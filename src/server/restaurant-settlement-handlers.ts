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
import { runNormalizedReconciliationShadow } from "@/server/core/normalized-reconciliation-shadow";
import type { V1Context, V1Result } from "@/server/v1-handlers";
import { acceptEngineEvent } from "@/server/core/engine-orchestrator";
import { processEngineQueue } from "@/server/core/engine-orchestrator";
import { backgroundTask } from "@/server/cf-ctx";

type JsonObject = Record<string, unknown>;
type SettlementRecord = {
  external_event_id: string;
  settlement_reference: string;
  order_external_id: string | null;
  occurred_at: string;
  currency: string;
  settled_amount: number;
  gross_sales_amount: number | null;
  commission_amount: number | null;
  tax_on_fees_amount: number | null;
  other_fee_amount: number | null;
  adjustment_amount: number | null;
};
type ReceiptRecord = {
  external_event_id: string;
  bank_reference: string;
  settlement_reference: string;
  occurred_at: string;
  currency: string;
  received_amount: number;
};
export type RestaurantSettlementBatch = {
  batch_id: string;
  source_provider: string;
  channel: string;
  schema_version: "2026-09-05";
  delivery_complete: boolean;
  settlements: SettlementRecord[];
  receipts: ReceiptRecord[];
};

const clean = (value: unknown, max: number) =>
  typeof value === "string" ? value.trim().slice(0, max) : "";
const optional = (value: unknown, max: number) => clean(value, max) || null;
const currency = (value: unknown, label: string) => {
  const result = clean(value, 3).toUpperCase();
  if (!/^[A-Z]{3}$/.test(result)) throw new Error(`${label} must be an ISO currency code.`);
  return result;
};
const timestamp = (value: unknown, label: string) => {
  const result = clean(value, 50);
  if (!result || Number.isNaN(Date.parse(result))) throw new Error(`${label} must be a timestamp.`);
  return new Date(result).toISOString();
};
const amount = (value: unknown, label: string, nullable = false) => {
  if (nullable && value == null) return null;
  const result = Number(value);
  if (!Number.isFinite(result) || (!nullable && result < 0))
    throw new Error(`${label} must be a valid amount.`);
  return Math.round(result * 100) / 100;
};

export function prepareRestaurantSettlementBatch(input: unknown): RestaurantSettlementBatch {
  if (!input || typeof input !== "object" || Array.isArray(input))
    throw new Error("Request body must be a JSON object.");
  const body = input as JsonObject;
  const batchId = clean(body.batch_id, 180);
  const provider = clean(body.source_provider, 120).toLowerCase();
  const channel = clean(body.channel, 80).toLowerCase();
  if (!batchId || !provider || !channel)
    throw new Error("batch_id, source_provider, and channel are required.");
  if (body.schema_version !== "2026-09-05") throw new Error("schema_version must be 2026-09-05.");
  const rawSettlements = body.settlements ?? [];
  const rawReceipts = body.receipts ?? [];
  if (!Array.isArray(rawSettlements) || !Array.isArray(rawReceipts))
    throw new Error("settlements and receipts must be arrays.");
  if (
    rawSettlements.length + rawReceipts.length < 1 ||
    rawSettlements.length + rawReceipts.length > 5000
  )
    throw new Error("Provide between 1 and 5,000 settlement or receipt records.");
  const identities = new Set<string>();
  const uniqueIdentity = (value: unknown, label: string) => {
    const result = clean(value, 240);
    if (!result) throw new Error(`${label} is required.`);
    if (identities.has(result))
      throw new Error(`external_event_id ${result} is duplicated in this batch.`);
    identities.add(result);
    return result;
  };
  const settlements = rawSettlements.map((candidate, index): SettlementRecord => {
    if (!candidate || typeof candidate !== "object" || Array.isArray(candidate))
      throw new Error(`Settlement ${index + 1} is invalid.`);
    const row = candidate as JsonObject;
    const gross = amount(
      row.gross_sales_amount,
      `Settlement ${index + 1} gross_sales_amount`,
      true,
    );
    const commission = amount(
      row.commission_amount,
      `Settlement ${index + 1} commission_amount`,
      true,
    );
    const tax = amount(row.tax_on_fees_amount, `Settlement ${index + 1} tax_on_fees_amount`, true);
    const fees = amount(row.other_fee_amount, `Settlement ${index + 1} other_fee_amount`, true);
    const adjustment = amount(
      row.adjustment_amount,
      `Settlement ${index + 1} adjustment_amount`,
      true,
    );
    const settled = amount(row.settled_amount, `Settlement ${index + 1} settled_amount`)!;
    const components = [gross, commission, tax, fees, adjustment];
    if (components.every((value) => value != null)) {
      const computed = Math.round((gross! - commission! - tax! - fees! + adjustment!) * 100) / 100;
      if (Math.abs(computed - settled) > 0.01)
        throw new Error(`Settlement ${index + 1} amount does not reconcile with its components.`);
    }
    const reference = clean(row.settlement_reference, 240);
    if (!reference) throw new Error(`Settlement ${index + 1} requires settlement_reference.`);
    return {
      external_event_id: uniqueIdentity(
        row.external_event_id,
        `Settlement ${index + 1} external_event_id`,
      ),
      settlement_reference: reference,
      order_external_id: optional(row.order_external_id, 240),
      occurred_at: timestamp(row.occurred_at, `Settlement ${index + 1} occurred_at`),
      currency: currency(row.currency, `Settlement ${index + 1} currency`),
      settled_amount: settled,
      gross_sales_amount: gross,
      commission_amount: commission,
      tax_on_fees_amount: tax,
      other_fee_amount: fees,
      adjustment_amount: adjustment,
    };
  });
  const receipts = rawReceipts.map((candidate, index): ReceiptRecord => {
    if (!candidate || typeof candidate !== "object" || Array.isArray(candidate))
      throw new Error(`Receipt ${index + 1} is invalid.`);
    const row = candidate as JsonObject;
    const bankReference = clean(row.bank_reference, 240);
    const settlementReference = clean(row.settlement_reference, 240);
    if (!bankReference || !settlementReference)
      throw new Error(`Receipt ${index + 1} requires bank_reference and settlement_reference.`);
    return {
      external_event_id: uniqueIdentity(
        row.external_event_id,
        `Receipt ${index + 1} external_event_id`,
      ),
      bank_reference: bankReference,
      settlement_reference: settlementReference,
      occurred_at: timestamp(row.occurred_at, `Receipt ${index + 1} occurred_at`),
      currency: currency(row.currency, `Receipt ${index + 1} currency`),
      received_amount: amount(row.received_amount, `Receipt ${index + 1} received_amount`)!,
    };
  });
  return {
    batch_id: batchId,
    source_provider: provider,
    channel,
    schema_version: "2026-09-05",
    delivery_complete: body.delivery_complete === true,
    settlements,
    receipts,
  };
}

export async function handleRestaurantSettlementBatch(
  request: Request,
  ctx: V1Context,
): Promise<V1Result> {
  if (!ctx.scopes.includes("write") && !ctx.scopes.includes("admin"))
    return {
      status: 403,
      body: { error: { code: "forbidden", message: "This API key requires the write scope." } },
    };
  let batch: RestaurantSettlementBatch;
  try {
    batch = prepareRestaurantSettlementBatch(await request.json());
  } catch (error) {
    return {
      status: 422,
      body: {
        error: {
          code: "validation_failed",
          message: error instanceof Error ? error.message : "The settlement batch is invalid.",
        },
      },
    };
  }
  const bodyHash = createHash("sha256").update(JSON.stringify(batch)).digest("hex");
  const sourceExternalId = `api:${ctx.apiKeyId}:settlements:${batch.batch_id}`;
  const db = supabaseAdmin as any;
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
  if (prior && prior.content_sha256 !== bodyHash)
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
    documentKind: "settlement_report",
    contentSha256: bodyHash,
    mediaType: "application/json",
    sourceMetadata: {
      schema_version: batch.schema_version,
      channel: batch.channel,
      settlement_count: batch.settlements.length,
      receipt_count: batch.receipts.length,
      delivery_complete: batch.delivery_complete,
      data_minimized: true,
    },
  });
  if (intake.duplicate) {
    const {data:priorEvents,error:priorEventsError}=await db.from("ps_normalized_commerce_events").select("id").eq("account_id",ctx.accountId).eq("evidence_item_id",intake.evidenceItemId);
    if(priorEventsError)throw new Error(priorEventsError.message);
    await acceptEngineEvent({accountId:ctx.accountId,merchantId:ctx.accountId,eventType:"commerce.settlement_batch.accepted",source:batch.source_provider,sourceEventId:`settlements:${batch.batch_id}`,schemaVersion:batch.schema_version,payload:{evidence_item_id:intake.evidenceItemId,normalized_event_ids:(priorEvents??[]).map((row:any)=>row.id),delivery_complete:batch.delivery_complete},workKind:"reconcile_settlement_evidence",priority:35});
    backgroundTask(processEngineQueue(`settlement-replay:${crypto.randomUUID()}`,5));
    return {
      status: 200,
      body: {
        data: {
          batch_id: batch.batch_id,
          evidence_item_id: intake.evidenceItemId,
          duplicate: true,
          accepted: batch.settlements.length + batch.receipts.length,
        },
      },
    };
  }
  const eventBase = {
    account_id: ctx.accountId,
    merchant_id: ctx.accountId,
    evidence_item_id: intake.evidenceItemId,
    source_kind: "optional_api" as const,
    source_provider: batch.source_provider,
    channel: batch.channel,
    branch_external_id: null,
    discount_amount: null,
    tax_amount: null,
    normalization_version: `${NORMALIZED_COMMERCE_VERSION}:restaurant-settlement-api-v1`,
  };
  const events: NormalizedCommerceEvent[] = [
    ...batch.settlements.map((row) => {
      const base: Omit<NormalizedCommerceEvent, "event_fingerprint"> = {
        ...eventBase,
        external_event_id: row.external_event_id,
        event_kind: "settlement_line",
        order_external_id: row.order_external_id,
        settlement_reference: row.settlement_reference,
        occurred_at: row.occurred_at,
        currency: row.currency,
        gross_amount: row.gross_sales_amount,
        fee_amount:
          row.commission_amount == null ||
          row.tax_on_fees_amount == null ||
          row.other_fee_amount == null
            ? null
            : Math.round(
                (row.commission_amount + row.tax_on_fees_amount + row.other_fee_amount) * 100,
              ) / 100,
        net_amount: row.settled_amount,
        normalized_payload: {
          schema_version: batch.schema_version,
          commission_amount: row.commission_amount,
          tax_on_fees_amount: row.tax_on_fees_amount,
          other_fee_amount: row.other_fee_amount,
          adjustment_amount: row.adjustment_amount,
          allocated_to_order: Boolean(row.order_external_id),
        },
        evidence_strength: row.order_external_id && batch.delivery_complete ? "strong" : "partial",
        limitations: [
          ...(!row.order_external_id
            ? ["This settlement is not allocated to a specific order."]
            : []),
          ...(!batch.delivery_complete ? ["The source did not declare the batch complete."] : []),
        ],
      };
      return { ...base, event_fingerprint: evidenceFingerprint(base) };
    }),
    ...batch.receipts.map((row) => {
      const base: Omit<NormalizedCommerceEvent, "event_fingerprint"> = {
        ...eventBase,
        external_event_id: row.external_event_id,
        event_kind: "receipt_confirmation",
        order_external_id: null,
        settlement_reference: row.settlement_reference,
        occurred_at: row.occurred_at,
        currency: row.currency,
        gross_amount: null,
        fee_amount: null,
        net_amount: row.received_amount,
        normalized_payload: {
          schema_version: batch.schema_version,
          confirmation_reference: row.bank_reference,
        },
        evidence_strength: batch.delivery_complete ? "strong" : "partial",
        limitations: batch.delivery_complete
          ? []
          : ["The source did not declare the batch complete."],
      };
      return { ...base, event_fingerprint: evidenceFingerprint(base) };
    }),
  ];
  const { data, error } = await db
    .from("ps_normalized_commerce_events")
    .insert(events)
    .select("id");
  if (error) throw new Error(error.message);
  await appendEvidenceProcessingAttempt({
    evidenceItemId: intake.evidenceItemId,
    accountId: ctx.accountId,
    processorVersion: `${NORMALIZED_COMMERCE_VERSION}:restaurant-settlement-api-v1`,
    attemptNumber: 1,
    state: "normalized",
    detectedDocumentKind: "settlement_report",
    extractionSummary: {
      event_count: data?.length ?? 0,
      settlement_count: batch.settlements.length,
      receipt_count: batch.receipts.length,
    },
    limitations: batch.delivery_complete ? [] : ["The source did not declare the batch complete."],
  });
  await acceptEngineEvent({
    accountId: ctx.accountId, merchantId: ctx.accountId,
    eventType: "commerce.settlement_batch.accepted", source: batch.source_provider,
    sourceEventId: `settlements:${batch.batch_id}`, schemaVersion: batch.schema_version,
    payload: { evidence_item_id: intake.evidenceItemId, normalized_event_ids: (data ?? []).map((row:any) => row.id), delivery_complete: batch.delivery_complete },
    workKind: "reconcile_settlement_evidence", priority: 35,
  });
  backgroundTask(processEngineQueue(`settlement:${crypto.randomUUID()}`,5));
  return {
    status: 202,
    body: {
      data: {
        batch_id: batch.batch_id,
        evidence_item_id: intake.evidenceItemId,
        duplicate: false,
        settlements_created: batch.settlements.length,
        receipts_created: batch.receipts.length,
        events_created: data?.length ?? 0,
      },
    },
  };
}

export async function handleRestaurantReconciliationRun(
  request: Request,
  ctx: V1Context,
): Promise<V1Result> {
  if (!ctx.scopes.includes("write") && !ctx.scopes.includes("admin"))
    return {
      status: 403,
      body: { error: { code: "forbidden", message: "This API key requires the write scope." } },
    };
  let body: JsonObject;
  try {
    const raw = await request.json();
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new Error();
    body = raw as JsonObject;
  } catch {
    return {
      status: 422,
      body: { error: { code: "validation_failed", message: "Request body must be valid JSON." } },
    };
  }
  const evidenceItemId = clean(body.evidence_item_id, 36);
  const contractTermId = clean(body.contract_term_id, 36);
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!uuid.test(evidenceItemId) || !uuid.test(contractTermId))
    return {
      status: 422,
      body: {
        error: {
          code: "validation_failed",
          message: "evidence_item_id and contract_term_id must be UUIDs.",
        },
      },
    };
  const { data: evidence, error } = await (supabaseAdmin as any)
    .from("ps_merchant_evidence_items")
    .select("id")
    .eq("id", evidenceItemId)
    .eq("account_id", ctx.accountId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!evidence)
    return {
      status: 404,
      body: {
        error: { code: "not_found", message: "The evidence item was not found in this account." },
      },
    };
  const result = await runNormalizedReconciliationShadow({
    accountId: ctx.accountId,
    evidenceItemId,
    contractTermId,
    requireExplicitContract: true,
  });
  return {
    status: result.duplicate ? 200 : 201,
    body: {
      data: {
        run_id: result.runId,
        status: result.status,
        duplicate: result.duplicate,
        summary: result.summary,
      },
    },
  };
}
