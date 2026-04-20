import { MetricsRow } from "@/components/dashboard/overview/MetricsRow";
import type { FieldIntelMetric } from "@/lib/field-intel-data";

export function FieldIntelMetrics({ metrics }: { metrics: FieldIntelMetric[] }) {
  return <MetricsRow metrics={metrics} />;
}
