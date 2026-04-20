import { MetricCard } from "@/components/dashboard/overview/MetricsRow";

export function CompetitorMetrics() {
  return (
    <div style={{ display: "flex", gap: 14 }}>
      <MetricCard
        label="Products monitored"
        value="2,847"
        footer={
          <span style={{ fontSize: 12, fontWeight: 400, color: "#6B6B6B" }}>
            across 6 competitors
          </span>
        }
      />
      <MetricCard
        label="You are cheapest on"
        value="38%"
        valueColor="#22C55E"
        footer={
          <span style={{ fontSize: 12, fontWeight: 400, color: "#6B6B6B" }}>
            of overlapping products
          </span>
        }
      />
      <MetricCard
        label="Undercut by competitors"
        value="27%"
        valueColor="#EF4444"
        footer={
          <span style={{ fontSize: 12, fontWeight: 400, color: "#6B6B6B" }}>
            of your catalog
          </span>
        }
      />
      <MetricCard
        label="Avg price gap"
        value="-4.3%"
        valueColor="#F59E0B"
        footer={
          <span style={{ fontSize: 12, fontWeight: 400, color: "#6B6B6B" }}>
            vs market average
          </span>
        }
      />
    </div>
  );
}
