// Shared types for the Pricing tab.
// Data fetch lives in src/routes/dashboard.pricing.tsx loader,
// which queries Supabase directly (RLS scopes results to the signed-in user).

import type { OverviewMetric } from "@/lib/overview-data";

// Pricing metrics share the exact same column shape as overview metrics -
// reuse the type so <MetricsRow /> can render them with no changes.
export type PricingMetric = OverviewMetric;

export type PricingRecommendation = {
  id: string;
  product: string;
  category: string;
  channel: "Online" | "In-Store";
  current_price: number;
  recommended_price: number;
  reason: string;
  unit_impact: string;
  margin_impact: string;
  net_monthly: string;
  confidence: number;
  position: number;
};

export type PricingRule = {
  id: string;
  rule_text: string;
  enabled: boolean;
  position: number;
};

export type PricingData = {
  metrics: PricingMetric[];
  recommendations: PricingRecommendation[];
  rules: PricingRule[];
};
