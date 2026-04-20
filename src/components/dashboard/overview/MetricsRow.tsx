import type { ReactNode } from "react";
import type { OverviewMetric } from "@/lib/overview-data";

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

export function MetricsRow({ metrics }: { metrics: OverviewMetric[] }) {
  if (!metrics.length) {
    return (
      <div
        style={{
          backgroundColor: "#FFFFFF",
          border: "1px dashed #E5E2DB",
          borderRadius: 10,
          padding: "20px 24px",
          fontSize: 13,
          color: "#6B6B6B",
        }}
      >
        No metrics yet.
      </div>
    );
  }

  return (
    <div className="metrics-row">
      {metrics.map((m) => (
        <MetricCard
          key={m.id}
          label={m.label}
          value={m.value}
          valueColor={m.value_color || "#1A1A18"}
          footer={
            m.footer_text ? (
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 500,
                  color: m.footer_color || "#6B6B6B",
                }}
              >
                {m.footer_text}
              </span>
            ) : null
          }
        />
      ))}
    </div>
  );
}
