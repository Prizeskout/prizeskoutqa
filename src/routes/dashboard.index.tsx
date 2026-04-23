import { createFileRoute, redirect } from "@tanstack/react-router";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { MetricsRow } from "@/components/dashboard/overview/MetricsRow";
import { LiveAlerts } from "@/components/dashboard/overview/LiveAlerts";
import { MarketPosition } from "@/components/dashboard/overview/MarketPosition";
import { ChannelBreakdown } from "@/components/dashboard/overview/ChannelBreakdown";
import { QuickActions } from "@/components/dashboard/overview/QuickActions";
import { OverviewHero } from "@/components/dashboard/overview/OverviewHero";
import { AIInsightsCard } from "@/components/dashboard/AIInsightsCard";
import { ExportInsightsButton } from "@/components/dashboard/ExportInsightsButton";
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

type OverviewPageData = OverviewData & { insight: AIInsight | null };

async function loadOverview(): Promise<OverviewPageData> {
  // During SSR there is no auth session - keep the route in its pending state
  // so the SSR HTML serializes the skeleton. Client-side the loader runs
  // normally with the real session.
  if (typeof window === "undefined") {
    return pendingOnSSR<OverviewPageData>();
  }

  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) {
    throw redirect({ to: "/login", search: { redirect: "/dashboard" } });
  }

  const [metricsRes, alertsRes, channelsRes, actionsRes, insightRes] = await Promise.all([
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
  ]);

  if (metricsRes.error) throw metricsRes.error;
  if (alertsRes.error) throw alertsRes.error;
  if (channelsRes.error) throw channelsRes.error;
  if (actionsRes.error) throw actionsRes.error;

  return {
    metrics: (metricsRes.data ?? []) as OverviewMetric[],
    alerts: (alertsRes.data ?? []) as OverviewAlert[],
    channels: (channelsRes.data ?? []) as OverviewChannel[],
    quickActions: (actionsRes.data ?? []) as OverviewQuickAction[],
    insight: (insightRes.data as AIInsight | null) ?? null,
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
  const data = Route.useLoaderData();

  return (
    <DashboardLayout title="Overview">
      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        {/* 1. Hero — greeting + briefing + primary CTAs */}
        <OverviewHero alerts={data.alerts} />

        {/* 2. AI summary — the smartest read on the page */}
        <SectionLabel
          title="What AI sees"
          subtitle="A plain-English read on your market right now."
          right={<ExportInsightsButton />}
        />
        <AIInsightsCard page="overview" initial={data.insight} />

        {/* 3. What changed — actionable alerts */}
        <SectionLabel
          title="What changed"
          subtitle="Recent moves from competitors and your channels. Click any row to act."
        />
        <LiveAlerts alerts={data.alerts} />

        {/* 4. What to do next — guided actions */}
        <SectionLabel
          title="What to do next"
          subtitle="Jump straight into the workflows that matter most today."
        />
        <QuickActions actions={data.quickActions} />

        {/* 5. Where you stand — context & reference data */}
        <SectionLabel
          title="Where you stand"
          subtitle="Headline numbers and your position vs the market."
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
  right?: React.ReactNode;
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
