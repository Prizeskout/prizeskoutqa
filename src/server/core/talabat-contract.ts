export type TalabatCallbackKind = "order" | "catalog";
export type TalabatOrderStatus = "RECEIVED" | "READY_FOR_PICKUP" | "DISPATCHED" | "CANCELLED";
export type TalabatOrderUpdateStatus = "order_accepted" | "order_rejected" | "order_prepared" | "order_picked_up";
export type TalabatRejectionReason =
  | "ADDRESS_INCOMPLETE_MISSTATED" | "BAD_WEATHER" | "BLACKLISTED" | "CARD_READER_NOT_AVAILABLE"
  | "CLOSED" | "CONTENT_WRONG_MISLEADING" | "FOOD_QUALITY_SPILLAGE" | "FRAUD_PRANK"
  | "ITEM_UNAVAILABLE" | "LATE_DELIVERY" | "MENU_ACCOUNT_SETTINGS" | "MOV_NOT_REACHED"
  | "NO_COURIER" | "NO_PICKER" | "NO_RESPONSE" | "OUTSIDE_DELIVERY_AREA" | "TECHNICAL_PROBLEM"
  | "TEST_ORDER" | "TOO_BUSY" | "UNABLE_TO_FIND" | "UNABLE_TO_PAY" | "UNPROFESSIONAL_BEHAVIOUR"
  | "WILL_NOT_WORK_WITH" | "WRONG_ORDER_ITEMS_DELIVERED";

export const TALABAT_REJECTION_REASONS = new Set<TalabatRejectionReason>([
  "ADDRESS_INCOMPLETE_MISSTATED", "BAD_WEATHER", "BLACKLISTED", "CARD_READER_NOT_AVAILABLE",
  "CLOSED", "CONTENT_WRONG_MISLEADING", "FOOD_QUALITY_SPILLAGE", "FRAUD_PRANK",
  "ITEM_UNAVAILABLE", "LATE_DELIVERY", "MENU_ACCOUNT_SETTINGS", "MOV_NOT_REACHED",
  "NO_COURIER", "NO_PICKER", "NO_RESPONSE", "OUTSIDE_DELIVERY_AREA", "TECHNICAL_PROBLEM",
  "TEST_ORDER", "TOO_BUSY", "UNABLE_TO_FIND", "UNABLE_TO_PAY", "UNPROFESSIONAL_BEHAVIOUR",
  "WILL_NOT_WORK_WITH", "WRONG_ORDER_ITEMS_DELIVERED",
]);

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

function decodeBase64Url(value: string): Uint8Array {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  const binary = atob(normalized);
  return Uint8Array.from(binary, character => character.charCodeAt(0));
}

export async function verifyTalabatMiddlewareJwt(
  authorization: string | null,
  secret: string,
): Promise<{ valid: boolean; claims?: Record<string, unknown>; reason?: string }> {
  const token = talabatStaticToken(authorization);
  const parts = token.split(".");
  if (!secret || parts.length !== 3) return { valid: false, reason: "Malformed middleware JWT." };
  try {
    const header = JSON.parse(new TextDecoder().decode(decodeBase64Url(parts[0]))) as Record<string, unknown>;
    const claims = JSON.parse(new TextDecoder().decode(decodeBase64Url(parts[1]))) as Record<string, unknown>;
    if (header.alg !== "HS512") return { valid: false, reason: "Talabat middleware JWT must use HS512." };
    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(secret),
      { name: "HMAC", hash: "SHA-512" },
      false,
      ["verify"],
    );
    const validSignature = await crypto.subtle.verify(
      "HMAC",
      key,
      new Uint8Array(decodeBase64Url(parts[2])).buffer,
      new TextEncoder().encode(`${parts[0]}.${parts[1]}`),
    );
    if (!validSignature) return { valid: false, reason: "Invalid middleware JWT signature." };
    if (claims.service !== "middleware") return { valid: false, reason: "Invalid middleware service claim." };
    if (typeof claims.exp === "number" && claims.exp * 1000 <= Date.now()) return { valid: false, reason: "Expired middleware JWT." };
    return { valid: true, claims };
  } catch {
    return { valid: false, reason: "Malformed middleware JWT." };
  }
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
  status: TalabatOrderUpdateStatus;
  callbackUrl: string;
  environment: "production" | "sandbox";
  acceptanceTime?: string;
  rejectionReason?: string;
}): string | null {
  let callback: URL;
  try { callback = new URL(input.callbackUrl); } catch { return "The order does not contain a valid callback URL for this status."; }
  const expectedHost = input.environment === "sandbox"
    ? "integration-middleware.stg.restaurant-partners.com"
    : "integration-middleware.eu.restaurant-partners.com";
  if (callback.protocol !== "https:" || callback.hostname !== expectedHost)
    return "Talabat callback URL does not match the configured middleware environment.";
  if (input.status === "order_accepted" && (!input.acceptanceTime || !Number.isFinite(Date.parse(input.acceptanceTime))))
    return "A valid RFC 3339 acceptance_time is required when accepting an order.";
  if (input.status === "order_rejected" && !TALABAT_REJECTION_REASONS.has(input.rejectionReason as TalabatRejectionReason))
    return "A supported Talabat rejection_reason is required when rejecting an order.";
  return null;
}

export function buildTalabatOrderUpdate(input: {
  status: TalabatOrderUpdateStatus;
  acceptanceTime?: string;
  remoteOrderId?: string;
  rejectionReason?: string;
  message?: string;
}) {
  if (input.status === "order_accepted") return {
    status: input.status, acceptanceTime: input.acceptanceTime,
    ...(input.remoteOrderId ? { remoteOrderId: input.remoteOrderId } : {}),
  };
  if (input.status === "order_rejected") return {
    status: input.status, reason: input.rejectionReason,
    ...(input.message?.trim() ? { message: input.message.trim() } : {}),
  };
  return { status: input.status };
}
