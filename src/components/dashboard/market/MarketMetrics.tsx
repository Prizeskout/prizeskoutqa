import { MetricCard } from "@/components/dashboard/overview/MetricsRow";

export function MarketMetrics() {
  return (
    <div style={{ display: "flex", gap: 14 }}>
      <MetricCard
        label="Categories tracked"
        value="12"
        footer={
          <span style={{ fontSize: 12, fontWeight: 400, color: "#6B6B6B" }}>
            across online and in-store
          </span>
        }
      />
      <MetricCard
        label="Fastest growing"
        value="Grocery"
        valueColor="#22C55E"
        footer={
          <span style={{ fontSize: 12, fontWeight: 500, color: "#22C55E" }}>
            +22% this month
          </span>
        }
      />
      <MetricCard
        label="Assortment gaps found"
        value="14"
        footer={
          <span style={{ fontSize: 12, fontWeight: 400, color: "#6B6B6B" }}>
            products you are missing
          </span>
        }
      />
      <MetricCard
        label="Cross-border threats"
        value="6"
        valueColor="#EF4444"
        footer={
          <span style={{ fontSize: 12, fontWeight: 400, color: "#6B6B6B" }}>
            products undercut by international sellers
          </span>
        }
      />
    </div>
  );
}
