import { createFileRoute, redirect } from "@tanstack/react-router";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { MetricsRow } from "@/components/dashboard/overview/MetricsRow";
import { LiveAlerts } from "@/components/dashboard/overview/LiveAlerts";
import { MarketPosition } from "@/components/dashboard/overview/MarketPosition";
import { ChannelBreakdown } from "@/components/dashboard/overview/ChannelBreakdown";
import { QuickActions } from "@/components/dashboard/overview/QuickActions";
import { OverviewPendingPage } from "@/components/dashboard/Skeletons";
import { supabase } from "@/integrations/supabase/client";
import type {
  OverviewAlert,
  OverviewChannel,
  OverviewData,
  OverviewMetric,
  OverviewQuickAction,
} from "@/lib/overview-data";

async function loadOverview(): Promise<OverviewData> {
  // SSR has no auth session — return empty payload, the client guard
  // in `dashboard.tsx` will redirect unauthenticated users to /login.
  if (typeof window === "undefined") {
    return { metrics: [], alerts: [], channels: [], quickActions: [] };
  }

  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) {
    throw redirect({ to: "/login", search: { redirect: "/dashboard" } });
  }

  const [metricsRes, alertsRes, channelsRes, actionsRes] = await Promise.all([
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
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <MetricsRow metrics={data.metrics} />
        <LiveAlerts alerts={data.alerts} />

        <div style={{ display: "flex", gap: 14, alignItems: "stretch" }}>
          <div style={{ flex: "0 0 60%", minWidth: 0 }}>
            <MarketPosition />
          </div>
          <div style={{ flex: "0 0 calc(40% - 14px)", minWidth: 0 }}>
            <ChannelBreakdown channels={data.channels} />
          </div>
        </div>

        <QuickActions actions={data.quickActions} />
      </div>
    </DashboardLayout>
  );
}
