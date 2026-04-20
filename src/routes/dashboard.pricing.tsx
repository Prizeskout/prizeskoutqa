import { createFileRoute, redirect } from "@tanstack/react-router";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { MetricsRow } from "@/components/dashboard/overview/MetricsRow";
import { ModelStatusBanner } from "@/components/dashboard/pricing/ModelStatusBanner";
import { RecommendationsList } from "@/components/dashboard/pricing/RecommendationsList";
import { PricingRules } from "@/components/dashboard/pricing/PricingRules";
import { ModelLearningCallout } from "@/components/dashboard/pricing/ModelLearningCallout";
import { PricingPendingPage } from "@/components/dashboard/Skeletons";
import { useHydrationRefetch } from "@/hooks/useHydrationRefetch";
import { supabase } from "@/integrations/supabase/client";
import type {
  PricingData,
  PricingMetric,
  PricingRecommendation,
  PricingRule,
} from "@/lib/pricing-data";

async function loadPricing(): Promise<PricingData> {
  // SSR has no auth session — return empty payload, the client guard
  // in `dashboard.tsx` will redirect unauthenticated users to /login.
  if (typeof window === "undefined") {
    return { metrics: [], recommendations: [], rules: [] };
  }

  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) {
    throw redirect({ to: "/login", search: { redirect: "/dashboard/pricing" } });
  }

  const [metricsRes, recsRes, rulesRes] = await Promise.all([
    supabase
      .from("pricing_metrics")
      .select("*")
      .order("position", { ascending: true }),
    supabase
      .from("pricing_recommendations")
      .select("*")
      .order("position", { ascending: true }),
    supabase
      .from("pricing_rules")
      .select("*")
      .order("position", { ascending: true }),
  ]);

  if (metricsRes.error) throw metricsRes.error;
  if (recsRes.error) throw recsRes.error;
  if (rulesRes.error) throw rulesRes.error;

  return {
    metrics: (metricsRes.data ?? []) as PricingMetric[],
    recommendations: (recsRes.data ?? []) as unknown as PricingRecommendation[],
    rules: (rulesRes.data ?? []) as PricingRule[],
  };
}

export const Route = createFileRoute("/dashboard/pricing")({
  head: () => ({ meta: [{ title: "Pricing | PrizeSkout" }] }),
  loader: () => loadPricing(),
  staleTime: 0,
  pendingMs: 0,
  pendingMinMs: 300,
  pendingComponent: PricingPendingPage,
  component: PricingPage,
});

function PricingPage() {
  const data = Route.useLoaderData();

  return (
    <DashboardLayout title="Pricing">
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <MetricsRow metrics={data.metrics} />
        <ModelStatusBanner />
        <RecommendationsList recommendations={data.recommendations} />
        <PricingRules rules={data.rules} />
        <ModelLearningCallout />
      </div>
    </DashboardLayout>
  );
}
