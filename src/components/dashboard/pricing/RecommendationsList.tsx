import { RecommendationCard, type Recommendation } from "./RecommendationCard";

const RECOMMENDATIONS: Recommendation[] = [
  {
    id: "r1",
    product: "Sony WH-1000XM5 Headphones",
    category: "Electronics",
    channel: "Online",
    current: 1299,
    recommended: 1199,
    reason:
      "You are 8% above market average. Carrefour and Amazon are both at 1,199. Price sensitivity is high in this bracket based on 11 months of your sales data. Lowering to match captures an estimated 340 additional units per month without triggering a price war, since you are matching rather than undercutting.",
    unitImpact: "+12%",
    marginImpact: "-2.1%",
    netMonthly: "+QAR 18K",
    confidence: 87,
  },
  {
    id: "r2",
    product: "Apple MacBook Air M3 256GB",
    category: "Electronics",
    channel: "Online",
    current: 4499,
    recommended: 4599,
    reason:
      "Carrefour is currently out of stock on this product. Talabat is at 4,599. Amazon has it at 4,299 but with 5 to 7 day delivery compared to your same-day option. Your customer base skews 14% toward premium buyers who pay for speed. Our elasticity model confirms low sensitivity at this price point.",
    unitImpact: "-3%",
    marginImpact: "+2.8%",
    netMonthly: "+QAR 31K",
    confidence: 91,
  },
  {
    id: "r3",
    product: "Ariel Detergent 3kg",
    category: "Grocery",
    channel: "Online",
    current: 42,
    recommended: 39.9,
    reason:
      "Grocery buyers on your platform are extremely price-sensitive. Carrefour is at 38.5 and Lulu at 39.9. You are currently the most expensive option for a commodity product. At 39.9 you match Lulu and stay above Carrefour. Combined with your delivery convenience, this is the optimal price point.",
    unitImpact: "+18%",
    marginImpact: "-5%",
    netMonthly: "+QAR 8K",
    confidence: 94,
  },
  {
    id: "r4",
    product: "Dyson V15 Detect Vacuum",
    category: "Home",
    channel: "Online",
    current: 2799,
    recommended: 2699,
    reason:
      "All five competitors are priced below you on this product. Lulu is temporarily out of stock but based on their historical restock cycle, they will be back within 4 days. There is a short window to capture customers looking for immediate availability. Recommend moving now and reviewing after Lulu restocks.",
    unitImpact: "+8%",
    marginImpact: "-1.2%",
    netMonthly: "+QAR 14K",
    confidence: 82,
  },
  {
    id: "r5",
    product: "Samsung Galaxy S24 Ultra (In-Store)",
    category: "Electronics",
    channel: "In-Store",
    current: 3999,
    recommended: 3899,
    reason:
      "Your in-store price is QAR 100 higher than your own online price for the same product. Customers comparing on their phones in your store are seeing this gap. Carrefour in-store at Doha Festival City is at 3,849. Harmonizing with your online price removes the inconsistency and keeps you within 1.3% of Carrefour.",
    unitImpact: "+5%",
    marginImpact: "-0.8%",
    netMonthly: "+QAR 6K",
    confidence: 88,
  },
];

export function RecommendationsList() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {RECOMMENDATIONS.map((rec) => (
        <RecommendationCard key={rec.id} rec={rec} />
      ))}
    </div>
  );
}
