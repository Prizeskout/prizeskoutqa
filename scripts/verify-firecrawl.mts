import { fetchCompetitorPrice } from "../src/server/scrape-runner.ts";

const url = process.argv[2];
if (!url) throw new Error("Usage: tsx scripts/verify-firecrawl.mts <public-product-url>");

const result = await fetchCompetitorPrice(url);
if (!result.ok) {
  console.error(JSON.stringify({ ok: false, category: result.category, error: result.error }));
  process.exit(1);
}

console.log(JSON.stringify({
  ok: true,
  price: result.price,
  currency: result.currency,
  availability: result.availability,
  productTitle: result.productTitle,
  sku: result.sku,
  gtin: result.gtin,
  seller: result.seller,
  originalPrice: result.originalPrice,
}, null, 2));
