import { createFileRoute, redirect } from "@tanstack/react-router";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { MarketMetrics } from "@/components/dashboard/market/MarketMetrics";
import { CategoryPerformance } from "@/components/dashboard/market/CategoryPerformance";
import { AssortmentGaps } from "@/components/dashboard/market/AssortmentGaps";
import { CrossBorderRadar } from "@/components/dashboard/market/CrossBorderRadar";
import { TrendingProducts } from "@/components/dashboard/market/TrendingProducts";
import { AIInsightsCard } from "@/components/dashboard/AIInsightsCard";
import { ExportInsightsButton } from "@/components/dashboard/ExportInsightsButton";
import { MarketPendingPage } from "@/components/dashboard/Skeletons";
import { pendingOnSSR } from "@/lib/ssr-pending";
import { supabase } from "@/integrations/supabase/client";
import type {
  MarketData,
  MarketMetric,
  CategoryPerformanceRow,
  TrendingProductRow,
  AssortmentGapRow,
  CrossBorderRadarRow,
} from "@/lib/market-data";
import type { AIInsight } from "@/server/ai-insights.functions";

type MarketPageData = MarketData & { insight: AIInsight | null };

async function loadMarket(): Promise<MarketPageData> {
  if (typeof window === "undefined") {
    return pendingOnSSR<MarketPageData>({
      metrics: [],
      categories: [],
      trending: [],
      gaps: [],
      crossBorder: [],
      insight: null,
    });
  }
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) {
    throw redirect({ to: "/login", search: { redirect: "/dashboard/market" } });
  }

  const [metricsRes, catsRes, trendRes, gapsRes, cbRes, insightRes] = await Promise.all([
    supabase.from("market_metrics").select("*").order("position", { ascending: true }),
    supabase.from("category_performance").select("*").order("position", { ascending: true }),
    supabase.from("trending_products").select("*").order("position", { ascending: true }),
    supabase.from("assortment_gaps").select("*").order("position", { ascending: true }),
    supabase.from("cross_border_radar").select("*").order("position", { ascending: true }),
    supabase.from("ai_insights").select("*").eq("page", "market").maybeSingle(),
  ]);

  if (metricsRes.error) throw metricsRes.error;
  if (catsRes.error) throw catsRes.error;
  if (trendRes.error) throw trendRes.error;
  if (gapsRes.error) throw gapsRes.error;
  if (cbRes.error) throw cbRes.error;

  return {
    metrics: (metricsRes.data ?? []) as MarketMetric[],
    categories: (catsRes.data ?? []) as unknown as CategoryPerformanceRow[],
    trending: (trendRes.data ?? []) as unknown as TrendingProductRow[],
    gaps: ((gapsRes.data ?? []) as unknown as (Omit<AssortmentGapRow, "competitors"> & {
      competitors: unknown;
    })[]).map((g) => ({
      ...g,
      competitors: Array.isArray(g.competitors) ? (g.competitors as string[]) : [],
    })) as AssortmentGapRow[],
    crossBorder: (cbRes.data ?? []) as unknown as CrossBorderRadarRow[],
    insight: (insightRes.data as AIInsight | null) ?? null,
  };
}

export const Route = createFileRoute("/dashboard/market")({
  head: () => ({ meta: [{ title: "Market | PrizeSkout" }] }),
  loader: () => loadMarket(),
  staleTime: 0,
  pendingMs: 0,
  pendingMinMs: 300,
  pendingComponent: MarketPendingPage,
  component: MarketPage,
});

function MarketPage() {
  const data = Route.useLoaderData() as MarketPageData;
  return (
    <DashboardLayout
      title="Market"
      subtitle="Category trends, assortment gaps, and cross-border arbitrage signals shaping demand."
      helpItems={[
        "Trending products show what's gaining share. Prioritise listings and stock there first.",
        "Assortment gaps show products competitors carry that you don't.",
        "Cross-border radar flags where international platforms undercut your prices.",
      ]}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <ExportInsightsButton />
        </div>
        <MarketMetrics metrics={data.metrics} />
        <AIInsightsCard page="market" initial={data.insight} />
        <CategoryPerformance rows={data.categories} />
        <AssortmentGaps gaps={data.gaps} />
        <CrossBorderRadar rows={data.crossBorder} />
        <TrendingProducts trending={data.trending} />
      </div>
    </DashboardLayout>
  );
}
