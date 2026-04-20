import { createFileRoute } from "@tanstack/react-router";
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
  PRODUCTS,
  type Category,
  type ChannelOpt,
  type SortKey,
  getPriceValue,
} from "@/components/dashboard/competitors/types";

export const Route = createFileRoute("/dashboard/competitors")({
  head: () => ({ meta: [{ title: "Competitors | PrizeSkout" }] }),
  component: CompetitorsPage,
});

const SIGNAL_ORDER = { WATCH: 0, LOWER: 1, HOLD: 2, RAISE: 3 } as const;

function CompetitorsPage() {
  const [tab, setTab] = useState<CompetitorsSubTab>("Price tracker");
  const [category, setCategory] = useState<Category>("All");
  const [channel, setChannel] = useState<ChannelOpt>("All Channels");
  const [sort, setSort] = useState<SortKey>("Price gap");
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = PRODUCTS.filter((p) => {
      if (category !== "All" && p.category !== category) return false;
      if (channel === "Online" && p.channel !== "online") return false;
      if (channel === "In-Store" && p.channel !== "in-store") return false;
      if (q && !p.name.toLowerCase().includes(q)) return false;
      return true;
    });

    const gapOf = (p: (typeof PRODUCTS)[number]) => {
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
  }, [category, channel, sort, search]);

  return (
    <DashboardLayout title="Competitors">
      <SubTabs active={tab} onChange={setTab} />
      <div style={{ display: tab === "Price tracker" ? "flex" : "none", flexDirection: "column", gap: 14 }}>
        <CompetitorMetrics />
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
        <PriceHistory />
        <OmnichannelGaps />
      </div>
      <div style={{ display: tab === "Behavior patterns" ? "block" : "none" }}>
        <BehaviorPatterns />
      </div>
    </DashboardLayout>
  );
}
