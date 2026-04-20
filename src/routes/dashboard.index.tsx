import { createFileRoute } from "@tanstack/react-router";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { MetricsRow } from "@/components/dashboard/overview/MetricsRow";
import { LiveAlerts } from "@/components/dashboard/overview/LiveAlerts";
import { MarketPosition } from "@/components/dashboard/overview/MarketPosition";
import { ChannelBreakdown } from "@/components/dashboard/overview/ChannelBreakdown";
import { QuickActions } from "@/components/dashboard/overview/QuickActions";

export const Route = createFileRoute("/dashboard/")({
  head: () => ({ meta: [{ title: "Overview | PrizeSkout" }] }),
  component: OverviewPage,
});

function OverviewPage() {
  return (
    <DashboardLayout title="Overview">
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <MetricsRow />
        <LiveAlerts />

        <div style={{ display: "flex", gap: 14, alignItems: "stretch" }}>
          <div style={{ flex: "0 0 60%", minWidth: 0 }}>
            <MarketPosition />
          </div>
          <div style={{ flex: "0 0 calc(40% - 14px)", minWidth: 0 }}>
            <ChannelBreakdown />
          </div>
        </div>

        <QuickActions />
      </div>
    </DashboardLayout>
  );
}
