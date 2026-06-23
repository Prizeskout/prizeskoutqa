// ============================================================================
// Enriched Webhook Intelligence API (API 17)
//
// Endpoints:
//   POST   /v1/webhooks/subscribe           — create subscription
//   GET    /v1/webhooks/subscriptions       — list subscriptions (account)
//   POST   /v1/webhooks/test               — fire test event, return enriched payload
//   GET    /v1/webhooks/deliveries         — delivery log (subscription_id filter)
//   DELETE /v1/webhooks/subscriptions/{id} — delete subscription
//
// Enrichment pipeline (computed per subscription on delivery):
//   1. margin_impact   — margin%, floor, breakeven from API 07 margin engine
//   2. competitor_context — cheapest competitor from competitor_prices table
//   3. action_suggestion  — rule-based English action
//   4. action_ar          — static Arabic lookup; DeepL stub for novel strings
//
// Delivery:
//   HMAC-SHA-256 over `${timestamp}.${body}` → X-Webhook-Signature: t=,v1=
//   Retry backoff: 5s → 30s → 5min → 30min → dead-letter (4 retries max)
//   Retry queue: /api/public/hooks/webhook-intelligence-retry (pg_cron pattern)
//
// Scopes: webhooks:read|read|admin (GETs)
//         webhooks:write|write|admin (POST/DELETE)
// ============================================================================

import { createHmac } from "crypto";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import {
  computeMargin, breakevenPrice, minViablePrice,
  landedCost as computeLandedCost, r2, r4, type ChannelCosts,
} from "@/server/margin";
import type { V1Context, V1Result } from "./v1-handlers";
import { backgroundTask } from "./cf-ctx";

// ─── Scope helpers ────────────────────────────────────────────────────────────

function canWrite(ctx: V1Context): boolean {
  return ctx.scopes.includes("webhooks:write") ||
         ctx.scopes.includes("write") ||
         ctx.scopes.includes("admin");
}
function canRead(ctx: V1Context): boolean {
  return ctx.scopes.includes("webhooks:read") || canWrite(ctx) ||
         ctx.scopes.includes("read");
}

// ─── Response helpers ─────────────────────────────────────────────────────────

function err(code: string, message: string, status: number, extra?: Record<string, unknown>): V1Result {
  return { status, body: { error: { code, message, ...extra } } };
}
function ok(body: unknown, status = 200): V1Result {
  return { status, body };
}
async function readJson(req: Request): Promise<Record<string, unknown> | null> {
  const raw = await req.text();
  if (!raw) return {};
  try {
    const p = JSON.parse(raw);
    return typeof p === "object" && p !== null && !Array.isArray(p)
      ? (p as Record<string, unknown>) : null;
  } catch { return null; }
}

// ─── HMAC signing (same Stripe-style format as webhook-delivery.ts) ──────────

function buildSignature(secret: string, body: string): { header: string; timestamp: string } {
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const v1 = createHmac("sha256", secret).update(`${timestamp}.${body}`).digest("hex");
  return { header: `t=${timestamp},v1=${v1}`, timestamp };
}

// ─── Retry schedule: 5s, 30s, 5m, 30m (4 retries after initial attempt) ─────

const RETRY_DELAYS_S = [5, 30, 300, 1800]; // seconds

function nextRetryAt(attempt: number): string | null {
  const delayS = RETRY_DELAYS_S[attempt - 1]; // attempt=1 means 2nd try → 5s
  if (delayS === undefined) return null;       // exhausted → dead-letter
  return new Date(Date.now() + delayS * 1000).toISOString();
}

// ─── Event matching (same logic as webhook-delivery.ts) ──────────────────────

function eventMatches(subscribed: string[], eventType: string): boolean {
  for (const raw of subscribed) {
    if (raw === "*" || raw === eventType) return true;
    if (raw.endsWith(".*") && eventType.startsWith(raw.slice(0, -2) + ".")) return true;
  }
  return false;
}

// ─── Payload filter check ─────────────────────────────────────────────────────

function passesFilters(
  sub: { channel_filter?: string | null; category_filter?: string | null;
         sku_prefix_filter?: string | null; min_price_change_pct?: number | null },
  payload: Record<string, unknown>,
): boolean {
  const channel  = (payload.channel  as string | undefined)?.toLowerCase();
  const category = (payload.category as string | undefined)?.toLowerCase();
  const sku      = (payload.sku      as string | undefined) ?? "";

  if (sub.channel_filter && channel !== sub.channel_filter.toLowerCase()) return false;
  if (sub.category_filter && category !== sub.category_filter.toLowerCase()) return false;
  if (sub.sku_prefix_filter && !sku.startsWith(sub.sku_prefix_filter)) return false;

  if (sub.min_price_change_pct != null) {
    const newP = typeof payload.new_price === "number" ? payload.new_price : 0;
    const oldP = typeof payload.old_price === "number" ? payload.old_price : 0;
    if (oldP > 0) {
      const changePct = Math.abs((newP - oldP) / oldP) * 100;
      if (changePct < Number(sub.min_price_change_pct)) return false;
    }
  }
  return true;
}

// ─── Enrichment types ────────────────────────────────────────────────────────

type MarginImpact = {
  price: number;
  landed_cost: number | null;
  channel_cost: number | null;
  margin_qar: number | null;
  margin_pct: number | null;
  breakeven_price: number | null;
  floor_price: number | null;       // 10% margin floor
  above_floor: boolean;
  above_breakeven: boolean;
};

type CompetitorContext = {
  cheapest_competitor: string | null;
  cheapest_price: number | null;
  your_price: number;
  price_position: "below_cheapest" | "matching_cheapest" | "above_cheapest" | "no_data";
  gap_qar: number | null;
  gap_pct: number | null;
  competitors: Record<string, number>;  // known competitor → price
};

type ActionKey =
  | "raise_above_floor"
  | "lower_to_match"
  | "hold_competitive"
  | "enforce_map"
  | "group_pricing_tier"
  | "priced_aggressively_low"
  | "no_data";

// ─── Static Arabic action phrases (MSA business Arabic) ──────────────────────
// DeepL stub for novel strings not in this table.

const AR_TEMPLATE: Record<ActionKey, (v?: Record<string, string | number>) => string> = {
  raise_above_floor:        (v) =>
    `ارفع السعر فوق الحد الأدنى — السعر الحالي ${v?.price ?? ""} ريال أقل من الحد الأدنى للهامش ${v?.floor ?? ""} ريال`,
  lower_to_match:           (v) =>
    `خفّض السعر لمجاراة ${v?.competitor ?? "المنافس"}: ${v?.price ?? ""} ريال`,
  hold_competitive:         () =>
    `حافظ على السعر — الهامش والمركز التنافسي مقبولان`,
  enforce_map:              () =>
    `طبّق اتفاقية الحد الأدنى للسعر — راجع المخالفة`,
  group_pricing_tier:       () =>
    `فعّل أسعار المجموعة للشريحة الحالية`,
  priced_aggressively_low:  () =>
    `سعرك منخفض جداً مقارنة بالمنافسين — فكّر في رفعه لاسترداد الهامش`,
  no_data:                  () =>
    `بيانات غير كافية لإصدار توصية`,
};

// ─── Static French action phrases (business French) ──────────────────────────

const FR_TEMPLATE: Record<ActionKey, (v?: Record<string, string | number>) => string> = {
  raise_above_floor: (v) =>
    `Relever le prix au-dessus du plancher — prix actuel ${v?.price ?? ""} QAR inférieur au plancher de marge ${v?.floor ?? ""} QAR`,
  lower_to_match: (v) =>
    `Baisser le prix pour s'aligner sur ${v?.competitor ?? "le concurrent"} : ${v?.price ?? ""} QAR`,
  hold_competitive: () =>
    `Maintenir le prix — marge et position concurrentielle acceptables`,
  enforce_map: () =>
    `Appliquer l'accord de prix minimum — examiner la violation`,
  group_pricing_tier: () =>
    `Activer la tarification de groupe pour le palier actuel`,
  priced_aggressively_low: () =>
    `Prix agressivement bas par rapport aux concurrents — envisager une hausse pour récupérer la marge`,
  no_data: () =>
    `Données insuffisantes pour émettre une recommandation`,
};

function buildAction(
  key: ActionKey,
  en: string,
  vars?: Record<string, string | number>,
): { action_suggestion: string; action_ar: string; action_fr: string } {
  return {
    action_suggestion: en,
    action_ar: AR_TEMPLATE[key]?.(vars) ?? en,
    action_fr: FR_TEMPLATE[key]?.(vars) ?? en,
  };
}

// ─── Margin enrichment ───────────────────────────────────────────────────────

async function computeMarginImpact(
  accountId: string,
  sku: string,
  price: number,
  channel: string,
): Promise<MarginImpact> {
  const base: MarginImpact = {
    price,
    landed_cost: null,
    channel_cost: null,
    margin_qar: null,
    margin_pct: null,
    breakeven_price: null,
    floor_price: null,
    above_floor: true,
    above_breakeven: true,
  };

  // Resolve product by SKU
  const { data: product } = await supabaseAdmin
    .from("catalog_products")
    .select("id")
    .eq("account_id", accountId)
    .eq("sku", sku)
    .maybeSingle();

  if (!product) return base;

  // Load margin inputs
  const { data: mi } = await supabaseAdmin
    .from("margin_inputs")
    .select("unit_cost, freight, duty_pct")
    .eq("product_id", product.id)
    .maybeSingle();

  if (!mi) return base;

  // Load channel cost structure
  const { data: ch } = await supabaseAdmin
    .from("channel_cost_structures")
    .select("commission_pct, delivery_cost, payment_pct, returns_provision")
    .eq("account_id", accountId)
    .ilike("channel", channel)
    .maybeSingle();

  const landed = computeLandedCost({
    unit_cost: Number(mi.unit_cost),
    freight:   Number(mi.freight),
    duty_pct:  Number(mi.duty_pct),
  });

  const channelCosts: ChannelCosts = ch
    ? {
        commission_pct:    Number(ch.commission_pct),
        delivery_cost:     Number(ch.delivery_cost),
        payment_pct:       Number(ch.payment_pct),
        returns_provision: Number(ch.returns_provision),
      }
    : { commission_pct: 0, delivery_cost: 0, payment_pct: 0, returns_provision: 0 };

  const mg        = computeMargin(price, landed, channelCosts);
  const breakeven = r2(breakevenPrice(landed, channelCosts));
  const floor     = r2(minViablePrice(landed, channelCosts, 0.10));
  const chCost    = r2(mg.channel_cost);

  return {
    price,
    landed_cost:     r2(landed),
    channel_cost:    chCost,
    margin_qar:      r2(mg.margin),
    margin_pct:      r4(mg.margin_pct),
    breakeven_price: breakeven,
    floor_price:     floor,
    above_floor:     price >= floor,
    above_breakeven: price >= breakeven,
  };
}

// ─── Competitor context ───────────────────────────────────────────────────────

const COMP_COLS = ["noon", "carrefour", "lulu", "amazon", "talabat"] as const;

async function computeCompetitorContext(
  userId: string,
  sku: string,
  yourPrice: number,
): Promise<CompetitorContext> {
  const base: CompetitorContext = {
    cheapest_competitor: null,
    cheapest_price: null,
    your_price: yourPrice,
    price_position: "no_data",
    gap_qar: null,
    gap_pct: null,
    competitors: {},
  };

  const { data: row } = await supabaseAdmin
    .from("competitor_prices")
    .select("noon, carrefour, lulu, amazon, talabat")
    .eq("user_id", userId)
    .ilike("product", `%${sku}%`)
    .limit(1)
    .maybeSingle();

  if (!row) return base;

  const competitors: Record<string, number> = {};
  for (const col of COMP_COLS) {
    const raw = (row as Record<string, unknown>)[col];
    let price: number | null = null;
    if (raw === null || raw === undefined) continue;
    if (typeof raw === "object" && raw !== null && "price" in raw) {
      price = Number((raw as { price: unknown }).price);
    } else {
      price = Number(raw);
    }
    if (isFinite(price) && price > 0) competitors[col] = r2(price);
  }

  if (Object.keys(competitors).length === 0) return base;

  let cheapestComp: string | null = null;
  let cheapestPrice = Infinity;
  for (const [name, p] of Object.entries(competitors)) {
    if (p < cheapestPrice) { cheapestPrice = p; cheapestComp = name; }
  }

  const gap    = yourPrice - cheapestPrice;
  const gapPct = r4((gap / cheapestPrice) * 100);
  const pos: CompetitorContext["price_position"] =
    gap < -0.5  ? "below_cheapest"    :
    gap < 0.5   ? "matching_cheapest" : "above_cheapest";

  return {
    cheapest_competitor: cheapestComp,
    cheapest_price:      r2(cheapestPrice),
    your_price:          yourPrice,
    price_position:      pos,
    gap_qar:             r2(gap),
    gap_pct:             gapPct,
    competitors,
  };
}

// ─── Action suggestion (rule-based) ─────────────────────────────────────────

function deriveAction(
  eventType: string,
  margin: MarginImpact,
  comp: CompetitorContext,
): ReturnType<typeof buildAction> {
  // Event-type-specific overrides (highest priority)
  if (eventType.includes("violation") || eventType.includes("map")) {
    return buildAction("enforce_map", "enforce MAP agreement — review violation");
  }
  if (eventType.includes("tier_unlocked")) {
    return buildAction("group_pricing_tier", "activate group pricing for the current tier");
  }

  // Margin floor violation
  if (margin.floor_price !== null && margin.price < margin.floor_price) {
    const en = `raise above margin floor: current QAR ${margin.price} < floor QAR ${margin.floor_price}`;
    return buildAction("raise_above_floor", en, {
      price: margin.price,
      floor: margin.floor_price,
    });
  }

  // Competitor undercut
  if (comp.cheapest_price !== null && comp.cheapest_competitor !== null) {
    if (comp.price_position === "above_cheapest") {
      const en = `lower to match ${comp.cheapest_competitor}: QAR ${comp.cheapest_price}`;
      return buildAction("lower_to_match", en, {
        competitor: comp.cheapest_competitor,
        price:      comp.cheapest_price,
      });
    }
    if (comp.price_position === "below_cheapest") {
      return buildAction(
        "priced_aggressively_low",
        `priced aggressively low vs. all competitors — consider raising to recover margin`,
      );
    }
  }

  // No data available
  if (margin.margin_pct === null && comp.price_position === "no_data") {
    return buildAction("no_data", "insufficient data for recommendation");
  }

  return buildAction("hold_competitive", "hold — margin and competitive position maintained");
}

// ─── Main enrichment orchestrator ─────────────────────────────────────────────

type EnrichedPayload = {
  margin_impact: MarginImpact;
  competitor_context: CompetitorContext;
  action_suggestion: string;
  action_ar: string;
  _ar_stub?: boolean;
};

async function computeEnrichment(
  accountId: string,
  userId: string,
  eventType: string,
  payload: Record<string, unknown>,
  config: { margin_impact?: boolean; competitor_context?: boolean; action_suggestion?: boolean },
): Promise<EnrichedPayload> {
  const sku      = (payload.sku      as string  | undefined) ?? "";
  const channel  = (payload.channel  as string  | undefined) ?? "Online";
  const price    = typeof payload.new_price === "number" ? payload.new_price
                 : typeof payload.price     === "number" ? payload.price : 0;

  const [margin, comp] = await Promise.all([
    config.margin_impact !== false && sku && price > 0
      ? computeMarginImpact(accountId, sku, price, channel)
      : Promise.resolve<MarginImpact>({
          price, landed_cost: null, channel_cost: null, margin_qar: null,
          margin_pct: null, breakeven_price: null, floor_price: null,
          above_floor: true, above_breakeven: true,
        }),
    config.competitor_context !== false && sku
      ? computeCompetitorContext(userId, sku, price)
      : Promise.resolve<CompetitorContext>({
          cheapest_competitor: null, cheapest_price: null, your_price: price,
          price_position: "no_data", gap_qar: null, gap_pct: null, competitors: {},
        }),
  ]);

  const action = config.action_suggestion !== false
    ? deriveAction(eventType, margin, comp)
    : { action_suggestion: "enrichment disabled", action_ar: "الإثراء معطّل" };

  return {
    margin_impact:       margin,
    competitor_context:  comp,
    action_suggestion:   action.action_suggestion,
    action_ar:           action.action_ar,
    ...((action as Record<string, unknown>)._ar_stub ? { _ar_stub: true } : {}),
  };
}

// ─── Delivery function ────────────────────────────────────────────────────────

type Sub = {
  id: string;
  endpoint_url: string;
  secret: string;
  max_attempts: number;
  events: string[];
  enrichment_config: Record<string, boolean>;
  channel_filter: string | null;
  category_filter: string | null;
  sku_prefix_filter: string | null;
  min_price_change_pct: number | null;
  status: string;
  created_by_user_id: string;
  account_id: string;
};

type WiEvent = {
  eventId: string;
  eventType: string;
  sentAt: string;
  payload: Record<string, unknown>;
  enriched: EnrichedPayload;
};

async function deliverOne(
  sub: Sub,
  ev: WiEvent,
  attempt: number,
): Promise<{ ok: boolean; statusCode: number | null; ms: number; error: string | null; responseBody: string | null }> {
  const body = JSON.stringify({
    id:      ev.eventId,
    type:    ev.eventType,
    sent_at: ev.sentAt,
    data: {
      ...ev.payload,
      enrichment: ev.enriched,
    },
  });

  const { header, timestamp } = buildSignature(sub.secret, body);
  const headers: Record<string, string> = {
    "Content-Type":                      "application/json",
    "X-Webhook-Event":               ev.eventType,
    "X-Webhook-Event-Id":            ev.eventId,
    "X-Webhook-Timestamp":           timestamp,
    "X-Webhook-Signature":           header,
    "X-Webhook-Delivery-Attempt":    String(attempt),
    "X-Webhook-Intelligence-Version": "1",
  };

  const t0 = Date.now();
  try {
    const res = await fetch(sub.endpoint_url, {
      method: "POST", headers, body,
      signal: AbortSignal.timeout(10000),
    });
    const ms   = Date.now() - t0;
    const text = (await res.text()).slice(0, 500);
    return { ok: res.ok, statusCode: res.status, ms, error: res.ok ? null : `HTTP ${res.status}`, responseBody: text };
  } catch (e: unknown) {
    const ms    = Date.now() - t0;
    const error = e instanceof Error ? e.message : "delivery failed";
    return { ok: false, statusCode: null, ms, error, responseBody: null };
  }
}

async function logDelivery(
  subId: string,
  ev: WiEvent,
  attempt: number,
  result: { ok: boolean; statusCode: number | null; ms: number; error: string | null; responseBody: string | null },
  nextRetry: string | null,
  deadLettered: boolean,
): Promise<string> {
  const { data, error } = await supabaseAdmin
    .from("webhook_intelligence_deliveries")
    .insert({
      subscription_id: subId,
      event_id:        ev.eventId,
      event_type:      ev.eventType,
      attempt,
      status_code:     result.statusCode,
      response_time_ms: result.ms,
      delivered_at:    result.ok ? new Date().toISOString() : null,
      next_retry_at:   nextRetry,
      success:         result.ok,
      dead_lettered:   deadLettered,
      error_message:   result.error,
      payload:         { id: ev.eventId, type: ev.eventType, sent_at: ev.sentAt, data: { ...ev.payload, enrichment: ev.enriched } } as never,
      response_body:   result.responseBody,
    })
    .select("id")
    .maybeSingle();

  if (error) console.error("logDelivery INSERT failed:", error.message);
  return data?.id ?? "";
}

// ─── Internal: fire to one subscription (used by test + regular delivery) ────

export async function fireToSubscription(
  sub: Sub,
  eventType: string,
  payload: Record<string, unknown>,
  eventId?: string,
): Promise<{ eventId: string; deliveryId: string; ok: boolean; statusCode: number | null; ms: number; body: string | null; enriched: EnrichedPayload }> {
  const id     = eventId ?? `evt_wi_${Math.random().toString(36).slice(2, 12)}`;
  const sentAt = new Date().toISOString();

  const enriched = await computeEnrichment(
    sub.account_id,
    sub.created_by_user_id,
    eventType,
    payload,
    sub.enrichment_config as { margin_impact?: boolean; competitor_context?: boolean; action_suggestion?: boolean },
  );

  const ev: WiEvent = { eventId: id, eventType, sentAt, payload, enriched };
  const result = await deliverOne(sub, ev, 1);

  const retry       = result.ok ? null : nextRetryAt(1);
  const deadLettered = !result.ok && retry === null;

  let deliveryId = "";
  try {
    deliveryId = await logDelivery(sub.id, ev, 1, result, retry, deadLettered);
  } catch (e) {
    console.error("logDelivery threw:", e);
  }

  // Update subscription last_delivery stats (non-blocking telemetry)
  const subId1 = sub.id;
  const deliveryOk1 = result.ok;
  const deadLettered1 = deadLettered;
  backgroundTask(
    (async () => {
      await supabaseAdmin
        .from("webhook_subscriptions")
        .update({
          last_delivery_at:      new Date().toISOString(),
          last_delivery_success: deliveryOk1,
          ...(deadLettered1 ? { status: "dead" } : {}),
        })
        .eq("id", subId1);
    })(),
  );

  return { eventId: id, deliveryId, ok: result.ok, statusCode: result.statusCode, ms: result.ms, body: result.responseBody, enriched };
}

// ─── Retry queue processor (called by the retry hook) ─────────────────────────

export async function processIntelligenceRetryQueue(limit = 50): Promise<{
  processed: number; retried: number; succeeded: number; dead_lettered: number;
}> {
  const nowIso = new Date().toISOString();

  const { data: due } = await supabaseAdmin
    .from("webhook_intelligence_deliveries")
    .select("id, subscription_id, event_id, event_type, attempt, payload")
    .eq("success", false)
    .eq("dead_lettered", false)
    .not("next_retry_at", "is", null)
    .lte("next_retry_at", nowIso)
    .order("next_retry_at", { ascending: true })
    .limit(limit);

  let succeeded = 0, deadLettered = 0;
  const list = due ?? [];

  for (const row of list) {
    // Load live subscription
    const { data: sub } = await supabaseAdmin
      .from("webhook_subscriptions")
      .select("id, endpoint_url, secret, max_attempts, events, enrichment_config, channel_filter, category_filter, sku_prefix_filter, min_price_change_pct, status, created_by_user_id, account_id")
      .eq("id", row.subscription_id)
      .maybeSingle() as { data: Sub | null };

    if (!sub || sub.status !== "active") {
      // Subscription paused/deleted/dead — cancel retry
      await supabaseAdmin
        .from("webhook_intelligence_deliveries")
        .update({ next_retry_at: null, dead_lettered: true, error_message: "Subscription inactive" })
        .eq("id", row.id);
      deadLettered++;
      continue;
    }

    const newAttempt  = (row.attempt ?? 1) + 1;
    const rawPayload  = row.payload as Record<string, unknown> | null;
    const eventPayload = (rawPayload?.data as Record<string, unknown> | undefined) ?? {};
    const { enrichment: _removed, ...cleanPayload } = eventPayload as { enrichment?: unknown } & Record<string, unknown>;

    // Re-compute enrichment fresh on retry
    const enriched = await computeEnrichment(
      sub.account_id,
      sub.created_by_user_id,
      row.event_type,
      cleanPayload,
      sub.enrichment_config as { margin_impact?: boolean; competitor_context?: boolean; action_suggestion?: boolean },
    );

    const ev: WiEvent = {
      eventId:   row.event_id,
      eventType: row.event_type,
      sentAt:    new Date().toISOString(),
      payload:   cleanPayload,
      enriched,
    };
    const result      = await deliverOne(sub, ev, newAttempt);
    const retry       = result.ok ? null : nextRetryAt(newAttempt);
    const isDead      = !result.ok && retry === null;

    // Clear old row's retry pointer and insert new attempt row
    await supabaseAdmin
      .from("webhook_intelligence_deliveries")
      .update({ next_retry_at: null })
      .eq("id", row.id);

    await logDelivery(sub.id, ev, newAttempt, result, retry, isDead);

    const subId2 = sub.id;
    const deliveryOk2 = result.ok;
    const isDead2 = isDead;
    backgroundTask(
      (async () => {
        await supabaseAdmin
          .from("webhook_subscriptions")
          .update({
            last_delivery_at: new Date().toISOString(),
            last_delivery_success: deliveryOk2,
            ...(isDead2 ? { status: "dead" } : {}),
          })
          .eq("id", subId2);
      })(),
    );

    if (result.ok) succeeded++;
    if (isDead) deadLettered++;
  }

  return { processed: list.length, retried: list.length, succeeded, dead_lettered: deadLettered };
}

// ============================================================================
// POST /v1/webhooks/subscribe
// ============================================================================
//
// Body:
//   endpoint_url            required text
//   events                  required string[] — e.g. ["rule.*", "price.changed"]
//   enrichment_config       optional JSONB { margin_impact, competitor_context, action_suggestion }
//   description             optional text
//   channel_filter          optional text
//   category_filter         optional text
//   sku_prefix_filter       optional text
//   min_price_change_pct    optional numeric
//
// Returns 201 with subscription including secret (only shown on create).

export async function handleWiSubscribe(req: Request, ctx: V1Context): Promise<V1Result> {
  if (!canWrite(ctx)) return err("forbidden", "Requires webhooks:write scope.", 403);

  const body = await readJson(req);
  if (!body) return err("invalid_json", "Body must be a JSON object.", 400);

  const endpoint_url = (body.endpoint_url as string | undefined)?.trim();
  if (!endpoint_url) return err("missing_endpoint_url", "'endpoint_url' is required.", 400);
  try { new URL(endpoint_url); } catch {
    return err("invalid_endpoint_url", "'endpoint_url' must be a valid HTTPS URL.", 400);
  }

  const events = body.events;
  if (!Array.isArray(events) || events.length === 0 || !events.every((e) => typeof e === "string")) {
    return err("missing_events", "'events' must be a non-empty array of strings.", 400);
  }

  const enrichment_config = (typeof body.enrichment_config === "object" && body.enrichment_config !== null)
    ? body.enrichment_config
    : { margin_impact: true, competitor_context: true, action_suggestion: true };

  // Generate a 32-byte random signing secret
  const secretBytes = new Uint8Array(32);
  crypto.getRandomValues(secretBytes);
  const secret = Array.from(secretBytes).map(b => b.toString(16).padStart(2, "0")).join("");

  const { data: sub, error } = await (supabaseAdmin.from("webhook_subscriptions") as any)
    .insert({
      account_id:          ctx.accountId,
      licensee_id:         ctx.licenseeId,
      created_by_user_id:  ctx.userId,
      endpoint_url,
      events,
      enrichment_config,
      secret,
      status:              "active",
      description:         (body.description as string | undefined)?.trim() ?? null,
      channel_filter:      (body.channel_filter as string | undefined)?.trim() ?? null,
      category_filter:     (body.category_filter as string | undefined)?.trim() ?? null,
      sku_prefix_filter:   (body.sku_prefix_filter as string | undefined)?.trim() ?? null,
      min_price_change_pct: typeof body.min_price_change_pct === "number" ? body.min_price_change_pct : null,
    })
    .select()
    .single();

  if (error) return err("db_error", error.message, 500);

  return ok(sub, 201);
}

// ============================================================================
// GET /v1/webhooks/subscriptions
// ============================================================================
//
// Returns all subscriptions for the account (secret NOT included after create).

export async function handleListWiSubscriptions(req: Request, ctx: V1Context): Promise<V1Result> {
  if (!canRead(ctx)) return err("forbidden", "Requires webhooks:read scope.", 403);

  const { data, error } = await supabaseAdmin
    .from("webhook_subscriptions")
    .select(
      "id, endpoint_url, events, enrichment_config, status, description, " +
      "channel_filter, category_filter, sku_prefix_filter, min_price_change_pct, " +
      "last_delivery_at, last_delivery_success, created_at, updated_at"
    )
    .eq("account_id", ctx.accountId)
    .order("created_at", { ascending: false });

  if (error) return err("db_error", error.message, 500);

  return ok({ data: data ?? [], count: (data ?? []).length });
}

// ============================================================================
// POST /v1/webhooks/test
// ============================================================================
//
// Fire a test intelligence event to a specific subscription synchronously.
// Returns the enriched payload + delivery result so callers can inspect HMAC,
// enrichment fields, and delivery status without waiting for the retry queue.
//
// Body:
//   subscription_id   required uuid
//   event_type        optional (default "intelligence.test")
//   payload           optional overrides { sku, channel, price, ... }

export async function handleWiTest(req: Request, ctx: V1Context): Promise<V1Result> {
  if (!canWrite(ctx)) return err("forbidden", "Requires webhooks:write scope.", 403);

  const body = await readJson(req);
  if (!body) return err("invalid_json", "Body must be a JSON object.", 400);

  const subId = (body.subscription_id as string | undefined)?.trim();
  if (!subId) return err("missing_subscription_id", "'subscription_id' is required.", 400);

  const { data: sub } = await supabaseAdmin
    .from("webhook_subscriptions")
    .select("id, endpoint_url, secret, max_attempts, events, enrichment_config, channel_filter, category_filter, sku_prefix_filter, min_price_change_pct, status, created_by_user_id, account_id")
    .eq("id", subId)
    .eq("account_id", ctx.accountId)
    .maybeSingle() as { data: Sub | null };

  if (!sub) return err("not_found", "Subscription not found.", 404);
  if (sub.status === "dead") return err("subscription_dead", "Subscription is dead-lettered.", 422);

  const eventType = ((body.event_type as string | undefined)?.trim()) ?? "intelligence.test";
  const customPayload = (typeof body.payload === "object" && body.payload !== null)
    ? body.payload as Record<string, unknown>
    : {};

  const testPayload: Record<string, unknown> = {
    sku:       customPayload.sku       ?? "SONY-WH1000XM5",
    channel:   customPayload.channel   ?? "Online",
    new_price: customPayload.new_price ?? customPayload.price ?? 1299,
    old_price: customPayload.old_price ?? 1399,
    ...customPayload,
    _test: true,
  };

  const result = await fireToSubscription(sub, eventType, testPayload);

  // Build the signature header that was sent so the caller can verify it
  const sentBody = JSON.stringify({
    id:      result.eventId,
    type:    eventType,
    sent_at: new Date().toISOString(),
    data: { ...testPayload, enrichment: result.enriched },
  });
  const { header: sigHeader } = buildSignature(sub.secret, sentBody);

  return ok({
    event_id:       result.eventId,
    delivery_id:    result.deliveryId,
    subscription_id: subId,
    event_type:     eventType,
    delivered:      result.ok,
    status_code:    result.statusCode,
    response_time_ms: result.ms,
    response_body:  result.body,
    signature_header: sigHeader,
    enriched_payload: {
      ...testPayload,
      enrichment: result.enriched,
    },
  });
}

// ============================================================================
// GET /v1/webhooks/deliveries
// ============================================================================
//
// Query params:
//   subscription_id   required (or all for account)
//   limit             int (default 50, max 200)
//   after             ISO datetime for cursor pagination
//   success           "true" | "false" filter
//   dead_lettered     "true" | "false" filter

export async function handleWiDeliveries(req: Request, ctx: V1Context): Promise<V1Result> {
  if (!canRead(ctx)) return err("forbidden", "Requires webhooks:read scope.", 403);

  const url   = new URL(req.url);
  const subId = url.searchParams.get("subscription_id")?.trim();
  const after = url.searchParams.get("after")?.trim();
  const successFilter = url.searchParams.get("success");
  const deadFilter    = url.searchParams.get("dead_lettered");
  const limit = Math.min(200, Math.max(1, parseInt(url.searchParams.get("limit") ?? "50", 10) || 50));

  // Get all subscription ids for this account (for scope enforcement)
  const { data: accountSubs } = await supabaseAdmin
    .from("webhook_subscriptions")
    .select("id")
    .eq("account_id", ctx.accountId);

  const accountSubIds = (accountSubs ?? []).map((s) => s.id);
  if (accountSubIds.length === 0) return ok({ data: [], count: 0 });

  const targetIds = subId
    ? (accountSubIds.includes(subId) ? [subId] : [])
    : accountSubIds;

  if (targetIds.length === 0)
    return err("not_found", "Subscription not found in this account.", 404);

  let q = supabaseAdmin
    .from("webhook_intelligence_deliveries")
    .select(
      "id, subscription_id, event_id, event_type, attempt, status_code, " +
      "response_time_ms, delivered_at, success, dead_lettered, error_message, created_at"
    )
    .in("subscription_id", targetIds)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (after)                              q = q.lt("created_at", after);
  if (successFilter === "true")           q = q.eq("success", true);
  if (successFilter === "false")          q = q.eq("success", false);
  if (deadFilter    === "true")           q = q.eq("dead_lettered", true);
  if (deadFilter    === "false")          q = q.eq("dead_lettered", false);

  const { data, error } = await q;
  if (error) return err("db_error", error.message, 500);

  return ok({ data: data ?? [], count: (data ?? []).length });
}

// ============================================================================
// DELETE /v1/webhooks/subscriptions/{id}
// ============================================================================

export async function handleDeleteWiSubscription(req: Request, ctx: V1Context, id: string): Promise<V1Result> {
  if (!canWrite(ctx)) return err("forbidden", "Requires webhooks:write scope.", 403);

  const { data: existing } = await supabaseAdmin
    .from("webhook_subscriptions")
    .select("id")
    .eq("id", id)
    .eq("account_id", ctx.accountId)
    .maybeSingle();

  if (!existing) return err("not_found", "Subscription not found.", 404);

  const { error } = await supabaseAdmin
    .from("webhook_subscriptions")
    .delete()
    .eq("id", id);

  if (error) return err("db_error", error.message, 500);

  return { status: 204, body: null };
}
