/**
 * Seed a fresh demo account with realistic Qatar retail data and run the
 * pricing engine. Run with:
 *   tsx --env-file=.env.local scripts/seed-demo.mts
 */

import { createClient } from "@supabase/supabase-js";
import { runPricingEngineForUser } from "../src/server/pricing-engine.ts";

const BASE    = process.env.SUPABASE_URL!;
const SRK     = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const ANON    = process.env.SUPABASE_PUBLISHABLE_KEY!;

const DEMO_EMAIL    = "dvdegwu@gmail.com";
const DEMO_PASSWORD = "(existing account — password unchanged)";

const admin = createClient(BASE, SRK, { auth: { persistSession: false } });

// ── helpers ───────────────────────────────────────────────────────────────────

function ok<T>(res: { data: T; error: unknown }, label: string): T {
  if (res.error) {
    console.error(`  FAIL: ${label}`, res.error);
    process.exit(1);
  }
  return res.data;
}

function log(msg: string) { console.log(msg); }
function section(s: string) { log(`\n${"═".repeat(60)}\n  ${s}\n${"═".repeat(60)}`); }

// ── Step 1: look up existing account ─────────────────────────────────────────

section("STEP 1 — Look up existing account");

const { data: { users }, error: listErr } = await admin.auth.admin.listUsers({ perPage: 1000 });
if (listErr) { console.error("listUsers failed", listErr); process.exit(1); }

const existing = users.find((u: any) => u.email === DEMO_EMAIL);
if (!existing) {
  console.error(`No user found with email ${DEMO_EMAIL}`);
  process.exit(1);
}

const userId = existing.id;
log(`  Found user: ${userId}  (${DEMO_EMAIL})`);

// ── Step 2: resolve account IDs ───────────────────────────────────────────────

section("STEP 2 — Resolve account / licensee IDs");

const { data: ctxRows, error: ctxErr } = await (admin as any)
  .rpc("current_account_for_user", { _user_id: userId });
if (ctxErr || !ctxRows?.[0]) {
  console.error("current_account_for_user failed", ctxErr ?? "no rows");
  process.exit(1);
}
const { account_id: accountId, licensee_id: licenseeId } = ctxRows[0];
log(`  account_id:  ${accountId}`);
log(`  licensee_id: ${licenseeId}`);

// ── Step 3: ROI model categories ──────────────────────────────────────────────

section("STEP 3 — Seed roi_model_categories");

const roiRows = [
  {
    user_id: userId, category: "Electronics", position: 0,
    elasticity: 1.5, baseline_daily_orders: 50,
    avg_order_value: 2000, base_margin: 0.18, cannibalization_base: 0.08,
  },
  {
    user_id: userId, category: "Grocery", position: 1,
    elasticity: 2.8, baseline_daily_orders: 500,
    avg_order_value: 45, base_margin: 0.12, cannibalization_base: 0.05,
  },
  {
    user_id: userId, category: "Home", position: 2,
    elasticity: 1.8, baseline_daily_orders: 30,
    avg_order_value: 800, base_margin: 0.20, cannibalization_base: 0.07,
  },
];

ok(
  await (admin.from("roi_model_categories") as any)
    .upsert(roiRows, { onConflict: "user_id,category" }),
  "roi_model_categories upsert"
);
log(`  Inserted ${roiRows.length} ROI categories`);

// ── Step 4: catalog_products ──────────────────────────────────────────────────

section("STEP 4 — Seed catalog_products");

type Product = {
  sku: string; name: string; brand: string; category: string;
  list_price: number; cogs?: number;
};

const PRODUCTS: Product[] = [
  // Electronics – clean match
  { sku: "SONY-WH1000XM5",    name: "Sony WH-1000XM5 Headphones",  brand: "Sony",    category: "Electronics", list_price: 1299, cogs: 750 },
  // Electronics – ceiling clamp (5% above lowest competitor fires)
  { sku: "APPLE-MBA-M3-256",  name: "Apple MacBook Air M3 256GB",  brand: "Apple",   category: "Electronics", list_price: 4799, cogs: 3200 },
  // Electronics – clean match
  { sku: "APPLE-IP15PRO-256", name: "iPhone 15 Pro 256GB",         brand: "Apple",   category: "Electronics", list_price: 4499, cogs: 3100 },
  // Grocery – Carrefour ceiling clamp
  { sku: "ARIEL-AUTO-3KG",    name: "Ariel Automatic Detergent 3kg", brand: "Ariel", category: "Grocery",     list_price: 48   },
  // Grocery – Carrefour ceiling clamp (staple)
  { sku: "ALMEERA-RICE-5KG",  name: "Al Meera Basmati Rice 5kg",   brand: "Al Meera", category: "Grocery",   list_price: 49   },
  // Home – COGS floor override (won't sell below cost)
  { sku: "DYSON-V15-DETECT",  name: "Dyson V15 Detect Vacuum",     brand: "Dyson",   category: "Home",        list_price: 2799, cogs: 2200 },
  // Home – clean match (COGS floor passes)
  { sku: "PHILIPS-AP-AC2889", name: "Philips Air Purifier AC2889",  brand: "Philips", category: "Home",       list_price: 899,  cogs: 550 },
];

const catalogProductRows = PRODUCTS.map(p => ({
  account_id:  accountId,
  licensee_id: licenseeId,
  sku:      p.sku,
  name:     p.name,
  brand:    p.brand,
  category: p.category,
  attributes: {},
}));

ok(
  await (admin.from("catalog_products") as any)
    .upsert(catalogProductRows, { onConflict: "account_id,sku" }),
  "catalog_products upsert"
);

const { data: insertedProducts } = await (admin.from("catalog_products") as any)
  .select("id, sku, name")
  .eq("account_id", accountId);

const productIdBySku = new Map<string, string>(
  (insertedProducts ?? []).map((r: any) => [r.sku, r.id])
);
log(`  Inserted ${insertedProducts?.length} catalog_products`);

// ── Step 5: catalog_prices ────────────────────────────────────────────────────

section("STEP 5 — Seed catalog_prices");

const priceRows = PRODUCTS.map(p => ({
  account_id:  accountId,
  licensee_id: licenseeId,
  product_id:  productIdBySku.get(p.sku)!,
  channel:     "Online",
  list_price:  p.list_price,
  currency:    "QAR",
}));

ok(
  await (admin.from("catalog_prices") as any)
    .upsert(priceRows, { onConflict: "product_id,channel" }),
  "catalog_prices upsert"
);
log(`  Inserted ${priceRows.length} catalog_prices`);

// ── Step 6: margin_inputs (COGS) ──────────────────────────────────────────────

section("STEP 6 — Seed margin_inputs (COGS)");

const marginRows = PRODUCTS
  .filter(p => p.cogs !== undefined)
  .map(p => ({
    account_id:  accountId,
    licensee_id: licenseeId,
    product_id:  productIdBySku.get(p.sku)!,
    unit_cost:   p.cogs!,
    freight:     0,
    duty_pct:    0,
    fees_pct:    0,
    currency:    "QAR",
  }));

ok(
  await (admin.from("margin_inputs") as any)
    .upsert(marginRows, { onConflict: "product_id" }),
  "margin_inputs upsert"
);
log(`  Inserted ${marginRows.length} margin_inputs (COGS rows)`);

// ── Step 7: competitor_product_urls ──────────────────────────────────────────

section("STEP 7 — Seed competitor_product_urls");

type CompRow = { product: string; competitor: string; url: string; category: string };
const compUrls: CompRow[] = [];

function addComp(product: string, category: string, competitor: string) {
  const slug = product.replace(/\s+/g, "-").toLowerCase();
  const compSlug = competitor.toLowerCase().replace(/\s+/g, "-");
  compUrls.push({
    user_id: userId, product, category,
    competitor,
    url: `https://www.${compSlug}.qa/products/${slug}`,
  } as any);
}

// The engine reads product category from the competitor='self' URL row.
// Without a self URL the category is "" and category-scoped rules (ceiling,
// COGS floor) never fire. Add one self entry per product carrying the category;
// no matching scrape row → engine falls back to catalog_prices for self-price.

// Sony WH-1000XM5 – self + 3 competitors
addComp("Sony WH-1000XM5 Headphones", "Electronics", "self");
addComp("Sony WH-1000XM5 Headphones", "Electronics", "Carrefour");
addComp("Sony WH-1000XM5 Headphones", "Electronics", "Lulu");
addComp("Sony WH-1000XM5 Headphones", "Electronics", "Amazon");

// MacBook Air M3 – self + 3 competitors (5% ceiling fires)
addComp("Apple MacBook Air M3 256GB", "Electronics", "self");
addComp("Apple MacBook Air M3 256GB", "Electronics", "Carrefour");
addComp("Apple MacBook Air M3 256GB", "Electronics", "Amazon");
addComp("Apple MacBook Air M3 256GB", "Electronics", "Talabat");

// iPhone 15 Pro – self + 3 competitors
addComp("iPhone 15 Pro 256GB", "Electronics", "self");
addComp("iPhone 15 Pro 256GB", "Electronics", "Carrefour");
addComp("iPhone 15 Pro 256GB", "Electronics", "Lulu");
addComp("iPhone 15 Pro 256GB", "Electronics", "Amazon");

// Ariel – self + 3 competitors (Carrefour ceiling fires)
addComp("Ariel Automatic Detergent 3kg", "Grocery", "self");
addComp("Ariel Automatic Detergent 3kg", "Grocery", "Carrefour");
addComp("Ariel Automatic Detergent 3kg", "Grocery", "Lulu");
addComp("Ariel Automatic Detergent 3kg", "Grocery", "Amazon");

// Al Meera Basmati Rice – self + 3 competitors (Carrefour ceiling fires)
addComp("Al Meera Basmati Rice 5kg", "Grocery", "self");
addComp("Al Meera Basmati Rice 5kg", "Grocery", "Carrefour");
addComp("Al Meera Basmati Rice 5kg", "Grocery", "Lulu");
addComp("Al Meera Basmati Rice 5kg", "Grocery", "Talabat");

// Dyson V15 – self + 4 competitors (COGS floor fires)
addComp("Dyson V15 Detect Vacuum", "Home", "self");
addComp("Dyson V15 Detect Vacuum", "Home", "Carrefour");
addComp("Dyson V15 Detect Vacuum", "Home", "Lulu");
addComp("Dyson V15 Detect Vacuum", "Home", "Amazon");
addComp("Dyson V15 Detect Vacuum", "Home", "Talabat");

// Philips Air Purifier – self + 3 competitors
addComp("Philips Air Purifier AC2889", "Home", "self");
addComp("Philips Air Purifier AC2889", "Home", "Carrefour");
addComp("Philips Air Purifier AC2889", "Home", "Lulu");
addComp("Philips Air Purifier AC2889", "Home", "Amazon");

ok(
  await (admin.from("competitor_product_urls") as any)
    .upsert(
      compUrls.map(r => ({ ...r, user_id: userId })),
      { onConflict: "user_id,product,competitor" }
    ),
  "competitor_product_urls upsert"
);
log(`  Inserted ${compUrls.length} competitor_product_urls`);

// ── Step 8: competitor_scrapes ────────────────────────────────────────────────

section("STEP 8 — Seed competitor_scrapes");

// Prices are deliberately varied so the engine produces interesting outcomes:
//   - MacBook: Carrefour cheapest (3,999) → ceiling 3,999*1.05=4,199 clamps median 4,366 → 4,199
//   - Ariel: Carrefour cheapest (36.50) → ceiling clamps median 39.13 → 36.50
//   - Basmati: Carrefour cheapest (34.90) → ceiling clamps median 37.13 → 34.90
//   - Dyson: ALL competitors below COGS+15=2,215 → floor clamps median 2,124 → 2,215

const SCRAPE_PRICES: Record<string, Record<string, number>> = {
  "Sony WH-1000XM5 Headphones":   { Carrefour: 1149, Lulu: 1199, Amazon: 1179 },
  "Apple MacBook Air M3 256GB":    { Carrefour: 3999, Amazon: 4599, Talabat: 4499 },
  "iPhone 15 Pro 256GB":           { Carrefour: 3899, Lulu: 3999, Amazon: 3949 },
  "Ariel Automatic Detergent 3kg": { Carrefour: 36.50, Lulu: 39.90, Amazon: 41.00 },
  "Al Meera Basmati Rice 5kg":     { Carrefour: 34.90, Lulu: 37.50, Talabat: 39.00 },
  "Dyson V15 Detect Vacuum":       { Carrefour: 2099, Lulu: 2199, Amazon: 2149, Talabat: 2050 },
  "Philips Air Purifier AC2889":   { Carrefour: 749, Lulu: 789, Amazon: 769 },
};

const scrapeRows: any[] = [];
const freshAt = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(); // 2h ago

for (const urlRow of compUrls) {
  const prices = SCRAPE_PRICES[urlRow.product];
  if (!prices) continue;
  const price = prices[urlRow.competitor];
  if (price === undefined) continue;
  scrapeRows.push({
    user_id:    userId,
    url:        urlRow.url,
    competitor: urlRow.competitor,
    product:    urlRow.product,
    price,
    currency:   "QAR",
    status:     "success",
    scraped_at: freshAt,
  });
}

ok(
  await (admin.from("competitor_scrapes") as any).insert(scrapeRows),
  "competitor_scrapes insert"
);
log(`  Inserted ${scrapeRows.length} competitor_scrapes`);

// ── Step 8b: ensure pricing_rules exist ──────────────────────────────────────

section("STEP 8b — Ensure pricing_rules (upsert if missing)");

const { data: existingRules } = await (admin.from("pricing_rules") as any)
  .select("id")
  .eq("user_id", userId);

if ((existingRules?.length ?? 0) === 0) {
  const ruleRows = [
    {
      user_id: userId,
      rule_text: "Never price more than 5% above the lowest competitor on Electronics",
      rule_type: "competitor_ceiling_pct",
      params: { type: "competitor_ceiling_pct", pct: 0.05, category: "Electronics" },
      enabled: true, position: 0,
    },
    {
      user_id: userId,
      rule_text: "Match Carrefour on all Grocery items within 24 hours of their price change",
      rule_type: "competitor_ceiling_pct",
      params: { type: "competitor_ceiling_pct", pct: 0.0, competitor: "Carrefour", category: "Grocery" },
      enabled: true, position: 1,
    },
    {
      user_id: userId,
      rule_text: "Do not drop below QAR 15 margin on any Home category product",
      rule_type: "nominal_floor_qar",
      params: { type: "nominal_floor_qar", min_margin_qar: 15, category: "Home" },
      enabled: true, position: 2,
    },
  ];
  ok(
    await (admin.from("pricing_rules") as any).insert(ruleRows),
    "pricing_rules insert"
  );
  log(`  Inserted ${ruleRows.length} structured pricing_rules`);
} else {
  log(`  ${existingRules!.length} pricing_rules already present — skipping`);
}

// ── Step 9: clear existing seed recs ─────────────────────────────────────────

section("STEP 9 — Clear seed pricing_recommendations");

const { error: delErr, count: delCount } = await (admin.from("pricing_recommendations") as any)
  .delete({ count: "exact" })
  .eq("user_id", userId)
  .in("source", ["seed", "computed"]);

if (delErr) { console.error("delete seed recs failed", delErr); }
else { log(`  Deleted ${delCount} existing recommendation rows`); }

// ── Step 10: run the engine ───────────────────────────────────────────────────

section("STEP 10 — Run pricing engine");

const result = await runPricingEngineForUser(admin as any, userId);

log(`\n  written:      ${result.written}`);
log(`  skipped:      ${result.skipped}`);
log(`  seeds wiped:  ${result.seedsWiped}`);

if (result.reasons.length) {
  log("\n  Skip reasons:");
  result.reasons.forEach(r => log(`    · ${r}`));
}

// ── Step 11: print diagnostics ────────────────────────────────────────────────

section("STEP 11 — Recommendation diagnostics");

for (const d of result.diagnostics) {
  if (d.skipped) {
    log(`\n  ⊘ SKIPPED  ${d.product}`);
    log(`    reason: ${d.skipReason}`);
    continue;
  }
  const ruleNote = d.ruleEffects
    .filter(e => e.clamped)
    .map(e => `[${e.ruleType}] ${e.reason}`)
    .join("\n             ");

  log(`\n  ✓ ${d.product}`);
  log(`    self-price src: ${d.selfPriceSource}`);
  log(`    current price:  QAR ${d.selfPrice}`);
  log(`    competitor min: QAR ${d.competitorMin}`);
  log(`    raw candidate:  QAR ${d.rawRecommendation}`);
  log(`    final rec:      QAR ${d.finalRecommendation}`);
  if (ruleNote) log(`    rule override:  ${ruleNote}`);
}

// ── Step 12: read back from DB ────────────────────────────────────────────────

section("STEP 12 — Verify DB rows written");

const { data: written } = await (admin.from("pricing_recommendations") as any)
  .select("product, current_price, recommended_price, source, confidence, reason")
  .eq("user_id", userId)
  .eq("source", "computed")
  .order("position");

log(`\n  ${written?.length ?? 0} computed rows in pricing_recommendations:\n`);
for (const r of written ?? []) {
  log(`  ${r.product.padEnd(36)} ${String(r.current_price).padStart(7)} → ${String(r.recommended_price).padStart(7)} QAR   conf=${r.confidence}`);
}

section("DONE");
log(`\n  Login`);
log(`  Email: ${DEMO_EMAIL}`);
log(`  URL:   https://prizeskoutqa.prizeskoutqatar.workers.dev/login\n`);
