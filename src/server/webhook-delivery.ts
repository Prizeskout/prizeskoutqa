// ============================================================================
// Webhook delivery worker (Week 5)
// ----------------------------------------------------------------------------
// Centralizes outbound webhook delivery so every emitter (`/v1/sync`,
// `/v1/dynprice`, `/v1/webhooks/enrich`, the pricing-engine cron, future
// emitters) goes through a single signed-POST primitive with consistent
// headers, retry scheduling, and audit logging.
//
// Delivery model:
//   1. `enqueueWebhookEvent` resolves all enabled endpoints for the user that
//      subscribe to the event (literal, prefix `enrich.*`, or wildcard `*`).
//   2. For each endpoint we attempt one synchronous POST. On success we log
//      and return. On failure we log with `next_retry_at` set to
//      `now() + backoff_seconds * 2^(attempt-1)` so the retry cron can pick
//      it up later.
//   3. `processWebhookRetryQueue` (called by the public `/api/public/hooks/
//      webhook-retry` endpoint or cron) finds deliveries whose `next_retry_at`
//      is due and replays them, incrementing `attempt`. Once `attempt`
//      reaches `max_attempts` we stop scheduling and surface the final error.
//
// Signing (v1): HMAC-SHA-256 over `${timestamp}.${rawBody}` with the
// endpoint's `signing_secret`. We send the signature as Stripe-style
// `X-Webhook-Signature: t=<unix_ts>,v1=<hex>` so receivers can verify
// the payload AND reject replays older than ~5 minutes. The legacy
// `sha256=<hex>` (body-only) signature is also included as a second
// comma-separated value for backward compatibility with Week 5 receivers.
//
// All writes use the admin client because deliveries are server-internal
// and need to bypass RLS (the originating user_id may not be the caller).
// ============================================================================

import { createHmac } from "crypto";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { safePublicFetch } from "@/server/safe-outbound-url";
import { createNotification } from "./notifications";
import { backgroundTask } from "./cf-ctx";

export type WebhookEvent = {
  /** Owner of the endpoint set we should deliver to. */
  userId: string;
  /** Event type identifier (e.g. "catalog.synced", "recommendation.ready"). */
  eventType: string;
  /** Free-form JSON payload — wrapped inside the canonical envelope. */
  payload: Record<string, unknown>;
  /** Optional event ID; auto-generated if not supplied. */
  eventId?: string;
};

export type DeliveryAttemptResult = {
  endpointId: string;
  success: boolean;
  status: number | null;
  error: string | null;
  attempt: number;
  willRetry: boolean;
};

const REQUEST_TIMEOUT_MS = 8000;
const PREVIEW_LIMIT = 500;

function newEventId(): string {
  return `evt_${Math.random().toString(36).slice(2, 14)}`;
}

function buildBody(event: { id: string; type: string; sentAt: string; data: unknown }): string {
  return JSON.stringify({
    id: event.id,
    type: event.type,
    sent_at: event.sentAt,
    data: event.data,
  });
}

function eventMatches(subscribed: unknown, eventType: string): boolean {
  if (!Array.isArray(subscribed)) return false;
  for (const raw of subscribed) {
    if (typeof raw !== "string") continue;
    if (raw === "*" || raw === eventType) return true;
    // Prefix match: "enrich.*" matches "enrich.price_changed".
    if (raw.endsWith(".*")) {
      const prefix = raw.slice(0, -2);
      if (eventType.startsWith(prefix + ".")) return true;
    }
  }
  return false;
}

/**
 * Compute exponential backoff: backoff_seconds * 2^(attempt-1).
 * Capped at 24 hours so we don't schedule a retry months in the future.
 */
function nextRetryAt(backoffSeconds: number, attempt: number): string {
  const base = Math.max(1, Math.floor(backoffSeconds || 30));
  const seconds = Math.min(base * Math.pow(2, attempt - 1), 24 * 60 * 60);
  return new Date(Date.now() + seconds * 1000).toISOString();
}

/**
 * Build a Stripe-style `t=<ts>,v1=<hex>,sha256=<hex>` signature header.
 * - `t` is the unix timestamp the signature was generated at.
 * - `v1` is HMAC-SHA-256 over `${t}.${body}` (replay-safe).
 * - `sha256` is HMAC-SHA-256 over `${body}` only (Week-5 compatibility).
 */
function buildSignatureHeader(secret: string, body: string): { header: string; timestamp: string } {
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const v1 = createHmac("sha256", secret).update(`${timestamp}.${body}`).digest("hex");
  const legacy = createHmac("sha256", secret).update(body).digest("hex");
  return { header: `t=${timestamp},v1=${v1},sha256=${legacy}`, timestamp };
}

async function postOnce(
  url: string,
  body: string,
  headers: Record<string, string>,
): Promise<{ status: number | null; ok: boolean; responseText: string | null; error: string | null }> {
  try {
    const res = await safePublicFetch(url, {
      method: "POST",
      headers,
      body,
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    const responseText = (await res.text()).slice(0, PREVIEW_LIMIT);
    return { status: res.status, ok: res.ok, responseText, error: res.ok ? null : `HTTP ${res.status}` };
  } catch (e) {
    const error = e instanceof Error ? e.message : "delivery failed";
    return { status: null, ok: false, responseText: null, error };
  }
}

/**
 * Fire a webhook event to every subscribed endpoint for a user.
 * Returns per-endpoint attempt results. Never throws — failures land in
 * `webhook_deliveries` with `next_retry_at` set for later retry.
 *
 * Async-safe: callers can `void enqueueWebhookEvent(...)` from request
 * handlers to avoid blocking the API response on outbound network calls.
 */
export async function enqueueWebhookEvent(event: WebhookEvent): Promise<{
  eventId: string;
  attempted: number;
  delivered: number;
  results: DeliveryAttemptResult[];
}> {
  const eventId = event.eventId ?? newEventId();
  const sentAt = new Date().toISOString();
  const body = buildBody({ id: eventId, type: event.eventType, sentAt, data: event.payload });

  const { data: endpoints, error } = await supabaseAdmin
    .from("webhook_endpoints")
    .select("id, url, signing_secret, events, max_attempts, backoff_seconds")
    .eq("user_id", event.userId)
    .eq("enabled", true);

  if (error) {
    console.error("enqueueWebhookEvent: endpoint lookup failed", error);
    return { eventId, attempted: 0, delivered: 0, results: [] };
  }

  const subscribers = (endpoints ?? []).filter((ep) => eventMatches(ep.events, event.eventType));
  if (subscribers.length === 0) {
    return { eventId, attempted: 0, delivered: 0, results: [] };
  }

  const results: DeliveryAttemptResult[] = [];

  for (const ep of subscribers) {
    const sig = buildSignatureHeader(ep.signing_secret, body);
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "X-Webhook-Event": event.eventType,
      "X-Webhook-Event-Id": eventId,
      "X-Webhook-Delivery-Id": eventId,
      "X-Webhook-Timestamp": sig.timestamp,
      "X-Webhook-Signature": sig.header,
      "X-Webhook-Delivery-Attempt": "1",
    };

    const start = Date.now();
    const post = await postOnce(ep.url, body, headers);
    const duration = Date.now() - start;

    const maxAttempts = ep.max_attempts ?? 5;
    const willRetry = !post.ok && 1 < maxAttempts;
    const retryAt = willRetry ? nextRetryAt(ep.backoff_seconds ?? 30, 1) : null;

    await supabaseAdmin.from("webhook_deliveries").insert({
      user_id: event.userId,
      endpoint_id: ep.id,
      event_type: event.eventType,
      attempt: 1,
      max_attempts: maxAttempts,
      success: post.ok,
      status_code: post.status,
      duration_ms: duration,
      payload: { id: eventId, type: event.eventType, sent_at: sentAt, data: event.payload } as never,
      payload_preview: body.slice(0, PREVIEW_LIMIT),
      response_body: post.responseText,
      error: post.error,
      next_retry_at: retryAt,
    });

    const epId1 = ep.id;
    const delivOk1 = post.ok;
    backgroundTask(
      (async () => {
        await supabaseAdmin
          .from("webhook_endpoints")
          .update({
            last_delivery_at: new Date().toISOString(),
            last_delivery_success: delivOk1,
          })
          .eq("id", epId1);
      })(),
    );

    // Notify on first failure if no retry will happen (max_attempts === 1).
    // Multi-attempt failures notify only when exhausted (see retry queue).
    if (!post.ok && !willRetry) {
      void createNotification({
        userId: event.userId,
        preferenceKey: "channel_down",
        category: "webhook_failure",
        severity: "error",
        title: `Webhook delivery failed`,
        body: `${event.eventType} → ${ep.url} (${post.status ?? "no response"})`,
        linkTo: "/dashboard/webhooks",
        dedupeKey: `endpoint:${ep.id}`,
        metadata: { endpoint_id: ep.id, event_type: event.eventType },
      });
    }

    results.push({
      endpointId: ep.id,
      success: post.ok,
      status: post.status,
      error: post.error,
      attempt: 1,
      willRetry,
    });
  }

  return {
    eventId,
    attempted: results.length,
    delivered: results.filter((r) => r.success).length,
    results,
  };
}

/**
 * Process the retry queue: find delivery rows whose `next_retry_at` is due,
 * re-POST them, and reschedule or finalize. Designed to be invoked by a cron
 * every minute or two via `/api/public/hooks/webhook-retry`.
 */
export async function processWebhookRetryQueue(limit = 50): Promise<{
  processed: number;
  retried: number;
  succeeded: number;
  exhausted: number;
}> {
  const nowIso = new Date().toISOString();

  const { data: due, error } = await supabaseAdmin
    .from("webhook_deliveries")
    .select(
      "id, endpoint_id, user_id, event_type, attempt, max_attempts, payload, payload_preview",
    )
    .eq("success", false)
    .not("next_retry_at", "is", null)
    .lte("next_retry_at", nowIso)
    .order("next_retry_at", { ascending: true })
    .limit(limit);

  if (error) {
    console.error("processWebhookRetryQueue: query failed", error);
    return { processed: 0, retried: 0, succeeded: 0, exhausted: 0 };
  }

  let succeeded = 0;
  let exhausted = 0;
  const list = due ?? [];

  for (const row of list) {
    const { data: ep } = await supabaseAdmin
      .from("webhook_endpoints")
      .select("id, url, signing_secret, enabled, max_attempts, backoff_seconds")
      .eq("id", row.endpoint_id)
      .maybeSingle();

    if (!ep || !ep.enabled) {
      // Endpoint deleted / disabled — stop retrying.
      await supabaseAdmin
        .from("webhook_deliveries")
        .update({ next_retry_at: null, error: "Endpoint disabled or removed" })
        .eq("id", row.id);
      exhausted++;
      continue;
    }

    const newAttempt = (row.attempt ?? 1) + 1;
    const maxAttempts = row.max_attempts ?? ep.max_attempts ?? 5;
    const payloadObj = row.payload as { id?: string; type?: string; data?: unknown } | null;
    const body =
      typeof row.payload_preview === "string" && row.payload_preview.length > 0
        ? row.payload_preview
        : JSON.stringify(payloadObj ?? {});

    const sig = buildSignatureHeader(ep.signing_secret, body);
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "X-Webhook-Event": row.event_type,
      "X-Webhook-Event-Id": payloadObj?.id ?? row.id,
      "X-Webhook-Delivery-Id": payloadObj?.id ?? row.id,
      "X-Webhook-Timestamp": sig.timestamp,
      "X-Webhook-Signature": sig.header,
      "X-Webhook-Delivery-Attempt": String(newAttempt),
    };

    const start = Date.now();
    const post = await postOnce(ep.url, body, headers);
    const duration = Date.now() - start;

    const willRetry = !post.ok && newAttempt < maxAttempts;
    const retryAt = willRetry ? nextRetryAt(ep.backoff_seconds ?? 30, newAttempt) : null;

    await supabaseAdmin.from("webhook_deliveries").insert({
      user_id: row.user_id,
      endpoint_id: ep.id,
      event_type: row.event_type,
      attempt: newAttempt,
      max_attempts: maxAttempts,
      success: post.ok,
      status_code: post.status,
      duration_ms: duration,
      payload: payloadObj as never,
      payload_preview: body.slice(0, PREVIEW_LIMIT),
      response_body: post.responseText,
      error: post.error,
      next_retry_at: retryAt,
    });

    // Clear the original row's retry pointer so we don't double-process it.
    await supabaseAdmin
      .from("webhook_deliveries")
      .update({ next_retry_at: null })
      .eq("id", row.id);

    const epId2 = ep.id;
    const delivOk2 = post.ok;
    backgroundTask(
      (async () => {
        await supabaseAdmin
          .from("webhook_endpoints")
          .update({
            last_delivery_at: new Date().toISOString(),
            last_delivery_success: delivOk2,
          })
          .eq("id", epId2);
      })(),
    );

    if (post.ok) succeeded++;
    if (!willRetry && !post.ok) {
      exhausted++;
      void createNotification({
        userId: row.user_id,
        preferenceKey: "channel_down",
        category: "webhook_failure",
        severity: "error",
        title: "Webhook delivery exhausted retries",
        body: `${row.event_type} → ${ep.url} failed after ${newAttempt} attempts (${post.status ?? "no response"}).`,
        linkTo: "/dashboard/webhooks",
        dedupeKey: `endpoint:${ep.id}:exhausted`,
        metadata: {
          endpoint_id: ep.id,
          event_type: row.event_type,
          attempts: newAttempt,
        },
      });
    }
  }

  return {
    processed: list.length,
    retried: list.length,
    succeeded,
    exhausted,
  };
}
