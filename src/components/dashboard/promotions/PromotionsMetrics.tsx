import { MetricCard } from "@/components/dashboard/overview/MetricsRow";
import type { PromotionsMetric } from "@/lib/promotions-data";

export function PromotionsMetrics({ metrics }: { metrics: PromotionsMetric[] }) {
  return (
    <div className="metrics-row">
      {metrics.map((m) => (
        <MetricCard
          key={m.id}
          label={m.label}
          value={m.value}
          valueColor={m.value_color ?? undefined}
          footer={
            m.footer_text ? (
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 400,
                  color: m.footer_color ?? "#6B6B6B",
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
