import { MetricCard } from "@/components/dashboard/overview/MetricsRow";

export function FieldIntelMetrics() {
  return (
    <div style={{ display: "flex", gap: 14 }}>
      <MetricCard
        label="Observations this week"
        value="47"
        footer={
          <span style={{ fontSize: 12, fontWeight: 500, color: "#22C55E" }}>
            +18% vs last week
          </span>
        }
      />
      <MetricCard
        label="Active field agents"
        value="8"
        footer={
          <span style={{ fontSize: 12, fontWeight: 400, color: "#6B6B6B" }}>
            across 5 locations
          </span>
        }
      />
      <MetricCard
        label="Pending review"
        value="4"
        valueColor="#F59E0B"
        footer={
          <span style={{ fontSize: 12, fontWeight: 400, color: "#6B6B6B" }}>
            submitted today
          </span>
        }
      />
      <MetricCard
        label="Price discrepancies found"
        value="12"
        footer={
          <span style={{ fontSize: 12, fontWeight: 400, color: "#6B6B6B" }}>
            in-store vs online gaps
          </span>
        }
      />
    </div>
  );
}
