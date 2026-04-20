import { createFileRoute, redirect } from "@tanstack/react-router";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { PromotionsMetrics } from "@/components/dashboard/promotions/PromotionsMetrics";
import { PromotionCalendar } from "@/components/dashboard/promotions/PromotionCalendar";
import { ROISimulator } from "@/components/dashboard/promotions/ROISimulator";
import { PastCampaigns } from "@/components/dashboard/promotions/PastCampaigns";
import { TimingInsight } from "@/components/dashboard/promotions/TimingInsight";
import { PromotionsPendingPage } from "@/components/dashboard/Skeletons";
import { pendingOnSSR } from "@/lib/ssr-pending";
import { supabase } from "@/integrations/supabase/client";
import type {
  PromotionsData,
  PromotionsMetric,
  PromotionCalendarRow,
  PastCampaignRow,
  TimingInsightRow,
} from "@/lib/promotions-data";
import type { RoiModelCategory, ScenarioRow } from "@/lib/roi-model";

async function loadPromotions(): Promise<PromotionsData> {
  if (typeof window === "undefined") {
    return pendingOnSSR<PromotionsData>();
  }
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) {
    throw redirect({ to: "/login", search: { redirect: "/dashboard/promotions" } });
  }

  const [metricsRes, calendarRes, campaignsRes, insightsRes, roiModelRes, scenariosRes] =
    await Promise.all([
      supabase.from("promotions_metrics").select("*").order("position", { ascending: true }),
      supabase.from("promotion_calendar").select("*").order("position", { ascending: true }),
      supabase.from("past_campaigns").select("*").order("position", { ascending: true }),
      supabase.from("timing_insights").select("*").order("position", { ascending: true }),
      supabase.from("roi_model_categories").select("*").order("position", { ascending: true }),
      supabase
        .from("promotions_scenarios")
        .select("*")
        .order("simulated_at", { ascending: false })
        .limit(11),
    ]);

  if (metricsRes.error) throw metricsRes.error;
  if (calendarRes.error) throw calendarRes.error;
  if (campaignsRes.error) throw campaignsRes.error;
  if (insightsRes.error) throw insightsRes.error;
  if (roiModelRes.error) throw roiModelRes.error;
  if (scenariosRes.error) throw scenariosRes.error;

  return {
    metrics: (metricsRes.data ?? []) as PromotionsMetric[],
    calendar: (calendarRes.data ?? []) as unknown as PromotionCalendarRow[],
    campaigns: (campaignsRes.data ?? []) as unknown as PastCampaignRow[],
    insights: (insightsRes.data ?? []) as unknown as TimingInsightRow[],
    roiModel: (roiModelRes.data ?? []) as unknown as RoiModelCategory[],
    scenarios: (scenariosRes.data ?? []) as unknown as ScenarioRow[],
  };
}

export const Route = createFileRoute("/dashboard/promotions")({
  head: () => ({ meta: [{ title: "Promotions | PrizeSkout" }] }),
  loader: () => loadPromotions(),
  staleTime: 0,
  pendingMs: 0,
  pendingMinMs: 300,
  pendingComponent: PromotionsPendingPage,
  component: PromotionsPage,
});

function PromotionsPage() {
  const data = Route.useLoaderData() as PromotionsData;

  return (
    <DashboardLayout title="Promotions">
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <PromotionsMetrics metrics={data.metrics} />
        <PromotionCalendar promos={data.calendar} />
        <ROISimulator roiModel={data.roiModel} scenarios={data.scenarios} />
        <PastCampaigns campaigns={data.campaigns} />
        <TimingInsight insights={data.insights} />
      </div>
    </DashboardLayout>
  );
}
