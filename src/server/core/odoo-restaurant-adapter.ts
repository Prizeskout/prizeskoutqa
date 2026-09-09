import {
  prepareRestaurantOrderBatch,
  type RestaurantOrderBatch,
} from "@/server/restaurant-commerce-handlers";
import {
  prepareProductCostBatch,
  type ProductCostBatch,
  type ProductCostRecord,
} from "@/server/core/restaurant-costs";

type JsonRecord = Record<string, unknown>;
type FetchLike = typeof fetch;

export type OdooRestaurantMapping = {
  currency: string;
  database?: string;
  companyExternalIds?: Record<string, string>;
  brandByCompany?: Record<string, string>;
  branchByConfig?: Record<string, string>;
  revenueCenterByConfig?: Record<string, string>;
  channelByOrderType?: Record<string, string>;
  defaultChannel?: string;
};

export type OdooOrderPage = {
  batch: RestaurantOrderBatch | null;
  cursorAfter: number | null;
  deliveryComplete: boolean;
  sourceRows: number;
  skippedRows: Array<{ id: string; reason: string }>;
};

export type OdooProductCostPage = {
  batch: ProductCostBatch | null;
  cursorAfter: number | null;
  deliveryComplete: boolean;
  sourceRows: number;
  skippedRows: Array<{ id: string; reason: string }>;
};

const object = (value: unknown): JsonRecord | null =>
  value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonRecord)
    : null;
const text = (value: unknown) => (typeof value === "string" ? value.trim() : "");
const number = (value: unknown) => {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};
const id = (value: unknown) => {
  if (Array.isArray(value)) return String(value[0] ?? "").trim();
  if (typeof value === "number" || typeof value === "string") return String(value).trim();
  return "";
};
const relationName = (value: unknown) => (Array.isArray(value) ? text(value[1]) : "");
const round = (value: number) => Math.round(value * 100) / 100;
const timestamp = (value: unknown) => {
  const raw = text(value);
  if (!raw) return null;
  const normalized = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(raw)
    ? `${raw.replace(" ", "T")}Z`
    : raw;
  return Number.isNaN(Date.parse(normalized)) ? null : new Date(normalized).toISOString();
};

function mappingValue(map: Record<string, string> | undefined, key: string) {
  return map?.[key]?.trim() || null;
}

/** Maps Odoo's company-dependent standard_price as baseline product-cost
 * evidence. It does not label this as recipe/BOM cost, which requires a
 * separate manufacturing/recipe extraction and company configuration. */
export function mapOdooProductCost(
  value: unknown,
  mapping: OdooRestaurantMapping,
): ProductCostRecord {
  const product = object(value);
  if (!product) throw new Error("Odoo product is not an object.");
  const productId = id(product.id);
  const sku = text(product.default_code);
  const companyId = id(product.company_id);
  const writtenAt = timestamp(product.write_date);
  const unitCost = number(product.standard_price);
  if (!productId || !sku || !writtenAt || unitCost < 0)
    throw new Error("Odoo product is missing its ID, SKU, update date, or valid standard cost.");
  return {
    external_event_id: `odoo:product.product:${productId}:${text(product.write_date)}`,
    sku,
    brand_external_id: mappingValue(mapping.brandByCompany, companyId),
    branch_external_id: null,
    currency: mapping.currency.trim().toUpperCase(),
    unit_cost: Math.round(unitCost * 10_000) / 10_000,
    unit_of_measure: relationName(product.uom_id) || "unit",
    effective_from: writtenAt.slice(0, 10),
    effective_to: null,
    cost_components: { standard_price: Math.round(unitCost * 10_000) / 10_000 },
  };
}

/**
 * Maps Odoo POS records without assuming custom module field names. Optional
 * fields such as x_delivery_channel are used only when present. Customer,
 * employee, card and free-text note fields are deliberately not retained.
 */
export function mapOdooPosOrder(value: unknown, lines: unknown[], mapping: OdooRestaurantMapping) {
  const order = object(value);
  if (!order) throw new Error("Odoo POS order is not an object.");
  const orderId = id(order.id);
  const reference = text(order.pos_reference) || text(order.name) || orderId;
  const occurredAt = timestamp(order.date_order) ?? timestamp(order.write_date);
  const companyId = id(order.company_id);
  const configId = id(order.config_id) || id(order.session_config_id);
  if (!orderId || !reference || !occurredAt)
    throw new Error("Odoo POS order is missing its ID, reference, or date.");
  if (["cancel", "cancelled"].includes(text(order.state).toLowerCase())) {
    throw new Error(
      "Cancelled Odoo orders require a separate cancellation event and are not imported as completed sales.",
    );
  }

  const mappedLines = lines.map((candidate, index) => {
    const line = object(candidate);
    if (!line) throw new Error(`Odoo line ${index + 1} is invalid.`);
    const lineId = id(line.id);
    const quantity = number(line.qty);
    const unitPrice = number(line.price_unit);
    const discountPct = Math.max(0, number(line.discount));
    const gross = round(Math.max(0, quantity * unitPrice));
    const discount = round((gross * Math.min(discountPct, 100)) / 100);
    if (!lineId || quantity <= 0 || unitPrice < 0)
      throw new Error(`Odoo line ${index + 1} is missing a valid ID, quantity, or price.`);
    return {
      external_line_id: lineId,
      sku: text(line.product_default_code) || null,
      name:
        text(line.full_product_name) ||
        relationName(line.product_id) ||
        `Odoo product ${id(line.product_id)}`,
      quantity,
      gross_amount: gross,
      discount_amount: discount,
      tax_amount: 0,
      modifiers: [],
    };
  });
  const total = round(number(order.amount_total));
  const tax = round(Math.max(0, number(order.amount_tax)));
  const lineDiscount = round(mappedLines.reduce((sum, line) => sum + line.discount_amount, 0));
  const gross = round(total + lineDiscount - tax);
  if (total < 0 || gross < 0)
    throw new Error(
      "Negative Odoo totals require the refund workflow and are not imported as sales.",
    );
  const orderType =
    text(order.x_delivery_channel) ||
    text(order.delivery_channel) ||
    text(order.order_type) ||
    relationName(order.order_type_id);
  const channel =
    mappingValue(mapping.channelByOrderType, orderType) ??
    (orderType.toLowerCase() || mapping.defaultChannel?.trim().toLowerCase() || "direct");
  const final = ["paid", "done", "invoiced"].includes(text(order.state).toLowerCase());
  return {
    external_event_id: `odoo:pos.order:${orderId}:${text(order.write_date) || text(order.date_order)}`,
    external_order_id: reference,
    occurred_at: occurredAt,
    business_date: occurredAt.slice(0, 10),
    currency: mapping.currency.trim().toUpperCase(),
    channel,
    status: text(order.state) || "unknown",
    final,
    legal_entity_external_id:
      mappingValue(mapping.companyExternalIds, companyId) ?? (companyId || null),
    brand_external_id: mappingValue(mapping.brandByCompany, companyId),
    branch_external_id: mappingValue(mapping.branchByConfig, configId) ?? (configId || null),
    revenue_center_external_id:
      mappingValue(mapping.revenueCenterByConfig, configId) ?? (configId || null),
    settlement_reference: text(order.x_settlement_reference) || null,
    gross_amount: gross,
    discount_amount: lineDiscount,
    tax_amount: tax,
    service_charge_amount: 0,
    delivery_charge_amount: 0,
    refund_amount: 0,
    cancellation_amount: 0,
    net_amount: total,
    lines: mappedLines,
  };
}

async function json2Call(input: {
  baseUrl: string;
  database?: string;
  apiKey: string;
  model: string;
  method: string;
  body: JsonRecord;
  fetchImpl: FetchLike;
}) {
  const base = input.baseUrl.trim().replace(/\/+$/, "");
  if (!/^https:\/\//i.test(base)) throw new Error("Odoo base URL must use HTTPS.");
  const response = await input.fetchImpl(`${base}/json/2/${input.model}/${input.method}`, {
    method: "POST",
    headers: {
      Authorization: `bearer ${input.apiKey}`,
      "Content-Type": "application/json; charset=utf-8",
      ...(input.database ? { "X-Odoo-Database": input.database } : {}),
      "User-Agent": "PrizeSkout Odoo Evidence Connector/1.0",
    },
    body: JSON.stringify(input.body),
    signal: AbortSignal.timeout(20_000),
  });
  if (!response.ok)
    throw new Error(`Odoo ${input.model} read failed with HTTP ${response.status}.`);
  const payload = await response.json();
  if (!Array.isArray(payload))
    throw new Error(`Odoo ${input.model} returned an unexpected response.`);
  return payload as unknown[];
}

/** Reads one bounded Odoo 19 JSON-2 page using a dedicated read-only bot. */
export async function fetchOdooRestaurantOrders(input: {
  baseUrl: string;
  database?: string;
  apiKey: string;
  mapping: OdooRestaurantMapping;
  cursor?: number | null;
  limit?: number;
  fetchImpl?: FetchLike;
}): Promise<OdooOrderPage> {
  if (!input.apiKey.trim()) throw new Error("Odoo read-only API key is required.");
  const limit = Math.min(Math.max(input.limit ?? 250, 1), 500);
  const fetchImpl = input.fetchImpl ?? fetch;
  const orders = await json2Call({
    ...input,
    model: "pos.order",
    method: "search_read",
    fetchImpl,
    body: {
      domain: [["id", ">", input.cursor ?? 0]],
      fields: [
        "id",
        "name",
        "pos_reference",
        "date_order",
        "write_date",
        "state",
        "amount_total",
        "amount_tax",
        "company_id",
        "config_id",
        "lines",
        "x_delivery_channel",
        "x_settlement_reference",
      ],
      limit,
      order: "id asc",
    },
  });
  if (!orders.length)
    return {
      batch: null,
      cursorAfter: input.cursor ?? null,
      deliveryComplete: true,
      sourceRows: 0,
      skippedRows: [],
    };
  const orderIds = orders.map((row) => id(object(row)?.id)).filter(Boolean);
  const lineRows = await json2Call({
    ...input,
    model: "pos.order.line",
    method: "search_read",
    fetchImpl,
    body: {
      domain: [["order_id", "in", orderIds.map(Number)]],
      fields: [
        "id",
        "order_id",
        "product_id",
        "full_product_name",
        "product_default_code",
        "qty",
        "price_unit",
        "discount",
      ],
      limit: Math.min(orderIds.length * 100, 10_000),
      order: "id asc",
    },
  });
  const linesByOrder = new Map<string, unknown[]>();
  for (const row of lineRows) {
    const orderId = id(object(row)?.order_id);
    if (!orderId) continue;
    linesByOrder.set(orderId, [...(linesByOrder.get(orderId) ?? []), row]);
  }
  const mapped: ReturnType<typeof mapOdooPosOrder>[] = [];
  const skippedRows: Array<{ id: string; reason: string }> = [];
  for (const row of orders) {
    const orderId = id(object(row)?.id);
    try {
      mapped.push(mapOdooPosOrder(row, linesByOrder.get(orderId) ?? [], input.mapping));
    } catch (error) {
      skippedRows.push({
        id: orderId || "unknown",
        reason: error instanceof Error ? error.message : "Mapping failed.",
      });
    }
  }
  const cursorAfter = Math.max(
    ...orders.map((row) => Number(id(object(row)?.id))).filter(Number.isFinite),
  );
  const deliveryComplete = orders.length < limit;
  const batch = mapped.length
    ? prepareRestaurantOrderBatch({
        batch_id: `odoo:pos.order:${input.cursor ?? 0}:${cursorAfter}`,
        source_provider: "odoo",
        schema_version: "2026-09-05",
        delivery_complete: deliveryComplete && skippedRows.length === 0,
        declared_record_count: orders.length,
        orders: mapped,
      })
    : null;
  return {
    batch,
    cursorAfter,
    deliveryComplete: Boolean(batch?.delivery_complete),
    sourceRows: orders.length,
    skippedRows,
  };
}

/** Reads one bounded page of Odoo product standard costs. A companyId adds
 * Odoo's allowed-company context so company-dependent costs are not silently
 * read from whichever company happens to be active for the integration user. */
export async function fetchOdooProductCosts(input: {
  baseUrl: string;
  database?: string;
  apiKey: string;
  mapping: OdooRestaurantMapping;
  companyId?: number;
  cursor?: number | null;
  limit?: number;
  fetchImpl?: FetchLike;
}): Promise<OdooProductCostPage> {
  if (!input.apiKey.trim()) throw new Error("Odoo read-only API key is required.");
  const limit = Math.min(Math.max(input.limit ?? 500, 1), 1000);
  const fetchImpl = input.fetchImpl ?? fetch;
  const rows = await json2Call({
    ...input,
    model: "product.product",
    method: "search_read",
    fetchImpl,
    body: {
      domain: [
        ["id", ">", input.cursor ?? 0],
        ["active", "=", true],
      ],
      fields: [
        "id",
        "default_code",
        "standard_price",
        "company_id",
        "uom_id",
        "write_date",
        "active",
      ],
      limit,
      order: "id asc",
      ...(input.companyId ? { context: { allowed_company_ids: [input.companyId] } } : {}),
    },
  });
  if (!rows.length)
    return {
      batch: null,
      cursorAfter: input.cursor ?? null,
      deliveryComplete: true,
      sourceRows: 0,
      skippedRows: [],
    };
  const mapped: ProductCostRecord[] = [];
  const skippedRows: Array<{ id: string; reason: string }> = [];
  for (const row of rows) {
    const productId = id(object(row)?.id);
    try {
      mapped.push(mapOdooProductCost(row, input.mapping));
    } catch (error) {
      skippedRows.push({
        id: productId || "unknown",
        reason: error instanceof Error ? error.message : "Mapping failed.",
      });
    }
  }
  const cursorAfter = Math.max(
    ...rows.map((row) => Number(id(object(row)?.id))).filter(Number.isFinite),
  );
  const deliveryComplete = rows.length < limit;
  const batch = mapped.length
    ? prepareProductCostBatch({
        batch_id: `odoo:product.product:${input.companyId ?? "default"}:${input.cursor ?? 0}:${cursorAfter}`,
        source_provider: "odoo",
        schema_version: "2026-09-05",
        costs: mapped,
      })
    : null;
  return {
    batch,
    cursorAfter,
    deliveryComplete: deliveryComplete && skippedRows.length === 0,
    sourceRows: rows.length,
    skippedRows,
  };
}
