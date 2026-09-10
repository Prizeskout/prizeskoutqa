import type {SourceOrderRecord} from "./evidence-source-sync";

const FOODICS_API_BASE = "https://api-v2.foodics.com/v2.1";
const MAX_PAGES = 20;

type JsonRecord = Record<string, unknown>;

export type FoodicsEvidencePage = {
  records: SourceOrderRecord[];
  cursorAfter: string | null;
  deliveryComplete: boolean;
  pagesFetched: number;
};

const record = (value: unknown): JsonRecord | null =>
  value !== null && typeof value === "object" && !Array.isArray(value) ? value as JsonRecord : null;
const text = (value: unknown) => typeof value === "string" ? value.trim() : "";
const number = (value: unknown) => {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? Math.round(parsed * 100) / 100 : 0;
};
const foodicsDate = (value: unknown) => {
  const raw = text(value);
  if (!raw) return null;
  const normalized = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(raw)
    ? `${raw.replace(" ", "T")}Z`
    : /^\d{4}-\d{2}-\d{2}$/.test(raw) ? `${raw}T00:00:00Z` : raw;
  const timestamp = Date.parse(normalized);
  return Number.isNaN(timestamp) ? null : new Date(timestamp).toISOString();
};

/**
 * Converts the documented Foodics order envelope into PrizeSkout's minimized
 * provider-neutral order truth. Customer, payment, note, item and device data
 * are deliberately never copied.
 */
export function mapFoodicsOrder(value: unknown, currency: string): SourceOrderRecord | null {
  const envelope = record(value);
  const order = record(envelope?.order) ?? envelope;
  if (!order) return null;

  const id = text(order.id);
  const reference = text(order.reference_x) || text(order.reference) || String(order.number ?? "").trim() || id;
  const occurredAt = foodicsDate(order.closed_at) ?? foodicsDate(order.business_date);
  const subtotal = number(order.subtotal_price);
  const discount = Math.max(0, number(order.discount_amount));
  const total = Math.max(0, number(order.total_price));
  const branch = record(order.branch);
  if (!id || !reference || !occurredAt || subtotal < 0 || !currency.trim()) return null;

  // Foodics total_price is the final order total. The remainder after subtotal
  // and discount can contain tax, rounding or charges, so it is not labelled as
  // tax without a verified tax breakdown.
  const final = Boolean(foodicsDate(order.closed_at));
  const isReturn = Boolean(record(order.original_order));
  return {
    external_event_id: `foodics-order:${id}:${text(order.updated_at) || text(order.closed_at) || reference}`,
    order_id: reference,
    occurred_at: occurredAt,
    channel: "foodics",
    branch_external_id: text(branch?.id) || text(branch?.reference) || null,
    currency: currency.trim().toUpperCase(),
    gross_amount: Math.max(0, subtotal),
    discount_amount: discount,
    tax_amount: 0,
    refund_amount: isReturn ? total : 0,
    cancellation_amount: 0,
    status: String(order.status ?? (final ? "closed" : "open")),
    final,
  };
}

export async function fetchFoodicsOrderEvidence(input: {
  accessToken: string;
  currency: string;
  cursor?: string | null;
  branchIds?: string[];
  fetchImpl?: typeof fetch;
  maxPages?: number;
}): Promise<FoodicsEvidencePage> {
  const token = input.accessToken.trim();
  if (!token) throw new Error("Foodics read-only access token is required.");
  const fetchImpl = input.fetchImpl ?? fetch;
  const maxPages = Math.min(Math.max(input.maxPages ?? MAX_PAGES, 1), MAX_PAGES);
  const allowedBranches = new Set((input.branchIds ?? []).map(value => value.trim()).filter(Boolean));
  let cursor = input.cursor?.trim() || "0";
  const records: SourceOrderRecord[] = [];
  let pagesFetched = 0;
  let deliveryComplete = false;

  for (; pagesFetched < maxPages; pagesFetched += 1) {
    const url = new URL(`${FOODICS_API_BASE}/orders`);
    url.searchParams.set("sort", "reference");
    url.searchParams.set("filter[reference_after]", cursor);
    url.searchParams.set("include", "branch,original_order");
    const response = await fetchImpl(url, {
      method: "GET",
      headers: {Authorization: `Bearer ${token}`, Accept: "application/json"},
    });
    if (!response.ok) throw new Error(`Foodics order read failed with HTTP ${response.status}.`);
    const payload = await response.json() as {data?: unknown[]};
    const rows = Array.isArray(payload.data) ? payload.data : [];
    for (const row of rows) {
      const envelope = record(row);
      const order = record(envelope?.order) ?? envelope;
      const reference = text(order?.reference);
      if (reference) cursor = reference;
      const mapped = mapFoodicsOrder(row, input.currency);
      if (!mapped) continue;
      if (allowedBranches.size && (!mapped.branch_external_id || !allowedBranches.has(mapped.branch_external_id))) continue;
      records.push(mapped);
    }
    if (rows.length < 50) {
      deliveryComplete = true;
      pagesFetched += 1;
      break;
    }
  }

  return {records, cursorAfter: cursor === "0" ? null : cursor, deliveryComplete, pagesFetched};
}
