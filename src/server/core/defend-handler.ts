// =============================================================================
// Defend — Outbound Reprice Dispatch with Circuit Breaker
//
// Aggregator targets: Talabat, Jahez, Snoonu, Deliveroo
//
// Circuit breaker states:
//   Closed   → normal; trip to Open if error_count > 15% in 30s window
//   Open     → fail fast; probe after next_probe_at
//   HalfOpen → single probe; restore to Closed on success, re-Open on failure
//
// Called by ingest-handler when floor is breached, or directly via
//   POST /v1/defend/dispatch
//   GET  /v1/defend/circuit-breaker
// =============================================================================

import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { type V1Context, type V1Result } from "@/server/v1-handlers";
import { writeAuditLog, dispatchSummary } from "./govern";
import { CIRCUIT_OPEN_BACKOFF_SECONDS } from "./decide-engine";
import { pushPriceToSourcePlatform } from "./platform-sync";

const SOURCE_PLATFORMS = ["salla", "foodics", "zid"] as const;

const VALID_CHANNELS = ["talabat", "jahez", "snoonu", "deliveroo"] as const;
type DispatchChannel = (typeof VALID_CHANNELS)[number];

const OPEN_ERROR_THRESHOLD = 5;
const OPEN_WINDOW_SECONDS = 30;
const PROBE_BACKOFF_SECONDS = CIRCUIT_OPEN_BACKOFF_SECONDS;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export type DispatchToAggregatorsParams = {
  ingestEventId: string;
  decideResultId: string;
  accountId: string;
  licenseeId: string;
  merchantId: string;
  sku: string;
  locationId?: string;
  region: string;
  oldPrice: number;
  newPrice: number;
  currency: string;
  auditSnapshot: Record<string, unknown>;
};

export type ChannelDispatchResult = {
  channel: DispatchChannel;
  status: string;
  http_status?: number;
  duration_ms?: number;
  error?: string;
  dispatch_id?: string;
};

export type DispatchToAggregatorsResult = {
  channels_attempted: number;
  results: ChannelDispatchResult[];
  source_platform_updates?: Array<{ platform: string; success: boolean; http_status?: number }>;
};

// ---------------------------------------------------------------------------
// Circuit breaker read
// ---------------------------------------------------------------------------
async function getCircuitBreakerState(accountId: string, channel: string) {
  const { data } = await supabaseAdmin
    .from("ps_circuit_breaker_state")
    .select("*")
    .eq("account_id", accountId)
    .eq("target_channel", channel)
    .maybeSingle();
  return data;
}

async function recordDispatchError(accountId: string, channel: string): Promise<void> {
  const now = new Date();
  const windowStart = new Date(now.getTime() - OPEN_WINDOW_SECONDS * 1000);

  const existing = await getCircuitBreakerState(accountId, channel);
  let newErrorCount = (existing?.error_count ?? 0) + 1;

  // Reset window if last error is outside window
  if (existing?.last_error_at && new Date(existing.last_error_at) < windowStart) {
    newErrorCount = 1;
  }

  const shouldOpen = newErrorCount >= OPEN_ERROR_THRESHOLD;
  const nextProbeAt = shouldOpen
    ? new Date(now.getTime() + PROBE_BACKOFF_SECONDS * 1000).toISOString()
    : null;

  await supabaseAdmin.from("ps_circuit_breaker_state").upsert(
    {
      account_id: accountId,
      target_channel: channel,
      state: shouldOpen ? "open" : (existing?.state ?? "closed"),
      error_count: newErrorCount,
      last_error_at: now.toISOString(),
      opened_at: shouldOpen ? now.toISOString() : (existing?.opened_at ?? null),
      next_probe_at: nextProbeAt,
      updated_at: now.toISOString(),
    },
    { onConflict: "account_id,target_channel" },
  );
}

async function recordDispatchSuccess(accountId: string, channel: string): Promise<void> {
  await supabaseAdmin.from("ps_circuit_breaker_state").upsert(
    {
      account_id: accountId,
      target_channel: channel,
      state: "closed",
      error_count: 0,
      last_error_at: null,
      opened_at: null,
      next_probe_at: null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "account_id,target_channel" },
  );
}

// ---------------------------------------------------------------------------
// Real aggregator call (per-platform logic)
// ---------------------------------------------------------------------------
type ChannelCreds = { bearer_token?: string | null; manager_token?: string | null };

async function getChannelCreds(accountId: string, merchantId: string, channel: string): Promise<ChannelCreds | null> {
  const { data } = await supabaseAdmin
    .from("ps_merchant_channels")
    .select("bearer_token, manager_token, status")
    .eq("account_id", accountId)
    .eq("merchant_id", merchantId)
    .eq("platform", channel)
    .eq("status", "connected")
    .maybeSingle();
  return data ?? null;
}

async function callAggregatorApi(
  channel: DispatchChannel,
  creds: ChannelCreds,
  sku: string,
  locationId: string | undefined,
  newPrice: number,
  currency: string,
): Promise<{ success: boolean; httpStatus: number; message?: string; durationMs: number }> {
  const start = Date.now();

  // Build request per platform spec
  let url = "";
  let body: Record<string, unknown> = {};
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
  };

  if (channel === "talabat") {
    // Talabat: PATCH /menu/items/{sku}/price
    url = `https://api.talabat.com/merchant/v1/menu/items/${encodeURIComponent(sku)}/price`;
    headers["Authorization"] = `Bearer ${creds.bearer_token ?? ""}`;
    body = { price: newPrice, currency };
  } else if (channel === "jahez") {
    // Jahez: POST /branch/{locationId}/items/update
    url = `https://merchant-api.jahez.net/v2/branch/${locationId ?? "default"}/items/update`;
    headers["Authorization"] = `Bearer ${creds.bearer_token ?? ""}`;
    body = { item_code: sku, new_price: newPrice, currency };
  } else if (channel === "snoonu") {
    // Snoonu: PATCH /v1/menu-items/{sku}
    url = `https://partner-api.snoonu.com/v1/menu-items/${encodeURIComponent(sku)}`;
    headers["Authorization"] = `Bearer ${creds.bearer_token ?? ""}`;
    body = { price: newPrice, currency };
  } else if (channel === "deliveroo") {
    // Deliveroo: PATCH /v1/sites/{locationId}/menu/items/{sku}/price
    url = `https://api.developers.deliveroo.com/v1/sites/${locationId ?? "default"}/menu/items/${encodeURIComponent(sku)}/price`;
    headers["Authorization"] = `Bearer ${creds.bearer_token ?? ""}`;
    body = { price: newPrice };
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const resp = await fetch(url, {
      method: channel === "talabat" || channel === "snoonu" || channel === "deliveroo" ? "PATCH" : "POST",
      headers,
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    const durationMs = Date.now() - start;
    if (resp.ok) {
      return { success: true, httpStatus: resp.status, durationMs };
    }
    const text = await resp.text().catch(() => "");
    return { success: false, httpStatus: resp.status, message: text.slice(0, 400), durationMs };
  } catch (e) {
    const durationMs = Date.now() - start;
    const isTimeout = (e instanceof Error && e.name === "AbortError") || durationMs >= 7900;
    return {
      success: false,
      httpStatus: isTimeout ? 504 : 500,
      message: isTimeout ? "ERR_TARGET_TIMEOUT" : String(e),
      durationMs,
    };
  }
}

// ---------------------------------------------------------------------------
// Core dispatch orchestrator
// ---------------------------------------------------------------------------
export async function dispatchToAggregators(
  params: DispatchToAggregatorsParams,
): Promise<DispatchToAggregatorsResult> {
  const {
    ingestEventId, decideResultId, accountId, licenseeId,
    merchantId, sku, locationId, region,
    oldPrice, newPrice, currency, auditSnapshot,
  } = params;

  // Find which channels this merchant has connected
  const { data: channels } = await supabaseAdmin
    .from("ps_merchant_channels")
    .select("platform, bearer_token, manager_token")
    .eq("account_id", accountId)
    .eq("merchant_id", merchantId)
    .eq("status", "connected")
    .in("platform", VALID_CHANNELS as unknown as string[]);

  if (!channels || channels.length === 0) {
    return { channels_attempted: 0, results: [] };
  }

  const results: ChannelDispatchResult[] = [];

  for (const ch of channels) {
    const channel = ch.platform as DispatchChannel;
    const breaker = await getCircuitBreakerState(accountId, channel);

    // ------------------------------------------------------------------
    // Circuit breaker check
    // ------------------------------------------------------------------
    if (breaker?.state === "open") {
      const now = new Date();
      const probeAt = breaker.next_probe_at ? new Date(breaker.next_probe_at) : null;

      if (probeAt && now < probeAt) {
        // Log circuit_open dispatch
        await supabaseAdmin.from("ps_aggregator_dispatch_log").insert({
          ingest_event_id: ingestEventId,
          decide_result_id: decideResultId,
          account_id: accountId,
          licensee_id: licenseeId,
          merchant_id: merchantId,
          sku,
          target_channel: channel,
          old_price: oldPrice,
          new_price: newPrice,
          currency,
          audit_snapshot: auditSnapshot,
          status: "circuit_open",
          upstream_message: "ERR_AGGREGATOR_CIRCUIT_OPEN",
          duration_ms: 0,
        });

        results.push({
          channel,
          status: "circuit_open",
          error: "ERR_AGGREGATOR_CIRCUIT_OPEN",
          dispatch_id: undefined,
        });
        continue;
      }

      // Probe allowed: transition to half_open
      await supabaseAdmin.from("ps_circuit_breaker_state").upsert(
        {
          account_id: accountId,
          target_channel: channel,
          state: "half_open",
          error_count: breaker.error_count,
          last_error_at: breaker.last_error_at,
          opened_at: breaker.opened_at,
          next_probe_at: null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "account_id,target_channel" },
      );
    }

    // ------------------------------------------------------------------
    // Attempt dispatch
    // ------------------------------------------------------------------
    const creds = { bearer_token: ch.bearer_token, manager_token: ch.manager_token };
    const callResult = await callAggregatorApi(channel, creds, sku, locationId, newPrice, currency);

    let dispatchStatus: string;
    if (callResult.success) {
      dispatchStatus = "success";
    } else if (callResult.httpStatus === 429) {
      dispatchStatus = "rate_limited";
    } else if (callResult.httpStatus === 504) {
      dispatchStatus = "timeout";
    } else if (callResult.httpStatus === 422) {
      dispatchStatus = "schema_mismatch";
    } else {
      dispatchStatus = "failed";
    }

    const retryable = ["rate_limited", "timeout"].includes(dispatchStatus);
    const nextRetryAt = retryable
      ? new Date(Date.now() + 60_000).toISOString()
      : null;

    const { data: dispatchRow } = await supabaseAdmin
      .from("ps_aggregator_dispatch_log")
      .insert({
        ingest_event_id: ingestEventId,
        decide_result_id: decideResultId,
        account_id: accountId,
        licensee_id: licenseeId,
        merchant_id: merchantId,
        sku,
        target_channel: channel,
        old_price: oldPrice,
        new_price: newPrice,
        currency,
        audit_snapshot: auditSnapshot,
        status: dispatchStatus,
        http_status: callResult.httpStatus,
        upstream_message: callResult.message ?? null,
        duration_ms: callResult.durationMs,
        retry_count: 0,
        max_retries: 5,
        next_retry_at: nextRetryAt,
        completed_at: callResult.success ? new Date().toISOString() : null,
      })
      .select("id")
      .single();

    // Update circuit breaker
    if (callResult.success) {
      await recordDispatchSuccess(accountId, channel);
    } else if (["rate_limited", "timeout", "failed", "schema_mismatch"].includes(dispatchStatus)) {
      await recordDispatchError(accountId, channel);
    }

    // Govern audit entry for dispatch
    const summaries = dispatchSummary(
      channel, sku, oldPrice, newPrice, currency,
      callResult.success, callResult.durationMs,
    );
    await writeAuditLog({
      accountId,
      licenseeId,
      merchantId,
      sku,
      region,
      eventType: "dispatch",
      targetChannel: channel,
      ingestEventId,
      dispatchId: dispatchRow?.id,
      dataRoute: region,
      payload: {
        channel,
        sku,
        old_price: oldPrice,
        new_price: newPrice,
        currency,
        http_status: callResult.httpStatus,
        duration_ms: callResult.durationMs,
        audit_snapshot: auditSnapshot,
      },
      summaryEn: summaries.en,
      summaryAr: summaries.ar,
    });

    results.push({
      channel,
      status: dispatchStatus,
      http_status: callResult.httpStatus,
      duration_ms: callResult.durationMs,
      ...(callResult.message ? { error: callResult.message } : {}),
      dispatch_id: dispatchRow?.id,
    });
  }

  // ------------------------------------------------------------------
  // Push price back to the source platform (Salla / Foodics / Zid)
  // so the merchant's own store/POS reflects the new price.
  // We look up the original ingest event to find the external item ID.
  // ------------------------------------------------------------------
  const anySuccess = results.some((r) => r.status === "success");
  const sourcePushResults: Array<{ platform: string; success: boolean; http_status?: number }> = [];

  if (anySuccess && ingestEventId && ingestEventId !== "") {
    const { data: ingestEvent } = await supabaseAdmin
      .from("ps_ingest_events")
      .select("source_platform, item_id")
      .eq("id", ingestEventId)
      .maybeSingle();

    if (ingestEvent && (SOURCE_PLATFORMS as readonly string[]).includes(ingestEvent.source_platform)) {
      const { data: channelCreds } = await supabaseAdmin
        .from("ps_merchant_channels")
        .select("bearer_token, manager_token")
        .eq("account_id", accountId)
        .eq("merchant_id", merchantId)
        .eq("platform", ingestEvent.source_platform)
        .eq("status", "connected")
        .maybeSingle();

      if (channelCreds && ingestEvent.item_id && channelCreds.bearer_token) {
        const pushResult = await pushPriceToSourcePlatform(
          ingestEvent.source_platform,
          {
            bearer_token: channelCreds.bearer_token,
            manager_token: channelCreds.manager_token,
          },
          ingestEvent.item_id,
          newPrice,
          currency,
        );
        sourcePushResults.push({
          platform: ingestEvent.source_platform,
          success: pushResult.success,
          http_status: pushResult.httpStatus,
        });
      }
    }
  }

  return {
    channels_attempted: channels.length,
    results,
    ...(sourcePushResults.length > 0 ? { source_platform_updates: sourcePushResults } : {}),
  };
}

// ---------------------------------------------------------------------------
// Route handlers
// ---------------------------------------------------------------------------
function err(code: string, message: string, status: number, extra?: Record<string, unknown>): V1Result {
  return { status, body: { error: { code, message, ...extra } } };
}

function ok(body: unknown, status = 200): V1Result {
  return { status, body };
}

// POST /v1/defend/dispatch — manual reprice dispatch
export async function handleDefendDispatch(request: Request, ctx: V1Context): Promise<V1Result> {
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return err("validation_failed", "Request body must be valid JSON.", 422);
  }

  const { merchant_id, sku, location_id, region, old_price, new_price, currency } = body;

  if (!merchant_id || typeof merchant_id !== "string") return err("validation_failed", "`merchant_id` is required.", 422);
  if (!sku || typeof sku !== "string") return err("validation_failed", "`sku` is required.", 422);
  if (typeof new_price !== "number" || new_price <= 0) return err("validation_failed", "`new_price` must be a positive number.", 422);

  const result = await dispatchToAggregators({
    ingestEventId: "",
    decideResultId: "",
    accountId: ctx.accountId,
    licenseeId: ctx.licenseeId,
    merchantId: merchant_id as string,
    sku: sku as string,
    locationId: location_id as string | undefined,
    region: (region as string) ?? "QA",
    oldPrice: (typeof old_price === "number" ? old_price : 0),
    newPrice: new_price as number,
    currency: (currency as string) ?? "QAR",
    auditSnapshot: { manual_dispatch: true, requested_by: ctx.userId },
  });

  return ok({ dispatch: result });
}

// GET /v1/defend/circuit-breaker — read circuit breaker state across channels
export async function handleGetCircuitBreaker(_request: Request, ctx: V1Context): Promise<V1Result> {
  const { data, error } = await supabaseAdmin
    .from("ps_circuit_breaker_state")
    .select("target_channel, state, error_count, last_error_at, opened_at, next_probe_at, updated_at")
    .eq("account_id", ctx.accountId)
    .order("updated_at", { ascending: false });

  if (error) return err("internal_error", "Failed to read circuit breaker state.", 500);

  const all: Record<string, unknown> = {};
  for (const channel of VALID_CHANNELS) {
    const row = data?.find((r) => r.target_channel === channel);
    all[channel] = row
      ? {
          state: row.state,
          error_count: row.error_count,
          last_error_at: row.last_error_at,
          opened_at: row.opened_at,
          next_probe_at: row.next_probe_at,
          updated_at: row.updated_at,
        }
      : { state: "closed", error_count: 0 };
  }

  return ok({ circuit_breakers: all });
}
