// Shared types for the Promotions tab.
// Data fetch lives in src/routes/dashboard.promotions.tsx loader.

import type { OverviewMetric } from "@/lib/overview-data";
import type { RoiModelCategory, ScenarioRow } from "@/lib/roi-model";

export type PromotionsMetric = OverviewMetric;

export type PromoChannel = "Online" | "In-Store" | "Both";
export type PromoStatus = "Live" | "Upcoming" | "Ended";

export type PromotionCalendarRow = {
  id: string;
  competitor: string;
  campaign: string;
  channel: PromoChannel;
  dates: string;
  duration: string;
  depth: string;
  categories: string;
  status: PromoStatus;
  position: number;
};

export type PastCampaignRow = {
  id: string;
  name: string;
  discount: string;
  total_gmv: string;
  incremental_gmv: string;
  cannibalized: string;
  roi: number;
  verdict: string;
  position: number;
};

export type TimingInsightRow = {
  id: string;
  title: string;
  body: string;
  position: number;
};

export type PromotionsData = {
  metrics: PromotionsMetric[];
  calendar: PromotionCalendarRow[];
  campaigns: PastCampaignRow[];
  insights: TimingInsightRow[];
  roiModel: RoiModelCategory[];
  scenarios: ScenarioRow[];
};
