import { createFileRoute, redirect } from "@tanstack/react-router";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { MetricsRow } from "@/components/dashboard/overview/MetricsRow";
import { ModelStatusBanner } from "@/components/dashboard/pricing/ModelStatusBanner";
import { RecommendationsList } from "@/components/dashboard/pricing/RecommendationsList";
import { PricingRules } from "@/components/dashboard/pricing/PricingRules";
import { ModelLearningCallout } from "@/components/dashboard/pricing/ModelLearningCallout";
import { AIInsightsCard } from "@/components/dashboard/AIInsightsCard";
import { ExportInsightsButton } from "@/components/dashboard/ExportInsightsButton";
import { NewSinceBanner } from "@/components/dashboard/NewSinceBanner";
import { PricingPendingPage } from "@/components/dashboard/Skeletons";
import { pendingOnSSR } from "@/lib/ssr-pending";
import { supabase } from "@/integrations/supabase/client";
import type {
  PricingData,
  PricingMetric,
  PricingRecommendation,
  PricingRule,
} from "@/lib/pricing-data";
import type { AIInsight } from "@/server/ai-insights.functions";

export type PricingDecision = {
  id: string;
  recommendation_id: string;
  decision: "applied" | "dismissed" | "snoozed";
  snooze_until: string | null;
  created_at: string;
};

type PricingPageData = PricingData & {
  insight: AIInsight | null;
  decisions: PricingDecision[];
};

async function loadPricing(): Promise<PricingPageData> {
  // During SSR keep the route in its pending state so the skeleton is what
  // serializes into the SSR HTML. Client-side the loader runs with the real
  // session.
  if (typeof window === "undefined") {
    return pendingOnSSR<PricingPageData>({
      metrics: [],
      recommendations: [],
      rules: [],
      insight: null,
      decisions: [],
    });
  }

  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) {
    throw redirect({ to: "/login", search: { redirect: "/dashboard/pricing" } });
  }

  const [metricsRes, recsRes, rulesRes, insightRes, decisionsRes] = await Promise.all([
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
    supabase.from("ai_insights").select("*").eq("page", "pricing").maybeSingle(),
    supabase
      .from("pricing_decisions")
      .select("id, recommendation_id, decision, snooze_until, created_at")
      .order("created_at", { ascending: false }),
  ]);

  if (metricsRes.error) throw metricsRes.error;
  if (recsRes.error) throw recsRes.error;
  if (rulesRes.error) throw rulesRes.error;

  return {
    metrics: (metricsRes.data ?? []) as PricingMetric[],
    recommendations: (recsRes.data ?? []) as unknown as PricingRecommendation[],
    rules: (rulesRes.data ?? []) as PricingRule[],
    insight: (insightRes.data as AIInsight | null) ?? null,
    decisions: (decisionsRes.data ?? []) as PricingDecision[],
  };
}

export const Route = createFileRoute("/dashboard/pricing")({
  head: () => ({ meta: [{ title: "Pricing | PrizeSkout" }] }),
  validateSearch: (search: Record<string, unknown>) => ({
    from: typeof search.from === "string" ? search.from : undefined,
  }),
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
    <DashboardLayout
      title="Pricing"
      subtitle="AI-driven price recommendations with explainable reasoning and projected margin impact."
      helpItems={[
        "Each card explains why the model recommends a new price, plus the expected unit and monthly impact.",
        "Confidence reflects how strong the underlying signals are. Review the low-confidence ones manually.",
        "Pricing rules at the bottom constrain the model. Toggle them to enforce floors, parity, and other guardrails.",
      ]}
    >
      <NewSinceBanner
        pageKey="pricing"
        count={data.recommendations.length}
        label="pricing recommendation"
        fromParam="overview"
      />
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <ExportInsightsButton />
        </div>
        <MetricsRow metrics={data.metrics} />
        <AIInsightsCard page="pricing" initial={data.insight} />
        <ModelStatusBanner />
        <RecommendationsList
          recommendations={data.recommendations}
          decisions={data.decisions}
        />
        <PricingRules rules={data.rules} />
        <ModelLearningCallout />
      </div>
    </DashboardLayout>
  );
}
