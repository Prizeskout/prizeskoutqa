// Shared types for the Market tab.
// Data fetch lives in src/routes/dashboard.market.tsx loader.

import type { OverviewMetric } from "@/lib/overview-data";

export type MarketMetric = OverviewMetric;

export type CategoryPerformanceRow = {
  id: string;
  category: string;
  growth: number;
  avg_discount: number;
  volatility: "Low" | "Medium" | "High";
  volatility_pct: number;
  top_mover: string;
  market_position: string;
  direction: "up" | "down" | "flat";
  position: number;
};

export type TrendingProductRow = {
  id: string;
  name: string;
  category: string;
  growth: string;
  status: "In catalog" | "Not listed";
  position: number;
};

export type AssortmentGapRow = {
  id: string;
  product: string;
  competitors: string[];
  price: number;
  searches: string;
  missed: string;
  demand: "High" | "Medium";
  position: number;
};

export type CrossBorderRadarRow = {
  id: string;
  product: string;
  your_price: number;
  intl_price: number;
  platform: string;
  delivery: string;
  gap: string;
  risk: "High" | "Medium" | "Low";
  position: number;
};

export type MarketData = {
  metrics: MarketMetric[];
  categories: CategoryPerformanceRow[];
  trending: TrendingProductRow[];
  gaps: AssortmentGapRow[];
  crossBorder: CrossBorderRadarRow[];
};
