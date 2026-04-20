import { createFileRoute } from "@tanstack/react-router";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { BenchmarksMetrics } from "@/components/dashboard/benchmarks/BenchmarksMetrics";
import { MarketBenchmarks } from "@/components/dashboard/benchmarks/MarketBenchmarks";
import { NetworkValueCallout } from "@/components/dashboard/benchmarks/NetworkValueCallout";
import { ModelMaturity } from "@/components/dashboard/benchmarks/ModelMaturity";
import { ModelKnowledge } from "@/components/dashboard/benchmarks/ModelKnowledge";
import { SwitchingCost } from "@/components/dashboard/benchmarks/SwitchingCost";

export const Route = createFileRoute("/dashboard/benchmarks")({
  head: () => ({ meta: [{ title: "Benchmarks — PrizeSkout" }] }),
  component: BenchmarksPage,
});

function BenchmarksPage() {
  return (
    <DashboardLayout title="Benchmarks">
      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        <BenchmarksMetrics />
        <MarketBenchmarks />
        <NetworkValueCallout />
        <ModelMaturity />
        <ModelKnowledge />
        <SwitchingCost />
      </div>
    </DashboardLayout>
  );
}
