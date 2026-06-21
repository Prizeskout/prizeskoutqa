/**
 * HTTP smoke test — Flash Sale Orchestration (API 09)
 *
 * Tests (in order):
 *  1. POST /v1/flash/events — 25% off SONY (scheduled, +1h to +3h) → 201
 *  2. GET  /v1/flash/events — list includes the new event → 200
 *  3. GET  /v1/flash/events/:id — get event detail → 200
 *  4. POST /v1/flash/events — same SKU overlapping window → 409 conflict
 *  5. POST /v1/flash/events — 30% off SONY (909.30 < floor 923.30) → 422
 *  6. POST /v1/flash/events — 25% off SONY NOW (-5min to +30min) → 201
 *  7. POST /api/public/hooks/flash-start — trigger activation → {activated:1}
 *  8. GET  /v1/flash/events/:id2 — status=active, sale_price applied → 200
 *  9. POST /v1/flash/events/:id2/cancel — restore prices → {status:cancelled}
 * 10. GET  /v1/flash/events/:id2/report → 200 (summary)
 * 11. POST /v1/flash/events — wrong scope → 403
 * 12. POST /api/public/hooks/flash-start — bad auth → 401
 */

import { createClient } from "@supabase/supabase-js";
import { createHash, randomBytes } from "crypto";
import { writeFileSync } from "fs";

const BASE      = "https://prizeskoutqa.prizeskoutqatar.workers.dev/api/public";
const MAIN_LIC  = "1a1d0a17-366b-4242-b504-ae78ee68b32c";
const UID       = "bed12406-2798-47f7-a30c-5de559e90d6d";
const ACCOUNT   = "4a292c7b-fa88-468a-8e33-fdc795e2f030";
const SKU       = "SONY-WH1000XM5";
const EXPECTED_FLOOR = 923.30;

const admin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

function hashKey(raw: string) { return createHash("sha256").update(raw).digest("hex"); }
function randKey()             { return "sk_test_" + randomBytes(16).toString("hex"); }

// ─── Test infra ───────────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;
const liveResponses: Record<string, unknown> = {};

function assert(label: string, cond: boolean, detail?: unknown) {
  if (cond) {
    console.log(`  ✓ ${label}`);
    passed++;
  } else {
    console.error(`  ✗ ${label}`, detail ?? "");
    failed++;
  }
}

async function h(path: string, opts: RequestInit = {}): Promise<{ status: number; body: unknown }> {
  const res = await fetch(`${BASE}${path}`, opts);
  const body = await res.json().catch(() => null);
  return { status: res.status, body };
}

// ─── Setup: create temp API keys ─────────────────────────────────────────────

let writeKeyId: string | null = null;
let writeKeyRaw = "";
let readKeyId:  string | null = null;
let readKeyRaw  = "";
let noScopeKeyId: string | null = null;
let noScopeKeyRaw = "";
const flashEventIds: string[] = [];

async function insertKey(name: string, raw: string, scopes: string[]): Promise<string> {
  const { data, error } = await (admin as any).from("api_keys").insert({
    user_id:     UID,
    licensee_id: MAIN_LIC,
    name,
    key_prefix:  raw.slice(0, 12),
    key_hash:    hashKey(raw),
    last_four:   raw.slice(-4),
    mode:        "test",
    scopes,
  }).select("id").single();
  if (error) throw new Error(`api_keys insert (${name}): ${error.message}`);
  return data.id;
}

async function setup() {
  writeKeyRaw  = randKey();
  readKeyRaw   = randKey();
  noScopeKeyRaw = randKey();

  writeKeyId   = await insertKey("smoke-flash-write", writeKeyRaw, ["flash:write", "flash:read", "audit:read"]);
  readKeyId    = await insertKey("smoke-flash-read",  readKeyRaw,  ["flash:read"]);
  noScopeKeyId = await insertKey("smoke-flash-noscope", noScopeKeyRaw, ["read"]);
}

async function cleanup() {
  if (writeKeyId)   await (admin as any).from("api_keys").delete().eq("id", writeKeyId);
  if (readKeyId)    await (admin as any).from("api_keys").delete().eq("id", readKeyId);
  if (noScopeKeyId) await (admin as any).from("api_keys").delete().eq("id", noScopeKeyId);
  if (flashEventIds.length > 0) {
    await (admin as any).from("flash_events").delete().in("id", flashEventIds);
  }
  // Restore sale_price in case a test failed mid-flight
  const { data: cp } = await (admin as any)
    .from("catalog_products")
    .select("id")
    .eq("account_id", ACCOUNT)
    .eq("sku", SKU)
    .maybeSingle();
  if (cp) {
    await (admin as any).from("catalog_prices")
      .update({ sale_price: null })
      .eq("product_id", cp.id)
      .ilike("channel", "Online");
  }
}

function auth(raw: string) {
  return { Authorization: `Bearer ${raw}`, "Content-Type": "application/json" };
}

// ─── Timestamps ───────────────────────────────────────────────────────────────

function ts(offsetMin: number): string {
  return new Date(Date.now() + offsetMin * 60_000).toISOString();
}

// ─── Main ─────────────────────────────────────────────────────────────────────

await setup();

// ── TEST 1: Create scheduled 25%-off event (+1h to +3h) ──────────────────────
console.log("\nTEST 1 — POST /v1/flash/events (25% off, scheduled)");
{
  const r = await h("/v1/flash/events", {
    method: "POST",
    headers: auth(writeKeyRaw),
    body: JSON.stringify({
      name:            "White Friday Preview — SONY WH-1000XM5",
      skus:            [SKU],
      discount_config: { type: "pct", value: 25 },
      channel_scope:   "Online",
      start_at:        ts(60),
      end_at:          ts(180),
      auto_restore:    true,
    }),
  });
  liveResponses["01_create_scheduled"] = { status: r.status, body: r.body };
  const b = r.body as any;
  assert("status 201", r.status === 201);
  assert("event_id present", typeof b?.event_id === "string");
  assert("status=scheduled", b?.status === "scheduled");
  assert("sku_count=1", b?.sku_count === 1);
  assert("flash_price ≈ 974.25", Math.abs((b?.skus?.[0]?.flash_price ?? 0) - 974.25) < 0.05, b?.skus?.[0]?.flash_price);
  assert("above floor", b?.skus?.[0]?.safe === true);

  if (b?.event_id) flashEventIds.push(b.event_id);
  var eventId1: string = b?.event_id;
}

// ── TEST 2: List flash events ─────────────────────────────────────────────────
console.log("\nTEST 2 — GET /v1/flash/events");
{
  const r = await h("/v1/flash/events?status=scheduled", {
    headers: auth(writeKeyRaw),
  });
  liveResponses["02_list_events"] = { status: r.status, body: r.body };
  const b = r.body as any;
  assert("status 200", r.status === 200);
  assert("events array", Array.isArray(b?.events));
  assert("contains our event", b?.events?.some((e: any) => e.id === eventId1));
}

// ── TEST 3: Get event by ID ───────────────────────────────────────────────────
console.log("\nTEST 3 — GET /v1/flash/events/:id");
{
  const r = await h(`/v1/flash/events/${eventId1}`, {
    headers: auth(writeKeyRaw),
  });
  liveResponses["03_get_event"] = { status: r.status, body: r.body };
  const b = r.body as any;
  assert("status 200", r.status === 200);
  assert("correct id", b?.id === eventId1);
  assert("sku_details array", Array.isArray(b?.sku_details));
  assert("sku_details has SONY", b?.sku_details?.some((s: any) => s.sku === SKU));
  assert("flash_price ≈ 974.25", Math.abs((b?.sku_details?.[0]?.flash_price ?? 0) - 974.25) < 0.05);
}

// ── TEST 4: Conflict — same SKU, overlapping time window ─────────────────────
console.log("\nTEST 4 — 409 conflict (same SKU, overlapping window)");
{
  const r = await h("/v1/flash/events", {
    method: "POST",
    headers: auth(writeKeyRaw),
    body: JSON.stringify({
      name:            "Conflict Test",
      skus:            [SKU],
      discount_config: { type: "pct", value: 20 },
      channel_scope:   "Online",
      start_at:        ts(90),  // +90min — inside [+1h, +3h] window of event1
      end_at:          ts(120),
    }),
  });
  liveResponses["04_conflict_409"] = { status: r.status, body: r.body };
  const b = r.body as any;
  assert("status 409", r.status === 409);
  assert("error.code=conflict", b?.error?.code === "conflict");
  assert("conflicts array present", Array.isArray(b?.error?.conflicts));
  assert("conflicting_skus has SONY", b?.error?.conflicts?.[0]?.conflicting_skus?.includes(SKU));
}

// ── TEST 5: Floor breach — 30% off SONY = 909.30 < floor 923.30 ───────────────
console.log("\nTEST 5 — 422 floor breach (30% off SONY)");
{
  const r = await h("/v1/flash/events", {
    method: "POST",
    headers: auth(writeKeyRaw),
    body: JSON.stringify({
      name:            "Floor Breach Test",
      skus:            [SKU],
      discount_config: { type: "pct", value: 30 },  // 1299 × 0.70 = 909.30 < 923.30
      channel_scope:   "Online",
      start_at:        ts(300),  // +5h — no conflict with event1
      end_at:          ts(360),
    }),
  });
  liveResponses["05_floor_breach_422"] = { status: r.status, body: r.body };
  const b = r.body as any;
  assert("status 422", r.status === 422);
  assert("error.code=below_floor", b?.error?.code === "below_floor");
  assert("floor_breaches present", Array.isArray(b?.error?.floor_breaches));
  assert("breach has correct sku", b?.error?.floor_breaches?.[0]?.sku === SKU);
  const breach = b?.error?.floor_breaches?.[0];
  assert(`flash_price ≈ 909.30`, Math.abs((breach?.flash_price ?? 0) - 909.30) < 0.05, breach?.flash_price);
  assert(`floor_price ≈ ${EXPECTED_FLOOR}`, Math.abs((breach?.floor_price ?? 0) - EXPECTED_FLOOR) < 0.5, breach?.floor_price);
}

// ── TEST 6: Create immediate event (start 5min ago) ───────────────────────────
console.log("\nTEST 6 — POST /v1/flash/events (immediate, start 5min ago)");
{
  const r = await h("/v1/flash/events", {
    method: "POST",
    headers: auth(writeKeyRaw),
    body: JSON.stringify({
      name:            "Smoke Test Immediate Flash",
      skus:            [SKU],
      discount_config: { type: "pct", value: 25 },
      channel_scope:   "Online",
      start_at:        ts(-5),   // 5 min ago — hook will pick it up
      end_at:          ts(30),   // 30 min from now — no overlap with event1 (+1h)
      auto_restore:    true,
    }),
  });
  liveResponses["06_create_immediate"] = { status: r.status, body: r.body };
  const b = r.body as any;
  assert("status 201", r.status === 201, b?.error);
  assert("event_id present", typeof b?.event_id === "string");
  assert("status=scheduled", b?.status === "scheduled");

  if (b?.event_id) flashEventIds.push(b.event_id);
  var eventId2: string = b?.event_id;
}

// ── TEST 7: Trigger flash-start hook ─────────────────────────────────────────
console.log("\nTEST 7 — POST /hooks/flash-start (activate immediate event)");
{
  const r = await h("/hooks/flash-start", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.SUPABASE_PUBLISHABLE_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({}),
  });
  liveResponses["07_hook_flash_start"] = { status: r.status, body: r.body };
  const b = r.body as any;
  assert("status 200", r.status === 200, b);
  assert("activated >= 1", (b?.activated ?? 0) >= 1, b);
  assert("errors = 0", b?.errors === 0, b?.errors);
}

// ── TEST 8: Verify event is active + price applied ────────────────────────────
console.log("\nTEST 8 — GET /v1/flash/events/:id2 (should be active)");
{
  const r = await h(`/v1/flash/events/${eventId2}`, {
    headers: auth(writeKeyRaw),
  });
  liveResponses["08_get_active_event"] = { status: r.status, body: r.body };
  const b = r.body as any;
  assert("status 200", r.status === 200, b?.error);
  assert("status=active", b?.status === "active", b?.status);
  assert("sku channel_push_status=applied", b?.sku_details?.[0]?.channel_push_status === "applied", b?.sku_details?.[0]);
}

// Verify catalog_prices.sale_price was updated
{
  const { data: cp } = await (admin as any)
    .from("catalog_products")
    .select("id")
    .eq("account_id", ACCOUNT)
    .eq("sku", SKU)
    .maybeSingle();
  if (cp) {
    const { data: price } = await (admin as any)
      .from("catalog_prices")
      .select("list_price, sale_price")
      .eq("product_id", cp.id)
      .ilike("channel", "Online")
      .maybeSingle();
    assert(
      `catalog_prices.sale_price ≈ 974.25 (was ${price?.sale_price})`,
      Math.abs((price?.sale_price ?? 0) - 974.25) < 0.05,
      price,
    );
    liveResponses["08b_catalog_price_after_flash"] = price;
  }
}

// ── TEST 9: Cancel the immediate event (restores prices) ─────────────────────
console.log("\nTEST 9 — POST /v1/flash/events/:id2/cancel");
{
  const r = await h(`/v1/flash/events/${eventId2}/cancel`, {
    method: "POST",
    headers: auth(writeKeyRaw),
    body: JSON.stringify({}),
  });
  liveResponses["09_cancel_event"] = { status: r.status, body: r.body };
  const b = r.body as any;
  assert("status 200", r.status === 200, b?.error);
  assert("status=cancelled", b?.status === "cancelled", b?.status);
}

// Verify catalog_prices.sale_price restored to null
{
  const { data: cp } = await (admin as any)
    .from("catalog_products")
    .select("id")
    .eq("account_id", ACCOUNT)
    .eq("sku", SKU)
    .maybeSingle();
  if (cp) {
    const { data: price } = await (admin as any)
      .from("catalog_prices")
      .select("list_price, sale_price")
      .eq("product_id", cp.id)
      .ilike("channel", "Online")
      .maybeSingle();
    assert(
      `catalog_prices.sale_price restored to null (got ${price?.sale_price})`,
      price?.sale_price === null,
      price,
    );
    liveResponses["09b_catalog_price_after_cancel"] = price;
  }
}

// ── TEST 10: Report ────────────────────────────────────────────────────────────
console.log("\nTEST 10 — GET /v1/flash/events/:id2/report");
{
  const r = await h(`/v1/flash/events/${eventId2}/report`, {
    headers: auth(writeKeyRaw),
  });
  liveResponses["10_report"] = { status: r.status, body: r.body };
  const b = r.body as any;
  assert("status 200", r.status === 200, b?.error);
  assert("event.status=cancelled", b?.event?.status === "cancelled", b?.event?.status);
  assert("summary present", typeof b?.summary === "object");
  assert("sku_count=1", b?.summary?.sku_count === 1, b?.summary);
}

// ── TEST 11: 403 — wrong scope ─────────────────────────────────────────────────
console.log("\nTEST 11 — 403 wrong scope");
{
  const r = await h("/v1/flash/events", {
    method: "POST",
    headers: auth(noScopeKeyRaw),
    body: JSON.stringify({
      name: "should fail",
      skus: [SKU],
      discount_config: { type: "pct", value: 10 },
      start_at: ts(400),
      end_at:   ts(460),
    }),
  });
  liveResponses["11_wrong_scope_403"] = { status: r.status, body: r.body };
  const b = r.body as any;
  assert("status 403", r.status === 403, r.status);
  assert("error.code=forbidden", b?.error?.code === "forbidden", b?.error);
}

// ── TEST 12: Hook — bad auth → 401 ────────────────────────────────────────────
console.log("\nTEST 12 — hook bad auth → 401");
{
  const r = await h("/hooks/flash-start", {
    method: "POST",
    headers: { Authorization: "Bearer wrong-token", "Content-Type": "application/json" },
    body: JSON.stringify({}),
  });
  liveResponses["12_hook_bad_auth"] = { status: r.status, body: r.body };
  assert("status 401", r.status === 401, r.status);
}

// ─── Cleanup + save responses ─────────────────────────────────────────────────
await cleanup();

const outFile = "scripts/flash-smoke-responses.json";
writeFileSync(outFile, JSON.stringify(liveResponses, null, 2));
console.log(`\nLive responses saved to ${outFile}`);
console.log(`\n${"─".repeat(50)}`);
console.log(`Results: ${passed} passed, ${failed} failed out of ${passed + failed} tests`);
if (failed > 0) process.exit(1);
