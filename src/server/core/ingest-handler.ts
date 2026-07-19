// =============================================================================
// POST /v1/sync/ingest — GCC Real-Time Inbound Webhook Receiver
//
// Receives events from Salla, Foodics, Zid, or SAP. Validates the GCC payload
// schema, runs the Decide engine (net margin vs floor), writes the Govern audit
// log, and if the margin floor is breached triggers the Defend dispatch inline.
//
// Headers required:
//   Authorization: Bearer ps_live_...   (handled by dispatcher)
//   X-Idempotency-Key: uuid-v4          (prevents duplicate processing)
//   X-Region: QA | SA | AE | KW | BH | OM
// =============================================================================

import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { type V1Context, type V1Result } from "@/server/v1-handlers";
import { decide, VALID_REGIONS } from "./decide-engine";
import { writeAuditLog, ingestSummary } from "./govern";
import { dispatchToAggregators } from "./defend-handler";
import { getMerchantMarginFloor } from "./merchant-pricing-config";

const VALID_PLATFORMS = ["foodics", "salla", "zid", "sap", "microsoft"] as const;

type IngestPayload = {
  event_id: string;
  timestamp: string;
  merchant_id: string;
  location_id?: string;
  source_platform: string;
  data: {
    item_id?: string;
    sku: string;
    item_name_en?: string;
    item_name_ar?: string;
    inventory_status?: string;
    financials: {
      base_cost: number;
      current_retail_price: number;
      currency?: string;
      vat_rate?: number;
    };
  };
};

function err(code: string, message: string, status: number, extra?: Record<string, unknown>): V1Result {
  return { status, body: { error: { code, message, ...extra } } };
}

function ok(body: unknown, status = 200): V1Result {
  return { status, body };
}

export async function handleSyncIngest(request: Request, ctx: V1Context): Promise<V1Result> {
  // ------------------------------------------------------------------
  // 1. Header validation
  // ------------------------------------------------------------------
  const idempotencyKey = request.headers.get("x-idempotency-key")?.trim();
  if (!idempotencyKey) {
    return err(
      "missing_idempotency_key",
      "X-Idempotency-Key header is required. Generate a UUID v4 per logical event to prevent duplicate processing.",
      400,
    );
  }
  if (idempotencyKey.length > 200) {
    return err("invalid_idempotency_key", "X-Idempotency-Key must be 200 characters or fewer.", 400);
  }

  const region = request.headers.get("x-region")?.trim().toUpperCase();
  if (!region || !VALID_REGIONS.includes(region)) {
    return err(
      "missing_region",
      `X-Region header is required. Acceptable values: ${VALID_REGIONS.join(", ")}.`,
      400,
      { valid_regions: VALID_REGIONS },
    );
  }

  // ------------------------------------------------------------------
  // 2. Idempotency replay check
  // ------------------------------------------------------------------
  const { data: cached } = await supabaseAdmin
    .from("ps_ingest_events")
    .select("id, status, raw_payload")
    .eq("account_id", ctx.accountId)
    .eq("idempotency_key", idempotencyKey)
    .maybeSingle();

  if (cached) {
    const { data: decidedRow } = await supabaseAdmin
      .from("ps_decide_results")
      .select("*")
      .eq("ingest_event_id", cached.id)
      .maybeSingle();

    return ok(
      {
        idempotency_replay: true,
        ingest_event_id: cached.id,
        status: cached.status,
        decide: decidedRow
          ? {
              net_margin: decidedRow.net_margin,
              net_margin_pct: decidedRow.net_margin_pct,
              floor_pct: decidedRow.margin_floor_pct,
              floor_breached: decidedRow.floor_breached,
              decision_action: decidedRow.decision_action,
              recommended_price: decidedRow.recommended_price,
            }
          : null,
      },
      200,
    );
  }

  // ------------------------------------------------------------------
  // 3. Parse and validate body
  // ------------------------------------------------------------------
  let raw: string;
  try {
    raw = await request.text();
  } catch {
    return err("read_error", "Could not read request body.", 400);
  }

  let body: IngestPayload;
  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) throw new Error();
    body = parsed as IngestPayload;
  } catch {
    return err("validation_failed", "Request body must be a valid JSON object.", 422);
  }

  // Required top-level fields
  if (!body.event_id || typeof body.event_id !== "string") {
    return err("validation_failed", "`event_id` is required.", 422, { field: "event_id" });
  }
  if (!body.merchant_id || typeof body.merchant_id !== "string") {
    return err("validation_failed", "`merchant_id` is required.", 422, { field: "merchant_id" });
  }
  if (!body.source_platform || !VALID_PLATFORMS.includes(body.source_platform as never)) {
    return err(
      "validation_failed",
      `\`source_platform\` must be one of: ${VALID_PLATFORMS.join(", ")}.`,
      422,
      { field: "source_platform", valid_values: VALID_PLATFORMS },
    );
  }
  if (!body.data || typeof body.data !== "object") {
    return err("validation_failed", "`data` object is required.", 422, { field: "data" });
  }
  if (!body.data.sku || typeof body.data.sku !== "string") {
    return err("validation_failed", "`data.sku` is required.", 422, { field: "data.sku" });
  }
  if (!body.data.financials || typeof body.data.financials !== "object") {
    return err("validation_failed", "`data.financials` object is required.", 422, { field: "data.financials" });
  }

  const fin = body.data.financials;
  if (typeof fin.base_cost !== "number" || fin.base_cost < 0) {
    return err("validation_failed", "`data.financials.base_cost` must be a non-negative number.", 422, { field: "data.financials.base_cost" });
  }
  if (typeof fin.current_retail_price !== "number" || fin.current_retail_price <= 0) {
    return err("validation_failed", "`data.financials.current_retail_price` must be a positive number.", 422, { field: "data.financials.current_retail_price" });
  }

  const currency = fin.currency ?? "QAR";
  const vatRate = typeof fin.vat_rate === "number" ? fin.vat_rate : undefined;

  // ------------------------------------------------------------------
  // 4. Persist ingest event
  // ------------------------------------------------------------------
  const { data: ingestRow, error: insertErr } = await supabaseAdmin
    .from("ps_ingest_events")
    .insert({
      account_id: ctx.accountId,
      licensee_id: ctx.licenseeId,
      api_key_id: ctx.apiKeyId,
      event_id: body.event_id,
      idempotency_key: idempotencyKey,
      region,
      source_platform: body.source_platform,
      merchant_id: body.merchant_id,
      location_id: body.location_id ?? null,
      item_id: body.data.item_id ?? null,
      sku: body.data.sku,
      item_name_en: body.data.item_name_en ?? null,
      item_name_ar: body.data.item_name_ar ?? null,
      inventory_status: body.data.inventory_status ?? "in_stock",
      base_cost: fin.base_cost,
      current_retail_price: fin.current_retail_price,
      currency,
      vat_rate: vatRate ?? 0,
      raw_payload: JSON.parse(raw) as Record<string, unknown>,
      status: "received",
    })
    .select("id")
    .single();

  if (insertErr || !ingestRow) {
    return err("internal_error", "Failed to persist ingest event.", 500);
  }
  const ingestEventId: string = ingestRow.id;

  // ------------------------------------------------------------------
  // 5. Decide — run margin engine
  // ------------------------------------------------------------------
  const marginFloorPct = await getMerchantMarginFloor(ctx.accountId);
  const decideOutput = decide({
    region,
    baseCost: fin.base_cost,
    currentRetailPrice: fin.current_retail_price,
    vatRate,
    marginFloorPct,
  });

  const { data: decideRow } = await supabaseAdmin
    .from("ps_decide_results")
    .insert({
      ingest_event_id: ingestEventId,
      account_id: ctx.accountId,
      licensee_id: ctx.licenseeId,
      region,
      merchant_id: body.merchant_id,
      sku: body.data.sku,
      base_cost: fin.base_cost,
      current_retail_price: fin.current_retail_price,
      commission_rate: decideOutput.commissionRate,
      vat_rate: decideOutput.vatRate,
      logistics_subsidy: decideOutput.logisticsSubsidy,
      margin_floor_pct: decideOutput.marginFloorPct,
      net_margin: decideOutput.netMargin,
      net_margin_pct: decideOutput.netMarginPct,
      floor_breached: decideOutput.floorBreached,
      recommended_price: decideOutput.recommendedPrice,
      decision_action: decideOutput.decisionAction,
    })
    .select("id")
    .single();

  await supabaseAdmin
    .from("ps_ingest_events")
    .update({ status: "decided" })
    .eq("id", ingestEventId);

  // ------------------------------------------------------------------
  // 6. Govern — write bilingual audit entry
  // ------------------------------------------------------------------
  const summaries = ingestSummary(
    body.source_platform, body.data.sku, region,
    decideOutput.netMarginPct, decideOutput.marginFloorPct,
    decideOutput.floorBreached,
  );

  const traceId = await writeAuditLog({
    accountId: ctx.accountId,
    licenseeId: ctx.licenseeId,
    merchantId: body.merchant_id,
    sku: body.data.sku,
    region,
    eventType: "ingest",
    sourcePlatform: body.source_platform,
    ingestEventId,
    dataRoute: region,
    payload: {
      event_id: body.event_id,
      merchant_id: body.merchant_id,
      sku: body.data.sku,
      region,
      source_platform: body.source_platform,
      financials: fin,
      decide: decideOutput,
    },
    summaryEn: summaries.en,
    summaryAr: summaries.ar,
  });

  // ------------------------------------------------------------------
  // 7. Defend — trigger async dispatch if floor is breached
  // ------------------------------------------------------------------
  let dispatchTriggered = false;
  let dispatchResult: Awaited<ReturnType<typeof dispatchToAggregators>> | null = null;

  if (decideOutput.floorBreached && decideOutput.recommendedPrice !== null && decideRow) {
    dispatchTriggered = true;
    dispatchResult = await dispatchToAggregators({
      ingestEventId,
      decideResultId: decideRow.id,
      accountId: ctx.accountId,
      licenseeId: ctx.licenseeId,
      merchantId: body.merchant_id,
      sku: body.data.sku,
      locationId: body.location_id,
      region,
      oldPrice: fin.current_retail_price,
      newPrice: decideOutput.recommendedPrice,
      currency,
      auditSnapshot: {
        ingested_base_cost: fin.base_cost,
        platform_commission_applied: decideOutput.commissionRate,
        logistics_subsidy_offset: decideOutput.logisticsSubsidy,
        guaranteed_net_margin_floor: decideOutput.marginFloorPct,
        net_margin_pct: decideOutput.netMarginPct,
        decision_action: decideOutput.decisionAction,
      },
    });

    await supabaseAdmin
      .from("ps_ingest_events")
      .update({ status: "dispatched" })
      .eq("id", ingestEventId);
  }

  // ------------------------------------------------------------------
  // 8. Response
  // ------------------------------------------------------------------
  return ok({
    ingest_event_id: ingestEventId,
    trace_id: traceId,
    received_at: new Date().toISOString(),
    idempotency_replay: false,
    region,
    source_platform: body.source_platform,
    merchant_id: body.merchant_id,
    sku: body.data.sku,
    decide: {
      commission_rate: decideOutput.commissionRate,
      vat_rate: decideOutput.vatRate,
      net_margin: decideOutput.netMargin,
      net_margin_pct: decideOutput.netMarginPct,
      floor_pct: decideOutput.marginFloorPct,
      floor_breached: decideOutput.floorBreached,
      decision_action: decideOutput.decisionAction,
      recommended_price: decideOutput.recommendedPrice,
    },
    dispatch_triggered: dispatchTriggered,
    ...(dispatchResult ? { dispatch: dispatchResult } : {}),
  });
}
