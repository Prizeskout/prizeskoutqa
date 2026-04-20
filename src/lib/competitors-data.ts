// Shared types for the Competitors tab.
// Data fetch lives in src/routes/dashboard.competitors.tsx loader.

import type { OverviewMetric } from "@/lib/overview-data";
import type { Product, CompetitorPrice } from "@/components/dashboard/competitors/types";

export type CompetitorMetric = OverviewMetric;

// DB row for competitor_prices (raw from Supabase, before mapping to UI Product).
export type CompetitorPriceRow = {
  id: string;
  product: string;
  category: string;
  channel: string; // 'online' | 'in-store'
  your_price: number;
  talabat: CompetitorPrice;
  carrefour: CompetitorPrice;
  lulu: CompetitorPrice;
  amazon: CompetitorPrice;
  noon: CompetitorPrice;
  signal: string; // 'RAISE' | 'LOWER' | 'HOLD' | 'WATCH'
  position: number;
};

export type PriceHistoryRow = {
  id: string;
  product: string;
  month_label: string;
  position: number;
  you: number | null;
  talabat: number | null;
  carrefour: number | null;
  amazon: number | null;
};

export type BehaviorPattern = {
  id: string;
  competitor: string;
  channel: "Online" | "In-Store" | "Both";
  category: string;
  detection_period: string;
  confidence: number;
  pattern: string;
  depth: string | null;
  evidence: { date: string; description: string }[];
  recommendation: string;
  impact: string;
  position: number;
};

export type CompetitorsData = {
  metrics: CompetitorMetric[];
  prices: CompetitorPriceRow[];
  history: PriceHistoryRow[];
  patterns: BehaviorPattern[];
};

// Map a DB row into the existing Product shape used by PriceTable / filters.
// Uses a numeric synthetic id for compatibility with the existing Product.id: number type.
export function rowToProduct(row: CompetitorPriceRow, idx: number): Product {
  return {
    id: idx + 1,
    name: row.product,
    category: row.category as Product["category"],
    channel: (row.channel === "in-store" ? "in-store" : "online") as Product["channel"],
    yourPrice: Number(row.your_price),
    talabat: row.talabat,
    carrefour: row.carrefour,
    lulu: row.lulu,
    amazon: row.amazon,
    noon: row.noon,
    signal: row.signal as Product["signal"],
  };
}
