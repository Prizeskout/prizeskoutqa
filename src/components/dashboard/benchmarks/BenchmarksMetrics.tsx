import { MetricCard } from "@/components/dashboard/overview/MetricsRow";

export function BenchmarksMetrics() {
  return (
    <div className="metrics-row">
      <MetricCard
        label="Overall market rank"
        value="3rd"
        footer={
          <span style={{ fontSize: 12, fontWeight: 400, color: "#6B6B6B" }}>
            out of 6 tracked competitors
          </span>
        }
      />
      <MetricCard
        label="Pricing competitiveness"
        value="72nd"
        valueColor="#EA580C"
        footer={
          <span style={{ fontSize: 12, fontWeight: 400, color: "#6B6B6B" }}>
            percentile
          </span>
        }
      />
      <MetricCard
        label="Response speed"
        value="4.2 hrs"
        valueColor="#22C55E"
        footer={
          <span style={{ fontSize: 12, fontWeight: 400, color: "#6B6B6B" }}>
            market avg is 8.1 hrs
          </span>
        }
      />
      <MetricCard
        label="Model accuracy"
        value="91%"
        valueColor="#3B82F6"
        footer={
          <span style={{ fontSize: 12, fontWeight: 400, color: "#6B6B6B" }}>
            after 11 months of training
          </span>
        }
      />
    </div>
  );
}
