import { createFileRoute } from "@tanstack/react-router";
import { Megaphone } from "lucide-react";
import { ProductDetailPage } from "@/components/marketing/ProductDetailPage";

export const Route = createFileRoute("/products/promotions")({
  head: () => ({
    meta: [
      { title: "Promotions & ROI API | PrizeSkout" },
      {
        name: "description",
        content:
          "Simulate campaign ROI with elasticity and cannibalization. Query the live competitor promo calendar via REST.",
      },
      { property: "og:title", content: "Promotions & ROI API | PrizeSkout" },
      {
        property: "og:description",
        content: "Simulate promotion ROI and query the live promo calendar programmatically.",
      },
    ],
  }),
  component: () => (
    <ProductDetailPage
      eyebrow="Promotions & ROI API"
      title="Before you burn the margin, simulate it."
      subtitle="Simulate ROI for any campaign — category, depth, duration, channel — and get expected GMV uplift, cannibalization, and net ROI back in a single call. Plus a live, programmatic read on what every tracked competitor is running right now."
      icon={Megaphone}
      endpoints={[
        { method: "GET", path: "/v1/promotions/calendar", desc: "Live promo calendar across all tracked competitors" },
        { method: "POST", path: "/v1/promotions/simulate", desc: "Simulate a candidate campaign with your ROI model parameters" },
        { method: "GET", path: "/v1/promotions/campaigns", desc: "Your historical campaigns with measured outcomes" },
      ]}
      features={[
        "ROI simulator parameterized on your elasticity, baseline, and cannibalization model",
        "Healthy-campaign heuristic that flags designs likely to burn net margin",
        "Live competitor promo calendar with depth, duration, and category coverage",
        "Replay historical campaigns to backtest new ROI parameters",
        "Webhook events when competitors launch or extend promotions",
        "Tie every live campaign back to the recommendation or signal that triggered it",
      ]}
      sampleRequest={`curl https://api.prizeskout.com/v1/promotions/simulate \\
  -H "Authorization: Bearer sk_live_••••" \\
  -H "Content-Type: application/json" \\
  -d '{
    "category": "small_appliances",
    "channel": "talabat",
    "depth_pct": 15,
    "duration_days": 7
  }'`}
      sampleResponse={`{
  "scenario_id": "sim_01HX9P2K3M7QZ8Y4N6W5B1E2F0",
  "gmv_uplift": 142800,
  "incremental_orders": 612,
  "cannibalization_pct": 18.4,
  "net_roi": 1.87,
  "healthy": true
}`}
      useCases={[
        { title: "Pre-launch approval gates", desc: "Require every proposed campaign to pass an ROI check before it reaches ops." },
        { title: "Competitive response", desc: "Ingest the promo-calendar webhook and auto-propose counter-campaigns." },
        { title: "Finance reconciliation", desc: "Attach measured outcomes to planned ROI for post-mortem analysis." },
      ]}
    />
  ),
});
