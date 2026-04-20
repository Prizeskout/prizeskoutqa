import { MetricsRow } from "@/components/dashboard/overview/MetricsRow";
import type { CompetitorMetric } from "@/lib/competitors-data";

export function CompetitorMetrics({ metrics }: { metrics: CompetitorMetric[] }) {
  return <MetricsRow metrics={metrics} />;
}
