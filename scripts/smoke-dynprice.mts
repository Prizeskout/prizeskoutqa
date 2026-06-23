/**
 * HTTP smoke test for the Dynamic Pricing Engine (API 03 — /v1/dynprice/*)
 * Tests all 5 endpoints against the live Worker.
 *
 * Test sequence:
 *  1. POST /v1/dynprice/config        — set up SONY-WH1000XM5 with 2 rules
 *  2. GET  /v1/dynprice/events        — list seeded GCC calendar (10 events)
 *  3. GET  /v1/dynprice/current/:sku  — time_window fires (WF not active) → normal adj
 *  4. POST /v1/dynprice/events/custom — inject a White Friday event for today
 *  5. GET  /v1/dynprice/current/:sku  — White Friday fires (priority=1 wins) → deeper adj
 *  6. POST /v1/dynprice/config        — replace rules with a −90% floor-clamp rule
 *  7. GET  /v1/dynprice/current/:sku  — −90% off base → floor clamp fires → QAR ~923
 *  8. GET  /v1/dynprice/audit/:sku    — shows 3 dynprice_engine_v1 audit entries
 *  9. POST /v1/dynprice/events/custom — bad payload → 422 validation
 */

import { createClient } from "@supabase/supabase-js";
import { createHash, randomBytes } from "crypto";

const BASE     = "https://prizeskoutqa.prizeskoutqatar.workers.dev/api/public";
const UID      = "bed12406-2798-47f7-a30c-5de559e90d6d";
const MAIN_LIC = "1a1d0a17-366b-4242-b504-ae78ee68b32c";
const SKU      = "SONY-WH1000XM5";
const CHANNEL  = "Online";

// Margin floor for SONY-WH1000XM5 at min_margin_pct=10%:
//   landed = 750 + 15 + 750×0.05 = 802.50
//   floor  = (802.50 + 8 + 2) / (1 − 0.10 − 0.00 − 0.02)
//           = 812.50 / 0.88 = 923.30 QAR
const EXPECTED_FLOOR = 923.30;

const admin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

function hashKey(raw: string) { return createHash("sha256").update(raw).digest("hex"); }
function randKey() { return "sk_test_" + randomBytes(16).toString("hex"); }

// ─── cleanup tracking ─────────────────────────────────────────────────────────
let testKeyId: string | null = null;
let customEventId: string | null = null;

async function cleanup() {
  // Dynprice rules + config (mutable)
  await (admin as any).from("dynprice_rules")
    .delete().eq("account_id", await mainAccountId());
  await (admin as any).from("dynprice_configs")
    .delete().eq("account_id", await mainAccountId());
  // Custom GCC event
  if (customEventId)
    await (admin as any).from("gcc_event_calendar").delete().eq("id", customEventId);
  // API key
  if (testKeyId)
    await (admin as any).from("api_keys").delete().eq("id", testKeyId);
}

let _accountId: string | null = null;
async function mainAccountId(): Promise<string> {
  if (_accountId) return _accountId;
  const { data } = await (admin as any)
    .from("accounts_v2").select("id").eq("licensee_id", MAIN_LIC).eq("is_default", true).single();
  _accountId = data?.id ?? "4a292c7b-fa88-468a-8e33-fdc795e2f030";
  return _accountId!;
}

// ─── Qatar time ───────────────────────────────────────────────────────────────
function qatarHour(): number {
  const utc = new Date();
  return new Date(utc.getTime() + 3 * 60 * 60 * 1000).getUTCHours();
}

// ─── HTTP helper ─────────────────────────────────────────────────────────────
type Hit = { method: string; path: string; status: number; body: unknown; ms: number };

async function call(method: string, path: string, key: string, body?: unknown): Promise<Hit> {
  const url = `${BASE}${path}`;
  const t0  = Date.now();
  const res = await fetch(url, {
    method,
    headers: { "Authorization": `Bearer ${key}`, "Content-Type": "application/json" },
    body: body != null ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => null);
  return { method, path, status: res.status, body: json, ms: Date.now() - t0 };
}

function section(t: string) {
  console.log(`\n${"═".repeat(72)}\n  ${t}\n${"═".repeat(72)}`);
}

function render(label: string, hit: Hit, expectStatus: number) {
  const ok   = hit.status === expectStatus;
  const icon = ok ? "✓" : "✗";
  const flag = ok ? "" : ` ← UNEXPECTED (expected ${expectStatus})`;
  console.log(`\n  ${icon} ${label}`);
  console.log(`    ${hit.method} ${hit.path}`);
  console.log(`    HTTP ${hit.status}${flag}  (${hit.ms} ms)`);
  const body = JSON.stringify(hit.body, null, 2).split("\n").slice(0, 30).join("\n    ");
  console.log(`    ${body}`);
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────

const hour = qatarHour();
console.log(`Live smoke test — Dynamic Pricing Engine`);
console.log(`Worker: ${BASE.replace("/api/public","")}`);
console.log(`Qatar time: ${hour}:xx  (UTC+3)\n`);

try {
  // Pre-flight: clear any stale dynprice data from previous runs
  await cleanup();

  // Create API key
  const rawKey = randKey();
  const acctId = await mainAccountId();
  const { data: keyRow, error: kErr } = await (admin as any).from("api_keys").insert({
    user_id:     UID,
    licensee_id: MAIN_LIC,
    name:        "smoke-dynprice",
    key_prefix:  rawKey.slice(0, 12),
    key_hash:    hashKey(rawKey),
    last_four:   rawKey.slice(-4),
    mode:        "test",
    scopes:      ["read","write","audit:read","margin:read"],
  }).select("id").single();
  if (kErr) throw new Error(`key insert: ${kErr.message}`);
  testKeyId = keyRow.id;
  const KEY = rawKey;

  // ── Test 1: configure ────────────────────────────────────────────────────────
  section("TEST 1 — POST /v1/dynprice/config  (configure SONY-WH1000XM5)");
  const winHour = hour;
  const winEnd  = Math.min(winHour + 1, 24);

  const r1 = await call("POST", "/v1/dynprice/config", KEY, {
    sku:            SKU,
    channel:        CHANNEL,
    base_price:     1299,
    min_margin_pct: 0.10,
    rules: [
      {
        rule_type:      "named_event",
        name:           "White Friday Deal",
        priority:       1,
        adjustment_pct: -0.20,
        config:         { event_type: "white_friday" },
        notes:          "−20% during White Friday weekend",
      },
      {
        rule_type:      "time_window",
        name:           `Hour-${winHour} Discount`,
        priority:       5,
        adjustment_pct: -0.05,
        config:         { hour_start: winHour, hour_end: winEnd },
        notes:          `−5% during Qatar hour ${winHour}:00–${winEnd}:00`,
      },
    ],
  });
  render(`Configure ${SKU}: base QAR 1299, min_margin 10%, 2 rules`, r1, 200);
  const floorPreview = (r1.body as any)?.floor_preview;
  console.log(`    → floor_preview: QAR ${floorPreview} (expected ~${EXPECTED_FLOOR})`);

  // ── Test 2: events list ───────────────────────────────────────────────────────
  section("TEST 2 — GET /v1/dynprice/events  (seeded GCC calendar)");
  const r2 = await call("GET", "/v1/dynprice/events?upcoming_days=800", KEY);
  render("List GCC events — expect 10 seeded rows (2026+2027)", r2, 200);
  const events = (r2.body as any)?.data ?? [];
  console.log(`    → Returned ${events.length} events:`);
  for (const e of events) {
    const approx = e.is_approximate ? "~" : " ";
    const active  = e.is_active ? " ← ACTIVE" : "";
    console.log(`      ${approx} ${e.year}  ${e.event_type.padEnd(15)} ${e.starts_at?.slice(0,10)} → ${e.ends_at?.slice(0,10)}${active}`);
  }

  // ── Test 3: White Friday NOT active → time_window wins ───────────────────────
  section("TEST 3 — GET /v1/dynprice/current/:sku  (time_window fires; WF not active)");
  const r3 = await call("GET", `/v1/dynprice/current/${SKU}?channel=${CHANNEL}`, KEY);
  render("Price eval — White Friday not active → time_window rule fires", r3, 200);
  const r3body = r3.body as any;
  if (r3.status === 200) {
    const winner  = r3body.adjustment;
    const final   = r3body.final_price;
    const expFinal = 1299 * (1 - 0.05); // = 1234.05
    console.log(`    → Winner rule:  "${winner?.rule_name}"  (type: ${winner?.rule_type}, priority: ${winner?.priority})`);
    console.log(`    → adj_pct:      ${winner?.adjustment_pct}  off base QAR 1299`);
    console.log(`    → off_base:     QAR ${winner?.off_base_price}`);
    console.log(`    → final_price:  QAR ${final}  (expected ~QAR ${expFinal})`);
    console.log(`    → floor_clamped: ${r3body.floor?.clamped}`);
    console.log(`    → Qatar hour:   ${r3body.qatar_hour}  (window [${winHour}, ${winEnd}))`);
    const skipped = r3body.skipped_rules ?? [];
    for (const s of skipped) console.log(`    → Skipped: "${s.rule_name}" — ${s.reason}`);
  }

  // ── Test 4: inject White Friday event for today ───────────────────────────────
  section("TEST 4 — POST /v1/dynprice/events/custom  (White Friday for today)");
  const nowMs   = Date.now();
  const todayQatar = new Date(nowMs - ((nowMs % 86400000)));
  const todayStart = new Date(todayQatar.getTime()).toISOString().slice(0, 10) + "T00:00:00+03:00";
  const todayEnd   = new Date(todayQatar.getTime() + 86400000).toISOString().slice(0, 10) + "T00:00:00+03:00";

  const r4 = await call("POST", "/v1/dynprice/events/custom", KEY, {
    name:       "White Friday 2026 Smoke Test",
    event_type: "white_friday",
    starts_at:  todayStart,
    ends_at:    todayEnd,
    notes:      "Injected by smoke test to validate named_event trigger",
  });
  render("Create custom White Friday event for today → 201", r4, 201);
  customEventId = (r4.body as any)?.id ?? null;
  console.log(`    → is_active: ${(r4.body as any)?.is_active}  (should be true)`);
  console.log(`    → id: ${customEventId}`);

  // ── Test 5: White Friday NOW active → priority=1 wins ────────────────────────
  section("TEST 5 — GET /v1/dynprice/current/:sku  (White Friday now active → priority=1 wins)");
  const r5 = await call("GET", `/v1/dynprice/current/${SKU}?channel=${CHANNEL}`, KEY);
  render("Price eval — White Friday active → named_event (priority=1) beats time_window (priority=5)", r5, 200);
  const r5body = r5.body as any;
  if (r5.status === 200) {
    const winner  = r5body.adjustment;
    const final   = r5body.final_price;
    const expFinal = round2(1299 * 0.80); // = 1039.20
    console.log(`    → Winner rule:  "${winner?.rule_name}"  (type: ${winner?.rule_type}, priority: ${winner?.priority})`);
    console.log(`    → adj_pct:      ${winner?.adjustment_pct}  (−20% off base)`);
    console.log(`    → off_base:     QAR ${winner?.off_base_price}`);
    console.log(`    → final_price:  QAR ${final}  (expected ~QAR ${expFinal})`);
    console.log(`    → floor_clamped: ${r5body.floor?.clamped}`);
    const skipped = r5body.skipped_rules ?? [];
    for (const s of skipped) console.log(`    → Skipped: "${s.rule_name}" — ${s.reason}`);
  }

  // ── Test 6: reconfigure with a −90% rule to trigger floor clamp ───────────────
  section("TEST 6 — POST /v1/dynprice/config  (replace rules: −90% clearance, always-on)");
  const r6 = await call("POST", "/v1/dynprice/config", KEY, {
    sku:            SKU,
    channel:        CHANNEL,
    base_price:     1299,
    min_margin_pct: 0.10,
    rules: [
      {
        rule_type:      "time_window",
        name:           "Extreme Clearance (floor-clamp test)",
        priority:       1,
        adjustment_pct: -0.90,
        config:         { hour_start: 0, hour_end: 24 },
        notes:          "−90% off base_price → will be clamped by margin floor",
      },
    ],
  });
  render("Reconfigure with −90% always-on rule", r6, 200);

  // ── Test 7: floor clamp fires ────────────────────────────────────────────────
  section("TEST 7 — GET /v1/dynprice/current/:sku  (−90% → floor clamp)");
  const r7 = await call("GET", `/v1/dynprice/current/${SKU}?channel=${CHANNEL}`, KEY);
  render("Price eval — −90% off 1299 = QAR 129.90 → clamped to margin floor", r7, 200);
  const r7body = r7.body as any;
  if (r7.status === 200) {
    const winner   = r7body.adjustment;
    const proposed = winner?.proposed_price;
    const floor    = r7body.floor;
    const final    = r7body.final_price;
    console.log(`    → Winner rule:   "${winner?.rule_name}"  (priority: ${winner?.priority})`);
    console.log(`    → adj_pct:       ${winner?.adjustment_pct}  (−90% off base QAR 1299)`);
    console.log(`    → proposed:      QAR ${proposed}  (= 1299 × 0.10)`);
    console.log(`    → floor_price:   QAR ${floor?.floor_price}  (expected ~QAR ${EXPECTED_FLOOR})`);
    console.log(`    → floor_clamped: ${floor?.clamped}  ← MUST BE TRUE`);
    console.log(`    → final_price:   QAR ${final}  (= floor)`);
    console.log(`    → clamp_reason:  ${floor?.clamp_reason}`);
  }

  // ── Test 8: audit trail ──────────────────────────────────────────────────────
  section("TEST 8 — GET /v1/dynprice/audit/:sku  (3 decisions in audit log)");
  const r8 = await call("GET", `/v1/dynprice/audit/${SKU}?limit=10`, KEY);
  render("Audit log for SONY-WH1000XM5 — expect 3 dynprice_engine_v1 entries", r8, 200);
  const audits = (r8.body as any)?.data ?? [];
  console.log(`    → ${audits.length} audit record(s):`);
  for (const a of audits) {
    const snap = a.inputs_snapshot ?? {};
    console.log(`      • rule: "${a.rule_fired ?? "none"}"  final: QAR ${a.recommended_price}  floor_clamped: ${snap.floor_clamped}  ts: ${a.created_at?.slice(0,19)}`);
  }

  // ── Test 9: validation error ─────────────────────────────────────────────────
  section("TEST 9 — POST /v1/dynprice/events/custom  (bad payload → 422)");
  const r9 = await call("POST", "/v1/dynprice/events/custom", KEY, {
    name:       "Missing event_type and dates",
    event_type: "invalid_type",
  });
  render("Bad event_type → 422 validation error", r9, 422);

  // ── Summary ───────────────────────────────────────────────────────────────────
  const results = [
    { n:1, label:"POST /v1/dynprice/config",            hit: r1, expect: 200 },
    { n:2, label:"GET  /v1/dynprice/events",             hit: r2, expect: 200 },
    { n:3, label:"GET  /v1/dynprice/current (TW wins)", hit: r3, expect: 200 },
    { n:4, label:"POST /v1/dynprice/events/custom",      hit: r4, expect: 201 },
    { n:5, label:"GET  /v1/dynprice/current (WF wins)", hit: r5, expect: 200 },
    { n:6, label:"POST /v1/dynprice/config  (re-cfg)",  hit: r6, expect: 200 },
    { n:7, label:"GET  /v1/dynprice/current (clamped)", hit: r7, expect: 200 },
    { n:8, label:"GET  /v1/dynprice/audit/:sku",         hit: r8, expect: 200 },
    { n:9, label:"POST /v1/dynprice/events/custom (422)",hit: r9, expect: 422 },
  ];

  console.log(`\n${"═".repeat(72)}`);
  console.log("  SUMMARY");
  console.log(`${"═".repeat(72)}`);
  let pass = 0;
  for (const { n, label, hit, expect } of results) {
    const ok = hit.status === expect;
    if (ok) pass++;
    console.log(`  ${ok ? "✓" : "✗"}  [${n}]  ${label.padEnd(42)} HTTP ${hit.status} (${hit.ms} ms)`);
  }
  console.log(`${"═".repeat(72)}`);
  console.log(`  ${pass}/${results.length} passed`);

} finally {
  await cleanup();
  console.log("\n  Cleanup: test key + dynprice config/rules + custom event removed.");
}

function round2(n: number) { return Math.round(n * 100) / 100; }
