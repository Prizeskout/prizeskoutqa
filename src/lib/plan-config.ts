// Single source of truth for frontend plan display.
//
// Limits (maxProducts, maxSeats, scrapeSchedule, mode) are imported directly
// from the backend enforcement module.  Changing a value in server/plans.ts
// changes it in every pricing UI that reads from here — no second copy to drift.
//
// Only display-only fields live here: QAR price, accent colour, popular flag.
// These have no backend equivalent and are intentionally front-end-only.

import { PLAN_LIMITS, type Plan, type PlanLimits } from "../server/plans";

export type { Plan, PlanLimits };
export { PLAN_LIMITS };

/** Monthly subscription price in QAR. null = custom / contact-us. */
export const PLAN_PRICES_QAR_MONTHLY: Record<Plan, number | null> = {
  starter:    349,
  standard:   1099,
  enterprise: null,
};

/** Monthly equivalent when the customer chooses annual billing. */
export const PLAN_PRICES_QAR_ANNUAL_MONTHLY: Record<Plan, number | null> = {
  starter:    279,
  standard:   879,
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

/**
 * Customer-facing package names intentionally differ from the stable database
 * identifiers. Keep `starter` and `standard` in storage/API payloads so existing
 * subscriptions continue to work; present them as Core and Growth everywhere.
 */
export const PLAN_NAME_KEYS: Record<Plan, string> = {
  starter: "plans.starterName",
  standard: "plans.standardName",
  enterprise: "plans.enterpriseName",
};

export const PLAN_PACKAGE_KEYS: Record<Plan, string> = {
  starter: "plans.packages.starter",
  standard: "plans.packages.standard",
  enterprise: "plans.packages.enterprise",
};

export const PLAN_FEATURE_COUNTS: Record<Plan, number> = {
  starter: 9,
  standard: 10,
  enterprise: 10,
};

export function packageFeatureKeys(plan: Plan): string[] {
  return Array.from(
    { length: PLAN_FEATURE_COUNTS[plan] },
    (_, index) => `${PLAN_PACKAGE_KEYS[plan]}.features.${index}`,
  );
}

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
