import { createFileRoute, redirect } from "@tanstack/react-router";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { BenchmarksMetrics } from "@/components/dashboard/benchmarks/BenchmarksMetrics";
import { MarketBenchmarks } from "@/components/dashboard/benchmarks/MarketBenchmarks";
import { NetworkValueCallout } from "@/components/dashboard/benchmarks/NetworkValueCallout";
import { ModelMaturity } from "@/components/dashboard/benchmarks/ModelMaturity";
import { ModelKnowledge } from "@/components/dashboard/benchmarks/ModelKnowledge";
import { SwitchingCost } from "@/components/dashboard/benchmarks/SwitchingCost";
import { ExportInsightsButton } from "@/components/dashboard/ExportInsightsButton";
import { BenchmarksPendingPage } from "@/components/dashboard/Skeletons";
import { pendingOnSSR } from "@/lib/ssr-pending";
import { supabase } from "@/integrations/supabase/client";
import type {
  BenchmarksData,
  BenchmarksMetric,
  MarketBenchmarkRow,
  ModelKnowledgeRow,
  ModelMaturityRow,
  SwitchingCostRow,
  NetworkValueRow,
} from "@/lib/benchmarks-data";

async function loadBenchmarks(): Promise<BenchmarksData> {
  if (typeof window === "undefined") {
    return pendingOnSSR<BenchmarksData>();
  }
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) {
    throw redirect({ to: "/login", search: { redirect: "/dashboard/benchmarks" } });
  }

  const [metricsRes, benchmarksRes, knowledgeRes, maturityRes, switchingRes, networkRes] =
    await Promise.all([
      supabase.from("benchmarks_metrics").select("*").order("position", { ascending: true }),
      supabase.from("market_benchmarks").select("*").order("position", { ascending: true }),
      supabase.from("model_knowledge").select("*").order("position", { ascending: true }),
      supabase.from("model_maturity").select("*").order("position", { ascending: true }),
      supabase.from("switching_cost").select("*").maybeSingle(),
      supabase.from("network_value").select("*").maybeSingle(),
    ]);

  if (metricsRes.error) throw metricsRes.error;
  if (benchmarksRes.error) throw benchmarksRes.error;
  if (knowledgeRes.error) throw knowledgeRes.error;
  if (maturityRes.error) throw maturityRes.error;
  if (switchingRes.error) throw switchingRes.error;
  if (networkRes.error) throw networkRes.error;

  return {
    metrics: (metricsRes.data ?? []) as BenchmarksMetric[],
    benchmarks: (benchmarksRes.data ?? []) as unknown as MarketBenchmarkRow[],
    knowledge: (knowledgeRes.data ?? []) as ModelKnowledgeRow[],
    maturity: (maturityRes.data ?? []) as unknown as ModelMaturityRow[],
    switchingCost: (switchingRes.data ?? null) as SwitchingCostRow | null,
    networkValue: (networkRes.data ?? null) as NetworkValueRow | null,
  };
}

export const Route = createFileRoute("/dashboard/benchmarks")({
  head: () => ({ meta: [{ title: "Benchmarks | PrizeSkout" }] }),
  loader: () => loadBenchmarks(),
  staleTime: 0,
  pendingMs: 0,
  pendingMinMs: 300,
  pendingComponent: BenchmarksPendingPage,
  component: BenchmarksPage,
});

function BenchmarksPage() {
  const data = Route.useLoaderData() as BenchmarksData;

  return (
    <DashboardLayout title="Benchmarks">
      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <ExportInsightsButton />
        </div>
        <BenchmarksMetrics metrics={data.metrics} />
        <MarketBenchmarks benchmarks={data.benchmarks} />
        <NetworkValueCallout data={data.networkValue} />
        <ModelMaturity rows={data.maturity} />
        <ModelKnowledge items={data.knowledge} />
        <SwitchingCost data={data.switchingCost} />
      </div>
    </DashboardLayout>
  );
}
