// Pricing engine verification script.
//
// Divided into five parts that run regardless of DB state:
//
//   PART 1 — Pure-function tests for all three self-price paths (Case A/B/C).
//             These prove the core logic and need no working DB.
//
//   PART 2 — Rule non-overridability tests.
//             Proves margin_floor_pct / moci_ceiling cannot be overridden by
//             soft rules or price_rounding.
//
//   PART 3 — COGS (noData) handling.
//             Shows what nominal_floor_qar does when unit_cost is null.
//
//   PART 4 — DB audit.
//             Checks which tables exist in the live Supabase project and
//             reports any missing migrations.
//
//   PART 5 — Full DB run.
//             If the DB is fully set up (profiles + key tables present), finds
//             the first seeded user, inserts ephemeral test fixtures for Case A
//             against a REAL product, runs runPricingEngineForUser, prints
//             per-product diagnostics, and reports before/after counts.
//
// Usage:
//   npm run verify-engine

import { createClient } from "@supabase/supabase-js";
import {
  computeRecommendations,
  runPricingEngineForUser,
} from "../src/server/pricing-engine.ts";
import {
  evaluateRules,
  type RuleContext,
  type StructuredRule,
} from "../src/server/pricing-rules.ts";

// ── Env check ─────────────────────────────────────────────────────────────────

const SUPABASE_URL = process.env.SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !KEY) {
  console.error("ERROR: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set.");
  console.error("Run via: npm run verify-engine  (passes --env-file=.env.local)");
  process.exit(1);
}

const admin = createClient(SUPABASE_URL, KEY, { auth: { persistSession: false } });

// ── Helpers ────────────────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;

function hr(char = "─", width = 72) {
  console.log(char.repeat(width));
}

function assert(condition: boolean, label: string, detail?: string) {
  if (condition) {
    console.log(`  ✓ ${label}`);
    passed++;
  } else {
    console.log(`  ✗ FAIL: ${label}${detail ? ` — ${detail}` : ""}`);
    failed++;
  }
}

function section(title: string) {
  console.log();
  hr("═");
  console.log(`  ${title}`);
  hr("═");
}

function sub(title: string) {
  console.log();
  hr("─");
  console.log(`  ${title}`);
  hr("─");
}

// ── Seeded ROI categories (mirrors seed data in migration 20260501000002) ─────

const SEED_ROI = [
  {
    category: "Electronics",
    elasticity: 1.8,
    baseline_daily_orders: 220,
    avg_order_value: 480,
    base_margin: 0.18,
  },
  {
    category: "Grocery",
    elasticity: 0.9,
    baseline_daily_orders: 1800,
    avg_order_value: 65,
    base_margin: 0.14,
  },
  {
    category: "Home",
    elasticity: 1.4,
    baseline_daily_orders: 160,
    avg_order_value: 240,
    base_margin: 0.28,
  },
];

// Seeded rules (mirrors seed data in migration 20260618000001)
const SEED_RULES: StructuredRule[] = [
  {
    id: "seed-rule-1",
    rule_text: "Never price more than 5% above the lowest competitor on Electronics",
    rule_type: "competitor_ceiling_pct",
    params: { type: "competitor_ceiling_pct", pct: 0.05, category: "Electronics" },
    enabled: true,
    position: 0,
  },
  {
    id: "seed-rule-2",
    rule_text: "Match Carrefour on all Grocery items within 24 hours of their price change",
    rule_type: "competitor_ceiling_pct",
    params: { type: "competitor_ceiling_pct", pct: 0.0, competitor: "carrefour", category: "Grocery" },
    enabled: true,
    position: 1,
  },
  {
    id: "seed-rule-3",
    rule_text: "Do not drop below QAR 15 margin on any Home category product",
    rule_type: "nominal_floor_qar",
    params: { type: "nominal_floor_qar", min_margin_qar: 15, category: "Home" },
    enabled: true,
    position: 2,
  },
];

const FAKE_USER = "00000000-0000-0000-0000-000000000001";

function nowIso() {
  return new Date().toISOString();
}

// ── PART 1: Pure-function self-price path tests ────────────────────────────────

section("PART 1 — PURE FUNCTION: Self-price paths (Cases A / B / C)");

console.log(`
  These tests call computeRecommendations() directly with synthetic inputs.
  No DB connection required. They prove the three self-price resolution paths.
`);

// ─── Case A: self URL + matching scrape → selfPriceSource='self_url_scrape' ──

sub("Case A: competitor='self' URL + fresh scrape");
console.log("  Setup: XM5 has self URL and a matching scrape (QAR 1299).");
console.log("         Carrefour=1149, Amazon=1199. Category: Electronics.");
console.log("  Expect: selfPriceSource='self_url_scrape', selfPrice=1299.");
console.log("          gapPct=(1299-1174)/1299=9.6%>2% → rec generated.");
console.log("          competitor_ceiling_pct(5%): ceiling=1149×1.05=1206.45");
console.log("          1174≤1206.45 → passes (no clamp).");

{
  const selfUrl = "https://test.prizeskout.verify/self/xm5";
  const carrefourUrl = "https://www.carrefourqatar.com/test/xm5";
  const amazonUrl = "https://www.amazon.ae/test/xm5";
  const ts = nowIso();

  const { diagnostics } = computeRecommendations({
    userId: FAKE_USER,
    urls: [
      { product: "Sony XM5", competitor: "self", category: "Electronics", url: selfUrl },
      { product: "Sony XM5", competitor: "Carrefour", category: "Electronics", url: carrefourUrl },
      { product: "Sony XM5", competitor: "Amazon", category: "Electronics", url: amazonUrl },
    ],
    scrapes: [
      { url: selfUrl, product: "Sony XM5", competitor: "self", price: 1299, scraped_at: ts },
      { url: carrefourUrl, product: "Sony XM5", competitor: "Carrefour", price: 1149, scraped_at: ts },
      { url: amazonUrl, product: "Sony XM5", competitor: "Amazon", price: 1199, scraped_at: ts },
    ],
    roiCategories: SEED_ROI,
    rules: SEED_RULES,
    catalogPrices: new Map(),
    unitCostByProduct: new Map(),
  });

  const d = diagnostics.find((x) => x.product === "Sony XM5");
  if (!d) {
    assert(false, "Case A: diagnostic found");
  } else {
    assert(!d.skipped, "Case A: product was NOT skipped", d.skipReason ?? undefined);
    assert(
      d.selfPriceSource === "self_url_scrape",
      `Case A: selfPriceSource='self_url_scrape'`,
      `got '${d.selfPriceSource}'`,
    );
    assert(d.selfPrice === 1299, `Case A: selfPrice=1299`, `got ${d.selfPrice}`);
    assert(
      d.competitorPricesByName["Carrefour"] === 1149 &&
        d.competitorPricesByName["Amazon"] === 1199,
      "Case A: competitor prices correct",
    );
    assert(
      d.finalRecommendation !== null && d.finalRecommendation > 0,
      `Case A: recommendation produced (QAR ${d.finalRecommendation?.toFixed(2)})`,
    );
    // The competitor_ceiling_pct should not clamp (1174 ≤ 1149×1.05=1206.45)
    const ceiling = d.ruleEffects.find((e) => e.ruleType === "competitor_ceiling_pct");
    assert(
      ceiling !== undefined && !ceiling.clamped,
      "Case A: competitor_ceiling_pct passes without clamping",
      ceiling ? ceiling.reason : "rule not found",
    );
    console.log(`\n  Diagnostics:`);
    console.log(`    selfPrice=${d.selfPrice} source=${d.selfPriceSource}`);
    console.log(`    competitorMin=${d.competitorMin} rawRec=${d.rawRecommendation} finalRec=${d.finalRecommendation}`);
    console.log(`    Rule application order:`);
    for (const e of d.ruleEffects) {
      const marker = e.noData ? "[NODATA]" : e.clamped ? "[CLAMPED]" : e.applicable ? "[passes]" : "[ n/a  ]";
      console.log(`      ${marker} ${e.ruleType.padEnd(22)} ${e.reason.slice(0, 70)}`);
    }
  }
}

// ─── Case B: no self URL, but catalog_prices fallback ─────────────────────────

sub("Case B: no self URL — catalog_prices fallback");
console.log("  Setup: MacBook Air has NO self URL. catalog_prices has QAR 4499.");
console.log("         Amazon=4299 (only competitor). Category: Electronics.");
console.log("  Expect: selfPriceSource='catalog_prices', selfPrice=4499.");
console.log("          gapPct=(4499-4299)/4499=4.4%>2% → rec generated.");
console.log("          competitor_ceiling_pct(5%): ceiling=4299×1.05=4513.95");
console.log("          4299≤4513.95 → passes (no clamp).");

{
  const amazonUrl = "https://www.amazon.ae/test/macbook-air";
  const ts = nowIso();

  const { diagnostics } = computeRecommendations({
    userId: FAKE_USER,
    urls: [
      { product: "MacBook Air", competitor: "Amazon", category: "Electronics", url: amazonUrl },
      // Deliberately no competitor='self' entry
    ],
    scrapes: [
      { url: amazonUrl, product: "MacBook Air", competitor: "Amazon", price: 4299, scraped_at: ts },
    ],
    roiCategories: SEED_ROI,
    rules: SEED_RULES,
    catalogPrices: new Map([["macbook air", 4499]]),
    unitCostByProduct: new Map(),
  });

  const d = diagnostics.find((x) => x.product === "MacBook Air");
  if (!d) {
    assert(false, "Case B: diagnostic found");
  } else {
    assert(!d.skipped, "Case B: product was NOT skipped", d.skipReason ?? undefined);
    assert(
      d.selfPriceSource === "catalog_prices",
      `Case B: selfPriceSource='catalog_prices'`,
      `got '${d.selfPriceSource}'`,
    );
    assert(d.selfPrice === 4499, `Case B: selfPrice=4499`, `got ${d.selfPrice}`);
    assert(
      d.finalRecommendation !== null && d.finalRecommendation > 0,
      `Case B: recommendation produced (QAR ${d.finalRecommendation?.toFixed(2)})`,
    );
    console.log(`\n  Diagnostics:`);
    console.log(`    selfPrice=${d.selfPrice} source=${d.selfPriceSource}`);
    console.log(`    competitorMin=${d.competitorMin} rawRec=${d.rawRecommendation} finalRec=${d.finalRecommendation}`);
    console.log(`    Rule application order:`);
    for (const e of d.ruleEffects) {
      const marker = e.noData ? "[NODATA]" : e.clamped ? "[CLAMPED]" : e.applicable ? "[passes]" : "[ n/a  ]";
      console.log(`      ${marker} ${e.ruleType.padEnd(22)} ${e.reason.slice(0, 70)}`);
    }
  }
}

// ─── Case C: no self URL AND no catalog entry ──────────────────────────────────

sub("Case C: no self URL AND no catalog_prices entry");
console.log("  Setup: 'Unknown Widget' has no self URL, no catalog price.");
console.log("         Amazon=200. Category: Electronics.");
console.log("  Expect: skipped=true with logged skipReason. No exception thrown.");

{
  const amazonUrl = "https://www.amazon.ae/test/unknown-widget";
  const ts = nowIso();

  let threw = false;
  let diagnostics: ReturnType<typeof computeRecommendations>["diagnostics"] = [];
  try {
    const result = computeRecommendations({
      userId: FAKE_USER,
      urls: [
        { product: "Unknown Widget", competitor: "Amazon", category: "Electronics", url: amazonUrl },
      ],
      scrapes: [
        { url: amazonUrl, product: "Unknown Widget", competitor: "Amazon", price: 200, scraped_at: ts },
      ],
      roiCategories: SEED_ROI,
      rules: SEED_RULES,
      catalogPrices: new Map(), // no catalog entry
      unitCostByProduct: new Map(),
    });
    diagnostics = result.diagnostics;
  } catch (err) {
    threw = true;
    assert(false, "Case C: engine did not throw", String(err));
  }

  if (!threw) {
    assert(true, "Case C: engine did not throw");
    const d = diagnostics.find((x) => x.product === "Unknown Widget");
    if (!d) {
      assert(false, "Case C: diagnostic found");
    } else {
      assert(d.skipped === true, "Case C: product skipped=true", `got skipped=${d.skipped}`);
      assert(
        typeof d.skipReason === "string" && d.skipReason.length > 0,
        `Case C: skipReason logged: "${d.skipReason}"`,
      );
      assert(
        d.selfPriceSource === null,
        "Case C: selfPriceSource=null (no source found)",
      );
      console.log(`\n  Skip reason: ${d.skipReason}`);
    }
  }
}

// ── PART 2: Rule non-overridability ───────────────────────────────────────────

section("PART 2 — RULE NON-OVERRIDABILITY");

console.log(`
  Hard constraints:
    - margin_floor_pct    non-overridable floor (% of current price)
    - nominal_floor_qar   non-overridable cost floor (unit_cost + QAR margin)
    - moci_ceiling        non-overridable regulatory ceiling
  After every soft rule (competitor_ceiling_pct, max_discount_pct, price_rounding)
  the price is re-clamped to [hardFloor, hardCeiling]. Effects are annotated with
  [OVERRIDE] when the clamp fires.
`);

// ─── Test 2a: Soft rule cannot push below margin floor ────────────────────────

sub("Test 2a: competitor_ceiling_pct cannot breach margin_floor_pct");
console.log("  Setup: currentPrice=1000, margin_floor_pct=20% → floor=800.");
console.log("         competitor_ceiling_pct=0% (must match): competitorMin=600 → ceiling=600.");
console.log("         candidatePrice=700 (initial rec below floor).");
console.log("  Order: margin_floor_pct runs first → lifts 700→800.");
console.log("         competitor_ceiling_pct ceiling=600: 800>600 → would push to 600.");
console.log("         OVERRIDE fires: re-lifts back to 800.");
console.log("  Expect: finalPrice=800 (floor wins).");

{
  const rules: StructuredRule[] = [
    {
      id: "r1",
      rule_text: "Margin floor 20%",
      rule_type: "margin_floor_pct",
      params: { type: "margin_floor_pct", pct: 0.2 },
      enabled: true,
      position: 0,
    },
    {
      id: "r2",
      rule_text: "Match lowest competitor exactly",
      rule_type: "competitor_ceiling_pct",
      params: { type: "competitor_ceiling_pct", pct: 0.0 },
      enabled: true,
      position: 1,
    },
  ];
  const ctx: RuleContext = {
    currentPrice: 1000,
    competitorMin: 600,
    competitorPrices: new Map([["amazon", 600]]),
    unitCost: null,
    category: "",
  };
  const { finalPrice, effects } = evaluateRules(700, ctx, rules);

  console.log(`\n  Rule effects:`);
  for (const e of effects) {
    const marker = e.clamped ? "[CLAMPED]" : e.applicable ? "[passes]" : "[ n/a  ]";
    console.log(`    ${marker} ${e.ruleType.padEnd(22)} ${e.reason}`);
  }
  console.log(`  finalPrice=${finalPrice}`);

  assert(finalPrice === 800, `Test 2a: finalPrice=800 (floor wins over competitor ceiling)`, `got ${finalPrice}`);
  const ceilingEffect = effects.find((e) => e.ruleType === "competitor_ceiling_pct");
  assert(
    ceilingEffect !== undefined && ceilingEffect.clamped && ceilingEffect.reason.includes("[OVERRIDE"),
    "Test 2a: competitor_ceiling_pct effect carries [OVERRIDE] annotation",
    ceilingEffect ? ceilingEffect.reason : "effect not found",
  );
}

// ─── Test 2b: price_rounding cannot push above MOCI ceiling ───────────────────

sub("Test 2b: price_rounding cannot push above moci_ceiling");
console.log("  Setup: moci_ceiling=799, price_rounding(unit=100, mode=ceil).");
console.log("         candidatePrice=750.");
console.log("  Order: moci_ceiling → 750≤799 passes.");
console.log("         price_rounding(ceil,100): ceil(750/100)*100=800 > 799.");
console.log("         OVERRIDE fires: caps back to 799.");
console.log("  Expect: finalPrice=799 (ceiling wins over rounding).");

{
  const rules: StructuredRule[] = [
    {
      id: "r1",
      rule_text: "MOCI ceiling 799",
      rule_type: "moci_ceiling",
      params: { type: "moci_ceiling", max_price: 799 },
      enabled: true,
      position: 0,
    },
    {
      id: "r2",
      rule_text: "Round up to nearest 100",
      rule_type: "price_rounding",
      params: { type: "price_rounding", unit: 100, mode: "ceil" },
      enabled: true,
      position: 1,
    },
  ];
  const ctx: RuleContext = {
    currentPrice: 900,
    competitorMin: null,
    competitorPrices: new Map(),
    unitCost: null,
    category: "",
  };
  const { finalPrice, effects } = evaluateRules(750, ctx, rules);

  console.log(`\n  Rule effects:`);
  for (const e of effects) {
    const marker = e.clamped ? "[CLAMPED]" : e.applicable ? "[passes]" : "[ n/a  ]";
    console.log(`    ${marker} ${e.ruleType.padEnd(22)} ${e.reason}`);
  }
  console.log(`  finalPrice=${finalPrice}`);

  assert(finalPrice === 799, `Test 2b: finalPrice=799 (MOCI ceiling wins over rounding)`, `got ${finalPrice}`);
  const roundEffect = effects.find((e) => e.ruleType === "price_rounding");
  assert(
    roundEffect !== undefined && roundEffect.clamped && roundEffect.reason.includes("[OVERRIDE"),
    "Test 2b: price_rounding effect carries [OVERRIDE] annotation",
    roundEffect ? roundEffect.reason : "effect not found",
  );
}

// ─── Test 2c: rounding respects floor too ─────────────────────────────────────

sub("Test 2c: price_rounding cannot push below margin_floor_pct");
console.log("  Setup: currentPrice=1000, margin_floor_pct=30% → floor=700.");
console.log("         price_rounding(unit=100, mode=floor): floor(710/100)*100=700.");
console.log("         candidatePrice=710.");
console.log("  Expect: rounding floors to 700, which exactly equals floor → OK.");
console.log("  (Bonus: candidatePrice=705 with same rounding floors to 700 = floor → OK)");

{
  const rules: StructuredRule[] = [
    {
      id: "r1",
      rule_text: "Margin floor 30%",
      rule_type: "margin_floor_pct",
      params: { type: "margin_floor_pct", pct: 0.3 },
      enabled: true,
      position: 0,
    },
    {
      id: "r2",
      rule_text: "Round floor to nearest 100",
      rule_type: "price_rounding",
      params: { type: "price_rounding", unit: 100, mode: "floor" },
      enabled: true,
      position: 1,
    },
  ];
  const ctx: RuleContext = {
    currentPrice: 1000,
    competitorMin: null,
    competitorPrices: new Map(),
    unitCost: null,
    category: "",
  };

  // candidatePrice=710: floor(710,100)=700, which equals margin floor (1000*0.7=700) → OK
  const r1 = evaluateRules(710, ctx, rules);
  console.log(`\n  candidatePrice=710 → finalPrice=${r1.finalPrice} (floor(710,100)=700=margin floor)`);
  assert(r1.finalPrice === 700, "Test 2c: 710→floor(100)=700 = margin floor (no override needed)");

  // candidatePrice=690 (below floor): margin_floor lifts to 700, rounding floor(700,100)=700 → no override
  const r2 = evaluateRules(690, ctx, rules);
  console.log(`  candidatePrice=690 → finalPrice=${r2.finalPrice} (margin floor lifts to 700, rounding keeps 700)`);
  assert(r2.finalPrice === 700, "Test 2c: 690 lifted to margin floor 700, rounding floor=700 → stays at 700");

  // candidatePrice=705: floor(705,100)=700, which is ≥ margin floor 700 → OK, no override
  const r3 = evaluateRules(705, ctx, rules);
  console.log(`  candidatePrice=705 → finalPrice=${r3.finalPrice} (floor(705,100)=700 ≥ margin floor 700)`);
  assert(r3.finalPrice === 700, "Test 2c: 705 rounded down to 700 ≥ floor → no override needed");
}

// ── PART 3: COGS / noData handling ────────────────────────────────────────────

section("PART 3 — COGS (unit_cost) / noData HANDLING");

console.log(`
  margin_floor_pct uses current_price × (1−pct) — does NOT need unit_cost.
  nominal_floor_qar uses unit_cost + min_margin_qar — REQUIRES unit_cost.

  When unit_cost is null:
    - nominal_floor_qar must NOT silently pass as if the floor is satisfied.
    - It must set noData=true and clearly report "Cannot enforce — missing COGS."
    - The rule is SKIPPED (not enforced), and the output MUST show [NODATA].
`);

sub("Test 3a: nominal_floor_qar with unitCost=null → noData=true");
{
  const rules: StructuredRule[] = [
    {
      id: "r1",
      rule_text: "Home margin floor QAR 15",
      rule_type: "nominal_floor_qar",
      params: { type: "nominal_floor_qar", min_margin_qar: 15, category: "Home" },
      enabled: true,
      position: 0,
    },
  ];
  const ctx: RuleContext = {
    currentPrice: 200,
    competitorMin: null,
    competitorPrices: new Map(),
    unitCost: null, // no COGS
    category: "Home",
  };
  const { finalPrice, effects } = evaluateRules(180, ctx, rules);
  const effect = effects[0];

  console.log(`  Rule effect: noData=${effect.noData} clamped=${effect.clamped}`);
  console.log(`  Reason: ${effect.reason}`);
  console.log(`  finalPrice=${finalPrice} (pass-through — cannot enforce without COGS)`);

  assert(effect.noData === true, "Test 3a: noData=true when unitCost=null");
  assert(effect.clamped === false, "Test 3a: clamped=false (rule not enforced, not 'passing')");
  assert(
    effect.reason.toLowerCase().includes("cannot enforce") ||
      effect.reason.toLowerCase().includes("unit_cost not in"),
    "Test 3a: reason text explicitly describes missing COGS",
    effect.reason,
  );
  assert(finalPrice === 180, "Test 3a: price passes through unchanged (rule skipped, not satisfied)");
}

sub("Test 3b: nominal_floor_qar with unitCost=150 → enforces correctly");
{
  const rules: StructuredRule[] = [
    {
      id: "r1",
      rule_text: "Home margin floor QAR 15",
      rule_type: "nominal_floor_qar",
      params: { type: "nominal_floor_qar", min_margin_qar: 15, category: "Home" },
      enabled: true,
      position: 0,
    },
  ];
  const ctx: RuleContext = {
    currentPrice: 200,
    competitorMin: null,
    competitorPrices: new Map(),
    unitCost: 150, // floor = 150+15 = 165
    category: "Home",
  };
  const { finalPrice, effects } = evaluateRules(155, ctx, rules); // 155 < 165 → should clamp
  const effect = effects[0];

  console.log(`  Rule effect: noData=${effect.noData} clamped=${effect.clamped}`);
  console.log(`  Reason: ${effect.reason}`);
  console.log(`  finalPrice=${finalPrice} (should be 165 = 150+15)`);

  assert(effect.noData === false, "Test 3b: noData=false when unitCost is available");
  assert(effect.clamped === true, "Test 3b: clamped=true (155 < floor 165)");
  assert(finalPrice === 165, `Test 3b: finalPrice=165 (unit_cost 150 + min_margin 15)`, `got ${finalPrice}`);
}

sub("COGS summary for seeded products");
console.log(`
  margin_floor_pct: Does NOT require unit_cost. Uses current_price × (1−pct).
    → Seeded rule 1 (Electronics, competitor_ceiling_pct) — no COGS needed.

  nominal_floor_qar: Requires unit_cost from margin_inputs table.
    → Seeded rule 3 (Home, nominal_floor_qar QAR 15) — COGS required.

  How many seeded products have COGS?
    This depends on whether the seeded user has rows in margin_inputs.
    The seeded migration data does NOT populate margin_inputs.
    Result: 0 products have unit_cost. The Home nominal_floor_qar rule
    will set noData=true for ALL Home products until margin_inputs are seeded
    via POST /v1/margin.

  This is a loud failure (noData=true, reason says "Cannot enforce") —
  NOT a silent pass. The rule is skipped, NOT assumed satisfied.
`);

// ── PART 4: DB audit ──────────────────────────────────────────────────────────

section("PART 4 — DB AUDIT");

console.log("  Checking which tables exist in the live Supabase project...\n");

const REQUIRED_TABLES = [
  // Core user tables (migration 20260618000001)
  "profiles",
  "pricing_rules",
  "pricing_recommendations",
  "competitor_product_urls",
  "competitor_scrapes",
  "roi_model_categories",
  // Multi-tenant chain tables (migration 20260424231425)
  "licensees",
  "accounts_v2",
  "licensee_members",
  // Catalog tables (migration 20260424231425)
  "catalog_products",
  "catalog_prices",
  "margin_inputs",
];

const tableStatus: Record<string, boolean> = {};
let dbFullyMigrated = true;

await Promise.all(
  REQUIRED_TABLES.map(async (table) => {
    const { error } = await (admin.from(table) as any)
      .select("*", { count: "exact", head: true })
      .limit(0);
    // Treat any error containing "does not exist" OR "schema cache" as absent.
    const isAbsent =
      error &&
      (error.message?.includes("does not exist") ||
        error.message?.includes("schema cache") ||
        error.message?.includes("Could not find"));
    const exists = !isAbsent;
    tableStatus[table] = exists;
    if (!exists) dbFullyMigrated = false;
  }),
);

for (const table of REQUIRED_TABLES) {
  const ok = tableStatus[table];
  console.log(`  ${ok ? "✓" : "✗ MISSING"} ${table}`);
}

if (!dbFullyMigrated) {
  console.log(`
  BLOCKED: Some tables are missing. The full DB run (Part 5) will be skipped.

  Missing tables from multi-tenant migration:
    licensees, accounts_v2, licensee_members  →  migration 20260424231425
    catalog_products, catalog_prices          →  migration 20260424231425

  Apply via Supabase dashboard:
    https://supabase.com/dashboard/project/itfhekcvmcbntjndvhzg/sql
    Paste the full contents of supabase/migrations/20260424231425_*.sql and run it.

  Alternatively use Supabase CLI (requires Personal Access Token):
    npx supabase link --project-ref itfhekcvmcbntjndvhzg
    npx supabase db push
`);
} else {
  console.log("\n  All required tables present. Proceeding to Part 5...");
}

// ── PART 5: Full DB run ────────────────────────────────────────────────────────

section("PART 5 — FULL DB RUN");

// ── Helper: check whether migration 20260618000001 columns exist ──────────────
async function checkMigration20260618(): Promise<boolean> {
  const { error } = await (admin.from("pricing_rules") as any)
    .select("rule_type, params")
    .limit(0);
  return !error;
}

// ── Fully self-contained test user creation ───────────────────────────────────
//
// Creates a temporary auth user + all required rows for the engine to run,
// covers all three self-price cases in one catalog, runs the engine, then
// deletes everything.
//
// Case A product: "Sony XM5" — has competitor='self' URL + fresh scrape
// Case B product: "MacBook Air" — no self URL, but catalog_prices entry
// Case C product: "Unknown Widget" — no self URL, no catalog entry
//
// The test user gets:
//   - 1 profile row (manual insert, bypass trigger)
//   - 1 accounts_v2 row + 1 licensees row (for current_account_for_user RPC)
//   - 3 roi_model_categories rows
//   - 3 pricing_rules rows (seeded structured rules)
//   - competitor_product_urls: Sony XM5 (self + Amazon), MacBook Air (Amazon), Unknown Widget (Amazon)
//   - competitor_scrapes: Sony XM5 self=1299 + Amazon=1149, MacBook Air Amazon=4299, Unknown Widget Amazon=200
//   - catalog_prices: MacBook Air = QAR 4499 (for Case B fallback)

// Retry wrapper for Supabase PostgREST calls that may hit transient network timeouts.
async function sbInsert<T>(
  op: () => Promise<{ data: T | null; error: any }>,
  label: string,
): Promise<{ data: T | null; error: any }> {
  for (let attempt = 1; attempt <= 3; attempt++) {
    const result = await op();
    if (!result.error) return result;
    const isTransient =
      result.error.message?.includes("fetch failed") ||
      result.error.message?.includes("network") ||
      result.error.code === "NETWORK_ERROR";
    if (!isTransient || attempt === 3) return result;
    console.log(`  [retry ${attempt}/3] ${label}: ${result.error.message} — retrying in 2s...`);
    await new Promise<void>((r) => setTimeout(r, 2000));
  }
  return await op();
}

async function runWithTempUser() {
  // Check migration before creating anything
  const migOk = await checkMigration20260618();
  if (!migOk) {
    console.log("  BLOCKED: pricing_rules is missing rule_type/params columns.");
    console.log("  Apply migration 20260618000001_structured_pricing_rules.sql first.");
    console.log("  Paste it into: https://supabase.com/dashboard/project/itfhekcvmcbntjndvhzg/sql");
    return;
  }
  console.log("  ✓ Migration 20260618000001 (rule_type/params) is applied.");

  // Create auth user — retry up to 3 times (auth admin API can have transient timeouts)
  const TEST_EMAIL = `verify-engine-${Date.now()}@prizeskout.local.test`;
  let userId = "";
  for (let attempt = 1; attempt <= 3; attempt++) {
    const { data: authData, error: authErr } = await admin.auth.admin.createUser({
      email: TEST_EMAIL,
      password: "verify-test-pw-1234!",
      email_confirm: true,
    });
    if (!authErr && authData?.user) {
      userId = authData.user.id;
      break;
    }
    if (attempt < 3) {
      console.log(`  [auth attempt ${attempt}/3 failed] ${authErr?.message} — retrying in 3s...`);
      await new Promise<void>((r) => setTimeout(r, 3000));
    } else {
      console.log(`  ERROR: Could not create test auth user after 3 attempts: ${authErr?.message}`);
      console.log("  This is a transient network issue with the Supabase Auth Admin API.");
      console.log("  Re-run npm run verify-engine when the network is stable.");
      return;
    }
  }
  console.log(`\n  Created temp auth user: ${TEST_EMAIL} (${userId})`);

  const cleanup: Array<() => Promise<void>> = [];

  try {
    // Detect whether on_auth_user_created fired for admin.auth.admin.createUser.
    // In a fully wired schema (migration 20260618000002 applied) the trigger fires
    // automatically and pre-provisions profile + licensee chain. In older/partial
    // deployments it may not. We handle both paths gracefully.
    const { data: existingProfile } = await (admin.from("profiles") as any)
      .select("id").eq("id", userId).maybeSingle();
    const triggerFired = existingProfile !== null;

    let licenseeId = "";
    let accountId = "";

    if (triggerFired) {
      console.log(`  [trigger] on_auth_user_created fired — profile + licensee chain auto-provisioned`);
      const { data: ctxData, error: ctxErr } = await (admin as any)
        .rpc("current_account_for_user", { _user_id: userId });
      if (ctxErr) {
        console.log(`  ERROR: current_account_for_user() failed after trigger: ${ctxErr.message}`);
        return;
      }
      const ctxRow = Array.isArray(ctxData) ? ctxData[0] : ctxData;
      if (!ctxRow?.account_id) {
        console.log(`  ERROR: trigger fired but current_account_for_user() returned NULL`);
        return;
      }
      licenseeId = ctxRow.licensee_id as string;
      accountId = ctxRow.account_id as string;
      console.log(`  [+] profile + licensee chain auto-provisioned by trigger`);
      console.log(`      licenseeId=${licenseeId}  accountId=${accountId}`);
      // Cleanup: deleting licensee cascades to licensee_members, accounts_v2,
      // catalog_products, catalog_prices (all have ON DELETE CASCADE via licensee_id FK).
      cleanup.push(async () => {
        await (admin.from("licensees") as any).delete().eq("id", licenseeId);
      });
      // pricing_rules were seeded by the trigger; clean them up on exit
      cleanup.push(async () => {
        await (admin.from("pricing_rules") as any).delete().eq("user_id", userId);
      });
    } else {
      // Trigger did not fire — insert profile + licensee chain manually.
      const { error: profileErr } = await (admin.from("profiles") as any)
        .insert({ id: userId, display_name: "Verify Engine Test User" });
      if (profileErr) {
        console.log(`  ERROR: Could not insert profile: ${profileErr.message}`);
        return;
      }
      // profile is cascade-deleted when auth user is deleted (FK: profiles.id → auth.users.id)

      const licSlug = `lic-${userId}`;
      const { data: licRow, error: licErr } = await sbInsert(
        () => (admin.from("licensees") as any)
          .insert({ slug: licSlug, name: "Verify Test Licensee", status: "trial" })
          .select("id")
          .single(),
        "licensees insert",
      );
      if (licErr) {
        console.log(`  ERROR: licensees insert failed: ${licErr.message}`);
        if (licErr.message?.includes("schema cache") || licErr.message?.includes("Could not find")) {
          console.log("  → PostgREST schema cache is stale for the 'licensees' table.");
          console.log("    Apply migration 20260618000002 in the Supabase SQL editor — its final");
          console.log("    NOTIFY statement will reload the schema cache in the same transaction:");
          console.log("      supabase/migrations/20260618000002_wire_ensure_licensee_on_signup.sql");
        }
        return;
      }
      licenseeId = licRow.id as string;
      // Cleanup: deleting licensee cascades to licensee_members, accounts_v2, catalog_*.
      cleanup.push(async () => {
        await (admin.from("licensees") as any).delete().eq("id", licenseeId);
      });

      const { error: memberErr } = await sbInsert(
        () => (admin.from("licensee_members") as any)
          .insert({ licensee_id: licenseeId, user_id: userId, role: "owner" }),
        "licensee_members insert",
      );
      if (memberErr) {
        console.log(`  ERROR: licensee_members insert failed: ${memberErr.message}`);
        return;
      }

      const { data: accRow, error: accErr } = await sbInsert(
        () => (admin.from("accounts_v2") as any)
          .insert({ licensee_id: licenseeId, slug: "default", name: "Default Account", is_default: true })
          .select("id")
          .single(),
        "accounts_v2 insert",
      );
      if (accErr) {
        console.log(`  ERROR: accounts_v2 insert failed: ${accErr.message}`);
        return;
      }
      accountId = accRow.id as string;
      console.log(`  [+] profile + licensee chain provisioned (direct inserts)`);
      console.log(`      licenseeId=${licenseeId}  accountId=${accountId}`);
    }

    // ── SIGNUP PROOF ──────────────────────────────────────────────────────────
    // Prove that current_account_for_user() resolves after provisioning.
    // Before migration 20260618000002: handle_new_user() never calls
    //   ensure_licensee_for_user(), so every real signup user has NULL here.
    // After migration 20260618000002: handle_new_user() calls it, and the
    //   NOTIFY at the end of that migration reloads the PostgREST schema cache
    //   so the RPC is callable. A NULL result means the migration hasn't been
    //   applied yet; a non-NULL result proves the signup gap is closed.
    {
      const { data: accountCtx, error: ctxErr } = await (admin as any)
        .rpc("current_account_for_user", { _user_id: userId });
      if (ctxErr) {
        if (ctxErr.message?.includes("schema cache") || ctxErr.message?.includes("Could not find")) {
          console.log(`\n  [SIGNUP PROOF] BLOCKED: current_account_for_user() not in schema cache.`);
          console.log(`    Apply migration 20260618000002 to wire ensure_licensee_for_user into`);
          console.log(`    handle_new_user() AND reload the PostgREST schema (NOTIFY at end).`);
        } else {
          console.log(`\n  [SIGNUP PROOF] RPC error: ${ctxErr.message}`);
        }
      } else {
        const row = Array.isArray(accountCtx) ? accountCtx[0] : accountCtx;
        if (row?.account_id) {
          console.log(`\n  ✓ [SIGNUP PROOF] current_account_for_user() resolves to a real account:`);
          console.log(`      account_id  = ${row.account_id}`);
          console.log(`      licensee_id = ${row.licensee_id}`);
          console.log(`    A real signup now gets a non-NULL account context immediately after`);
          console.log(`    the trigger fires (migration 20260618000002 applied).`);
        } else {
          console.log(`\n  ✗ [SIGNUP PROOF] current_account_for_user() returned NULL.`);
          console.log(`    Signup gap still open — apply migration 20260618000002 to fix.`);
        }
      }
    }
    // ─────────────────────────────────────────────────────────────────────────

    // Seed roi_model_categories
    const roiRows = SEED_ROI.map((r) => ({ ...r, user_id: userId }));
    const { error: roiErr } = await (admin.from("roi_model_categories") as any).insert(roiRows);
    if (roiErr) { console.log(`  NOTE: roi_model_categories insert: ${roiErr.message}`); }
    else {
      console.log(`  [+] roi_model_categories (${roiRows.length} rows)`);
      cleanup.push(async () => {
        await (admin.from("roi_model_categories") as any).delete().eq("user_id", userId);
      });
    }

    // pricing_rules: skip when trigger already seeded them; insert manually otherwise.
    if (!triggerFired) {
      const ruleRows = [
        {
          user_id: userId,
          rule_text: "Never price more than 5% above the lowest competitor on Electronics",
          rule_type: "competitor_ceiling_pct",
          params: { type: "competitor_ceiling_pct", pct: 0.05, category: "Electronics" },
          enabled: true,
          position: 0,
        },
        {
          user_id: userId,
          rule_text: "Match Carrefour on all Grocery items within 24 hours of their price change",
          rule_type: "competitor_ceiling_pct",
          params: { type: "competitor_ceiling_pct", pct: 0.0, competitor: "carrefour", category: "Grocery" },
          enabled: true,
          position: 1,
        },
        {
          user_id: userId,
          rule_text: "Do not drop below QAR 15 margin on any Home category product",
          rule_type: "nominal_floor_qar",
          params: { type: "nominal_floor_qar", min_margin_qar: 15, category: "Home" },
          enabled: true,
          position: 2,
        },
      ];
      const { error: rulesErr } = await (admin.from("pricing_rules") as any).insert(ruleRows);
      if (rulesErr) {
        console.log(`  ERROR: pricing_rules insert failed: ${rulesErr.message}`);
        console.log("  This likely means migration 20260618000001 is not fully applied.");
        return;
      }
      console.log(`  [+] pricing_rules (${ruleRows.length} structured rules)`);
      cleanup.push(async () => {
        await (admin.from("pricing_rules") as any).delete().eq("user_id", userId);
      });
    } else {
      console.log(`  [trigger] pricing_rules already seeded by handle_new_user()`);
    }

    // Seed catalog_products + catalog_prices for Case B (MacBook Air catalog fallback)
    // catalog_products requires: account_id, licensee_id (NOT NULL FK), sku, name
    // catalog_prices requires:   account_id, licensee_id (NOT NULL FK), product_id, channel (NOT NULL), list_price
    let macbookProductId: string | undefined;
    {
      const { data: cpRow, error: cpErr } = await (admin.from("catalog_products") as any)
        .insert({ account_id: accountId, licensee_id: licenseeId, name: "MacBook Air", sku: "VERIFY-MBA-001" })
        .select("id")
        .single();
      if (cpErr) { console.log(`  NOTE: catalog_products insert: ${cpErr.message}`); }
      macbookProductId = cpRow?.id as string | undefined;
      if (macbookProductId) {
        cleanup.push(async () => {
          await (admin.from("catalog_products") as any).delete().eq("id", macbookProductId);
        });
        const { error: priceErr } = await (admin.from("catalog_prices") as any)
          .insert({
            account_id: accountId,
            licensee_id: licenseeId,
            product_id: macbookProductId,
            channel: "Online",
            list_price: 4499,
            sale_price: null,
          });
        if (priceErr) { console.log(`  NOTE: catalog_prices insert: ${priceErr.message}`); }
        else {
          console.log(`  [+] catalog_prices: MacBook Air = QAR 4499 Online (for Case B fallback)`);
          cleanup.push(async () => {
            await (admin.from("catalog_prices") as any)
              .delete()
              .eq("product_id", macbookProductId);
          });
        }
      }
    }

    // Seed competitor_product_urls
    //   Case A: Sony XM5 — has self URL + Amazon
    //   Case B: MacBook Air — Amazon only (no self URL → will fall back to catalog_prices)
    //   Case C: Unknown Widget — Amazon only, no catalog entry → will be skipped
    const SELF_URL = "https://test.prizeskout.verify/self/sony-xm5-verify";
    const XM5_AMAZON = "https://www.amazon.ae/test/xm5-verify";
    const MBA_AMAZON = "https://www.amazon.ae/test/macbook-air-verify";
    const WIDGET_AMAZON = "https://www.amazon.ae/test/unknown-widget-verify";

    const urlRows = [
      { user_id: userId, product: "Sony XM5", competitor: "self", url: SELF_URL, category: "Electronics" },
      { user_id: userId, product: "Sony XM5", competitor: "Amazon", url: XM5_AMAZON, category: "Electronics" },
      { user_id: userId, product: "MacBook Air", competitor: "Amazon", url: MBA_AMAZON, category: "Electronics" },
      { user_id: userId, product: "Unknown Widget", competitor: "Amazon", url: WIDGET_AMAZON, category: "Electronics" },
    ];
    const { error: urlErr } = await (admin.from("competitor_product_urls") as any).insert(urlRows);
    if (urlErr) { console.log(`  NOTE: competitor_product_urls insert: ${urlErr.message}`); }
    else {
      console.log(`  [+] competitor_product_urls (${urlRows.length} rows)`);
      cleanup.push(async () => {
        await (admin.from("competitor_product_urls") as any).delete().eq("user_id", userId);
      });
    }

    // Seed competitor_scrapes
    const ts = new Date().toISOString();
    const scrapeRows = [
      // Case A: Sony XM5 — self scrape (1299) + Amazon (1149) → self_url_scrape path
      { user_id: userId, url: SELF_URL, product: "Sony XM5", competitor: "self", price: 1299, currency: "QAR", status: "success", scraped_at: ts },
      { user_id: userId, url: XM5_AMAZON, product: "Sony XM5", competitor: "Amazon", price: 1149, currency: "QAR", status: "success", scraped_at: ts },
      // Case B: MacBook Air — Amazon only (1149), no self scrape → catalog_prices fallback
      { user_id: userId, url: MBA_AMAZON, product: "MacBook Air", competitor: "Amazon", price: 4299, currency: "QAR", status: "success", scraped_at: ts },
      // Case C: Unknown Widget — Amazon=200, no self URL, no catalog → will be skipped
      { user_id: userId, url: WIDGET_AMAZON, product: "Unknown Widget", competitor: "Amazon", price: 200, currency: "QAR", status: "success", scraped_at: ts },
    ];
    const { data: scrapeData, error: scrapeErr } = await (admin.from("competitor_scrapes") as any)
      .insert(scrapeRows)
      .select("id");
    if (scrapeErr) { console.log(`  NOTE: competitor_scrapes insert: ${scrapeErr.message}`); }
    else {
      const scrapeIds = ((scrapeData ?? []) as any[]).map((r: any) => r.id as string);
      console.log(`  [+] competitor_scrapes (${scrapeIds.length} rows)`);
      cleanup.push(async () => {
        await (admin.from("competitor_scrapes") as any).delete().in("id", scrapeIds);
      });
    }
    console.log();
    console.log("  Catalog summary:");
    console.log("    Sony XM5        — Case A (self_url_scrape: self=1299, Amazon=1149)");
    console.log("    MacBook Air     — Case B (catalog_prices fallback: catalog=4499, Amazon=4299)");
    console.log("    Unknown Widget  — Case C (no self URL + no catalog → skipped)");

    // 5b. Before counts
    const { count: totalBefore } = await (admin.from("pricing_recommendations") as any)
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId);
    const { count: computedBefore } = await (admin.from("pricing_recommendations") as any)
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("source", "computed");

    console.log(`\n  Recommendations BEFORE:`);
    console.log(`    Total    : ${totalBefore ?? 0}`);
    console.log(`    computed : ${computedBefore ?? 0}`);

    // 5c. Run engine
    console.log(`\n  Running runPricingEngineForUser(${userId})...`);
    hr();
    let engineResult: Awaited<ReturnType<typeof runPricingEngineForUser>> | null = null;
    try {
      engineResult = await runPricingEngineForUser(admin as any, userId);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.log(`\n  ENGINE ERROR: ${msg}`);
    }
    hr();

    if (engineResult) {
      // Print diagnostics
      console.log(`\n  Per-product diagnostics (${engineResult.diagnostics.length} products):`);
      for (const d of engineResult.diagnostics) {
        hr("-");
        console.log(`\n  PRODUCT: ${d.product}`);
        if (d.skipped) {
          console.log(`  STATUS : SKIPPED — ${d.skipReason}`);
          continue;
        }
        console.log(`  selfPriceSource : ${d.selfPriceSource}`);
        console.log(`  selfPrice       : QAR ${d.selfPrice?.toFixed(2)}`);
        console.log(`  competitorMin   : QAR ${d.competitorMin?.toFixed(2) ?? "n/a"}`);
        console.log(`  rawRec          : QAR ${d.rawRecommendation?.toFixed(2) ?? "n/a"}`);
        console.log(`  Rule application order (${d.ruleEffects.length} rules):`);
        for (const e of d.ruleEffects) {
          const marker = e.noData
            ? "[NODATA ]"
            : e.clamped
              ? "[CLAMPED]"
              : e.applicable
                ? "[passes ]"
                : "[ n/a   ]";
          console.log(`    ${marker} [${e.ruleType.padEnd(22)}] ${e.reason.slice(0, 68)}`);
        }
        console.log(`  finalRec        : QAR ${d.finalRecommendation?.toFixed(2) ?? "n/a"}`);
      }

      if (engineResult.reasons.length > 0) {
        console.log(`\n  Engine notes:`);
        for (const r of engineResult.reasons) {
          console.log(`    • ${r}`);
        }
      }

      // After counts
      const { count: totalAfter } = await (admin.from("pricing_recommendations") as any)
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId);
      const { count: seedsAfter } = await (admin.from("pricing_recommendations") as any)
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("source", "seed");
      const { count: computedAfter } = await (admin.from("pricing_recommendations") as any)
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("source", "computed");

      console.log(`\n  Recommendations AFTER:`);
      console.log(`    Total    : ${totalAfter ?? 0}`);
      console.log(`    seed     : ${seedsAfter ?? 0}`);
      console.log(`    computed : ${computedAfter ?? 0}`);

      // Verify Cases A and B are satisfied by the DB run
      const xm5Diag = engineResult.diagnostics.find((d) => d.product === "Sony XM5");
      const mbaDiag = engineResult.diagnostics.find((d) => d.product === "MacBook Air");
      const widgetDiag = engineResult.diagnostics.find((d) => d.product === "Unknown Widget");

      console.log();
      assert(
        xm5Diag !== undefined && !xm5Diag.skipped && xm5Diag.selfPriceSource === "self_url_scrape",
        `DB Case A: Sony XM5 selfPriceSource='self_url_scrape'`,
        xm5Diag ? `got ${xm5Diag.selfPriceSource}` : "diagnostic missing",
      );
      assert(
        mbaDiag !== undefined && !mbaDiag.skipped && mbaDiag.selfPriceSource === "catalog_prices",
        `DB Case B: MacBook Air selfPriceSource='catalog_prices' (fallback proven)`,
        mbaDiag ? `got ${mbaDiag.selfPriceSource} skipped=${mbaDiag.skipped} skipReason=${mbaDiag.skipReason}` : "diagnostic missing",
      );
      assert(
        widgetDiag !== undefined && widgetDiag.skipped === true,
        `DB Case C: Unknown Widget skipped (no self URL, no catalog entry)`,
        widgetDiag ? `got skipped=${widgetDiag.skipped}` : "diagnostic missing",
      );

      const net = (computedAfter ?? 0) - (computedBefore ?? 0);
      if (net > 0) {
        console.log(`\n  SUCCESS: +${net} computed recommendation(s) produced. ✓`);
      } else {
        console.log("\n  NOTICE: No new computed recs. Check diagnostics above.");
      }

      // Clean up computed recs (avoid polluting the DB from test runs)
      cleanup.push(async () => {
        await (admin.from("pricing_recommendations") as any)
          .delete()
          .eq("user_id", userId);
      });
    }
  } finally {
    // Clean up in reverse insertion order
    console.log("\n  Cleaning up all test fixtures...");
    for (const fn of cleanup.reverse()) {
      await fn().catch((e: unknown) => {
        console.log(`  CLEANUP WARNING: ${e instanceof Error ? e.message : String(e)}`);
      });
    }
    // Delete auth user last
    await admin.auth.admin.deleteUser(userId);
    console.log(`  [-] Deleted temp auth user ${TEST_EMAIL}`);
    console.log("  Done.");
  }
}

if (!dbFullyMigrated) {
  console.log("  SKIPPED — DB not fully migrated (see Part 4 above).");
  console.log("  Apply all migrations and re-run to exercise the full engine path.");
} else {
  await runWithTempUser();
}

// ── Summary ───────────────────────────────────────────────────────────────────

section("SUMMARY");
console.log(`  Pure-function assertions: ${passed} passed, ${failed} failed`);
if (failed > 0) {
  console.log(`\n  ✗ VERIFICATION FAILED — ${failed} assertion(s) above need attention.`);
  process.exit(1);
} else {
  console.log(`\n  ✓ All pure-function tests passed.`);
  if (!dbFullyMigrated) {
    console.log(`  ✗ DB is not fully migrated — apply remaining migrations to run Part 5.`);
  }
}
console.log();
