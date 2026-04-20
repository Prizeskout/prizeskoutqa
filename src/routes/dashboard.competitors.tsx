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
import {
  type Category,
  type ChannelOpt,
  type SortKey,
  getPriceValue,
} from "@/components/dashboard/competitors/types";
import { CompetitorsPendingPage } from "@/components/dashboard/Skeletons";
import { supabase } from "@/integrations/supabase/client";
import {
  rowToProduct,
  type CompetitorMetric,
  type CompetitorPriceRow,
  type CompetitorsData,
  type PriceHistoryRow,
  type BehaviorPattern,
} from "@/lib/competitors-data";

async function loadCompetitors(): Promise<CompetitorsData> {
  if (typeof window === "undefined") {
    return { metrics: [], prices: [], history: [], patterns: [] };
  }
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) {
    throw redirect({ to: "/login", search: { redirect: "/dashboard/competitors" } });
  }

  const [metricsRes, pricesRes, historyRes, patternsRes] = await Promise.all([
    supabase.from("competitor_metrics").select("*").order("position", { ascending: true }),
    supabase.from("competitor_prices").select("*").order("position", { ascending: true }),
    supabase
      .from("competitor_price_history")
      .select("*")
      .order("position", { ascending: true }),
    supabase.from("behavior_patterns").select("*").order("position", { ascending: true }),
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
  };
}

export const Route = createFileRoute("/dashboard/competitors")({
  head: () => ({ meta: [{ title: "Competitors | PrizeSkout" }] }),
  loader: () => loadCompetitors(),
  staleTime: 0,
  pendingMs: 0,
  pendingMinMs: 300,
  pendingComponent: CompetitorsPendingPage,
  component: CompetitorsPage,
});

const SIGNAL_ORDER = { WATCH: 0, LOWER: 1, HOLD: 2, RAISE: 3 } as const;

function CompetitorsPage() {
  const data = Route.useLoaderData() as CompetitorsData;
  const [tab, setTab] = useState<CompetitorsSubTab>("Price tracker");
  const [category, setCategory] = useState<Category>("All");
  const [channel, setChannel] = useState<ChannelOpt>("All Channels");
  const [sort, setSort] = useState<SortKey>("Price gap");
  const [search, setSearch] = useState("");

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
    <DashboardLayout title="Competitors">
      <SubTabs active={tab} onChange={setTab} />
      <div
        style={{
          display: tab === "Price tracker" ? "flex" : "none",
          flexDirection: "column",
          gap: 14,
        }}
      >
        <CompetitorMetrics metrics={data.metrics} />
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
        <PriceTable products={filtered} />
        <PriceHistory history={data.history} />
        <OmnichannelGaps />
      </div>
      <div style={{ display: tab === "Behavior patterns" ? "block" : "none" }}>
        <BehaviorPatterns patterns={data.patterns} />
      </div>
    </DashboardLayout>
  );
}
