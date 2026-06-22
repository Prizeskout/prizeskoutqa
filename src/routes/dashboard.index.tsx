import { useMemo, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { MetricsRow } from "@/components/dashboard/overview/MetricsRow";
import { LiveAlerts } from "@/components/dashboard/overview/LiveAlerts";
import { MarketPosition } from "@/components/dashboard/overview/MarketPosition";
import { ChannelBreakdown } from "@/components/dashboard/overview/ChannelBreakdown";
import { QuickActions } from "@/components/dashboard/overview/QuickActions";
import { OverviewHero, type SeverityFilter } from "@/components/dashboard/overview/OverviewHero";
import { AIInsightsCard } from "@/components/dashboard/AIInsightsCard";
import { ExportInsightsButton } from "@/components/dashboard/ExportInsightsButton";
import { OnboardingChecklist } from "@/components/dashboard/onboarding/OnboardingChecklist";
import { OverviewPendingPage } from "@/components/dashboard/Skeletons";
import { pendingOnSSR } from "@/lib/ssr-pending";
import { supabase } from "@/integrations/supabase/client";
import type {
  OverviewAlert,
  OverviewChannel,
  OverviewData,
  OverviewMetric,
  OverviewQuickAction,
} from "@/lib/overview-data";
import type { AIInsight } from "@/server/ai-insights.functions";

type OverviewPageData = OverviewData & {
  insight: AIInsight | null;
  pricingCount: number;
  competitorChangeCount: number;
};

async function loadOverview(): Promise<OverviewPageData> {
  // During SSR there is no auth session - keep the route in its pending state
  // so the SSR HTML serializes the skeleton. Client-side the loader runs
  // normally with the real session.
  if (typeof window === "undefined") {
    return pendingOnSSR<OverviewPageData>({
      metrics: [],
      alerts: [],
      channels: [],
      quickActions: [],
      insight: null,
      pricingCount: 0,
      competitorChangeCount: 0,
    });
  }

  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) {
    throw redirect({ to: "/login", search: { redirect: "/dashboard" } });
  }

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const [
    metricsRes,
    alertsRes,
    channelsRes,
    actionsRes,
    insightRes,
    pricingCountRes,
    competitorChangesRes,
  ] = await Promise.all([
    supabase
      .from("overview_metrics")
      .select("*")
      .order("position", { ascending: true }),
    supabase
      .from("overview_alerts")
      .select("*")
      .order("occurred_at", { ascending: false })
      .limit(20),
    supabase
      .from("overview_channels")
      .select("*")
      .order("position", { ascending: true }),
    supabase
      .from("overview_quick_actions")
      .select("*")
      .order("position", { ascending: true }),
    supabase
      .from("ai_insights")
      .select("*")
      .eq("page", "overview")
      .maybeSingle(),
    supabase
      .from("pricing_recommendations")
      .select("id", { count: "exact", head: true }),
    supabase
      .from("competitor_scrapes")
      .select("id", { count: "exact", head: true })
      .eq("status", "success")
      .gte("scraped_at", sevenDaysAgo),
  ]);

  // Treat Supabase query errors as empty data rather than crashing the route.
  // A brand-new user will have no rows in these tables (and may hit RLS
  // policies that return an error), so an empty-state UI is the right outcome.

  return {
    metrics: (metricsRes.data ?? []) as OverviewMetric[],
    alerts: (alertsRes.data ?? []) as OverviewAlert[],
    channels: (channelsRes.data ?? []) as OverviewChannel[],
    quickActions: (actionsRes.data ?? []) as OverviewQuickAction[],
    insight: (insightRes.data as AIInsight | null) ?? null,
    pricingCount: pricingCountRes.count ?? 0,
    competitorChangeCount: competitorChangesRes.count ?? 0,
  };
}

export const Route = createFileRoute("/dashboard/")({
  head: () => ({ meta: [{ title: "Overview | PrizeSkout" }] }),
  loader: () => loadOverview(),
  staleTime: 0,
  pendingMs: 0,
  pendingMinMs: 300,
  pendingComponent: OverviewPendingPage,
  component: OverviewPage,
});

function OverviewPage() {
  const { t } = useTranslation();
  const data = Route.useLoaderData();
  const [severityFilter, setSeverityFilter] = useState<SeverityFilter>(null);

  const filteredAlerts = useMemo(() => {
    if (!severityFilter) return data.alerts;
    return data.alerts.filter((a) => a.severity === severityFilter);
  }, [data.alerts, severityFilter]);

  return (
    <DashboardLayout title={t("overview.title")}>
      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        {/* 1. Hero: greeting, briefing, and primary CTAs */}
        <OverviewHero
          alerts={data.alerts}
          activeFilter={severityFilter}
          onFilterChange={setSeverityFilter}
          pricingCount={data.pricingCount}
          competitorChangeCount={data.competitorChangeCount}
        />

        {/* 1b. First-run checklist. */}
        <OnboardingChecklist />

        {/* 2. AI summary */}
        <SectionLabel
          title={t("overview.aiSees")}
          subtitle={t("overview.aiSeesDesc")}
          right={<ExportInsightsButton />}
        />
        <AIInsightsCard page="overview" initial={data.insight} />

        {/* 3. What changed — actionable alerts */}
        <SectionLabel
          title={severityFilter ? t("overview.whatChangedFiltered", { severity: severityFilter }) : t("overview.whatChanged")}
          subtitle={
            severityFilter
              ? t(
                  filteredAlerts.length === 1
                    ? "overview.whatChangedFilteredDesc"
                    : "overview.whatChangedFilteredDesc_plural",
                  { count: filteredAlerts.length, severity: severityFilter },
                )
              : t("overview.whatChangedDesc")
          }
        />
        <div id="overview-live-alerts" style={{ scrollMarginTop: 16 }}>
          <LiveAlerts alerts={filteredAlerts} />
        </div>

        {/* 4. What to do next — guided actions */}
        <SectionLabel
          title={t("overview.whatToDo")}
          subtitle={t("overview.whatToDoDesc")}
        />
        <QuickActions actions={data.quickActions} />

        {/* 5. Where you stand — context & reference data */}
        <SectionLabel
          title={t("overview.whereYouStand")}
          subtitle={t("overview.whereYouStandDesc")}
        />
        <MetricsRow metrics={data.metrics} />
        <div style={{ display: "flex", gap: 14, alignItems: "stretch", flexWrap: "wrap" }}>
          <div style={{ flex: "1 1 480px", minWidth: 0 }}>
            <MarketPosition />
          </div>
          <div style={{ flex: "1 1 320px", minWidth: 0 }}>
            <ChannelBreakdown channels={data.channels} />
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

function SectionLabel({
  title,
  subtitle,
  right,
}: {
  title: string;
  subtitle?: string;
  right?: ReactNode;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "space-between",
        gap: 12,
        marginTop: 4,
        flexWrap: "wrap",
      }}
    >
      <div>
        <h2
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: "#1A1A18",
            margin: 0,
            letterSpacing: "0.02em",
            textTransform: "uppercase",
          }}
        >
          {title}
        </h2>
        {subtitle && (
          <p style={{ fontSize: 13, color: "#6B6B6B", margin: "4px 0 0", lineHeight: 1.4 }}>
            {subtitle}
          </p>
        )}
      </div>
      {right}
    </div>
  );
}
