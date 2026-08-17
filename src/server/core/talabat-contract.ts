export type TalabatCallbackKind = "order" | "catalog";
export type TalabatOrderStatus = "RECEIVED" | "READY_FOR_PICKUP" | "DISPATCHED" | "CANCELLED";
export type TalabatOrderUpdateStatus = "READY_FOR_PICKUP" | "DISPATCHED" | "CANCELLED" | "UPDATE_CART";
export type TalabatTransportType = "VENDOR_DELIVERY" | "LOGISTICS_DELIVERY";

const record = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};

export function talabatStaticToken(header: string | null): string {
  if (!header) return "";
  return header.startsWith("Bearer ") ? header.slice(7).trim() : header.trim();
}

export function constantTimeTokenMatch(actual: string, expected: string): boolean {
  if (!actual || !expected || actual.length !== expected.length) return false;
  let difference = 0;
  for (let index = 0; index < actual.length; index++) difference |= actual.charCodeAt(index) ^ expected.charCodeAt(index);
  return difference === 0;
}

export async function sha256Hex(value: string): Promise<string> {
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)));
  return Array.from(digest, byte => byte.toString(16).padStart(2, "0")).join("");
}

export async function parseTalabatCallback(rawBody: string, hint?: string | null) {
  const payload = JSON.parse(rawBody) as Record<string, unknown>;
  const client = record(payload.client);
  const sys = record(payload.sys);
  const explicitCatalog = hint === "catalog" || !!payload.job_id || !!payload.platform_vendor_id || !!payload.download_url;
  const kind: TalabatCallbackKind = explicitCatalog ? "catalog" : "order";
  const vendorId = String(
    kind === "catalog"
      ? payload.platform_vendor_id ?? payload.vendor_id ?? ""
      : client.store_id ?? payload.vendor_id ?? "",
  );
  const orderId = kind === "order" ? String(payload.order_id ?? "") : "";
  const status = String(payload.status ?? payload.job_status ?? (kind === "catalog" ? "UNKNOWN" : ""));
  const jobId = kind === "catalog" ? String(payload.job_id ?? "") : "";
  const occurredAt = String(sys.updated_at ?? sys.created_at ?? payload.updated_at ?? payload.created_at ?? "") || null;
  const payloadHash = await sha256Hex(rawBody);
  const eventKey = kind === "catalog"
    ? `${jobId || payloadHash}:${status || "UNKNOWN"}`
    : `${orderId || payloadHash}:${status || "UNKNOWN"}:${occurredAt ?? payloadHash}`;
  return { payload, kind, vendorId, orderId, status, jobId, occurredAt, payloadHash, eventKey, client, sys };
}

export function validateTalabatOrderUpdate(input: {
  orderId: string;
  status: TalabatOrderUpdateStatus;
  transportType?: TalabatTransportType;
  cancellationReason?: string;
  items: unknown[];
}): string | null {
  if (!input.orderId) return "order_id is required.";
  if (!input.items.length) return "Talabat requires item-level status data for order updates.";
  if (input.items.some(value => { const item=record(value); return !item._id&&!item.id&&!item.sku; })) return "Every Talabat order item requires _id, id, or sku.";
  if (input.status === "CANCELLED" && !input.cancellationReason?.trim()) return "A cancellation reason is required.";
  if (input.transportType === "VENDOR_DELIVERY" && !["DISPATCHED", "CANCELLED", "UPDATE_CART"].includes(input.status)) {
    return "Vendor-delivery orders can only be dispatched, cancelled, or have their cart updated.";
  }
  if (input.transportType === "LOGISTICS_DELIVERY" && !["READY_FOR_PICKUP", "CANCELLED", "UPDATE_CART"].includes(input.status)) {
    return "Talabat-logistics orders can only be marked ready for pickup, cancelled, or have their cart updated.";
  }
  return null;
}

export function buildTalabatOrderUpdate(input: {
  orderId: string;
  status: TalabatOrderUpdateStatus;
  cancellationReason?: string;
  items: unknown[];
}) {
  const items = input.items.map(value => {
    const item = record(value);
    const pricing = record(item.pricing);
    return {
      ...(item._id ? { _id: item._id } : item.id ? { id: item.id } : {}),
      ...(item.sku ? { sku: item.sku } : {}),
      ...(item.replaced_id ? { replaced_id: item.replaced_id } : {}),
      status: String(item.status ?? "IN_CART"),
      pricing: {
        pricing_type: String(pricing.pricing_type ?? "UNIT"),
        quantity: Number(pricing.quantity ?? 0),
        unit_price: Number(pricing.unit_price ?? 0),
        weight: Number(pricing.weight ?? 0),
        weighted_pieces: Number(pricing.weighted_pieces ?? 0),
      },
    };
  });
  return {
    order_id: input.orderId,
    status: input.status,
    items,
    ...(input.status === "CANCELLED" ? { cancellation: { reason: input.cancellationReason } } : {}),
  };
}
