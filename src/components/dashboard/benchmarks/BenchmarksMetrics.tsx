import { MetricCard } from "@/components/dashboard/overview/MetricsRow";
import type { BenchmarksMetric } from "@/lib/benchmarks-data";

export function BenchmarksMetrics({ metrics }: { metrics: BenchmarksMetric[] }) {
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
              <span style={{ fontSize: 12, fontWeight: 400, color: m.footer_color ?? "#6B6B6B" }}>
                {m.footer_text}
              </span>
            ) : undefined
          }
        />
      ))}
    </div>
  );
}
