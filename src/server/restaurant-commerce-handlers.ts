import { createHash } from "node:crypto";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { evidenceFingerprint } from "@/server/core/merchant-evidence";
import {
  appendEvidenceProcessingAttempt,
  registerMerchantEvidence,
} from "@/server/core/merchant-evidence-intake";
import {
  NORMALIZED_COMMERCE_VERSION,
  type NormalizedCommerceEvent,
} from "@/server/core/normalized-commerce-events";
import type { V1Context, V1Result } from "@/server/v1-handlers";

type JsonObject = Record<string, unknown>;

export type RestaurantOrderLine = {
  external_line_id: string;
  sku: string | null;
  name: string;
  quantity: number;
  gross_amount: number;
  discount_amount: number;
  tax_amount: number;
  net_amount: number;
  modifiers: JsonObject[];
};

export type RestaurantOrder = {
  external_event_id: string;
  external_order_id: string;
  occurred_at: string;
  business_date: string;
  currency: string;
  channel: string;
  status: string;
  final: boolean;
  legal_entity_external_id: string | null;
  brand_external_id: string | null;
  branch_external_id: string | null;
  revenue_center_external_id: string | null;
  settlement_reference: string | null;
  gross_amount: number;
  discount_amount: number;
  tax_amount: number;
  service_charge_amount: number;
  delivery_charge_amount: number;
  refund_amount: number;
  cancellation_amount: number;
  net_amount: number;
  lines: RestaurantOrderLine[];
};

export type RestaurantOrderBatch = {
  batch_id: string;
  source_provider: string;
  schema_version: "2026-09-05";
  delivery_complete: boolean;
  declared_record_count: number | null;
  orders: RestaurantOrder[];
};

const clean = (value: unknown, max: number) =>
  typeof value === "string" ? value.trim().slice(0, max) : "";
const optional = (value: unknown, max: number) => clean(value, max) || null;
const money = (value: unknown, label: string, index: number) => {
  const parsed = value == null ? 0 : Number(value);
  if (!Number.isFinite(parsed) || parsed < 0)
    throw new Error(`Order ${index + 1} has an invalid ${label}.`);
  return Math.round(parsed * 100) / 100;
};

export function prepareRestaurantOrderBatch(input: unknown): RestaurantOrderBatch {
  if (!input || typeof input !== "object" || Array.isArray(input))
    throw new Error("Request body must be a JSON object.");
  const body = input as JsonObject;
  const batchId = clean(body.batch_id, 180);
  const provider = clean(body.source_provider, 120).toLowerCase();
  if (!batchId) throw new Error("batch_id is required and must be stable across retries.");
  if (!provider) throw new Error("source_provider is required.");
  if (body.schema_version !== "2026-09-05") throw new Error("schema_version must be 2026-09-05.");
  if (!Array.isArray(body.orders) || body.orders.length < 1 || body.orders.length > 1000) {
    throw new Error("Provide between 1 and 1,000 orders.");
  }
  const declared = body.declared_record_count == null ? null : Number(body.declared_record_count);
  if (declared != null && (!Number.isInteger(declared) || declared < 0))
    throw new Error("declared_record_count must be a non-negative integer.");
  const eventIds = new Set<string>();
  const orders = body.orders.map((candidate, index): RestaurantOrder => {
    if (!candidate || typeof candidate !== "object" || Array.isArray(candidate))
      throw new Error(`Order ${index + 1} is invalid.`);
    const row = candidate as JsonObject;
    const eventId = clean(row.external_event_id, 240);
    const orderId = clean(row.external_order_id, 240);
    const occurred = clean(row.occurred_at, 50);
    const businessDate = clean(row.business_date, 10);
    const currency = clean(row.currency, 3).toUpperCase();
    const channel = clean(row.channel, 80).toLowerCase();
    if (
      !eventId ||
      !orderId ||
      !channel ||
      !/^[A-Z]{3}$/.test(currency) ||
      Number.isNaN(Date.parse(occurred))
    ) {
      throw new Error(
        `Order ${index + 1} is missing a valid event ID, order ID, timestamp, channel, or ISO currency.`,
      );
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(businessDate))
      throw new Error(`Order ${index + 1} has an invalid business_date.`);
    if (eventIds.has(eventId))
      throw new Error(`external_event_id ${eventId} is duplicated in this batch.`);
    eventIds.add(eventId);
    const gross = money(row.gross_amount, "gross_amount", index);
    const discount = money(row.discount_amount, "discount_amount", index);
    const tax = money(row.tax_amount, "tax_amount", index);
    const service = money(row.service_charge_amount, "service_charge_amount", index);
    const delivery = money(row.delivery_charge_amount, "delivery_charge_amount", index);
    const refund = money(row.refund_amount, "refund_amount", index);
    const cancellation = money(row.cancellation_amount, "cancellation_amount", index);
    const computedNet =
      Math.round((gross - discount + tax + service + delivery - refund - cancellation) * 100) / 100;
    const suppliedNet = row.net_amount == null ? computedNet : Number(row.net_amount);
    if (!Number.isFinite(suppliedNet) || Math.abs(suppliedNet - computedNet) > 0.01) {
      throw new Error(`Order ${index + 1} net_amount does not reconcile with its components.`);
    }
    const rawLines = row.lines == null ? [] : row.lines;
    if (!Array.isArray(rawLines) || rawLines.length > 500)
      throw new Error(`Order ${index + 1} has invalid order lines.`);
    const lines = rawLines.map((lineCandidate, lineIndex): RestaurantOrderLine => {
      if (!lineCandidate || typeof lineCandidate !== "object" || Array.isArray(lineCandidate))
        throw new Error(`Order ${index + 1}, line ${lineIndex + 1} is invalid.`);
      const line = lineCandidate as JsonObject;
      const quantity = Number(line.quantity);
      const lineGross = Number(line.gross_amount);
      if (
        !clean(line.external_line_id, 240) ||
        !clean(line.name, 300) ||
        !Number.isFinite(quantity) ||
        quantity <= 0 ||
        !Number.isFinite(lineGross) ||
        lineGross < 0
      ) {
        throw new Error(
          `Order ${index + 1}, line ${lineIndex + 1} is missing a valid identity, name, quantity, or amount.`,
        );
      }
      const lineDiscount = money(
        line.discount_amount,
        `line ${lineIndex + 1} discount_amount`,
        index,
      );
      const lineTax = money(line.tax_amount, `line ${lineIndex + 1} tax_amount`, index);
      return {
        external_line_id: clean(line.external_line_id, 240),
        sku: optional(line.sku, 180),
        name: clean(line.name, 300),
        quantity,
        gross_amount: Math.round(lineGross * 100) / 100,
        discount_amount: lineDiscount,
        tax_amount: lineTax,
        net_amount: Math.round((lineGross - lineDiscount + lineTax) * 100) / 100,
        modifiers: Array.isArray(line.modifiers)
          ? (line.modifiers
              .filter((value) => value && typeof value === "object" && !Array.isArray(value))
              .slice(0, 100) as JsonObject[])
          : [],
      };
    });
    return {
      external_event_id: eventId,
      external_order_id: orderId,
      occurred_at: new Date(occurred).toISOString(),
      business_date: businessDate,
      currency,
      channel,
      status: clean(row.status, 80) || "unknown",
      final: row.final === true,
      legal_entity_external_id: optional(row.legal_entity_external_id, 160),
      brand_external_id: optional(row.brand_external_id, 160),
      branch_external_id: optional(row.branch_external_id, 160),
      revenue_center_external_id: optional(row.revenue_center_external_id, 160),
      settlement_reference: optional(row.settlement_reference, 240),
      gross_amount: gross,
      discount_amount: discount,
      tax_amount: tax,
      service_charge_amount: service,
      delivery_charge_amount: delivery,
      refund_amount: refund,
      cancellation_amount: cancellation,
      net_amount: Math.round(suppliedNet * 100) / 100,
      lines,
    };
  });
  if (body.delivery_complete === true && declared != null && declared !== orders.length)
    throw new Error(
      `The source declared ${declared} orders but PrizeSkout received ${orders.length}.`,
    );
  return {
    batch_id: batchId,
    source_provider: provider,
    schema_version: "2026-09-05",
    delivery_complete: body.delivery_complete === true,
    declared_record_count: declared,
    orders,
  };
}

export async function handleRestaurantOrderBatch(
  request: Request,
  ctx: V1Context,
): Promise<V1Result> {
  if (!ctx.scopes.includes("write") && !ctx.scopes.includes("admin"))
    return {
      status: 403,
      body: { error: { code: "forbidden", message: "This API key requires the write scope." } },
    };
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return {
      status: 422,
      body: { error: { code: "validation_failed", message: "Request body must be valid JSON." } },
    };
  }
  let batch: RestaurantOrderBatch;
  try {
    batch = prepareRestaurantOrderBatch(body);
  } catch (error) {
    return {
      status: 422,
      body: {
        error: {
          code: "validation_failed",
          message: error instanceof Error ? error.message : "The order batch is invalid.",
        },
      },
    };
  }
  const bodyHash = createHash("sha256").update(JSON.stringify(batch)).digest("hex");
  const sourceExternalId = `api:${ctx.apiKeyId}:${batch.batch_id}`;
  const { data: prior, error: priorError } = await (supabaseAdmin as any)
    .from("ps_merchant_evidence_items")
    .select("id,content_sha256")
    .eq("account_id", ctx.accountId)
    .eq("source_kind", "optional_api")
    .eq("source_provider", batch.source_provider)
    .eq("source_external_id", sourceExternalId)
    .limit(1)
    .maybeSingle();
  if (priorError) throw new Error(priorError.message);
  if (prior && prior.content_sha256 !== bodyHash) {
    return {
      status: 409,
      body: {
        error: {
          code: "idempotency_conflict",
          message: "This batch_id was already used with different normalized content.",
          evidence_item_id: prior.id,
        },
      },
    };
  }
  const intake = await registerMerchantEvidence({
    accountId: ctx.accountId,
    merchantId: ctx.accountId,
    sourceKind: "optional_api",
    sourceProvider: batch.source_provider,
    sourceExternalId,
    documentKind: "order_export",
    contentSha256: bodyHash,
    mediaType: "application/json",
    sourceMetadata: {
      schema_version: batch.schema_version,
      record_count: batch.orders.length,
      declared_record_count: batch.declared_record_count,
      delivery_complete: batch.delivery_complete,
      api_key_id: ctx.apiKeyId,
      data_minimized: true,
    },
  });
  if (intake.duplicate)
    return {
      status: 200,
      body: {
        data: {
          batch_id: batch.batch_id,
          evidence_item_id: intake.evidenceItemId,
          duplicate: true,
          accepted: batch.orders.length,
        },
      },
    };
  const events: NormalizedCommerceEvent[] = batch.orders.flatMap((order) => {
    const limitations = [
      ...(!order.final ? ["The source order is not final."] : []),
      ...(!batch.delivery_complete ? ["The source did not declare the batch complete."] : []),
    ];
    const base: Omit<NormalizedCommerceEvent, "event_fingerprint"> = {
      account_id: ctx.accountId,
      merchant_id: ctx.accountId,
      evidence_item_id: intake.evidenceItemId,
      source_kind: "optional_api",
      source_provider: batch.source_provider,
      external_event_id: order.external_event_id,
      event_kind: "order_snapshot",
      channel: order.channel,
      branch_external_id: order.branch_external_id,
      order_external_id: order.external_order_id,
      settlement_reference: order.settlement_reference,
      occurred_at: order.occurred_at,
      currency: order.currency,
      gross_amount: order.gross_amount,
      discount_amount: order.discount_amount,
      tax_amount: order.tax_amount,
      fee_amount: order.service_charge_amount + order.delivery_charge_amount,
      net_amount: order.net_amount,
      normalized_payload: {
        schema_version: batch.schema_version,
        business_date: order.business_date,
        status: order.status,
        final: order.final,
        legal_entity_external_id: order.legal_entity_external_id,
        brand_external_id: order.brand_external_id,
        revenue_center_external_id: order.revenue_center_external_id,
        refund_amount: order.refund_amount,
        cancellation_amount: order.cancellation_amount,
        service_charge_amount: order.service_charge_amount,
        delivery_charge_amount: order.delivery_charge_amount,
        lines: order.lines,
      },
      normalization_version: `${NORMALIZED_COMMERCE_VERSION}:restaurant-api-v1`,
      evidence_strength: order.final && batch.delivery_complete ? "strong" : "partial",
      limitations,
    };
    return [{ ...base, event_fingerprint: evidenceFingerprint(base) }];
  });
  const { data, error } = await (supabaseAdmin as any)
    .from("ps_normalized_commerce_events")
    .insert(events)
    .select("id");
  if (error) throw new Error(error.message);
  await appendEvidenceProcessingAttempt({
    evidenceItemId: intake.evidenceItemId,
    accountId: ctx.accountId,
    processorVersion: `${NORMALIZED_COMMERCE_VERSION}:restaurant-api-v1`,
    attemptNumber: 1,
    state: "normalized",
    detectedDocumentKind: "order_export",
    extractionSummary: {
      event_count: data?.length ?? 0,
      order_count: batch.orders.length,
      schema_version: batch.schema_version,
    },
    limitations: batch.delivery_complete ? [] : ["The source did not declare the batch complete."],
  });
  return {
    status: 202,
    body: {
      data: {
        batch_id: batch.batch_id,
        evidence_item_id: intake.evidenceItemId,
        duplicate: false,
        accepted: batch.orders.length,
        events_created: data?.length ?? 0,
        delivery_complete: batch.delivery_complete,
      },
    },
  };
}

const objectValue = (value: unknown): JsonObject =>
  value && typeof value === "object" && !Array.isArray(value) ? (value as JsonObject) : {};

type ProductCostEvidence = {
  id?: string;
  sku?: string;
  brand_external_id?: string | null;
  branch_external_id?: string | null;
  currency?: string;
  unit_cost?: number;
  effective_from?: string;
  effective_to?: string | null;
  source_provider?: string;
  created_at?: string;
};

const roundMoney = (value: number) => Math.round(value * 100) / 100;

export function selectEffectiveProductCost(
  costs: ProductCostEvidence[],
  context: {
    sku: string;
    currency: string;
    businessDate: string;
    brandExternalId: string | null;
    branchExternalId: string | null;
  },
) {
  const ranked = costs
    .filter((cost) => {
      if (cost.sku !== context.sku || cost.currency !== context.currency) return false;
      if (!cost.effective_from || cost.effective_from > context.businessDate) return false;
      if (cost.effective_to && cost.effective_to < context.businessDate) return false;
      if (cost.branch_external_id && cost.branch_external_id !== context.branchExternalId)
        return false;
      if (cost.brand_external_id && cost.brand_external_id !== context.brandExternalId)
        return false;
      return Number.isFinite(Number(cost.unit_cost));
    })
    .map((cost) => ({
      cost,
      specificity: (cost.branch_external_id ? 2 : 0) + (cost.brand_external_id ? 1 : 0),
    }))
    .sort(
      (left, right) =>
        right.specificity - left.specificity ||
        String(right.cost.effective_from).localeCompare(String(left.cost.effective_from)) ||
        String(right.cost.created_at ?? "").localeCompare(String(left.cost.created_at ?? "")),
    );
  return ranked[0]?.cost ?? null;
}

export function summarizeRestaurantOrderEconomics(
  event: JsonObject,
  costs: ProductCostEvidence[] = [],
) {
  const payload = objectValue(event.normalized_payload);
  const amount = (value: unknown) =>
    value == null
      ? null
      : Number.isFinite(Number(value))
        ? Math.round(Number(value) * 100) / 100
        : null;
  const net = amount(event.net_amount);
  const lines = Array.isArray(payload.lines) ? payload.lines.map(objectValue) : [];
  const businessDate = String(payload.business_date ?? "");
  const currency = String(event.currency ?? "");
  const brandExternalId =
    payload.brand_external_id == null ? null : String(payload.brand_external_id);
  const branchExternalId =
    event.branch_external_id == null ? null : String(event.branch_external_id);
  const lineCosts = lines.map((line) => {
    const sku = String(line.sku ?? "");
    const quantity = Number(line.quantity);
    const evidence = selectEffectiveProductCost(costs, {
      sku,
      currency,
      businessDate,
      brandExternalId,
      branchExternalId,
    });
    return { sku, quantity, evidence };
  });
  const costCoverageComplete =
    lineCosts.length > 0 &&
    lineCosts.every((line) => line.sku && Number.isFinite(line.quantity) && line.evidence);
  const evidenceProductCost = costCoverageComplete
    ? roundMoney(
        lineCosts.reduce((sum, line) => sum + line.quantity * Number(line.evidence?.unit_cost), 0),
      )
    : null;
  const productCost = amount(payload.product_cost_amount) ?? evidenceProductCost;
  return {
    id: String(event.id ?? ""),
    external_order_id: String(event.order_external_id ?? ""),
    occurred_at: event.occurred_at ?? null,
    business_date: payload.business_date ?? null,
    source_provider: event.source_provider ?? null,
    channel: event.channel ?? null,
    currency: event.currency ?? null,
    legal_entity_external_id: payload.legal_entity_external_id ?? null,
    brand_external_id: payload.brand_external_id ?? null,
    branch_external_id: event.branch_external_id ?? null,
    revenue_center_external_id: payload.revenue_center_external_id ?? null,
    settlement_reference: event.settlement_reference ?? null,
    status: payload.status ?? null,
    final: payload.final === true,
    economics: {
      gross_amount: amount(event.gross_amount),
      discount_amount: amount(event.discount_amount) ?? 0,
      tax_amount: amount(event.tax_amount) ?? 0,
      fee_amount: amount(event.fee_amount) ?? 0,
      net_amount: net,
      product_cost_amount: productCost,
      contribution_amount:
        net != null && productCost != null ? Math.round((net - productCost) * 100) / 100 : null,
    },
    lines,
    cost_evidence:
      productCost == null
        ? {
            coverage: "missing",
            matched_skus: lineCosts.filter((line) => line.evidence).map((line) => line.sku),
            missing_skus: lineCosts.filter((line) => !line.evidence).map((line) => line.sku),
          }
        : {
            coverage: "complete",
            matched_skus: lineCosts.filter((line) => line.evidence).map((line) => line.sku),
            missing_skus: [],
          },
    evidence: {
      strength: event.evidence_strength ?? "insufficient",
      limitations: Array.isArray(event.limitations) ? event.limitations : [],
      normalization_version: event.normalization_version ?? null,
    },
    completeness:
      net != null && productCost != null
        ? "contribution_available"
        : "order_economics_without_product_cost",
  };
}

export async function handleGetRestaurantOrderEconomics(
  _request: Request,
  ctx: V1Context,
  externalOrderId: string,
): Promise<V1Result> {
  if (!ctx.scopes.some((scope) => ["read", "admin", "audit:read"].includes(scope)))
    return {
      status: 403,
      body: { error: { code: "forbidden", message: "This API key requires the read scope." } },
    };
  const decoded = decodeURIComponent(externalOrderId).trim();
  if (!decoded || decoded.length > 240)
    return {
      status: 422,
      body: {
        error: { code: "validation_failed", message: "A valid external order ID is required." },
      },
    };
  const db = supabaseAdmin as any;
  const { data: candidates, error } = await db
    .from("ps_normalized_commerce_events")
    .select(
      "id,source_provider,order_external_id,settlement_reference,occurred_at,currency,channel,branch_external_id,gross_amount,discount_amount,tax_amount,fee_amount,net_amount,normalized_payload,normalization_version,evidence_strength,limitations,created_at",
    )
    .eq("account_id", ctx.accountId)
    .eq("event_kind", "order_snapshot")
    .eq("order_external_id", decoded)
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw new Error(error.message);
  const candidateIds = (candidates ?? []).map((row: { id: string }) => row.id);
  if (!candidateIds.length)
    return {
      status: 404,
      body: {
        error: { code: "not_found", message: `Order ${decoded} was not found in this account.` },
      },
    };
  const { data: heads, error: headError } = await db
    .from("ps_normalized_event_heads")
    .select("current_event_id")
    .eq("account_id", ctx.accountId)
    .eq("event_kind", "order_snapshot")
    .in("current_event_id", candidateIds);
  if (headError) throw new Error(headError.message);
  const current = new Set(
    (heads ?? []).map((row: { current_event_id: string }) => row.current_event_id),
  );
  const data = (candidates ?? []).filter((row: { id: string }) => current.has(row.id)).slice(0, 20);
  if (!data.length)
    return {
      status: 404,
      body: {
        error: { code: "not_found", message: `No current record for order ${decoded} was found.` },
      },
    };
  const skus = Array.from(
    new Set(
      data.flatMap((event: JsonObject) => {
        const payload = objectValue(event.normalized_payload);
        return Array.isArray(payload.lines)
          ? payload.lines.map((line) => String(objectValue(line).sku ?? "")).filter(Boolean)
          : [];
      }),
    ),
  );
  let costs: ProductCostEvidence[] = [];
  if (skus.length) {
    const { data: costRows, error: costError } = await db
      .from("ps_product_cost_evidence")
      .select(
        "id,sku,brand_external_id,branch_external_id,currency,unit_cost,effective_from,effective_to,source_provider,created_at",
      )
      .eq("account_id", ctx.accountId)
      .in("sku", skus)
      .order("effective_from", { ascending: false })
      .limit(5000);
    if (costError) throw new Error(costError.message);
    costs = costRows ?? [];
  }
  return {
    status: 200,
    body: {
      data: data.map((event: JsonObject) => summarizeRestaurantOrderEconomics(event, costs)),
      meta: {
        count: data.length,
        note:
          data.length > 1
            ? "More than one source has a current record for this external order ID."
            : null,
      },
    },
  };
}
