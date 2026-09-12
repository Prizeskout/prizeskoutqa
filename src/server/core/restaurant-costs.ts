import { createHash } from "node:crypto";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { evidenceFingerprint } from "./merchant-evidence";
import {
  appendEvidenceProcessingAttempt,
  registerMerchantEvidence,
} from "./merchant-evidence-intake";
import type { V1Context, V1Result } from "@/server/v1-handlers";
import { resolveAuthoritativeEconomics } from "./economics-resolver";
import { resolveMerchantMarginPolicy } from "./merchant-pricing-config";
import { decide } from "./decide-engine";
import { PRICE_DECISION_TTL_MS } from "./pricing-evidence";

type JsonObject = Record<string, unknown>;
export type ProductCostRecord = {
  external_event_id: string;
  sku: string;
  brand_external_id: string | null;
  branch_external_id: string | null;
  currency: string;
  unit_cost: number;
  unit_of_measure: string;
  effective_from: string;
  effective_to: string | null;
  cost_components: JsonObject;
};
export type ProductCostBatch = {
  batch_id: string;
  source_provider: string;
  schema_version: "2026-09-05";
  costs: ProductCostRecord[];
};
export type ProductCostBatchResult = {
  batch_id: string;
  evidence_item_id: string;
  duplicate: boolean;
  accepted: number;
  costs_created?: number;
  pricing_decisions_created?: number;
  products_waiting_for_economics?: number;
};
const clean = (value: unknown, max: number) =>
  typeof value === "string" ? value.trim().slice(0, max) : "";
const optional = (value: unknown, max: number) => clean(value, max) || null;
const isoDate = (value: unknown) => {
  const date = clean(value, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(date) && !Number.isNaN(Date.parse(`${date}T00:00:00Z`))
    ? date
    : null;
};

export function prepareProductCostBatch(input: unknown): ProductCostBatch {
  if (!input || typeof input !== "object" || Array.isArray(input))
    throw new Error("Request body must be a JSON object.");
  const body = input as JsonObject,
    batchId = clean(body.batch_id, 180),
    provider = clean(body.source_provider, 120).toLowerCase();
  if (!batchId) throw new Error("batch_id is required and must be stable across retries.");
  if (!provider) throw new Error("source_provider is required.");
  if (body.schema_version !== "2026-09-05") throw new Error("schema_version must be 2026-09-05.");
  if (!Array.isArray(body.costs) || body.costs.length < 1 || body.costs.length > 5000)
    throw new Error("Provide between 1 and 5,000 product costs.");
  const identities = new Set<string>();
  const costs = body.costs.map((candidate, index): ProductCostRecord => {
    if (!candidate || typeof candidate !== "object" || Array.isArray(candidate))
      throw new Error(`Cost record ${index + 1} is invalid.`);
    const row = candidate as JsonObject,
      external = clean(row.external_event_id, 240),
      sku = clean(row.sku, 180),
      currency = clean(row.currency, 3).toUpperCase(),
      unitCost = Number(row.unit_cost),
      from = isoDate(row.effective_from),
      to = row.effective_to == null ? null : isoDate(row.effective_to);
    if (
      !external ||
      !sku ||
      !from ||
      !/^[A-Z]{3}$/.test(currency) ||
      !Number.isFinite(unitCost) ||
      unitCost < 0
    )
      throw new Error(
        `Cost record ${index + 1} is missing a valid identity, SKU, currency, cost, or effective date.`,
      );
    if (to && to < from) throw new Error(`Cost record ${index + 1} ends before it begins.`);
    if (identities.has(external))
      throw new Error(`external_event_id ${external} is duplicated in this batch.`);
    identities.add(external);
    const components =
      row.cost_components &&
      typeof row.cost_components === "object" &&
      !Array.isArray(row.cost_components)
        ? (row.cost_components as JsonObject)
        : {};
    const componentTotal = Object.values(components).reduce<number>(
      (sum, value) => sum + (Number.isFinite(Number(value)) ? Number(value) : 0),
      0,
    );
    if (Object.keys(components).length && Math.abs(componentTotal - unitCost) > 0.01)
      throw new Error(`Cost record ${index + 1} components do not equal unit_cost.`);
    return {
      external_event_id: external,
      sku,
      brand_external_id: optional(row.brand_external_id, 160),
      branch_external_id: optional(row.branch_external_id, 160),
      currency,
      unit_cost: Math.round(unitCost * 10000) / 10000,
      unit_of_measure: clean(row.unit_of_measure, 40) || "unit",
      effective_from: from,
      effective_to: to,
      cost_components: components,
    };
  });
  return { batch_id: batchId, source_provider: provider, schema_version: "2026-09-05", costs };
}

export async function handleProductCostBatch(request: Request, ctx: V1Context): Promise<V1Result> {
  if (!ctx.scopes.includes("write") && !ctx.scopes.includes("admin"))
    return {
      status: 403,
      body: { error: { code: "forbidden", message: "This API key requires the write scope." } },
    };
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return {
      status: 422,
      body: { error: { code: "validation_failed", message: "Request body must be valid JSON." } },
    };
  }
  let batch: ProductCostBatch;
  try {
    batch = prepareProductCostBatch(raw);
  } catch (error) {
    return {
      status: 422,
      body: {
        error: {
          code: "validation_failed",
          message: error instanceof Error ? error.message : "The cost batch is invalid.",
        },
      },
    };
  }
  try {
    const result = await persistProductCostBatch(ctx.accountId, batch, `api:${ctx.apiKeyId}`);
    return { status: result.duplicate ? 200 : 202, body: { data: result } };
  } catch (error) {
    if (error instanceof ProductCostBatchConflict) {
      return { status: 409, body: { error: { code: "idempotency_conflict", message: error.message, evidence_item_id: error.evidenceItemId } } };
    }
    throw error;
  }
}

export class ProductCostBatchConflict extends Error {
  constructor(message: string, readonly evidenceItemId: string) {
    super(message);
  }
}

/** Persist normalized cost evidence without changing the connected storefront. */
export async function persistProductCostBatch(
  accountId: string,
  batch: ProductCostBatch,
  sourceNamespace = "dashboard",
): Promise<ProductCostBatchResult> {
  const hash = createHash("sha256").update(JSON.stringify(batch)).digest("hex"),
    sourceExternalId = `${sourceNamespace}:costs:${batch.batch_id}`,
    db = supabaseAdmin as any;
  const { data: prior, error: priorError } = await db
    .from("ps_merchant_evidence_items")
    .select("id,content_sha256")
    .eq("account_id", accountId)
    .eq("source_kind", "optional_api")
    .eq("source_provider", batch.source_provider)
    .eq("source_external_id", sourceExternalId)
    .limit(1)
    .maybeSingle();
  if (priorError) throw new Error(priorError.message);
  if (prior && prior.content_sha256 !== hash)
    throw new ProductCostBatchConflict(
      "This batch_id was already used with different normalized content.",
      prior.id,
    );
  const intake = await registerMerchantEvidence({
    accountId,
    merchantId: accountId,
    sourceKind: "optional_api",
    sourceProvider: batch.source_provider,
    sourceExternalId,
    documentKind: "unknown",
    contentSha256: hash,
    mediaType: "application/json",
    sourceMetadata: {
      evidence_kind: "product_cost_batch",
      schema_version: batch.schema_version,
      record_count: batch.costs.length,
      data_minimized: true,
    },
  });
  if (intake.duplicate) {
    const refresh = await refreshPricingDecisionsForCosts(accountId, batch, true);
    return {
          batch_id: batch.batch_id,
          evidence_item_id: intake.evidenceItemId,
          duplicate: true,
          accepted: batch.costs.length,
          pricing_decisions_created: refresh.created,
          products_waiting_for_economics: refresh.waitingForEconomics,
    };
  }
  const rows = batch.costs.map((cost) => {
    const base = {
      account_id: accountId,
      evidence_item_id: intake.evidenceItemId,
      source_provider: batch.source_provider,
      ...cost,
    };
    return { ...base, event_fingerprint: evidenceFingerprint(base) };
  });
  const { data, error } = await db.from("ps_product_cost_evidence").insert(rows).select("id");
  if (error) throw new Error(error.message);
  const refresh = await refreshPricingDecisionsForCosts(accountId, batch);
  await appendEvidenceProcessingAttempt({
    evidenceItemId: intake.evidenceItemId,
    accountId,
    processorVersion: "restaurant-cost-normalizer-v1",
    attemptNumber: 1,
    state: "normalized",
    detectedDocumentKind: "unknown",
    extractionSummary: {
      evidence_kind: "product_cost_batch",
      cost_count: data?.length ?? 0,
      schema_version: batch.schema_version,
    },
  });
  return {
        batch_id: batch.batch_id,
        evidence_item_id: intake.evidenceItemId,
        duplicate: false,
        accepted: batch.costs.length,
        costs_created: data?.length ?? 0,
        pricing_decisions_created: refresh.created,
        products_waiting_for_economics: refresh.waitingForEconomics,
  };
}

const MERCHANT_COST_TTL_MS = 30 * 24 * 60 * 60_000;

/** Rebuild the authoritative margin snapshot immediately after cost evidence changes. */
async function refreshPricingDecisionsForCosts(accountId: string, batch: ProductCostBatch, onlyIfMissing = false) {
  const db = supabaseAdmin as any;
  const bySku = new Map(batch.costs.map(cost => [cost.sku.toLowerCase(), cost]));
  const { data: events, error } = await db.from("ps_ingest_events")
    .select("id,account_id,licensee_id,merchant_id,region,source_platform,item_id,sku,current_retail_price,currency,raw_payload,created_at")
    .eq("account_id", accountId)
    .in("sku", [...new Set(batch.costs.map(cost => cost.sku))])
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  const seen = new Set<string>();
  let created = 0, waitingForEconomics = 0;
  for (const event of events ?? []) {
    const key = `${event.source_platform}:${event.item_id || event.sku}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const cost = bySku.get(String(event.sku).toLowerCase());
    if (!cost || String(event.currency ?? cost.currency).toUpperCase() !== cost.currency) continue;
    const observedAt = new Date().toISOString();
    const expiresAt = cost.effective_to
      ? new Date(`${cost.effective_to}T23:59:59.999Z`).toISOString()
      : new Date(Date.now() + MERCHANT_COST_TTL_MS).toISOString();
    const raw = event.raw_payload && typeof event.raw_payload === "object" ? event.raw_payload : {};
    const economics = await resolveAuthoritativeEconomics({ accountId, merchantId: event.merchant_id ?? accountId, channel: event.source_platform });
    await db.from("ps_ingest_events").update({
      base_cost: cost.unit_cost,
      status: economics ? "decided" : "received",
      raw_payload: { ...raw, cost_source: "merchant_confirmed_evidence", cost_observed_at: observedAt, cost_evidence_expires_at: expiresAt, cost_currency: cost.currency, cost_sku: cost.sku, cost_item_id: event.item_id ?? event.sku, ...(economics ? { economics_source: "approved_contract" } : { economics_source: "approved_contract_required" }) },
    }).eq("id", event.id).eq("account_id", accountId);
    if (!economics) { waitingForEconomics += 1; continue; }
    const policy = await resolveMerchantMarginPolicy(accountId, event.source_platform);
    if (onlyIfMissing) {
      const { data: currentDecision, error: currentError } = await db.from("ps_decide_results")
        .select("base_cost,current_retail_price,economics_version_id,margin_policy_version,decision_expires_at,evidence_currency")
        .eq("account_id", accountId).eq("ingest_event_id", event.id)
        .order("created_at", { ascending:false }).limit(1).maybeSingle();
      if (currentError) throw new Error(currentError.message);
      const stillCurrent = currentDecision
        && Math.abs(Number(currentDecision.base_cost) - cost.unit_cost) < 0.00005
        && Math.abs(Number(currentDecision.current_retail_price) - Number(event.current_retail_price)) < 0.00005
        && String(currentDecision.economics_version_id) === economics.id
        && Number(currentDecision.margin_policy_version) === policy.version
        && String(currentDecision.evidence_currency).toUpperCase() === cost.currency
        && Date.parse(String(currentDecision.decision_expires_at)) > Date.now();
      if (stillCurrent) continue;
    }
    const output = decide({
      region: event.region ?? "QA", baseCost: cost.unit_cost, currentRetailPrice: Number(event.current_retail_price),
      commissionRate: economics.commissionRate, vatRate: economics.vatRate, paymentFeeRate: economics.paymentFeeRate,
      fixedOrderFee: economics.fixedOrderFee, promotionContributionRate: economics.promotionContributionRate,
      logisticsSubsidy: economics.logisticsSubsidy, marginFloorPct: policy.marginFloorPct,
      minimumContributionAmount: policy.minimumContributionAmount,
    });
    const { error: decisionError } = await db.from("ps_decide_results").insert({
      ingest_event_id: event.id, account_id: accountId, licensee_id: event.licensee_id,
      region: event.region ?? "QA", merchant_id: event.merchant_id ?? accountId, sku: event.sku,
      base_cost: cost.unit_cost, current_retail_price: Number(event.current_retail_price),
      commission_rate: economics.commissionRate, vat_rate: economics.vatRate,
      payment_fee_rate: economics.paymentFeeRate, fixed_order_fee: economics.fixedOrderFee,
      promotion_contribution_rate: economics.promotionContributionRate, logistics_subsidy: economics.logisticsSubsidy,
      economics_version_id: economics.id, margin_floor_pct: policy.marginFloorPct,
      minimum_contribution_amount: policy.minimumContributionAmount, contribution_amount: output.netMargin,
      margin_policy_version: policy.version, margin_policy_scope: policy.scope, margin_policy_channel: policy.channel,
      cost_observed_at: observedAt, cost_evidence_expires_at: expiresAt,
      decision_expires_at: new Date(Date.now() + PRICE_DECISION_TTL_MS).toISOString(),
      evidence_channel: event.source_platform, evidence_item_id: event.item_id ?? event.sku,
      evidence_currency: cost.currency, net_margin: output.netMargin, net_margin_pct: output.netMarginPct,
      floor_breached: output.floorBreached, recommended_price: output.recommendedPrice,
      decision_action: output.decisionAction,
    });
    if (decisionError) throw new Error(decisionError.message);
    created += 1;
  }
  return { created, waitingForEconomics };
}
