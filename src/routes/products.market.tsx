import { createFileRoute } from "@tanstack/react-router";
import { Map as MapIcon } from "lucide-react";
import { ProductDetailPage } from "@/components/marketing/ProductDetailPage";

export const Route = createFileRoute("/products/market")({
  head: () => ({
    meta: [
      { title: "Market Signals API | PrizeSkout" },
      {
        name: "description",
        content:
          "Category growth, assortment gaps, and cross-border price radar. Feed merchandising and planning systems via REST.",
      },
      { property: "og:title", content: "Market Signals API | PrizeSkout" },
      {
        property: "og:description",
        content:
          "Category growth, assortment gaps, and cross-border price radar — as a programmatic feed.",
      },
    ],
  }),
  component: () => (
    <ProductDetailPage
      eyebrow="Market Signals API"
      title="Assortment and demand signals on tap."
      subtitle="Pull category growth, top movers, assortment gaps, and cross-border price radar directly into your merchandising, planning, and replenishment systems. Less spreadsheet triage, more programmatic decisions."
      icon={MapIcon}
      endpoints={[
        { method: "GET", path: "/v1/market/trends", desc: "Category growth, volatility, and top movers" },
        { method: "GET", path: "/v1/market/assortment-gaps", desc: "SKUs competitors carry that you do not, ranked by demand" },
        { method: "GET", path: "/v1/market/cross-border", desc: "International price radar for import-risk monitoring" },
      ]}
      features={[
        "Category-level growth and volatility rollups updated hourly",
        "Assortment gap detection with demand scoring and competitor counts",
        "Cross-border radar across 20+ international markets with delivery cost modeling",
        "Trending products feed with status (rising, peaking, cooling)",
        "Historical pull for backtesting planning models",
        "Scoped keys so planning and pricing teams can each consume only what they need",
      ]}
      sampleRequest={`curl "https://api.prizeskout.com/v1/market/assortment-gaps?limit=10" \\
  -H "Authorization: Bearer sk_live_••••"`}
      sampleResponse={`{
  "data": [
    {
      "product": "Cordless vacuum 2200W",
      "demand_score": 0.92,
      "competitors_carrying": 4,
      "missed_monthly_gmv": 18400,
      "avg_market_price": 549.00
    }
  ]
}`}
      useCases={[
        { title: "Merchandising planning", desc: "Rank assortment gaps by estimated missed GMV to prioritize onboarding." },
        { title: "Cross-border risk", desc: "Trigger alerts when import parity erodes your domestic pricing power." },
        { title: "Demand forecasting", desc: "Feed category growth signals into forecasting and replenishment models." },
      ]}
    />
  ),
});
