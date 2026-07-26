// =============================================================================
// Platform Webhook Receivers — Salla, Foodics, Zid, Keeta
//
// Called by the platforms themselves (not by API-key callers).
// Auth: Salla/Foodics use HMAC-SHA-256 over the raw request body (key stored
//       per-channel in ps_merchant_channels.webhook_secret); Zid uses Basic
//       Auth; Keeta uses the same app-level SHA-256 request-signing scheme
//       as its outbound API calls (see keeta-client.ts / verifyKeetaSig).
//
// Flow per request:
//   1. Read raw body (must preserve bytes for HMAC)
//   2. Parse platform identifier from payload
//   3. Look up connected channel via metadata (store_id / business_id)
//   4. Verify HMAC signature — reject 401 on mismatch
//   5. Filter to pricing-relevant events only
//   6. Normalise native payload → GCC ingest schema
//   7. Run Ingest → Decide → Govern → Defend inline
//
// Uses Web Crypto API throughout (works in CF Workers, Node 18+, any runtime)
// — no Node-specific imports so the file is portable for a future cloud move.
// =============================================================================

import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { decide, VALID_REGIONS } from "./decide-engine";
import { writeAuditLog, ingestSummary } from "./govern";
import { dispatchToAggregators } from "./defend-handler";
import { signRequest } from "./keeta-client";
import { getMerchantMarginFloor } from "./merchant-pricing-config";

// ---------------------------------------------------------------------------
// Event allow-lists — only pricing-relevant events trigger the pipeline
// ---------------------------------------------------------------------------
// Salla: product.updated is deprecated; product.price.updated is the current event
// Zid: event name is product.update (singular) per Zid webhook event list
const SALLA_PRICE_EVENTS   = new Set(["product.price.updated", "product.created"]);
const FOODICS_PRICE_EVENTS = new Set(["products.updated", "product.updated"]);
const ZID_PRICE_EVENTS     = new Set(["product.update"]);

// ---------------------------------------------------------------------------
// Zid Basic Auth verification
// Zid sends: Authorization: Basic base64("prizeskout:<webhook_secret>")
// ---------------------------------------------------------------------------
function verifyZidBasicAuth(authHeader: string | null, storedSecret: string | null): boolean {
  if (!authHeader || !storedSecret || !authHeader.startsWith("Basic ")) return false;
  try {
    const decoded = atob(authHeader.slice(6));
    const colonIdx = decoded.indexOf(":");
    if (colonIdx < 0) return false;
    const password = decoded.slice(colonIdx + 1);
    if (password.length !== storedSecret.length) return false;
    let diff = 0;
    for (let i = 0; i < password.length; i++) {
      diff |= password.charCodeAt(i) ^ storedSecret.charCodeAt(i);
    }
    return diff === 0;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// HMAC-SHA-256 verification (Web Crypto — runtime-agnostic)
// ---------------------------------------------------------------------------
async function verifyHmac(rawBody: string, secret: string, header: string | null): Promise<boolean> {
  if (!header || !secret) return false;

  const received = header.startsWith("sha256=") ? header.slice(7) : header;

  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw", enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false, ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(rawBody));
  const expected = Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  // Constant-time comparison to prevent timing attacks
  if (received.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < received.length; i++) {
    diff |= received.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  return diff === 0;
}

// ---------------------------------------------------------------------------
// Keeta signature verification — same sig scheme as outbound calls, computed
// over the flat webhook payload (see keeta-client.ts for the algorithm).
// ---------------------------------------------------------------------------
async function verifyKeetaSig(payload: Record<string, unknown>, webhookUrl: string): Promise<boolean> {
  const appSecret = process.env.KEETA_APP_SECRET;
  const received = payload.sig;
  if (!appSecret || typeof received !== "string") return false;

  const params: Record<string, string | number | boolean> = {};
  for (const [key, value] of Object.entries(payload)) {
    if (key === "sig") continue;
    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
      params[key] = value;
    }
  }
  const expected = await signRequest(webhookUrl, params, appSecret);

  if (received.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < received.length; i++) {
    diff |= received.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  return diff === 0;
}

// ---------------------------------------------------------------------------
// Channel lookup by platform-native store identifier stored in metadata
// ---------------------------------------------------------------------------
type Channel = {
  id: string;
  account_id: string;
  licensee_id: string;
  merchant_id: string;
  webhook_secret: string | null;
};

async function findChannel(platform: string, platformStoreId: string): Promise<Channel | null> {
  // Salla & Zid use metadata->store_id; Foodics uses metadata->business_id;
  // Keeta's webhook payload carries shopId directly, mapped to metadata->shop_id
  const metaKey = platform === "foodics" ? "business_id" : platform === "keeta" ? "shop_id" : "store_id";

  const { data } = await supabaseAdmin
    .from("ps_merchant_channels")
    .select("id, account_id, licensee_id, merchant_id, webhook_secret")
    .eq("platform", platform)
    .eq("status", "connected")
    .filter(`metadata->>${metaKey}`, "eq", platformStoreId)
    .maybeSingle();

  return (data as Channel | null) ?? null;
}

// ---------------------------------------------------------------------------
// Shared pipeline: Ingest → Decide → Govern → Defend
// ---------------------------------------------------------------------------
type PipelineInput = {
  channel: Channel;
  platform: string;
  externalId: string;
  sku: string;
  nameEn: string;
  nameAr: string;
  price: number;
  baseCost: number;
  currency: string;
  inStock: boolean;
  region: string;
  rawPayload: Record<string, unknown>;
};

async function runPipeline(p: PipelineInput): Promise<Response> {
  const region = VALID_REGIONS.includes(p.region) ? p.region : "SA";

  // Include price in the idempotency key so a real price change always re-processes
  const idempotencyKey = `webhook:${p.platform}:${p.channel.merchant_id}:${p.externalId}:${p.price}`;

  const { data: existing } = await supabaseAdmin
    .from("ps_ingest_events")
    .select("id")
    .eq("account_id", p.channel.account_id)
    .eq("idempotency_key", idempotencyKey)
    .maybeSingle();

  if (existing) {
    return ok({ received: true, idempotency_replay: true, ingest_event_id: existing.id });
  }

  // 1. Ingest
  const eventId = `wh-${p.platform}-${p.externalId}-${Date.now()}`;
  const { data: ingestRow, error: insertErr } = await supabaseAdmin
    .from("ps_ingest_events")
    .insert({
      account_id: p.channel.account_id,
      licensee_id: p.channel.licensee_id,
      event_id: eventId,
      idempotency_key: idempotencyKey,
      region,
      source_platform: p.platform,
      merchant_id: p.channel.merchant_id,
      item_id: p.externalId,
      sku: p.sku,
      item_name_en: p.nameEn,
      item_name_ar: p.nameAr,
      inventory_status: p.inStock ? "in_stock" : "out_of_stock",
      base_cost: p.baseCost,
      current_retail_price: p.price,
      currency: p.currency,
      vat_rate: 0,
      raw_payload: p.rawPayload,
      status: "received",
    })
    .select("id")
    .single();

  if (insertErr || !ingestRow) return err("Failed to persist ingest event", 500);

  // 2. Decide
  const marginFloorPct = await getMerchantMarginFloor(p.channel.account_id);
  const decideOutput = decide({
    region,
    baseCost: p.baseCost,
    currentRetailPrice: p.price,
    marginFloorPct,
  });

  const { data: decideRow } = await supabaseAdmin
    .from("ps_decide_results")
    .insert({
      ingest_event_id: ingestRow.id,
      account_id: p.channel.account_id,
      licensee_id: p.channel.licensee_id,
      region,
      merchant_id: p.channel.merchant_id,
      sku: p.sku,
      base_cost: p.baseCost,
      current_retail_price: p.price,
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
    .eq("id", ingestRow.id);

  // 3. Govern
  const summaries = ingestSummary(
    p.platform, p.sku, region,
    decideOutput.netMarginPct, decideOutput.marginFloorPct, decideOutput.floorBreached,
  );
  const traceId = await writeAuditLog({
    accountId: p.channel.account_id,
    licenseeId: p.channel.licensee_id,
    merchantId: p.channel.merchant_id,
    sku: p.sku,
    region,
    eventType: "ingest",
    sourcePlatform: p.platform,
    ingestEventId: ingestRow.id,
    dataRoute: region,
    payload: {
      event_id: eventId,
      merchant_id: p.channel.merchant_id,
      sku: p.sku,
      region,
      source_platform: p.platform,
      financials: { base_cost: p.baseCost, current_retail_price: p.price, currency: p.currency },
      decide: decideOutput,
    },
    summaryEn: summaries.en,
    summaryAr: summaries.ar,
  });

  // 4. Defend — dispatch to aggregators if floor breached
  let dispatchResult = null;
  if (decideOutput.floorBreached && decideOutput.recommendedPrice !== null && decideRow) {
    dispatchResult = await dispatchToAggregators({
      ingestEventId: ingestRow.id,
      decideResultId: decideRow.id,
      accountId: p.channel.account_id,
      licenseeId: p.channel.licensee_id,
      merchantId: p.channel.merchant_id,
      sku: p.sku,
      region,
      oldPrice: p.price,
      newPrice: decideOutput.recommendedPrice,
      currency: p.currency,
      auditSnapshot: {
        ingested_base_cost: p.baseCost,
        platform_commission_applied: decideOutput.commissionRate,
        logistics_subsidy_offset: decideOutput.logisticsSubsidy,
        guaranteed_net_margin_floor: decideOutput.marginFloorPct,
        net_margin_pct: decideOutput.netMarginPct,
        decision_action: decideOutput.decisionAction,
        webhook_source: p.platform,
      },
    });
    await supabaseAdmin
      .from("ps_ingest_events")
      .update({ status: "dispatched" })
      .eq("id", ingestRow.id);
  }

  return ok({
    received: true,
    ingest_event_id: ingestRow.id,
    trace_id: traceId,
    sku: p.sku,
    floor_breached: decideOutput.floorBreached,
    decision_action: decideOutput.decisionAction,
    ...(dispatchResult ? { dispatch: dispatchResult } : {}),
  });
}

// ---------------------------------------------------------------------------
// Salla webhook handler
// POST /api/webhooks/salla
// Header: X-Salla-Signature: sha256=<hex>
// Payload: { event, merchant, data: { id, sku, name, arabic_name, price: { amount, currency }, cost, quantity } }
// ---------------------------------------------------------------------------
export async function handleSallaWebhook(request: Request): Promise<Response> {
  const rawBody = await request.text();
  let payload: Record<string, unknown>;
  try { payload = JSON.parse(rawBody); } catch { return err("Invalid JSON", 400); }

  const storeId = String(payload.merchant ?? "");
  if (!storeId) return err("Missing merchant identifier", 400);

  const channel = await findChannel("salla", storeId);
  if (!channel) return ok({ received: true, processed: false, reason: "merchant_not_connected" });

  const sig = request.headers.get("x-salla-signature");
  if (!await verifyHmac(rawBody, channel.webhook_secret ?? "", sig)) {
    return err("Invalid signature", 401);
  }

  const event = String(payload.event ?? "");
  if (!SALLA_PRICE_EVENTS.has(event)) {
    return ok({ received: true, processed: false, reason: "event_not_subscribed" });
  }

  const data = payload.data as Record<string, unknown> | undefined ?? {};
  // product.created → price: { amount, currency }
  // product.price.updated → price: <number>, regular_price: <number>
  const priceRaw = data.price;
  const price = typeof priceRaw === "object" && priceRaw !== null
    ? (priceRaw as { amount?: number }).amount ?? 0
    : typeof priceRaw === "number" ? priceRaw : 0;
  const currency = typeof priceRaw === "object" && priceRaw !== null
    ? (priceRaw as { currency?: string }).currency ?? "SAR"
    : "SAR";
  const sku = String(data.sku ?? data.id ?? "");
  if (!sku || price <= 0) return ok({ received: true, processed: false, reason: "insufficient_price_data" });

  return runPipeline({
    channel,
    platform: "salla",
    externalId: String(data.id ?? ""),
    sku,
    nameEn: String(data.name ?? ""),
    nameAr: String(data.arabic_name ?? data.name ?? ""),
    price,
    baseCost: (data.cost as number | undefined) ?? price * 0.6,
    currency,
    inStock: ((data.quantity as number | undefined) ?? 1) > 0,
    region: "SA",
    rawPayload: payload,
  });
}

// ---------------------------------------------------------------------------
// Foodics webhook handler
// POST /api/webhooks/foodics
// Header: X-Foodics-Signature: sha256=<hex>
// Payload: { event, business: { reference }, data: { id, sku, name, name_locales: { ar }, selling_price, cost_price, in_stock } }
// ---------------------------------------------------------------------------
export async function handleFoodicsWebhook(request: Request): Promise<Response> {
  const rawBody = await request.text();
  let payload: Record<string, unknown>;
  try { payload = JSON.parse(rawBody); } catch { return err("Invalid JSON", 400); }

  const business = payload.business as Record<string, unknown> | undefined ?? {};
  const businessId = String(business.reference ?? business.id ?? "");
  if (!businessId) return err("Missing business identifier", 400);

  const channel = await findChannel("foodics", businessId);
  if (!channel) return ok({ received: true, processed: false, reason: "merchant_not_connected" });

  const sig = request.headers.get("x-foodics-signature");
  if (!await verifyHmac(rawBody, channel.webhook_secret ?? "", sig)) {
    return err("Invalid signature", 401);
  }

  const event = String(payload.event ?? "");
  if (!FOODICS_PRICE_EVENTS.has(event)) {
    return ok({ received: true, processed: false, reason: "event_not_subscribed" });
  }

  const data = payload.data as Record<string, unknown> | undefined ?? {};
  const price = (data.selling_price as number | undefined) ?? 0;
  const sku = String(data.sku ?? data.id ?? "");
  if (!sku || price <= 0) return ok({ received: true, processed: false, reason: "insufficient_price_data" });

  const nameLocales = data.name_locales as Record<string, string> | undefined;

  return runPipeline({
    channel,
    platform: "foodics",
    externalId: String(data.id ?? ""),
    sku,
    nameEn: String(data.name ?? ""),
    nameAr: nameLocales?.ar ?? String(data.name ?? ""),
    price,
    baseCost: (data.cost_price as number | undefined) ?? price * 0.6,
    currency: "SAR",
    inStock: (data.in_stock as boolean | undefined) ?? true,
    region: "SA",
    rawPayload: payload,
  });
}

// ---------------------------------------------------------------------------
// Zid webhook handler
// POST /api/webhooks/zid
// Header: X-Zid-Signature: sha256=<hex>
// Payload: { event, store_id, data: { id, sku, name, name_ar, price, cost_price, currency, quantity } }
// ---------------------------------------------------------------------------
export async function handleZidWebhook(request: Request): Promise<Response> {
  const rawBody = await request.text();
  let payload: Record<string, unknown>;
  try { payload = JSON.parse(rawBody); } catch { return err("Invalid JSON", 400); }

  const storeId = String(payload.store_id ?? payload.merchant_id ?? "");
  if (!storeId) return err("Missing store identifier", 400);

  const channel = await findChannel("zid", storeId);
  if (!channel) return ok({ received: true, processed: false, reason: "merchant_not_connected" });

  // Zid uses Basic Auth, not HMAC — Authorization: Basic base64("prizeskout:<secret>")
  if (!verifyZidBasicAuth(request.headers.get("authorization"), channel.webhook_secret)) {
    return err("Invalid credentials", 401);
  }

  const event = String(payload.event ?? "");
  if (!ZID_PRICE_EVENTS.has(event)) {
    return ok({ received: true, processed: false, reason: "event_not_subscribed" });
  }

  const data = payload.data as Record<string, unknown> | undefined ?? {};
  const price = (data.price as number | undefined) ?? 0;
  const sku = String(data.sku ?? data.id ?? "");
  if (!sku || price <= 0) return ok({ received: true, processed: false, reason: "insufficient_price_data" });

  return runPipeline({
    channel,
    platform: "zid",
    externalId: String(data.id ?? ""),
    sku,
    nameEn: String(data.name ?? ""),
    nameAr: String(data.name_ar ?? data.name ?? ""),
    price,
    baseCost: (data.cost_price as number | undefined) ?? price * 0.6,
    currency: String(data.currency ?? "SAR"),
    inStock: ((data.quantity as number | undefined) ?? 1) > 0,
    region: "SA",
    rawPayload: payload,
  });
}

const ZID_APP_MARKET_EVENTS = new Set([
  "app.market.application.install",
  "app.market.application.authorized",
  "app.market.application.uninstall",
]);

async function secretsMatch(actual: string | null, expected: string): Promise<boolean> {
  if (!actual) return false;
  const encoder = new TextEncoder();
  const [actualHash, expectedHash] = await Promise.all([
    crypto.subtle.digest("SHA-256", encoder.encode(actual)),
    crypto.subtle.digest("SHA-256", encoder.encode(expected)),
  ]);
  const a = new Uint8Array(actualHash);
  const b = new Uint8Array(expectedHash);
  if (a.length !== b.length) return false;
  let difference = 0;
  for (let i = 0; i < a.length; i++) difference |= a[i] ^ b[i];
  return difference === 0;
}

function zidLifecycleStoreId(payload: Record<string, unknown>): string {
  const data = payload.data && typeof payload.data === "object"
    ? payload.data as Record<string, unknown>
    : {};
  const store = data.store && typeof data.store === "object"
    ? data.store as Record<string, unknown>
    : {};
  return String(
    payload.store_id ??
    payload.storeId ??
    data.store_id ??
    data.storeId ??
    store.id ??
    "",
  );
}

// Partner Dashboard application lifecycle events. These are distinct from
// per-store product.update events registered after OAuth.
export async function handleZidAppMarketWebhook(request: Request): Promise<Response> {
  const expectedSecret = process.env.ZID_WEBHOOK_SECRET;
  if (!expectedSecret) return err("Webhook receiver is not configured", 503);

  const suppliedSecret = request.headers.get("x-prizeskout-webhook-token");
  if (!(await secretsMatch(suppliedSecret, expectedSecret))) return err("Invalid credentials", 401);

  let payload: Record<string, unknown>;
  try {
    payload = await request.json() as Record<string, unknown>;
  } catch {
    return err("Invalid JSON", 400);
  }

  const event = String(payload.event ?? payload.name ?? payload.type ?? "");
  if (!ZID_APP_MARKET_EVENTS.has(event)) {
    return ok({ received: true, processed: false, reason: "event_not_subscribed" });
  }

  const storeId = zidLifecycleStoreId(payload);
  if (event === "app.market.application.uninstall") {
    if (!storeId) return err("Missing store identifier", 400);

    const { error } = await supabaseAdmin
      .from("ps_merchant_channels")
      .update({
        status: "revoked",
        bearer_token: null,
        manager_token: null,
        error_message: "Zid application uninstalled by merchant",
        updated_at: new Date().toISOString(),
      })
      .eq("platform", "zid")
      .contains("metadata", { store_id: storeId });

    if (error) {
      console.error("[zid-app-market] failed to revoke channel", error.message);
      return err("Failed to process uninstall", 500);
    }
  }

  console.info("[zid-app-market]", { event, store_id: storeId || null });
  return ok({ received: true, processed: true });
}

// ---------------------------------------------------------------------------
// Keeta webhook handler
// POST /api/webhooks/keeta
// Auth: same app-level `sig` scheme as outbound calls (see verifyKeetaSig)
// Payload: { sig, eventId, appId, messageId, shopId, message (JSON string), timestamp }
//
// v1 scope is deliberately minimal: verify + acknowledge only, no pipeline
// run. Keeta's registered event (1001, order placement) isn't a product/
// price-update event and carries no margin/cost data PrizeSkout caches
// anywhere — there's nothing correct to compute from it yet. None of
// Keeta's true siblings (Talabat/Jahez/Snoonu/Deliveroo — the other
// outbound-only channels) have any inbound pipeline either; this preserves
// that boundary rather than inventing a one-off exception. Real per-order
// margin reconciliation is a documented fast-follow, not attempted here.
// ---------------------------------------------------------------------------
export async function handleKeetaWebhook(request: Request): Promise<Response> {
  const rawBody = await request.text();
  let payload: Record<string, unknown>;
  try { payload = JSON.parse(rawBody); } catch { return err("Invalid JSON", 400); }

  const shopId = payload.shopId;
  if (shopId === undefined || shopId === null) return err("Missing shopId", 400);

  const channel = await findChannel("keeta", String(shopId));
  if (!channel) return ok({ received: true, processed: false, reason: "merchant_not_connected" });

  const webhookUrl = `${new URL(request.url).origin}/api/webhooks/keeta`;
  if (!await verifyKeetaSig(payload, webhookUrl)) {
    return err("Invalid signature", 401);
  }

  return ok({ received: true, event_id: payload.eventId ?? null, processed: false, reason: "order_events_not_yet_wired_to_pipeline" });
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function ok(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

function err(message: string, status: number): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
