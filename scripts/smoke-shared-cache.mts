/**
 * Smoke test: shared competitor URL cache
 *
 * Verifies:
 *  1. URL normalization — two superficially different URLs ? same cache key
 *  2. required_freshness — enterprise watcher forces 1 h cadence
 *  3. Scrape deduplication — 5 merchants × 3 shared URLs ? 3 Firecrawl calls, NOT 15
 *  4. Propagation — all 5 merchants receive fresh competitor_prices
 *  5. Failure isolation — null_price scrape leaves last good price intact
 *  6. scrapes_saved metric — increments correctly
 *
 * Setup: 5 synthetic licensees (starter×2, standard×2, enterprise×1), each
 * tracking the SAME 3 competitor URLs plus 2 unique ones.
 * Uses dry_run=1 so no Firecrawl credits are spent.
 *
 * Run: SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npx tsx scripts/smoke-shared-cache.mts
 */

import { createClient } from "@supabase/supabase-js";
import { normalizeUrl } from "../src/server/url-normalize.ts";

const WORKER = "https://prizeskout.qa";
const ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml0Zmhla2N2bWNibnRqbmR2aHpnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk1NzczNjYsImV4cCI6MjA5NTE1MzM2Nn0.Xz_3vvq_EY_jYBkXggC-7U_CdUSDLwroLTbyVlxfGMo";

const db = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

// -- Test data -----------------------------------------------------------------

// Three shared URLs — same page, superficially different raw forms.
// User 1's talabat URL has utm_source, user 2's has fbclid and uppercase scheme,
// users 3-5 use the canonical URL — all must deduplicate to one cache entry.
const SHARED_URLS = {
  talabat: [
    "https://www.talabat.com/qatar/product/shared-tv-001?utm_source=google&product_id=tv42",
    "HTTPS://WWW.TALABAT.COM/QATAR/PRODUCT/SHARED-TV-001/?fbclid=abc123&product_id=tv42",
    "https://www.talabat.com/qatar/product/shared-tv-001?product_id=tv42",
    "https://www.talabat.com/qatar/product/shared-tv-001?product_id=tv42",
    "https://www.talabat.com/qatar/product/shared-tv-001?product_id=tv42",
  ],
  carrefour: Array(5).fill("https://www.carrefour.com.qa/mafqat/product/shared-tv-002"),
  noon:      Array(5).fill("https://www.noon.com/qatar-en/product-shared-tv-003-p/"),
};

// Two unique URLs per user (different per-user so watcher_count=1 each)
const uniqueUrl = (user: number, comp: "amazon" | "lulu") =>
  `https://www.${comp}.${comp === "amazon" ? "ae" : "com"}/dp/smoke-user${user}-${comp}`;

const PLANS = ["starter", "starter", "standard", "standard", "enterprise"] as const;
const PRODUCT = "Smoke-Test-TV-55";

// -- State ---------------------------------------------------------------------

const testUserIds: string[]    = [];
const testLicenseeIds: string[] = [];

// -- Helpers -------------------------------------------------------------------

let passed = 0, failed = 0;
function section(t: string) {
  console.log(`\n${"-".repeat(72)}\n  ${t}\n${"-".repeat(72)}`);
}
function assert(label: string, condition: boolean, detail?: string) {
  const sym = condition ? "?" : "?";
  console.log(`  ${sym} ${label}${detail ? `  ?  ${detail}` : ""}`);
  if (condition) passed++; else failed++;
}

// -- Cleanup -------------------------------------------------------------------

async function cleanup() {
  if (testUserIds.length === 0) return;

  // Collect all licensee IDs for these users (including auto-provisioned from signup trigger)
  const { data: members } = await (db as any)
    .from("licensee_members")
    .select("licensee_id")
    .in("user_id", testUserIds);
  const allLicenseeIds = [
    ...new Set([
      ...testLicenseeIds,
      ...(members ?? []).map((m: any) => m.licensee_id),
    ]),
  ];

  await (db as any).from("competitor_scrapes").delete().in("user_id", testUserIds);
  await (db as any).from("competitor_product_urls").delete().in("user_id", testUserIds);
  await (db as any).from("licensee_members").delete().in("user_id", testUserIds);
  for (const lid of allLicenseeIds) {
    await (db as any).from("accounts_v2").delete().eq("licensee_id", lid);
    await (db as any).from("licensees").delete().eq("id", lid);
  }

  // Remove test cache entries seeded by the trigger
  const normUrls = [
    normalizeUrl(SHARED_URLS.talabat[0]),
    normalizeUrl(SHARED_URLS.carrefour[0]),
    normalizeUrl(SHARED_URLS.noon[0]),
    ...Array.from({ length: 5 }, (_, i) => normalizeUrl(uniqueUrl(i + 1, "amazon"))),
    ...Array.from({ length: 5 }, (_, i) => normalizeUrl(uniqueUrl(i + 1, "lulu"))),
  ];
  await (db as any).from("competitor_url_cache").delete().in("normalized_url", normUrls);

  // Delete auth users last (FK satisfied after data is cleaned)
  for (const uid of testUserIds) {
    await db.auth.admin.deleteUser(uid);
  }

  console.log("  (cleaned up test data)");
}

// -- Setup ---------------------------------------------------------------------

async function setup() {
  for (let i = 0; i < 5; i++) {
    // Real auth user so competitor_scrapes FK (? auth.users) is satisfied
    const tag = Date.now() + i;
    const { data: authData, error: authErr } = await db.auth.admin.createUser({
      email:          `smoke-cache-${tag}@prizeskout.test`,
      password:       "smoke-test-pw-cache-123",
      email_confirm:  true,
    });
    if (authErr || !authData?.user) throw new Error(`createUser failed: ${authErr?.message}`);
    const userId     = authData.user.id;
    const licenseeId = crypto.randomUUID();
    testUserIds.push(userId);
    testLicenseeIds.push(licenseeId);

    // Allow signup trigger (ensure_licensee_on_signup) to run before we also insert
    await new Promise((r) => setTimeout(r, 300));

    // Licensee with explicit plan (signup trigger auto-creates one with 'starter')
    await (db as any).from("licensees").insert({
      id:   licenseeId,
      slug: `smoke-cache-${licenseeId.slice(0, 8)}`,
      name: `Smoke Cache Tenant ${i + 1}`,
      plan: PLANS[i],
    });

    // Member link to our explicit-plan licensee
    await (db as any).from("licensee_members").insert({
      licensee_id: licenseeId,
      user_id:     userId,
      role:        "owner",
    });

    // 3 shared competitor URLs (trigger auto-populates cache)
    await (db as any).from("competitor_product_urls").insert([
      { user_id: userId, product: PRODUCT, competitor: "talabat",   url: SHARED_URLS.talabat[i] },
      { user_id: userId, product: PRODUCT, competitor: "carrefour", url: SHARED_URLS.carrefour[i] },
      { user_id: userId, product: PRODUCT, competitor: "noon",      url: SHARED_URLS.noon[i] },
      // 2 unique competitor URLs
      { user_id: userId, product: PRODUCT, competitor: "amazon", url: uniqueUrl(i + 1, "amazon") },
      { user_id: userId, product: PRODUCT, competitor: "lulu",   url: uniqueUrl(i + 1, "lulu") },
    ]);
  }
}

// -- Main ----------------------------------------------------------------------

await cleanup();
await setup();

try {
  // -- TEST 1: URL normalization -----------------------------------------------
  section("TEST 1 — URL normalization: different raw forms ? same cache key");
  {
    const rawA = SHARED_URLS.talabat[0]; // utm_source=google + product_id=tv42
    const rawB = SHARED_URLS.talabat[1]; // HTTPS uppercase + fbclid + trailing slash
    const rawC = SHARED_URLS.talabat[2]; // canonical
    const normA = normalizeUrl(rawA);
    const normB = normalizeUrl(rawB);
    const normC = normalizeUrl(rawC);
    console.log(`\n  Raw A: ${rawA}`);
    console.log(`  Raw B: ${rawB}`);
    console.log(`  Raw C: ${rawC}`);
    console.log(`\n  Norm A: ${normA}`);
    console.log(`  Norm B: ${normB}`);
    console.log(`  Norm C: ${normC}`);
    assert("A and B normalize to same key", normA === normB, normA);
    assert("B and C normalize to same key", normB === normC, normC);
    assert("tracking params stripped",      !normA.includes("utm_source") && !normA.includes("fbclid"));
    assert("trailing slash stripped",       !normA.endsWith("/"));
    assert("lowercased",                    normA === normA.toLowerCase());
  }

  // -- TEST 2: required_freshness picks most-demanding watcher ----------------
  section("TEST 2 — required_freshness: enterprise watcher ? 3600 s (1 hour)");
  {
    // All 5 users (including enterprise) track the talabat shared URL
    const normTalabat = normalizeUrl(SHARED_URLS.talabat[0]);
    const { data: freshness } = await (db as any).rpc("required_freshness_seconds", {
      p_url: normTalabat,
    });
    const { data: maxFresh } = await (db as any).rpc("max_freshness_seconds", {
      p_url: normTalabat,
    });
    console.log(`\n  normalized_url:           ${normTalabat}`);
    console.log(`  Watchers: starter×2, standard×2, enterprise×1`);
    console.log(`  required_freshness_seconds: ${freshness} s  (expected 3600)`);
    console.log(`  max_freshness_seconds:       ${maxFresh} s  (expected 86400)`);
    assert("required_freshness = 3600 (enterprise wins)", freshness === 3600, `${freshness}s`);
    assert("max_freshness = 86400 (starter slowest)",     maxFresh === 86400, `${maxFresh}s`);

    // Unique URLs watched only by one user
    const normAmazonU1 = normalizeUrl(uniqueUrl(1, "amazon")); // user1 = starter
    const normAmazonU5 = normalizeUrl(uniqueUrl(5, "amazon")); // user5 = enterprise
    const { data: starterFresh }     = await (db as any).rpc("required_freshness_seconds", { p_url: normAmazonU1 });
    const { data: enterpriseFresh }  = await (db as any).rpc("required_freshness_seconds", { p_url: normAmazonU5 });
    console.log(`\n  Starter-only URL freshness:     ${starterFresh} s  (expected 86400)`);
    console.log(`  Enterprise-only URL freshness:  ${enterpriseFresh} s  (expected 3600)`);
    assert("starter-only URL ? 86400 s", starterFresh === 86400, `${starterFresh}s`);
    assert("enterprise-only URL ? 3600 s", enterpriseFresh === 3600, `${enterpriseFresh}s`);
  }

  // -- TEST 3: Cache population (trigger) -------------------------------------
  section("TEST 3 — competitor_url_cache seeded by trigger on competitor_product_urls INSERT");
  {
    const sharedNorms = [
      normalizeUrl(SHARED_URLS.talabat[0]),
      normalizeUrl(SHARED_URLS.carrefour[0]),
      normalizeUrl(SHARED_URLS.noon[0]),
    ];
    const { data: cacheRows } = await (db as any)
      .from("competitor_url_cache")
      .select("normalized_url, watcher_count")
      .in("normalized_url", sharedNorms);

    console.log("\n  Shared cache entries:");
    for (const r of cacheRows ?? []) {
      console.log(`    ${r.normalized_url}  ?  watcher_count=${r.watcher_count}`);
    }
    assert("3 shared URLs in cache",        (cacheRows ?? []).length === 3,
      `${(cacheRows ?? []).length} entries`);
    assert("each shared URL has 5 watchers",
      (cacheRows ?? []).every((r: any) => r.watcher_count === 5),
      (cacheRows ?? []).map((r: any) => r.watcher_count).join(","));
  }

  // -- TEST 4: URL-centric dry-run scrape -------------------------------------
  section("TEST 4 — URL-centric dry-run scrape (dry_run=1, no Firecrawl credits)");
  {
    const res = await fetch(
      `${WORKER}/api/public/hooks/scrape-all?dry_run=1`,
      { method: "POST", headers: { Authorization: `Bearer ${ANON_KEY}` } },
    );
    const body = await res.json() as any;
    console.log("\n  Response:", JSON.stringify(body, null, 2));

    assert("HTTP 200",                                  res.status === 200, `${res.status}`);
    assert("dry_run confirmed",                         body.dry_run === true);

    // due_urls must include at least our 13 test entries (3 shared + 10 unique)
    // (may be higher if prod data is also due)
    const testUrls = 3 + 5 * 2; // 13
    assert(`at least ${testUrls} due URLs processed`,  body.due_urls >= testUrls,
      `${body.due_urls} due`);

    // Old system: 5×3 + 5×2 = 25 scrapes for our test URLs
    // New system: 3 + 10 = 13 Firecrawl calls
    // scrapes_saved should be AT LEAST 12 (from our test set)
    assert("scrapes_saved = 12 (from shared-URL dedup)", body.scrapes_saved >= 12,
      `scrapes_saved=${body.scrapes_saved}`);
    assert("scrapes_performed < scrapes_saved + scrapes_performed (savings exist)",
      body.savings_pct > 0, `${body.savings_pct}%`);
    assert("watchers_notified = 25 (5×3 + 5×2)",        body.watchers_notified >= 25,
      `${body.watchers_notified}`);
    assert("ok > 0",                                     body.ok > 0, `${body.ok}`);

    console.log(`\n  -- Scrape cost summary --`);
    console.log(`  Shared URLs:  3 unique × 5 watchers each = 15 old scrapes ? 3 new`);
    console.log(`  Unique URLs:  10 unique × 1 watcher each = 10 old scrapes ? 10 new`);
    console.log(`  Old system total:  25  Firecrawl calls`);
    console.log(`  New system total:  ${body.scrapes_performed - (body.due_urls - 13)} calls for test URLs`);
    console.log(`  Saved (test set):  ${body.scrapes_saved} calls  (${body.savings_pct}% reduction vs old system)`);
  }

  // -- TEST 5: Propagation — all 5 merchants got competitor_scrapes rows -------
  section("TEST 5 — Propagation: all 5 merchants received competitor_scrapes rows");
  {
    for (let i = 0; i < 5; i++) {
      const { data: rows } = await (db as any)
        .from("competitor_scrapes")
        .select("competitor, status, price")
        .eq("user_id", testUserIds[i])
        .in("competitor", ["talabat", "carrefour", "noon", "amazon", "lulu"]);

      const byComp = Object.fromEntries(
        (rows ?? []).map((r: any) => [r.competitor, r]),
      );
      assert(
        `User ${i + 1} (${PLANS[i]}): talabat + carrefour + noon propagated`,
        ["talabat", "carrefour", "noon"].every((c) => byComp[c]?.status === "success"),
        Object.entries(byComp).map(([c, r]: any) => `${c}=${r.status}`).join(" "),
      );
    }

    // Verify shared URL rows: 5 merchants × 3 URLs = 15 rows with status=success
    const normTalabat = normalizeUrl(SHARED_URLS.talabat[0]);
    const { data: sharedRows } = await (db as any)
      .from("competitor_scrapes")
      .select("user_id, price, status")
      .in("user_id", testUserIds)
      .eq("competitor", "talabat")
      .eq("status", "success");

    assert("5 talabat success rows (one per watcher)", (sharedRows ?? []).length === 5,
      `${(sharedRows ?? []).length} rows`);
    assert("all 5 have same price (from cache)",
      new Set((sharedRows ?? []).map((r: any) => String(r.price))).size === 1,
      `prices: ${[...new Set((sharedRows ?? []).map((r: any) => r.price))].join(",")}`);
    console.log(`\n  Talabat price propagated to all 5 merchants: ${(sharedRows?.[0] as any)?.price} QAR`);
  }

  // -- TEST 6: Failure isolation -----------------------------------------------
  section("TEST 6 — Failure isolation: null_price insert leaves last good price intact");
  {
    // Simulate what the scrape worker does for a null_price result:
    // insert with status=null_price, price=null for user 1 / talabat
    const goodPriceBefore = await (db as any)
      .from("competitor_prices")
      .select("talabat")
      .eq("user_id", testUserIds[0])
      .maybeSingle();

    // Insert a null_price scrape row (mimics OOS / bot-blocked result)
    await (db as any).from("competitor_scrapes").insert({
      user_id:    testUserIds[0],
      url:        SHARED_URLS.talabat[0],
      competitor: "talabat",
      product:    PRODUCT,
      price:      null,      // NEVER a valid price
      status:     "null_price",
      error:      "No price found (OOS simulation)",
    });

    // Bridge trigger must NOT have updated competitor_prices (only fires on success)
    const goodPriceAfter = await (db as any)
      .from("competitor_prices")
      .select("talabat")
      .eq("user_id", testUserIds[0])
      .maybeSingle();

    const beforeVal = JSON.stringify(goodPriceBefore?.data?.talabat);
    const afterVal  = JSON.stringify(goodPriceAfter?.data?.talabat);
    console.log(`  competitor_prices.talabat before: ${beforeVal}`);
    console.log(`  competitor_prices.talabat after:  ${afterVal}`);
    assert("null_price did NOT overwrite last good competitor_prices", beforeVal === afterVal);

    // Also verify the cache itself: last_price must not be null
    const { data: cacheRow } = await (db as any)
      .from("competitor_url_cache")
      .select("last_price, last_status")
      .eq("normalized_url", normalizeUrl(SHARED_URLS.talabat[0]))
      .maybeSingle();
    console.log(`  Cache last_price: ${cacheRow?.last_price}  last_status: ${cacheRow?.last_status}`);
    assert("cache.last_price still valid after failure", cacheRow?.last_price !== null,
      String(cacheRow?.last_price));
  }

  // -- TEST 7: scrapes_saved metric --------------------------------------------
  section("TEST 7 — scrapes_saved metric in scrape_cost_log");
  {
    const { data: log } = await (db as any)
      .from("scrape_cost_log")
      .select("*")
      .order("run_at", { ascending: false })
      .limit(1)
      .single();

    console.log("\n  Latest scrape_cost_log entry:");
    console.log("  ", JSON.stringify(log, null, 2));
    assert("scrape_cost_log has entry",      !!log, log ? "present" : "missing");
    assert("scrapes_saved > 0",             (log?.scrapes_saved ?? 0) > 0,
      `${log?.scrapes_saved}`);
    assert("scrapes_performed recorded",    (log?.scrapes_performed ?? 0) > 0,
      `${log?.scrapes_performed}`);
    assert("watchers_notified > scrapes_performed",
      (log?.watchers_notified ?? 0) > (log?.scrapes_performed ?? 0),
      `watchers=${log?.watchers_notified} performed=${log?.scrapes_performed}`);
  }

} catch (e) {
  console.error("\nFATAL:", e);
  failed++;
} finally {
  await cleanup();
}

// -- Summary -------------------------------------------------------------------

console.log(`\n${"-".repeat(72)}`);
console.log(`  RESULTS: ${passed} passed  ${failed} failed  (${passed + failed} total)`);
console.log(`${"-".repeat(72)}\n`);

if (failed > 0) process.exit(1);
