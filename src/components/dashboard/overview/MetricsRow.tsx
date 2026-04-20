import type { ReactNode } from "react";

export function MetricCard({
  label,
  value,
  valueColor = "#1A1A18",
  footer,
}: {
  label: string;
  value: string;
  valueColor?: string;
  footer: ReactNode;
}) {
  return (
    <div
      style={{
        backgroundColor: "#FFFFFF",
        border: "1px solid #E5E2DB",
        borderRadius: 10,
        padding: "18px 22px",
        flex: 1,
        minWidth: 0,
      }}
    >
      <div style={{ fontSize: 12, fontWeight: 500, color: "#9A9A9A" }}>{label}</div>
      <div
        style={{
          fontSize: 28,
          fontWeight: 700,
          color: valueColor,
          marginTop: 8,
          lineHeight: 1.1,
          letterSpacing: "-0.01em",
        }}
      >
        {value}
      </div>
      <div style={{ marginTop: 8 }}>{footer}</div>
    </div>
  );
}

export function MetricsRow() {
  return (
    <div style={{ display: "flex", gap: 14 }}>
      <MetricCard
        label="Products tracked"
        value="2,847"
        footer={
          <span style={{ fontSize: 12, fontWeight: 500, color: "#22C55E" }}>
            +12% vs last month
          </span>
        }
      />
      <MetricCard
        label="Price position"
        value="3rd / 6"
        footer={
          <span style={{ fontSize: 12, fontWeight: 500, color: "#22C55E" }}>
            Rank improved by 1
          </span>
        }
      />
      <MetricCard
        label="Active alerts today"
        value="14"
        valueColor="#EA580C"
        footer={
          <span style={{ fontSize: 12, fontWeight: 400, color: "#6B6B6B" }}>
            3 require action
          </span>
        }
      />
      <MetricCard
        label="Estimated monthly savings"
        value="QAR 48K"
        valueColor="#22C55E"
        footer={
          <span style={{ fontSize: 12, fontWeight: 500, color: "#22C55E" }}>
            +3.2% vs last month
          </span>
        }
      />
    </div>
  );
}
