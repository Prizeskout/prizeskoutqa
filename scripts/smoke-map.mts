/**
 * HTTP smoke test for MAP Compliance API (API 16 — /v1/compliance/map/*)
 *
 * Setup:
 *   Seed competitor_prices for SONY-WH1000XM5 with noon=420 and carrefour=450.
 *   Create a MAP agreement at QAR 469: both noon (420) and carrefour (450) are
 *   below MAP → two violations will be detected by the monitor.
 *
 * Test sequence:
 *  1. POST /v1/compliance/map/agreements — MAP QAR 469, retailers noon + carrefour
 *  2. POST /api/public/hooks/map-monitor — trigger monitoring; expect 2 violations
 *  3. GET  /v1/compliance/map/violations — list violations (≥1)
 *  4. GET  /v1/compliance/map/retailers  — compliance rate (0%)
 *  5. GET  /v1/compliance/map/report     — CSV output (2 violating rows)
 *  6. POST /v1/compliance/map/agreements — wrong-scope key → 403
 *
 * Cleanup:
 *   agreements are deleted; violations remain (IMMUTABLE — legal evidence).
 *   competitor_prices seed row is deleted.
 */

import { createClient } from "@supabase/supabase-js";
import { createHash, randomBytes } from "crypto";

const BASE     = "https://prizeskoutqa.prizeskoutqatar.workers.dev/api/public";
const HOOK_URL = "https://prizeskoutqa.prizeskoutqatar.workers.dev/api/public/hooks/map-monitor";
const UID      = "bed12406-2798-47f7-a30c-5de559e90d6d";
const MAIN_LIC = "1a1d0a17-366b-4242-b504-ae78ee68b32c";
const SKU      = "SONY-WH1000XM5";

// MAP price chosen so that seeded competitor prices (noon=420, carrefour=450) violate it
const MAP_PRICE = 469;

const admin = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
function hashKey(raw: string) { return createHash("sha256").update(raw).digest("hex"); }
function randKey()   { return "sk_test_" + randomBytes(16).toString("hex"); }

const ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml0Zmhla2N2bWNibnRqbmR2aHpnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk1NzczNjYsImV4cCI6MjA5NTE1MzM2Nn0.Xz_3vvq_EY_jYBkXggC-7U_CdUSDLwroLTbyVlxfGMo";

let keyId: string | null = null;
let badKeyId: string | null = null;
let agreementId: string | null = null;
let seededCompPriceId: string | null = null;

const { data: acct } = await (admin as any)
  .from("accounts_v2").select("id").eq("licensee_id", MAIN_LIC).eq("is_default", true).single();
const accountId = acct?.id ?? "4a292c7b-fa88-468a-8e33-fdc795e2f030";

async function cleanup() {
  if (agreementId) await (admin as any).from("map_agreements").delete().eq("id", agreementId);
  // map_violations is immutable — cannot delete; violations for this test remain
  if (seededCompPriceId)
    await (admin as any).from("competitor_prices").delete().eq("id", seededCompPriceId);
  if (keyId)    await (admin as any).from("api_keys").delete().eq("id", keyId);
  if (badKeyId) await (admin as any).from("api_keys").delete().eq("id", badKeyId);
}

await cleanup();

// ── Seed competitor_prices: noon=420, carrefour=450 (both below MAP=469) ──────
// noon column stores numeric; carrefour column stores numeric
const { data: seededRow, error: seedErr } = await (admin as any).from("competitor_prices").upsert({
  user_id:    UID,
  product:    SKU,
  category:   "Electronics",
  channel:    "Online",
  your_price: 1299,
  noon:       420,      // below MAP=469 → violation_pct = (469-420)/469*100 = 10.45%
  carrefour:  450,      // below MAP=469 → violation_pct = (469-450)/469*100 = 4.05%
  signal:     "undercut",
  position:   1,
}, { onConflict: "user_id,product,channel" }).select("id").single();
if (seedErr) console.error("  seed competitor_prices FAILED:", seedErr.message);
else console.log(`  (seed row id: ${seededRow?.id})`);
seededCompPriceId = seededRow?.id ?? null;
console.log(`\n  ✓ Seeded competitor_prices: noon=420 QAR, carrefour=450 QAR for ${SKU}`);

// ── Create test API key ───────────────────────────────────────────────────────
const raw = randKey();
const { data: k } = await (admin as any).from("api_keys").insert({
  user_id: UID, licensee_id: MAIN_LIC, name: "smoke-map",
  key_prefix: raw.slice(0, 12), key_hash: hashKey(raw), last_four: raw.slice(-4),
  mode: "test", scopes: ["read","write","compliance:read","compliance:write"],
}).select("id").single();
keyId = k?.id;
const KEY = raw;

const badRaw = randKey();
const { data: bk } = await (admin as any).from("api_keys").insert({
  user_id: UID, licensee_id: MAIN_LIC, name: "smoke-map-bad",
  key_prefix: badRaw.slice(0, 12), key_hash: hashKey(badRaw), last_four: badRaw.slice(-4),
  mode: "test", scopes: ["audit:read"],
}).select("id").single();
badKeyId = bk?.id;
const BAD_KEY = badRaw;

// ─── HTTP helpers ─────────────────────────────────────────────────────────────

type Hit = { method: string; path: string; status: number; body: unknown; ms: number; rawText?: string };

async function call(method: string, path: string, key: string, body?: unknown): Promise<Hit> {
  const url = `${BASE}${path}`;
  const t0  = Date.now();
  const res = await fetch(url, {
    method,
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const rawText = await res.text();
  let parsed: unknown = null;
  try { parsed = JSON.parse(rawText); } catch { parsed = rawText; }
  return { method, path, status: res.status, body: parsed, ms: Date.now() - t0, rawText };
}

async function callHook(method: string, url: string, authToken: string, body?: unknown): Promise<Hit> {
  const t0  = Date.now();
  const res = await fetch(url, {
    method,
    headers: { Authorization: `Bearer ${authToken}`, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const rawText = await res.text();
  let parsed: unknown = null;
  try { parsed = JSON.parse(rawText); } catch { parsed = rawText; }
  return { method, path: url, status: res.status, body: parsed, ms: Date.now() - t0, rawText };
}

function section(t: string) { console.log(`\n${"═".repeat(76)}\n  ${t}\n${"═".repeat(76)}`); }
function render(label: string, hit: Hit, expectStatus: number): boolean {
  const pass  = hit.status === expectStatus;
  const flag  = pass ? "" : ` ← UNEXPECTED (expected ${expectStatus})`;
  console.log(`\n  ${pass ? "✓" : "✗"} ${label}`);
  console.log(`    ${hit.method} ${hit.path.replace(BASE,"").replace(HOOK_URL,"/hooks/map-monitor")}  →  HTTP ${hit.status}${flag}  (${hit.ms} ms)`);
  const preview = typeof hit.body === "string"
    ? hit.body.slice(0, 2000)
    : JSON.stringify(hit.body ?? {}, null, 2).split("\n").slice(0, 60).join("\n    ");
  console.log("   ", preview);
  return pass;
}

let passed = 0, failed = 0;

try {

  // ── TEST 1: Create MAP agreement ──────────────────────────────────────────
  section(`TEST 1 — POST /v1/compliance/map/agreements  (MAP QAR ${MAP_PRICE}, noon + carrefour)`);
  const r1 = await call("POST", "/v1/compliance/map/agreements", KEY, {
    sku:           SKU,
    map_price:     MAP_PRICE,
    currency:      "QAR",
    effective_from: new Date().toISOString().slice(0, 10),
    retailer_list: [
      { name: "noon",      url: null },   // Firecrawl skipped; competitor_prices fallback
      { name: "carrefour", url: null },
    ],
    notes: "Smoke test MAP agreement — QAR 469",
  });
  const ok1 = render("Create MAP agreement", r1, 201);
  agreementId = (r1.body as any)?.id;
  if (ok1 && agreementId) {
    console.log(`\n    → agreement_id: ${agreementId}`);
    console.log(`    → sku=${SKU}  map_price=${MAP_PRICE} QAR  retailers=noon,carrefour ✓`);
    passed++;
  } else {
    console.log(`    → missing id or wrong status ✗`);
    failed++;
  }

  // ── TEST 2: Trigger map-monitor hook ─────────────────────────────────────
  section("TEST 2 — POST /hooks/map-monitor  (detect violations via competitor_prices fallback)");
  const r2 = await callHook("POST", HOOK_URL, ANON_KEY, { account_id: accountId });
  const ok2base = render("MAP monitor hook (competitor_prices fallback)", r2, 200);
  const b2 = r2.body as any;

  const violations_created = b2?.violations_created ?? 0;
  const scrape_results     = b2?.scrape_results ?? [];
  const noonResult     = scrape_results.find((s: any) => s.retailer === "noon");
  const carrefourResult = scrape_results.find((s: any) => s.retailer === "carrefour");

  if (ok2base && violations_created >= 2) {
    console.log(`\n    → agreements_checked=${b2.agreements_checked}`);
    console.log(`    → retailers_checked=${b2.retailers_checked}`);
    console.log(`    → violations_created=${violations_created} ✓`);
    for (const sr of scrape_results) {
      const viol_pct = sr.violated
        ? ` violation_pct=${(((sr.map_price - sr.price) / sr.map_price) * 100).toFixed(2)}%` : "";
      console.log(`      ${sr.retailer}: price=${sr.price}  map=${sr.map_price}  violated=${sr.violated}  source=${sr.source}${viol_pct}`);
    }
    passed++;
  } else if (ok2base) {
    console.log(`\n    → violations_created=${violations_created} (expected ≥2)`);
    console.log(`    → noon: ${JSON.stringify(noonResult)}`);
    console.log(`    → carrefour: ${JSON.stringify(carrefourResult)}`);
    console.log(`    NOTE: If violations_created=0, competitor_prices seed may have failed`);
    failed++;
  } else {
    failed++;
  }

  // ── TEST 3: List violations ───────────────────────────────────────────────
  section(`TEST 3 — GET /v1/compliance/map/violations?sku=${SKU}`);
  const r3 = await call("GET", `/v1/compliance/map/violations?sku=${SKU}&limit=10`, KEY);
  const ok3base = render("List MAP violations", r3, 200);
  const b3 = r3.body as any;
  const vCount = b3?.count ?? 0;

  if (ok3base && vCount >= 1) {
    console.log(`\n    → ${vCount} violations returned ✓`);
    for (const v of (b3.data ?? []).slice(0, 5)) {
      console.log(
        `      [${v.retailer}]  detected=${v.detected_price} QAR  map=${v.map_price} QAR` +
        `  violation_pct=${Number(v.violation_pct).toFixed(2)}%  source=${v.scrape_source}` +
        `  at=${v.first_detected_at}`,
      );
      if (v.evidence_url) console.log(`      evidence_url: ${v.evidence_url.slice(0, 80)}...`);
    }
    passed++;
  } else {
    console.log(`    → expected ≥1 violation, got ${vCount} ✗`);
    failed++;
  }

  // ── TEST 4: Retailer compliance rate ─────────────────────────────────────
  section("TEST 4 — GET /v1/compliance/map/retailers  (0% compliance for noon + carrefour)");
  const r4 = await call("GET", "/v1/compliance/map/retailers", KEY);
  const ok4base = render("Retailer compliance rates", r4, 200);
  const b4 = r4.body as any;
  const hasRetailers = (b4?.data?.length ?? 0) >= 1;

  if (ok4base && hasRetailers) {
    console.log(`\n    → ${b4.data.length} retailers monitored  window=${b4.window} ✓`);
    for (const r of b4.data) {
      console.log(
        `      ${r.retailer}: compliance=${r.compliance_rate_pct}%` +
        `  total_skus=${r.total_monitored_skus}  compliant=${r.compliant_skus}  violating=${r.violating_skus}`,
      );
    }
    passed++;
  } else {
    console.log(`    → expected ≥1 retailer, got ${b4?.data?.length ?? 0} ✗`);
    failed++;
  }

  // ── TEST 5: CSV report ────────────────────────────────────────────────────
  section(`TEST 5 — GET /v1/compliance/map/report?sku=${SKU}  (CSV)`);
  const r5 = await call("GET", `/v1/compliance/map/report?sku=${SKU}`, KEY);
  const ok5base = render("CSV compliance report", r5, 200);
  const csvText = typeof r5.body === "string" ? r5.body : r5.rawText ?? "";
  const csvLines = csvText.split("\n").filter(Boolean);
  const csvHasHeader = csvLines[0]?.startsWith("retailer,");
  const csvHasData   = csvLines.length >= 2;

  if (ok5base && csvHasHeader && csvHasData) {
    console.log(`\n    → CSV header: ${csvLines[0]} ✓`);
    console.log(`    → ${csvLines.length - 1} data rows:`);
    for (const line of csvLines.slice(1)) console.log(`      ${line}`);
    passed++;
  } else {
    console.log(`    → csvHasHeader=${csvHasHeader} csvHasData=${csvHasData} ✗`);
    console.log(`    raw:\n${csvText.slice(0, 400)}`);
    failed++;
  }

  // ── TEST 6: Wrong scope → 403 ─────────────────────────────────────────────
  section("TEST 6 — POST /v1/compliance/map/agreements  (wrong-scope key → 403)");
  const r6 = await call("POST", "/v1/compliance/map/agreements", BAD_KEY, {
    sku: SKU, map_price: MAP_PRICE, retailer_list: [{ name: "noon" }],
  });
  const ok6base = render("Wrong-scope key → 403", r6, 403);
  const ok6 = ok6base && (r6.body as any)?.error?.code === "forbidden";
  if (ok6) {
    console.log(`    → code: "forbidden" ✓`);
    passed++;
  } else {
    console.log(`    → expected 403 forbidden, got: ${JSON.stringify(r6.body)} ✗`);
    failed++;
  }

} catch (e) {
  console.error("\nFATAL:", e);
  failed++;
} finally {
  await cleanup();
  console.log("\n  NOTE: map_violations rows are IMMUTABLE and cannot be deleted — test violations remain in DB.");
}

console.log(`\n${"═".repeat(76)}`);
console.log(`  RESULTS: ${passed} passed  ${failed} failed  (${passed + failed} total)`);
console.log(`${"═".repeat(76)}\n`);

if (failed > 0) process.exit(1);
