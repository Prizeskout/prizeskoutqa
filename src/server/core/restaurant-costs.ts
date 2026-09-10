import { createHash } from "node:crypto";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { evidenceFingerprint } from "./merchant-evidence";
import {
  appendEvidenceProcessingAttempt,
  registerMerchantEvidence,
} from "./merchant-evidence-intake";
import type { V1Context, V1Result } from "@/server/v1-handlers";

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
  const hash = createHash("sha256").update(JSON.stringify(batch)).digest("hex"),
    sourceExternalId = `api:${ctx.apiKeyId}:costs:${batch.batch_id}`,
    db = supabaseAdmin as any;
  const { data: prior, error: priorError } = await db
    .from("ps_merchant_evidence_items")
    .select("id,content_sha256")
    .eq("account_id", ctx.accountId)
    .eq("source_kind", "optional_api")
    .eq("source_provider", batch.source_provider)
    .eq("source_external_id", sourceExternalId)
    .limit(1)
    .maybeSingle();
  if (priorError) throw new Error(priorError.message);
  if (prior && prior.content_sha256 !== hash)
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
  const intake = await registerMerchantEvidence({
    accountId: ctx.accountId,
    merchantId: ctx.accountId,
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
  if (intake.duplicate)
    return {
      status: 200,
      body: {
        data: {
          batch_id: batch.batch_id,
          evidence_item_id: intake.evidenceItemId,
          duplicate: true,
          accepted: batch.costs.length,
        },
      },
    };
  const rows = batch.costs.map((cost) => {
    const base = {
      account_id: ctx.accountId,
      evidence_item_id: intake.evidenceItemId,
      source_provider: batch.source_provider,
      ...cost,
    };
    return { ...base, event_fingerprint: evidenceFingerprint(base) };
  });
  const { data, error } = await db.from("ps_product_cost_evidence").insert(rows).select("id");
  if (error) throw new Error(error.message);
  await appendEvidenceProcessingAttempt({
    evidenceItemId: intake.evidenceItemId,
    accountId: ctx.accountId,
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
    status: 202,
    body: {
      data: {
        batch_id: batch.batch_id,
        evidence_item_id: intake.evidenceItemId,
        duplicate: false,
        accepted: batch.costs.length,
        costs_created: data?.length ?? 0,
      },
    },
  };
}
