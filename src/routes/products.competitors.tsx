import { createFileRoute } from "@tanstack/react-router";
import { LineChart } from "lucide-react";
import { ProductDetailPage } from "@/components/marketing/ProductDetailPage";

export const Route = createFileRoute("/products/competitors")({
  head: () => ({
    meta: [
      { title: "Competitor Intelligence API | PrizeSkout" },
      {
        name: "description",
        content:
          "Live competitor prices, promotion depth, and detected behavior patterns across marketplaces and delivery apps — via REST API.",
      },
      { property: "og:title", content: "Competitor Intelligence API | PrizeSkout" },
      {
        property: "og:description",
        content:
          "Live competitor prices and behavior patterns across every channel. Programmatic access.",
      },
    ],
  }),
  component: () => (
    <ProductDetailPage
      eyebrow="Competitor Intelligence API"
      title="The live price map of your market."
      subtitle="Query competitor prices, promotion depth, and historical series across marketplaces, delivery apps, and direct sites. Our scrape fleet runs continuously; you read normalized, deduplicated data through a clean REST interface."
      icon={LineChart}
      endpoints={[
        { method: "GET", path: "/v1/competitors/prices", desc: "Latest prices across all tracked competitors and channels" },
        { method: "GET", path: "/v1/competitors/prices/history", desc: "Historical price series with configurable granularity" },
        { method: "GET", path: "/v1/competitors/patterns", desc: "Detected behavior patterns — bundling, weekend pricing, promo cadence" },
      ]}
      features={[
        "Continuous scrape of 1,400+ SKUs across 6+ channels by default, extensible on request",
        "Normalized currency, unit, and SKU matching across competitors",
        "Historical price series with 15-minute resolution",
        "Behavior pattern detection: promo cadence, weekend pricing, bundling, stealth drops",
        "Webhooks on price drops, promo starts, and competitor stockouts",
        "Field-intel reconciliation so in-store and online prices can be queried together",
      ]}
      sampleRequest={`curl "https://api.prizeskout.qa/v1/competitors/prices?product_id=sku_galaxy_buds_2_pro" \\
  -H "Authorization: Bearer sk_live_••••"`}
      sampleResponse={`{
  "product_id": "sku_galaxy_buds_2_pro",
  "currency": "QAR",
  "channels": {
    "carrefour": { "price": 449.00, "promo": null, "observed_at": "2025-01-14T09:42:11Z" },
    "talabat":   { "price": 479.00, "promo": { "depth_pct": 15, "ends_at": "2025-01-21" } },
    "amazon":    { "price": 469.00, "promo": null }
  }
}`}
      useCases={[
        { title: "Price monitoring dashboards", desc: "Build internal dashboards without running your own scrape infrastructure." },
        { title: "Alerting pipelines", desc: "Wire webhooks into Slack, PagerDuty, or your incident tool when competitors move." },
        { title: "Data science features", desc: "Feed normalized time series directly into your forecasting and elasticity models." },
      ]}
    />
  ),
});
