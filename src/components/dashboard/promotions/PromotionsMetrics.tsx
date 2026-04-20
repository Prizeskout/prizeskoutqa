import { MetricCard } from "@/components/dashboard/overview/MetricsRow";

export function PromotionsMetrics() {
  return (
    <div className="metrics-row">
      <MetricCard
        label="Active competitor promos"
        value="8"
        footer={
          <span style={{ fontSize: 12, fontWeight: 400, color: "#6B6B6B" }}>
            running right now
          </span>
        }
      />
      <MetricCard
        label="Upcoming in 7 days"
        value="3"
        footer={
          <span style={{ fontSize: 12, fontWeight: 400, color: "#6B6B6B" }}>
            across 3 competitors
          </span>
        }
      />
      <MetricCard
        label="Your last campaign ROI"
        value="1.4x"
        valueColor="#F59E0B"
        footer={
          <span style={{ fontSize: 12, fontWeight: 400, color: "#6B6B6B" }}>
            Eid Electronics Blitz
          </span>
        }
      />
      <MetricCard
        label="Avg cannibalization rate"
        value="38%"
        valueColor="#EF4444"
        footer={
          <span style={{ fontSize: 12, fontWeight: 400, color: "#6B6B6B" }}>
            across last 3 campaigns
          </span>
        }
      />
    </div>
  );
}
