import { createFileRoute, redirect } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { CompetitorMetrics } from "@/components/dashboard/competitors/CompetitorMetrics";
import { FilterBar } from "@/components/dashboard/competitors/FilterBar";
import { PriceTable } from "@/components/dashboard/competitors/PriceTable";
import { PriceHistory } from "@/components/dashboard/competitors/PriceHistory";
import { OmnichannelGaps } from "@/components/dashboard/competitors/OmnichannelGaps";
import { SubTabs, type CompetitorsSubTab } from "@/components/dashboard/competitors/SubTabs";
import { BehaviorPatterns } from "@/components/dashboard/competitors/BehaviorPatterns";
import { AIInsightsCard } from "@/components/dashboard/AIInsightsCard";
import { CompetitorPriceChanges } from "@/components/dashboard/competitors/CompetitorPriceChanges";
import { ExportInsightsButton } from "@/components/dashboard/ExportInsightsButton";
import { NewSinceBanner } from "@/components/dashboard/NewSinceBanner";
import {
  type Category,
  type ChannelOpt,
  type SortKey,
  getPriceValue,
} from "@/components/dashboard/competitors/types";
import { CompetitorsPendingPage } from "@/components/dashboard/Skeletons";
import { pendingOnSSR } from "@/lib/ssr-pending";
import { supabase } from "@/integrations/supabase/client";
import { useLiveScrapes, indexScrapesByProduct } from "@/hooks/useLiveScrapes";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import {
  rowToProduct,
  type CompetitorMetric,
  type CompetitorPriceRow,
  type CompetitorsData,
  type PriceHistoryRow,
  type BehaviorPattern,
} from "@/lib/competitors-data";
import type { AIInsight } from "@/server/ai-insights.functions";

type CompetitorsPageData = CompetitorsData & { insight: AIInsight | null };

async function loadCompetitors(): Promise<CompetitorsPageData> {
  if (typeof window === "undefined") {
    return pendingOnSSR<CompetitorsPageData>({
      metrics: [],
      prices: [],
      history: [],
      patterns: [],
      insight: null,
    });
  }
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) {
    throw redirect({ to: "/login", search: { redirect: "/dashboard/competitors" } });
  }

  const [metricsRes, pricesRes, historyRes, patternsRes, insightRes] = await Promise.all([
    supabase.from("competitor_metrics").select("*").order("position", { ascending: true }),
    supabase.from("competitor_prices").select("*").order("position", { ascending: true }),
    supabase
      .from("competitor_price_history")
      .select("*")
      .order("position", { ascending: true }),
    supabase.from("behavior_patterns").select("*").order("position", { ascending: true }),
    supabase.from("ai_insights").select("*").eq("page", "competitors").maybeSingle(),
  ]);

  if (metricsRes.error) throw metricsRes.error;
  if (pricesRes.error) throw pricesRes.error;
  if (historyRes.error) throw historyRes.error;
  if (patternsRes.error) throw patternsRes.error;

  return {
    metrics: (metricsRes.data ?? []) as CompetitorMetric[],
    prices: (pricesRes.data ?? []) as unknown as CompetitorPriceRow[],
    history: (historyRes.data ?? []) as unknown as PriceHistoryRow[],
    patterns: (patternsRes.data ?? []) as unknown as BehaviorPattern[],
    insight: (insightRes.data as AIInsight | null) ?? null,
  };
}

export const Route = createFileRoute("/dashboard/competitors")({
  head: () => ({ meta: [{ title: "Competitors | PrizeSkout" }] }),
  validateSearch: (search: Record<string, unknown>) => ({
    from: typeof search.from === "string" ? search.from : undefined,
  }),
  loader: () => loadCompetitors(),
  staleTime: 0,
  pendingMs: 0,
  pendingMinMs: 300,
  pendingComponent: CompetitorsPendingPage,
  component: CompetitorsPage,
});

const SIGNAL_ORDER = { WATCH: 0, LOWER: 1, HOLD: 2, RAISE: 3 } as const;

function CompetitorsPage() {
  const data = Route.useLoaderData() as CompetitorsPageData;
  const [tab, setTab] = useState<CompetitorsSubTab>("Price tracker");
  const [category, setCategory] = useState<Category>("All");
  const [channel, setChannel] = useState<ChannelOpt>("All Channels");
  const [sort, setSort] = useState<SortKey>("Price gap");
  const [search, setSearch] = useState("");

  const { data: liveScrapes } = useLiveScrapes();
  const { data: isAdmin = false } = useIsAdmin();
  const liveByProduct = useMemo(
    () => indexScrapesByProduct(liveScrapes ?? []),
    [liveScrapes],
  );
  const liveCount = liveByProduct.size;

  // Map DB rows -> existing UI Product shape.
  const allProducts = useMemo(
    () => data.prices.map((row, idx) => rowToProduct(row, idx)),
    [data.prices],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = allProducts.filter((p) => {
      if (category !== "All" && p.category !== category) return false;
      if (channel === "Online" && p.channel !== "online") return false;
      if (channel === "In-Store" && p.channel !== "in-store") return false;
      if (q && !p.name.toLowerCase().includes(q)) return false;
      return true;
    });

    const gapOf = (p: (typeof allProducts)[number]) => {
      const comps = ["talabat", "carrefour", "lulu", "amazon", "noon"]
        .map((k) => getPriceValue(p[k as "talabat"]))
        .filter((v): v is number => v !== null);
      if (comps.length === 0) return 0;
      const lowest = Math.min(...comps);
      return ((lowest - p.yourPrice) / p.yourPrice) * 100;
    };

    const sorted = [...list].sort((a, b) => {
      switch (sort) {
        case "Price gap":
          return gapOf(a) - gapOf(b);
        case "Your price":
          return b.yourPrice - a.yourPrice;
        case "Category":
          return a.category.localeCompare(b.category);
        case "Signal":
          return SIGNAL_ORDER[a.signal] - SIGNAL_ORDER[b.signal];
      }
    });
    return sorted;
  }, [allProducts, category, channel, sort, search]);

  return (
    <DashboardLayout
      title="Competitors"
      subtitle="Track competitor prices, promo timing, and behavior patterns across rivals — in real time."
      helpItems={[
        "Use the sub-tabs to flip between Prices, History, and Behavior patterns.",
        "Click any row in Live prices to deep-link into the source URL or trigger a fresh scrape.",
        "Behavior patterns highlight repeat tactics — use them to predict the next promo.",
      ]}
    >
      <NewSinceBanner
        pageKey="competitors"
        count={data.prices.length}
        label="competitor price"
        fromParam="overview"
      />
      <div
        style={{
          marginBottom: 12,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <HeaderLivePill liveCount={liveCount} />
        <ExportInsightsButton />
      </div>
      <SubTabs active={tab} onChange={setTab} />
      <div
        style={{
          display: tab === "Price tracker" ? "flex" : "none",
          flexDirection: "column",
          gap: 14,
        }}
      >
        <CompetitorMetrics metrics={data.metrics} />
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)",
            gap: 14,
          }}
        >
          <AIInsightsCard page="competitors" initial={data.insight} />
          <CompetitorPriceChanges />
        </div>
        <FilterBar
          category={category}
          setCategory={setCategory}
          channel={channel}
          setChannel={setChannel}
          sort={sort}
          setSort={setSort}
          search={search}
          setSearch={setSearch}
        />
        <PriceTable products={filtered} liveByProduct={liveByProduct} isAdmin={isAdmin} />
        <PriceHistory history={data.history} />
        <OmnichannelGaps />
      </div>
      <div style={{ display: tab === "Behavior patterns" ? "block" : "none" }}>
        <BehaviorPatterns patterns={data.patterns} />
      </div>
    </DashboardLayout>
  );
}

function HeaderLivePill({ liveCount }: { liveCount: number }) {
  const live = liveCount > 0;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "4px 10px",
        borderRadius: 999,
        backgroundColor: live ? "rgba(34, 197, 94, 0.12)" : "rgba(154, 154, 154, 0.12)",
        color: live ? "#16A34A" : "#6B6B6B",
        fontSize: 11,
        fontWeight: 600,
        letterSpacing: "0.02em",
      }}
    >
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: "50%",
          backgroundColor: live ? "#22C55E" : "#9A9A9A",
          display: "inline-block",
        }}
      />
      {live ? `LIVE DATA · ${liveCount} product${liveCount === 1 ? "" : "s"}` : "MOCK DATA"}
    </span>
  );
}
