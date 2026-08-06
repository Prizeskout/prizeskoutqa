import { computeRecommendations } from "../src/server/pricing-engine.ts";

const now = new Date().toISOString();
const result = computeRecommendations({
  userId: "channel-test-user",
  urls: [
    { product: "Test Coffee", competitor: "self", category: "Coffee", url: "https://self/zid", channel: "zid", match_status: "manual_confirmed", match_confidence: 1 },
    { product: "Test Coffee", competitor: "Store A", category: "Coffee", url: "https://a/zid", channel: "zid", match_status: "manual_confirmed", match_confidence: 1 },
    { product: "Test Coffee", competitor: "self", category: "Coffee", url: "https://self/noon", channel: "noon", match_status: "manual_confirmed", match_confidence: 1 },
    { product: "Test Coffee", competitor: "Store B", category: "Coffee", url: "https://b/noon", channel: "noon", match_status: "manual_confirmed", match_confidence: 1 },
  ],
  scrapes: [
    { url: "https://self/zid", product: "Test Coffee", competitor: "self", price: 120, scraped_at: now, channel: "zid", availability: "in_stock", match_confidence: 1 },
    { url: "https://a/zid", product: "Test Coffee", competitor: "Store A", price: 100, scraped_at: now, channel: "zid", availability: "in_stock", match_confidence: 1 },
    { url: "https://self/noon", product: "Test Coffee", competitor: "self", price: 200, scraped_at: now, channel: "noon", availability: "in_stock", match_confidence: 1 },
    { url: "https://b/noon", product: "Test Coffee", competitor: "Store B", price: 150, scraped_at: now, channel: "noon", availability: "in_stock", match_confidence: 1 },
  ],
  roiCategories: [],
  rules: [],
  catalogPrices: new Map(),
  unitCostByProduct: new Map(),
  landedCostByProduct: new Map(),
  channelCostByChannel: new Map(),
});

const byChannel = new Map(result.recs.map((rec) => [rec.channel, rec]));
const zid = byChannel.get("zid");
const noon = byChannel.get("noon");

if (result.recs.length !== 2 || zid?.recommended_price !== 100 || noon?.recommended_price !== 150) {
  throw new Error(`Channel isolation failed: ${JSON.stringify(result.recs)}`);
}

console.log("Channel isolation passed: zid=QAR 100, noon=QAR 150 (same product, independent markets)");
