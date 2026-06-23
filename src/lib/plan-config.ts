// Single source of truth for frontend plan display.
//
// Limits (maxProducts, maxSeats, scrapeSchedule, mode) are imported directly
// from the backend enforcement module.  Changing a value in server/plans.ts
// changes it in every pricing UI that reads from here — no second copy to drift.
//
// Only display-only fields live here: USD price, accent colour, popular flag.
// These have no backend equivalent and are intentionally front-end-only.

import { PLAN_LIMITS, type Plan, type PlanLimits } from "../server/plans";

export type { Plan, PlanLimits };
export { PLAN_LIMITS };

/** Monthly subscription price in USD.  null = custom / contact-us. */
export const PLAN_PRICES_USD: Record<Plan, number | null> = {
  starter:    25,
  standard:   50,
  enterprise: null,
};

export const PLAN_ACCENTS: Record<Plan, string> = {
  starter:    "#3B82F6",
  standard:   "#EA580C",
  enterprise: "#1A1A18",
};

export const PLAN_POPULAR: Record<Plan, boolean> = {
  starter:    false,
  standard:   true,
  enterprise: false,
};

export const PLANS: Plan[] = ["starter", "standard", "enterprise"];

/** i18n key suffix that maps scrapeSchedule → freshness label. */
export function freshnessI18nKey(plan: Plan): string {
  return `plans.freshness_${PLAN_LIMITS[plan].scrapeSchedule}`;
}

/** Returns -1 for enterprise unlimited, the numeric value otherwise. */
export function limitValue(plan: Plan, field: keyof PlanLimits): number | string {
  const v = PLAN_LIMITS[plan][field];
  if (v === -1) return "∞";
  return v as number;
}
