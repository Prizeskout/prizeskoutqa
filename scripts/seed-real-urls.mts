/**
 * Seed REAL competitor product URLs for the 7 demo products.
 *
 * Research methodology: each URL was found via a targeted search query and
 * verified to appear as a direct product-detail-page result from the retailer.
 * URLs marked "NOT SEEDED" have no confirmed cross-retailer listing — do not
 * fabricate them.
 *
 * Coverage ceiling:
 *   Lulu Qatar (gcc.luluhypermarket.com): most reliable — all electronics
 *     and grocery products found. Scrapes confirmed working via Firecrawl.
 *   Amazon.ae: UAE storefront, accessible from Qatar, confirmed product pages.
 *   Noon Qatar (noon.com/qatar-en): Sony XM5 confirmed. Other products not
 *     found via search — NOT seeded to avoid fabrication.
 *   Carrefour Qatar (carrefour.qa): no scrapeable product pages found via
 *     search — NOT seeded.
 *   Talabat: food-delivery app; does not list electronics/home appliances —
 *     NOT seeded for those categories.
 *   Al Meera Basmati Rice 5kg: "Al Meera" is a Qatari hypermarket chain, not
 *     a branded rice sold at competing retailers. No cross-competitor URL
 *     exists. Only the 'self' row is retained for engine self-price.
 *
 * What needs the matching engine (future roadmap):
 *   Automatic SKU→URL matching across an arbitrary merchant catalog requires
 *   entity-resolution across retailer product graphs. This script hardens the
 *   pipeline for the ~7 KNOWN products. Scaling to hundreds of SKUs is a
 *   separate roadmap item (catalog entity-resolution engine).
 */

import { createClient } from "@supabase/supabase-js";

const admin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

// ─── Target user ──────────────────────────────────────────────────────────────

// UID is hardcoded below — this lookup is informational only
const users = null;

// Fallback: resolve from accounts_v2 seed
const UID = "bed12406-2798-47f7-a30c-5de559e90d6d";

// ─── Real URLs ────────────────────────────────────────────────────────────────

type UrlRow = {
  user_id: string;
  product: string;
  category: string;
  competitor: string;
  url: string;
};

const REAL_URLS: Omit<UrlRow, "user_id">[] = [
  // ── Sony WH-1000XM5 Headphones ─────────────────────────────────────────────
  // self row carries category for the engine's rule evaluation
  {
    product: "Sony WH-1000XM5 Headphones",
    category: "Electronics",
    competitor: "self",
    url: "https://www.luluhypermarket.com/en-qa/sony-wireless-noise-cancelling-headphone-wh1000xm5-black/p/1990563",
  },
  // Lulu Qatar — confirmed product page, Black variant
  {
    product: "Sony WH-1000XM5 Headphones",
    category: "Electronics",
    competitor: "Lulu",
    url: "https://gcc.luluhypermarket.com/en-qa/sony-wireless-noise-cancelling-headphone-wh1000xm5-black/p/1990563/",
  },
  // Amazon.ae — confirmed ASIN B09ZFD9CBB (UAE version, QAR pricing shown in Qatar)
  {
    product: "Sony WH-1000XM5 Headphones",
    category: "Electronics",
    competitor: "Amazon",
    url: "https://www.amazon.ae/Sony-WH-1000XM5-Cancelling-Headphones-Detection/dp/B09ZFD9CBB",
  },
  // Noon Qatar — confirmed PDP (Midnight Blue, N53433355A)
  {
    product: "Sony WH-1000XM5 Headphones",
    category: "Electronics",
    competitor: "Noon",
    url: "https://www.noon.com/qatar-en/over-ear-wireless-noise-cancelling-headphones-wh-1000xm5-lm-midnight-blue/N53433355A/p/",
  },

  // ── iPhone 15 Pro 256GB ────────────────────────────────────────────────────
  {
    product: "iPhone 15 Pro 256GB",
    category: "Electronics",
    competitor: "self",
    url: "https://gcc.luluhypermarket.com/en-qa/apple-iphone-15-pro-5g-smartphone-256-gb-storage-natural-titanium/p/2163448/",
  },
  // Lulu Qatar — confirmed product page (Natural Titanium, 256GB)
  {
    product: "iPhone 15 Pro 256GB",
    category: "Electronics",
    competitor: "Lulu",
    url: "https://gcc.luluhypermarket.com/en-qa/apple-iphone-15-pro-5g-smartphone-256-gb-storage-natural-titanium/p/2163448/",
  },

  // ── Apple MacBook Air M3 256GB ─────────────────────────────────────────────
  // NOTE: Lulu lists MacBook Air M3 as 16GB RAM / 256GB SSD (Space Grey, p/2373067).
  // The seeded product SKU is APPLE-MBA-M3-256 (our list_price: 4799 QAR for
  // the 8GB base). This URL covers the 16GB/256GB variant — prices will differ.
  // Flagged in coverage report. No clean 8GB/256GB URL found on Lulu Qatar.
  {
    product: "Apple MacBook Air M3 256GB",
    category: "Electronics",
    competitor: "self",
    url: "https://gcc.luluhypermarket.com/en-qa/apple-13-inches-macbook-air-m3-chip-with-8-core-cpu-and-8-core-gpu-16-gb-ram-256-gb-ssd-macos-sequoia-space-grey/p/2373067/",
  },
  {
    product: "Apple MacBook Air M3 256GB",
    category: "Electronics",
    competitor: "Lulu",
    url: "https://gcc.luluhypermarket.com/en-qa/apple-13-inches-macbook-air-m3-chip-with-8-core-cpu-and-8-core-gpu-16-gb-ram-256-gb-ssd-macos-sequoia-space-grey/p/2373067/",
  },

  // ── Ariel Automatic Detergent 3kg ──────────────────────────────────────────
  {
    product: "Ariel Automatic Detergent 3kg",
    category: "Grocery",
    competitor: "self",
    url: "https://www.luluhypermarket.com/en-qa/ariel-automatic-powder-laundry-detergent-original-scent/p/637151",
  },
  // Lulu Qatar — confirmed product page (Ariel Automatic Powder Laundry
  // Detergent Original Scent, QAR 43.00, p/637151)
  {
    product: "Ariel Automatic Detergent 3kg",
    category: "Grocery",
    competitor: "Lulu",
    url: "https://www.luluhypermarket.com/en-qa/ariel-automatic-powder-laundry-detergent-original-scent/p/637151",
  },

  // ── Dyson V15 Detect Vacuum ────────────────────────────────────────────────
  {
    product: "Dyson V15 Detect Vacuum",
    category: "Home",
    competitor: "self",
    url: "https://gcc.luluhypermarket.com/en-qa/dyson-v15-detect-absolute-cordless-vacuum-cleaner/p/1981759/",
  },
  // Lulu Qatar — confirmed product page (Dyson V15 Detect Absolute, p/1981759)
  {
    product: "Dyson V15 Detect Vacuum",
    category: "Home",
    competitor: "Lulu",
    url: "https://gcc.luluhypermarket.com/en-qa/dyson-v15-detect-absolute-cordless-vacuum-cleaner/p/1981759/",
  },
  // Amazon.ae — confirmed ASIN B099MQG6CX (V15 Detect Absolute Cordless)
  {
    product: "Dyson V15 Detect Vacuum",
    category: "Home",
    competitor: "Amazon",
    url: "https://www.amazon.ae/Dyson-Absolute-Cordless-Cleaner-V15DETECT/dp/B099MQG6CX",
  },

  // ── Philips Air Purifier AC2889 ────────────────────────────────────────────
  {
    product: "Philips Air Purifier AC2889",
    category: "Home",
    competitor: "self",
    url: "https://www.luluhypermarket.com/en-qa/philips-air-purifier-ac2889-90/p/1685792",
  },
  // Lulu Qatar — confirmed product page (Philips Air Purifier AC2889/90, p/1685792)
  {
    product: "Philips Air Purifier AC2889",
    category: "Home",
    competitor: "Lulu",
    url: "https://www.luluhypermarket.com/en-qa/philips-air-purifier-ac2889-90/p/1685792",
  },
  // Amazon.ae — confirmed ASIN B076F5RLP5 (Philips Series 2000i AC2889/60)
  {
    product: "Philips Air Purifier AC2889",
    category: "Home",
    competitor: "Amazon",
    url: "https://www.amazon.ae/Connected-Ultrafine-Anti-Allergen-AC2889-60/dp/B076F5RLP5",
  },

  // ── Al Meera Basmati Rice 5kg ─────────────────────────────────────────────
  // Al Meera is a Qatari hypermarket chain — this brand name does not appear
  // on Lulu, Amazon.ae, or Noon as a cross-retailer product. Only 'self' row
  // is retained so the engine can resolve a self-price from catalog_prices.
  // No competitor URLs seeded — honest about this ceiling.
  {
    product: "Al Meera Basmati Rice 5kg",
    category: "Grocery",
    competitor: "self",
    url: "https://www.almeera.com.qa/products/al-meera-basmati-rice-5kg",
  },
];

// ─── Upsert ───────────────────────────────────────────────────────────────────

console.log(`\nSeeding ${REAL_URLS.length} real competitor URLs for user ${UID}...\n`);

// Remove ALL existing competitor_product_urls for this user first (idempotent reset).
const { error: delErr } = await (admin as any)
  .from("competitor_product_urls")
  .delete()
  .eq("user_id", UID);
if (delErr) throw new Error(`Delete failed: ${delErr.message}`);
console.log("  Cleared previous URL rows");

const rows: UrlRow[] = REAL_URLS.map((r) => ({ ...r, user_id: UID }));
const { error: insErr } = await (admin as any)
  .from("competitor_product_urls")
  .insert(rows);
if (insErr) throw new Error(`Insert failed: ${insErr.message}`);

console.log(`  Inserted ${rows.length} rows\n`);

// Print summary
const byProduct = new Map<string, string[]>();
for (const r of REAL_URLS) {
  if (r.competitor === "self") continue;
  const list = byProduct.get(r.product) ?? [];
  list.push(r.competitor);
  byProduct.set(r.product, list);
}

console.log("Coverage summary (real URLs seeded):");
console.log("─".repeat(60));
for (const [product, comps] of byProduct) {
  console.log(`  ${product.padEnd(34)} → ${comps.join(", ")}`);
}
console.log("─".repeat(60));
console.log("  Al Meera Basmati Rice 5kg           → (none — local chain, no cross-retailer URL)");
console.log("\n⚠  MacBook Air M3: Lulu URL is 16GB RAM / 256GB SSD variant.");
console.log("   Prices will reflect that SKU, not the 8GB base. Noted in coverage report.\n");
console.log("Done.");
