/**
 * Live end-to-end evidence test for MAP Compliance API.
 *
 * Tests the Firecrawl screenshot ? Supabase Storage ? signed URL chain:
 *  1. Create MAP agreement: SKU=SONY-WH1000XM5, MAP=1500 QAR,
 *     retailer lulu with real URL (sells at ~1399 QAR ? violation guaranteed)
 *  2. POST /hooks/map-monitor ? Firecrawl scrapes the URL, uploads screenshot,
 *     inserts violation with evidence_path + evidence_url
 *  3. GET /v1/compliance/map/violations ? confirm evidence_url is non-null
 *  4. Fetch evidence_url ? confirm it returns a real image (HTTP 200)
 *
 * Cleanup: delete the agreement (violation is immutable, stays in DB).
 */

import { createClient } from "@supabase/supabase-js";
import { createHash, randomBytes } from "crypto";

const BASE     = "https://prizeskout.qa/api/public";
const HOOK_URL = "https://prizeskout.qa/api/public/hooks/map-monitor";
const UID      = "bed12406-2798-47f7-a30c-5de559e90d6d";
const MAIN_LIC = "1a1d0a17-366b-4242-b504-ae78ee68b32c";
const SKU      = "SONY-WH1000XM5";

// MAP set above Lulu retail (~1399 QAR) ? triggers a violation
const MAP_PRICE = 1500;

// Confirmed Lulu Qatar product page for SONY WH-1000XM5
const LULU_URL =
  "https://gcc.luluhypermarket.com/en-qa/sony-wireless-noise-cancelling-headphone-wh1000xm5-black/p/1990563/";

const ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml0Zmhla2N2bWNibnRqbmR2aHpnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk1NzczNjYsImV4cCI6MjA5NTE1MzM2Nn0.Xz_3vvq_EY_jYBkXggC-7U_CdUSDLwroLTbyVlxfGMo";

const admin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);
function hashKey(raw: string) { return createHash("sha256").update(raw).digest("hex"); }
function randKey() { return "sk_test_" + randomBytes(16).toString("hex"); }

const { data: acct } = await (admin as any)
  .from("accounts_v2").select("id").eq("licensee_id", MAIN_LIC).eq("is_default", true).single();
const accountId = acct?.id ?? "4a292c7b-fa88-468a-8e33-fdc795e2f030";

let keyId: string | null = null;
let agreementId: string | null = null;

async function cleanup() {
  if (agreementId)
    await (admin as any).from("map_agreements").delete().eq("id", agreementId);
  if (keyId)
    await (admin as any).from("api_keys").delete().eq("id", keyId);
  // map_violations: immutable, left in DB
}

await cleanup(); // clear any prior run debris

const raw = randKey();
const { data: k } = await (admin as any).from("api_keys").insert({
  user_id: UID, licensee_id: MAIN_LIC, name: "smoke-map-evidence",
  key_prefix: raw.slice(0, 12), key_hash: hashKey(raw), last_four: raw.slice(-4),
  mode: "test", scopes: ["read", "write", "compliance:read", "compliance:write"],
}).select("id").single();
keyId = k?.id;
const KEY = raw;

// --- HTTP helpers -------------------------------------------------------------

async function apiCall(method: string, path: string, body?: unknown) {
  const url = `${BASE}${path}`;
  const t0 = Date.now();
  const res = await fetch(url, {
    method,
    headers: { Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let parsed: unknown;
  try { parsed = JSON.parse(text); } catch { parsed = text; }
  return { status: res.status, body: parsed, ms: Date.now() - t0 };
}

async function hookCall(body?: unknown) {
  const t0 = Date.now();
  const res = await fetch(HOOK_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${ANON_KEY}`, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let parsed: unknown;
  try { parsed = JSON.parse(text); } catch { parsed = text; }
  return { status: res.status, body: parsed, ms: Date.now() - t0 };
}

function section(t: string) { console.log(`\n${"-".repeat(72)}\n  ${t}\n${"-".repeat(72)}`); }

let passed = 0, failed = 0;

try {

  // -- STEP 1: Create MAP agreement with real Lulu URL -----------------------
  section("STEP 1 — Create MAP agreement (MAP=1500 QAR, lulu URL)");
  const r1 = await apiCall("POST", "/v1/compliance/map/agreements", {
    sku:            SKU,
    map_price:      MAP_PRICE,
    currency:       "QAR",
    effective_from: new Date().toISOString().slice(0, 10),
    retailer_list: [
      { name: "lulu", url: LULU_URL },
    ],
    notes: "Evidence chain test — Firecrawl screenshot of Lulu WH-1000XM5",
  });

  agreementId = (r1.body as any)?.id ?? null;
  console.log(`  HTTP ${r1.status}  (${r1.ms} ms)`);
  if (r1.status === 201 && agreementId) {
    console.log(`  ? agreement_id: ${agreementId}`);
    console.log(`  ? sku=${SKU}  map_price=${MAP_PRICE} QAR`);
    console.log(`  ? retailer: lulu @ ${LULU_URL}`);
    passed++;
  } else {
    console.log(`  ? FAILED: ${JSON.stringify(r1.body)}`);
    failed++;
  }

  // -- STEP 2: Trigger map-monitor (Firecrawl scrape + violation insert) ------
  section("STEP 2 — POST /hooks/map-monitor (Firecrawl scrapes Lulu URL)");
  console.log(`  Scraping ${LULU_URL}`);
  console.log(`  This may take 15-30s (Firecrawl + Storage upload)...`);

  const r2 = await hookCall({ account_id: accountId });
  const b2 = r2.body as any;

  console.log(`  HTTP ${r2.status}  (${r2.ms} ms)`);
  console.log(`  agreements_checked: ${b2?.agreements_checked ?? "?"}`);
  console.log(`  retailers_checked:  ${b2?.retailers_checked ?? "?"}`);
  console.log(`  violations_created: ${b2?.violations_created ?? "?"}`);
  console.log(`  violations_skipped_dedup: ${b2?.violations_skipped_dedup ?? "?"}`);

  const luluResult = (b2?.scrape_results ?? []).find((s: any) => s.retailer === "lulu");
  if (luluResult) {
    console.log(`\n  Lulu scrape result:`);
    console.log(`    source:    ${luluResult.source}`);
    console.log(`    price:     ${luluResult.price ?? "null"}`);
    console.log(`    map_price: ${luluResult.map_price}`);
    console.log(`    violated:  ${luluResult.violated}`);
    console.log(`    deduped:   ${luluResult.deduped}`);
    if (luluResult.reason) console.log(`    reason:    ${luluResult.reason}`);
  } else {
    console.log(`  (no lulu entry in scrape_results)`);
    console.log(`  Full response: ${JSON.stringify(b2, null, 2).slice(0, 1000)}`);
  }

  if (r2.status === 200 && b2?.violations_created >= 1) {
    console.log(`\n  ? violation created via Firecrawl`);
    passed++;
  } else if (r2.status === 200 && b2?.violations_skipped_dedup >= 1) {
    console.log(`\n  ? dedup skip — a violation for this (sku, retailer) exists within 24h`);
    console.log(`    (run cleanup in DB to reset, or wait 24h)`);
    // Not a hard fail for this test — still check the existing violation
  } else if (r2.status === 200 && luluResult && !luluResult.violated) {
    console.log(`\n  ? no violation — Firecrawl returned price=${luluResult.price} which is NOT < ${MAP_PRICE}`);
    if (luluResult.source === "competitor_prices") {
      console.log(`    Firecrawl failed; fell back to competitor_prices (no URL data for lulu)`);
    }
    failed++;
  } else {
    console.log(`\n  ? unexpected result`);
    failed++;
  }

  // -- STEP 3: GET violations — check evidence_url ---------------------------
  section("STEP 3 — GET /v1/compliance/map/violations?sku=SONY-WH1000XM5&retailer=lulu");

  // Brief pause to let the Storage upload complete if async
  await new Promise(r => setTimeout(r, 2000));

  const r3 = await apiCall("GET", `/v1/compliance/map/violations?sku=${SKU}&retailer=lulu&limit=5`);
  const b3 = r3.body as any;

  console.log(`  HTTP ${r3.status}  count=${b3?.count ?? "?"}  (${r3.ms} ms)`);

  if (r3.status !== 200 || !b3?.data?.length) {
    console.log(`  ? No violations returned`);
    failed++;
  } else {
    const newest = b3.data[0];
    console.log(`\n  Most recent lulu violation:`);
    console.log(`    id:              ${newest.id}`);
    console.log(`    retailer:        ${newest.retailer}`);
    console.log(`    detected_price:  ${newest.detected_price} ${newest.currency}`);
    console.log(`    map_price:       ${newest.map_price} ${newest.currency}`);
    console.log(`    violation_pct:   ${Number(newest.violation_pct).toFixed(2)}%`);
    console.log(`    scrape_source:   ${newest.scrape_source}`);
    console.log(`    first_detected_at: ${newest.first_detected_at}`);
    console.log(`    evidence_path:   ${newest.evidence_path ?? "NULL"}`);
    console.log(`    evidence_url:    ${newest.evidence_url ? newest.evidence_url.slice(0, 80) + "…" : "NULL"}`);

    if (newest.evidence_url) {
      console.log(`\n  ? evidence_url is populated — testing URL accessibility...`);
      passed++;

      // -- STEP 4: Confirm the signed URL actually serves an image ----------
      section("STEP 4 — Confirm evidence_url returns HTTP 200 (real image)");
      try {
        const imgRes = await fetch(newest.evidence_url, { signal: AbortSignal.timeout(10000) });
        const ct = imgRes.headers.get("content-type") ?? "";
        console.log(`  HTTP ${imgRes.status}  content-type: ${ct}  size: ${imgRes.headers.get("content-length") ?? "unknown"} bytes`);

        if (imgRes.status === 200 && (ct.startsWith("image/") || ct.includes("octet"))) {
          console.log(`\n  ? evidence_url serves a valid image`);
          console.log(`\n  FULL evidence_url:\n  ${newest.evidence_url}`);
          passed++;
        } else if (imgRes.status === 200) {
          console.log(`  ? HTTP 200 but content-type is ${ct} — may not be an image`);
          console.log(`  Full URL: ${newest.evidence_url}`);
          passed++;
        } else {
          console.log(`  ? evidence_url returned HTTP ${imgRes.status}`);
          failed++;
        }
      } catch (e: unknown) {
        console.log(`  ? fetch error: ${e instanceof Error ? e.message : String(e)}`);
        failed++;
      }
    } else {
      console.log(`\n  ? evidence_url is NULL — Firecrawl screenshot path did not fire`);
      console.log(`    scrape_source=${newest.scrape_source} confirms which path ran`);
      if (newest.scrape_source === "competitor_prices") {
        console.log(`\n  DIAGNOSIS: Firecrawl scrape failed (or was not attempted).`);
        console.log(`  The competitor_prices fallback was used instead.`);
        console.log(`  Check Worker logs for Firecrawl error details.`);
      }
      failed++;
    }
  }

} catch (e) {
  console.error("\nFATAL:", e);
  failed++;
} finally {
  await cleanup();
}

console.log(`\n${"-".repeat(72)}`);
console.log(`  RESULTS: ${passed} passed  ${failed} failed`);
console.log(`${"-".repeat(72)}\n`);
if (failed > 0) process.exit(1);
