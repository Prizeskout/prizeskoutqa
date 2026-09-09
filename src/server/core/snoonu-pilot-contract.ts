export const SNOONU_PILOT_SCHEMA_VERSION = "2026-09-09";
export const SNOONU_PILOT_EVENT_TYPES = [
  "order.created", "order.updated", "order.cancelled", "order.refunded",
  "settlement.created", "settlement.updated",
] as const;

export type SnoonuPilotEventType = (typeof SNOONU_PILOT_EVENT_TYPES)[number];

export type SnoonuPilotEnvelope = {
  schema_version: string;
  event_id: string;
  event_type: SnoonuPilotEventType;
  occurred_at: string;
  merchant: { id: string };
  branch: { id: string };
  data: Record<string, unknown>;
};

export type SnoonuNormalizedEvent = {
  kind: "order" | "settlement";
  external_id: string;
  merchant_external_id: string;
  branch_external_id: string;
  occurred_at: string;
  currency: string;
  gross_amount: number | null;
  commission_amount: number | null;
  discount_amount: number | null;
  refund_amount: number | null;
  net_amount: number | null;
  status: string;
  line_items: unknown[];
  source: Record<string, unknown>;
};

function object(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(`${label} must be an object.`);
  return value as Record<string, unknown>;
}

function required(value: unknown, label: string): string {
  if (typeof value !== "string" || !value.trim()) throw new Error(`${label} is required.`);
  return value.trim();
}

function money(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) throw new Error(`Invalid monetary value: ${String(value)}`);
  return Math.round(parsed * 100) / 100;
}

export function parseSnoonuPilotEnvelope(value: unknown): SnoonuPilotEnvelope {
  const input = object(value, "Webhook body");
  const merchant = object(input.merchant, "merchant");
  const branch = object(input.branch, "branch");
  const eventType = required(input.event_type, "event_type");
  if (!(SNOONU_PILOT_EVENT_TYPES as readonly string[]).includes(eventType)) throw new Error(`Unsupported event_type: ${eventType}`);
  const occurredAt = required(input.occurred_at, "occurred_at");
  if (!Number.isFinite(Date.parse(occurredAt))) throw new Error("occurred_at must be an ISO-8601 timestamp.");
  return {
    schema_version: required(input.schema_version, "schema_version"),
    event_id: required(input.event_id, "event_id"),
    event_type: eventType as SnoonuPilotEventType,
    occurred_at: occurredAt,
    merchant: { id: required(merchant.id, "merchant.id") },
    branch: { id: required(branch.id, "branch.id") },
    data: object(input.data, "data"),
  };
}

export function normalizeSnoonuPilotEvent(event: SnoonuPilotEnvelope): SnoonuNormalizedEvent {
  const data = event.data;
  const isSettlement = event.event_type.startsWith("settlement.");
  const externalId = required(isSettlement ? data.settlement_id : data.order_id, isSettlement ? "data.settlement_id" : "data.order_id");
  return {
    kind: isSettlement ? "settlement" : "order",
    external_id: externalId,
    merchant_external_id: event.merchant.id,
    branch_external_id: event.branch.id,
    occurred_at: event.occurred_at,
    currency: required(data.currency ?? "QAR", "data.currency").toUpperCase(),
    gross_amount: money(data.gross_amount),
    commission_amount: money(data.commission_amount),
    discount_amount: money(data.discount_amount),
    refund_amount: money(data.refund_amount),
    net_amount: money(data.net_amount),
    status: typeof data.status === "string" ? data.status : event.event_type.split(".")[1],
    line_items: Array.isArray(data.line_items) ? data.line_items : [],
    source: data,
  };
}

export async function signSnoonuPilotPayload(rawBody: string, timestamp: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const bytes = await crypto.subtle.sign("HMAC", key, encoder.encode(`${timestamp}.${rawBody}`));
  return Array.from(new Uint8Array(bytes)).map(byte => byte.toString(16).padStart(2, "0")).join("");
}

export async function verifySnoonuPilotSignature(rawBody: string, timestamp: string, secret: string, supplied: string): Promise<boolean> {
  const received = supplied.startsWith("sha256=") ? supplied.slice(7) : supplied;
  const expected = await signSnoonuPilotPayload(rawBody, timestamp, secret);
  if (received.length !== expected.length) return false;
  let difference = 0;
  for (let index = 0; index < received.length; index += 1) difference |= received.charCodeAt(index) ^ expected.charCodeAt(index);
  return difference === 0;
}

export function isFreshSnoonuTimestamp(timestamp: string, now = Date.now(), toleranceMs = 5 * 60_000): boolean {
  const numeric = Number(timestamp);
  const parsed = Number.isFinite(numeric) ? numeric * 1000 : Date.parse(timestamp);
  return Number.isFinite(parsed) && Math.abs(now - parsed) <= toleranceMs;
}
