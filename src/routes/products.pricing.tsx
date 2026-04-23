import { createFileRoute } from "@tanstack/react-router";
import { Tags } from "lucide-react";
import { ProductDetailPage } from "@/components/marketing/ProductDetailPage";

export const Route = createFileRoute("/products/pricing")({
  head: () => ({
    meta: [
      { title: "Pricing Recommendations API | PrizeSkout" },
      {
        name: "description",
        content:
          "AI-driven price decisions with expected P&L impact, confidence, and signal attribution. Per SKU, per channel, via REST API.",
      },
      { property: "og:title", content: "Pricing Recommendations API | PrizeSkout" },
      {
        property: "og:description",
        content:
          "AI-driven price decisions with expected P&L impact, confidence, and signal attribution.",
      },
    ],
  }),
  component: () => (
    <ProductDetailPage
      eyebrow="Pricing Recommendations API"
      title="Decide the right price. Cite the evidence."
      subtitle="Fetch a margin-aware recommendation for any SKU and channel set. Each recommendation ships with the expected P&L delta, a confidence score, and the signals that drove the decision — so your systems and humans can audit every move."
      icon={Tags}
      endpoints={[
        { method: "POST", path: "/v1/pricing/recommendations", desc: "Create a recommendation for a SKU on one or more channels" },
        { method: "GET", path: "/v1/pricing/recommendations/:id", desc: "Retrieve a single recommendation with signal attribution" },
        { method: "GET", path: "/v1/pricing/recommendations", desc: "List recommendations, filter by product, channel, or confidence" },
        { method: "POST", path: "/v1/pricing/decisions", desc: "Log whether you accepted, adjusted, or rejected a recommendation" },
      ]}
      features={[
        "Expected margin delta, unit impact, and net monthly impact on every recommendation",
        "Confidence score calibrated against historical outcomes",
        "Signal attribution: which competitor, which channel, which event drove the call",
        "Per-channel guardrails you define — floor prices, MAP rules, margin minima",
        "Webhook events when a new recommendation fires or an existing one changes",
        "Full decision log for compliance and post-hoc analysis",
      ]}
      sampleRequest={`curl https://api.prizeskout.qa/v1/pricing/recommendations \\
  -H "Authorization: Bearer sk_live_••••" \\
  -H "Content-Type: application/json" \\
  -d '{
    "product_id": "sku_galaxy_buds_2_pro",
    "channels": ["talabat", "carrefour"],
    "objective": "protect_margin"
  }'`}
      sampleResponse={`{
  "id": "rec_01HX9P2K3M7QZ8Y4N6W5B1E2F0",
  "product_id": "sku_galaxy_buds_2_pro",
  "recommended_price": 449.00,
  "confidence": 0.91,
  "reason": "carrefour_price_drop",
  "expected_impact": {
    "margin_delta_pct": -0.8,
    "units_delta_pct": 6.4,
    "net_monthly": 3820
  }
}`}
      useCases={[
        { title: "Dynamic repricer", desc: "Poll or subscribe to recommendations and push price changes directly to your commerce platform." },
        { title: "Merchandising review", desc: "Queue recommendations for category managers to approve with full evidence attached." },
        { title: "Audit & compliance", desc: "Stream decisions to your data warehouse for quarterly pricing governance reviews." },
      ]}
    />
  ),
});
