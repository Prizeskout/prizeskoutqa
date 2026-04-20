import { MetricCard } from "@/components/dashboard/overview/MetricsRow";

export function PricingMetrics() {
  return (
    <div className="metrics-row">
      <MetricCard
        label="Active recommendations"
        value="5"
        footer={
          <span style={{ fontSize: 12, fontWeight: 400, color: "#6B6B6B" }}>
            across all categories
          </span>
        }
      />
      <MetricCard
        label="Total monthly impact"
        value="+QAR 71K"
        valueColor="#22C55E"
        footer={
          <span style={{ fontSize: 12, fontWeight: 400, color: "#6B6B6B" }}>
            if all applied
          </span>
        }
      />
      <MetricCard
        label="Avg confidence score"
        value="89%"
        valueColor="#EA580C"
        footer={
          <span style={{ fontSize: 12, fontWeight: 400, color: "#6B6B6B" }}>
            across recommendations
          </span>
        }
      />
      <MetricCard
        label="Model maturity"
        value="11 months"
        valueColor="#3B82F6"
        footer={
          <span style={{ fontSize: 12, fontWeight: 400, color: "#6B6B6B" }}>
            trained on your data
          </span>
        }
      />
    </div>
  );
}
