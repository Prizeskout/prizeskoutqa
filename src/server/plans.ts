export type Plan = "starter" | "standard" | "enterprise";

export const PLAN_LEVELS: Record<Plan, number> = {
  starter: 0,
  standard: 1,
  enterprise: 2,
};

export type PlanMode = "advisory" | "automated";

export type PlanLimits = {
  maxProducts: number;        // -1 = unlimited
  maxCompetitorsPerProduct: number;
  maxChannels: number;
  maxSeats: number;
  scrapeSchedule: "daily" | "twice_daily" | "hourly";
  mode: PlanMode;
};

export const PLAN_LIMITS: Record<Plan, PlanLimits> = {
  starter: {
    maxProducts: 50,
    maxCompetitorsPerProduct: 2,
    maxChannels: 1,
    maxSeats: 1,
    scrapeSchedule: "daily",
    mode: "advisory",
  },
  standard: {
    maxProducts: 500,
    maxCompetitorsPerProduct: 5,
    maxChannels: 3,
    maxSeats: 3,
    scrapeSchedule: "twice_daily",
    mode: "automated",
  },
  enterprise: {
    maxProducts: -1,
    maxCompetitorsPerProduct: -1,
    maxChannels: -1,
    maxSeats: -1,
    scrapeSchedule: "hourly",
    mode: "automated",
  },
};

// Scopes that may appear on API keys, gated by plan.
// Keys with scopes not in this set for their plan are rejected at dispatch.
export const PLAN_SCOPES: Record<Plan, Set<string>> = {
  starter: new Set(["read", "write"]),
  standard: new Set(["read", "write", "audit:read"]),
  enterprise: new Set([
    "read", "write", "admin",
    "audit:read", "audit:write",
    "embed:read", "embed:write",
    "webhooks:read", "webhooks:write", "webhooks:subscribe",
    "loyalty:read", "loyalty:write",
  ]),
};

// Minimum plan required for each route, identified by path prefix / exact match.
// Checked in the dispatcher before reaching the handler.
export function requiredPlanForRoute(method: string, path: string): Plan {
  // Enterprise-only features
  if (path.startsWith("/v1/tenant/")) return "enterprise";
  if (path.startsWith("/v1/parity/")) return "enterprise";
  if (path.startsWith("/v1/compliance/")) return "enterprise";
  if (path.startsWith("/v1/embed/")) return "enterprise";
  if (path.startsWith("/v1/webhooks/")) return "enterprise";

  // Standard features
  if (path.startsWith("/v1/dynprice/")) return "standard";
  if (path.startsWith("/v1/loyalty/")) return "standard";
  if (path.startsWith("/v1/flash/")) return "standard";
  if (path.startsWith("/v1/group/")) return "standard";
  if (path.startsWith("/v1/audit/")) return "standard";
  if (`${method} ${path}` === "POST /v1/pricing/decisions") return "standard";

  // Starter (all remaining routes)
  return "starter";
}

// Returns scopes on a key that are not allowed by the plan.
export function deniedScopes(keyScopes: string[], plan: Plan): string[] {
  const allowed = PLAN_SCOPES[plan];
  return keyScopes.filter((s) => !allowed.has(s));
}

// The lowest plan that allows a given scope, for upgrade messaging.
export function minPlanForScope(scope: string): Plan | null {
  for (const plan of ["starter", "standard", "enterprise"] as Plan[]) {
    if (PLAN_SCOPES[plan].has(scope)) return plan;
  }
  return null;
}

// The lowest plan that allows a given route, for upgrade messaging.
export function minPlanForRoute(method: string, path: string): Plan {
  return requiredPlanForRoute(method, path);
}
