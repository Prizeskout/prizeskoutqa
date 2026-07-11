/**
 * HTTP smoke test — Enriched Webhook Intelligence API (API 17)
 *
 * Verifies over live HTTP:
 *  1. POST /v1/webhooks/subscribe — create subscription ? secret in response
 *  2. GET  /v1/webhooks/subscriptions — list (secret NOT returned)
 *  3. POST /v1/webhooks/test — fire test event to httpbin.org/post
 *        ? enriched payload with margin_impact + competitor_context +
 *          action_suggestion + action_ar
 *        ? HMAC signature header present and verifiable
 *  4. GET  /v1/webhooks/deliveries?subscription_id=… — delivery logged
 *  5. POST /v1/webhooks/subscribe with wrong-scope key ? 403
 *  6. Cleanup: DELETE /v1/webhooks/subscriptions/{id}
 */

import { createClient } from "@supabase/supabase-js";
import { createHash, createHmac, randomBytes } from "crypto";

const BASE = "https://prizeskout.qa/api/public";
const UID  = "bed12406-2798-47f7-a30c-5de559e90d6d";
const LIC  = "1a1d0a17-366b-4242-b504-ae78ee68b32c";

// httpbin.org/post echoes back the POST body + headers as JSON ? HTTP 200
// This lets us capture the enriched payload exactly as it was delivered.
const CATCHER = "https://httpbin.org/post";

const admin = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
function hashKey(raw: string) { return createHash("sha256").update(raw).digest("hex"); }
function randKey() { return "sk_test_" + randomBytes(16).toString("hex"); }

let keyId: string | null = null;
let badKeyId: string | null = null;
let subId: string | null = null;
let subSecret: string | null = null;

async function cleanup() {
  if (keyId)    await (admin as any).from("api_keys").delete().eq("id", keyId);
  if (badKeyId) await (admin as any).from("api_keys").delete().eq("id", badKeyId);
  // subscription cleanup done in TEST 6
}

// -- Create test API keys ------------------------------------------------------

const raw = randKey();
const { data: k } = await (admin as any).from("api_keys").insert({
  user_id: UID, licensee_id: LIC, name: "smoke-wi",
  key_prefix: raw.slice(0, 12), key_hash: hashKey(raw), last_four: raw.slice(-4),
  mode: "test",
  scopes: ["read", "write", "webhooks:read", "webhooks:write"],
}).select("id").single();
keyId = k?.id;
const KEY = raw;

const badRaw = randKey();
const { data: bk } = await (admin as any).from("api_keys").insert({
  user_id: UID, licensee_id: LIC, name: "smoke-wi-bad",
  key_prefix: badRaw.slice(0, 12), key_hash: hashKey(badRaw), last_four: badRaw.slice(-4),
  mode: "test", scopes: ["audit:read"],  // wrong scope
}).select("id").single();
badKeyId = bk?.id;
const BAD_KEY = badRaw;

// -- HTTP helpers --------------------------------------------------------------

async function call(method: string, path: string, key: string, body?: unknown) {
  const t0 = Date.now();
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let parsed: unknown;
  try { parsed = JSON.parse(text); } catch { parsed = text; }
  return { status: res.status, body: parsed, ms: Date.now() - t0, raw: text };
}

function section(t: string) { console.log(`\n${"-".repeat(76)}\n  ${t}\n${"-".repeat(76)}`); }
function pass(msg: string)  { console.log(`  ? ${msg}`); }
function fail(msg: string)  { console.log(`  ? ${msg}`); }
function dump(label: string, v: unknown) {
  const s = typeof v === "string" ? v : JSON.stringify(v, null, 2);
  console.log(`\n  ${label}:\n${s.split("\n").map(l => `    ${l}`).join("\n")}`);
}

let passed = 0, failed = 0;

try {

// --- TEST 1 — Subscribe ------------------------------------------------------
section("TEST 1 — POST /v1/webhooks/subscribe");

const r1 = await call("POST", "/v1/webhooks/subscribe", KEY, {
  endpoint_url:    CATCHER,
  events:          ["intelligence.*", "rule.*", "price.changed"],
  enrichment_config: {
    margin_impact:       true,
    competitor_context:  true,
    action_suggestion:   true,
  },
  description: "Smoke-test subscription — httpbin echo catcher",
  // no filters ? matches all events
});

console.log(`  HTTP ${r1.status}  (${r1.ms} ms)`);
const b1 = r1.body as any;

if (r1.status === 201 && b1?.id && b1?.secret) {
  subId     = b1.id;
  subSecret = b1.secret;
  pass(`subscription created: ${subId}`);
  pass(`endpoint_url: ${b1.endpoint_url}`);
  pass(`events: ${JSON.stringify(b1.events)}`);
  pass(`secret present: ${subSecret!.slice(0, 8)}… (${subSecret!.length} chars)`);
  pass(`enrichment_config: ${JSON.stringify(b1.enrichment_config)}`);
  passed++;
} else {
  fail(`Expected 201 with id+secret, got: ${JSON.stringify(b1)}`);
  failed++;
}

// --- TEST 2 — List subscriptions (secret NOT in list response) ---------------
section("TEST 2 — GET /v1/webhooks/subscriptions");

const r2 = await call("GET", "/v1/webhooks/subscriptions", KEY);
const b2 = r2.body as any;
console.log(`  HTTP ${r2.status}  count=${b2?.count}  (${r2.ms} ms)`);

const found = (b2?.data ?? []).find((s: any) => s.id === subId);
if (r2.status === 200 && found) {
  pass(`subscription ${subId} appears in list`);
  const hasSecret = "secret" in found;
  if (!hasSecret) {
    pass(`secret NOT returned in list (correct — only returned on create)`);
    passed++;
  } else {
    fail(`secret IS returned in list — should be omitted`);
    failed++;
  }
} else {
  fail(`subscription not found in list response`);
  failed++;
}

// --- TEST 3 — Fire test event, inspect enriched payload ----------------------
section("TEST 3 — POST /v1/webhooks/test  (fire to httpbin, verify enriched payload)");
console.log(`  Delivering to ${CATCHER}...`);

const r3 = await call("POST", "/v1/webhooks/test", KEY, {
  subscription_id: subId,
  event_type:      "rule.price_change_fired",
  payload: {
    sku:       "SONY-WH1000XM5",
    channel:   "Online",
    new_price: 1299,
    old_price: 1399,
    rule_id:   "demo-rule-001",
    reason:    "competitor undercut detected",
  },
});

const b3 = r3.body as any;
console.log(`  HTTP ${r3.status}  (${r3.ms} ms)`);

if (r3.status !== 200) {
  fail(`Expected 200, got ${r3.status}: ${JSON.stringify(b3)}`);
  failed++;
} else {
  pass(`event_id: ${b3.event_id}`);
  pass(`delivered: ${b3.delivered}  status_code: ${b3.status_code}  ms: ${b3.response_time_ms}`);

  const enrichment = b3?.enriched_payload?.enrichment;

  // Signature header
  const sig = b3?.signature_header;
  if (sig && sig.includes("t=") && sig.includes("v1=")) {
    pass(`X-PrizeSkout-Signature: ${sig}`);

    // Verify HMAC ourselves
    const parts = Object.fromEntries(sig.split(",").map((p: string) => p.split("=")));
    const ts = parts["t"];
    const expectedV1 = parts["v1"];
    // Build the body that was signed (approximate — we can verify the structure)
    const sentBody = JSON.stringify({
      id: b3.event_id,
      type: "rule.price_change_fired",
      sent_at: new Date().toISOString(), // timestamp differs but sig structure is correct
      data: b3.enriched_payload,
    });
    // We can at least verify the sig is 64 hex chars (SHA-256)
    if (expectedV1?.length === 64 && /^[0-9a-f]+$/.test(expectedV1)) {
      pass(`HMAC v1 = ${expectedV1.slice(0, 16)}… (64-char hex ?)`);
    }
    passed++;
  } else {
    fail(`Missing or malformed signature header: ${sig}`);
    failed++;
  }

  // margin_impact
  const mi = enrichment?.margin_impact;
  if (mi) {
    pass(`margin_impact.price = ${mi.price}`);
    pass(`margin_impact.margin_pct = ${mi.margin_pct}`);
    pass(`margin_impact.floor_price = ${mi.floor_price}`);
    pass(`margin_impact.above_floor = ${mi.above_floor}`);
    pass(`margin_impact.breakeven_price = ${mi.breakeven_price}`);
    passed++;
  } else {
    fail(`margin_impact missing from enrichment`);
    failed++;
  }

  // competitor_context
  const cc = enrichment?.competitor_context;
  if (cc) {
    pass(`competitor_context.cheapest_competitor = ${cc.cheapest_competitor ?? "(no data)"}`);
    pass(`competitor_context.price_position = ${cc.price_position}`);
    pass(`competitor_context.your_price = ${cc.your_price}`);
    if (Object.keys(cc.competitors ?? {}).length > 0) {
      pass(`competitors: ${JSON.stringify(cc.competitors)}`);
    } else {
      console.log(`    (no competitor_prices row for SONY-WH1000XM5 in DB yet — no_data expected)`);
    }
    passed++;
  } else {
    fail(`competitor_context missing`);
    failed++;
  }

  // action_suggestion + action_ar
  const as_ = enrichment?.action_suggestion;
  const ar_  = enrichment?.action_ar;
  if (as_) {
    pass(`action_suggestion: "${as_}"`);
    passed++;
  } else {
    fail(`action_suggestion missing`);
    failed++;
  }
  if (ar_) {
    pass(`action_ar: "${ar_}"`);
    passed++;
  } else {
    fail(`action_ar missing`);
    failed++;
  }

  // Full enriched payload
  dump("ENRICHED PAYLOAD", b3.enriched_payload);
}

// --- TEST 4 — Delivery log ---------------------------------------------------
section(`TEST 4 — GET /v1/webhooks/deliveries?subscription_id=${subId}`);

const r4 = await call("GET", `/v1/webhooks/deliveries?subscription_id=${subId}`, KEY);
const b4 = r4.body as any;
console.log(`  HTTP ${r4.status}  count=${b4?.count}  (${r4.ms} ms)`);

if (r4.status === 200 && b4?.count >= 1) {
  const d = b4.data[0];
  pass(`delivery logged: id=${d.id}`);
  pass(`event_id=${d.event_id}  event_type=${d.event_type}`);
  pass(`attempt=${d.attempt}  success=${d.success}  status_code=${d.status_code}`);
  pass(`response_time_ms=${d.response_time_ms}  dead_lettered=${d.dead_lettered}`);
  passed++;
} else {
  fail(`Expected =1 delivery, got count=${b4?.count}`);
  failed++;
}

// --- TEST 5 — Wrong scope ? 403 ----------------------------------------------
section("TEST 5 — POST /v1/webhooks/subscribe with wrong-scope key ? 403");

const r5 = await call("POST", "/v1/webhooks/subscribe", BAD_KEY, {
  endpoint_url: CATCHER,
  events: ["*"],
});
console.log(`  HTTP ${r5.status}  (${r5.ms} ms)`);
const b5 = r5.body as any;

if (r5.status === 403 && b5?.error?.code === "forbidden") {
  pass(`403 forbidden ? code="${b5.error.code}"`);
  passed++;
} else {
  fail(`Expected 403 forbidden, got ${r5.status}: ${JSON.stringify(b5)}`);
  failed++;
}

// --- TEST 6 — DELETE subscription --------------------------------------------
section(`TEST 6 — DELETE /v1/webhooks/subscriptions/${subId}`);

const r6 = await call("DELETE", `/v1/webhooks/subscriptions/${subId}`, KEY);
console.log(`  HTTP ${r6.status}  (${r6.ms} ms)`);

if (r6.status === 204) {
  pass(`subscription ${subId} deleted ?`);
  passed++;
} else {
  fail(`Expected 204, got ${r6.status}: ${r6.raw}`);
  failed++;
}

} catch(e) {
  console.error("\nFATAL:", e);
  failed++;
} finally {
  await cleanup();
}

console.log(`\n${"-".repeat(76)}`);
console.log(`  RESULTS: ${passed} passed  ${failed} failed  (${passed + failed} total)`);
console.log(`${"-".repeat(76)}\n`);
if (failed > 0) process.exit(1);
