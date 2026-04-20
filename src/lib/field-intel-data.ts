// Shared types for the Field Intel tab.
// Data fetch lives in src/routes/dashboard.field-intel.tsx loader.

import type { OverviewMetric } from "@/lib/overview-data";

export type FieldIntelMetric = OverviewMetric;

export type ObservationStatus = "Reviewed" | "Pending" | "Flagged";
export type ObservationCondition = "Regular price" | "On promotion" | "Clearance";

export type RecentObservationRow = {
  id: string;
  product: string;
  store: string;
  price: number;
  condition: ObservationCondition;
  promo_detail: string | null;
  status: ObservationStatus;
  agent: string;
  time_label: string;
  position: number;
};

export type PriceGapRow = {
  id: string;
  product: string;
  competitor: string;
  online_price: number;
  in_store_price: number;
  gap: string;
  direction: "up" | "down";
  observed: string;
  position: number;
};

export type FieldTeamActivityRow = {
  id: string;
  agent_name: string;
  role: string;
  observation_count: number;
  position: number;
};

export type FieldIntelData = {
  metrics: FieldIntelMetric[];
  observations: RecentObservationRow[];
  gaps: PriceGapRow[];
  activity: FieldTeamActivityRow[];
};
