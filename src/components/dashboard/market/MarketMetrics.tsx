import { MetricCard } from "@/components/dashboard/overview/MetricsRow";
import type { MarketMetric } from "@/lib/market-data";

export function MarketMetrics({ metrics }: { metrics: MarketMetric[] }) {
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
                  fontWeight: m.footer_color && m.footer_color !== "#6B6B6B" ? 500 : 400,
                  color: m.footer_color ?? "#6B6B6B",
                }}
              >
                {m.footer_text}
              </span>
            ) : undefined
          }
        />
      ))}
    </div>
  );
}
