import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
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
        borderRadius: 12,
        padding: "20px 24px",
        flex: 1,
        minWidth: 0,
      }}
    >
      <div
        style={{
          fontSize: 11,
          fontWeight: 600,
          color: "#9A9A9A",
          textTransform: "uppercase",
          letterSpacing: "0.07em",
          marginBottom: 10,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 30,
          fontWeight: 700,
          color: valueColor,
          lineHeight: 1.1,
          letterSpacing: "-0.02em",
        }}
      >
        {value}
      </div>
      {footer && (
        <div style={{ marginTop: 10 }}>{footer}</div>
      )}
    </div>
  );
}

export function MetricsRow({ metrics }: { metrics: OverviewMetric[] }) {
  const { t } = useTranslation();
  if (!metrics.length) {
    return (
      <div
        style={{
          backgroundColor: "#FFFFFF",
          border: "1px dashed #E5E2DB",
          borderRadius: 12,
          padding: "20px 24px",
          fontSize: 13,
          color: "#9A9A9A",
        }}
      >
        {t("metrics.empty")}
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
