// Deterministic ROI model for the Campaign ROI Simulator.
// Per-category parameters live in roi_model_categories (per-user, RLS-scoped).

export type RoiModelCategory = {
  id: string;
  category: string;
  elasticity: number;
  baseline_daily_orders: number;
  avg_order_value: number;
  base_margin: number;
  cannibalization_base: number;
  position: number;
};

export type ScenarioInputs = {
  category: string;
  depth: string;     // "15%"
  duration: string;  // "5 days"
  channel: string;   // "Online" | "In-Store" | "Both"
};

export type ScenarioResult = {
  gmvUplift: number;          // QAR
  incrementalOrders: number;
  cannibalizationPct: number; // 0..1
  netRoi: number;             // multiplier
  healthy: boolean;
};

export type ScenarioRow = {
  id: string;
  category: string;
  depth: string;
  duration: string;
  channel: string;
  gmv_uplift: number;
  incremental_orders: number;
  cannibalization_pct: number;
  net_roi: number;
  healthy: boolean;
  is_baseline: boolean;
  simulated_at: string;
};

export const CHANNEL_REACH: Record<string, number> = {
  Online: 0.55,
  "In-Store": 0.45,
  Both: 0.92, // overlap, not 1.0
};

export const DEPTH_OPTIONS = ["5%", "10%", "15%", "20%", "25%", "30%"] as const;
export const DURATION_OPTIONS = ["2 days", "3 days", "5 days", "7 days", "10 days", "14 days"] as const;
export const CHANNEL_OPTIONS = ["Online", "In-Store", "Both"] as const;

export function parsePct(s: string): number {
  return Number(s.replace("%", "")) / 100;
}
export function parseDays(s: string): number {
  return Number(s.split(" ")[0]);
}

export function simulate(
  inputs: ScenarioInputs,
  model: RoiModelCategory[],
): ScenarioResult {
  const c =
    model.find((m) => m.category === inputs.category) ??
    model[0] ?? {
      // hard fallback if model is empty (shouldn't happen post-seed)
      elasticity: 1.5,
      baseline_daily_orders: 200,
      avg_order_value: 150,
      base_margin: 0.25,
      cannibalization_base: 0.18,
    };

  const d = parsePct(inputs.depth);
  const days = parseDays(inputs.duration);
  const reach = CHANNEL_REACH[inputs.channel] ?? 0.5;

  // Volume lift from elasticity, with diminishing returns at deeper discounts.
  const rawLift = Number(c.elasticity) * d;
  const liftMultiplier = 1 - Math.exp(-rawLift);
  const baselineOrders = Number(c.baseline_daily_orders) * days * reach;
  const incrementalOrders = Math.round(baselineOrders * liftMultiplier);

  const discountedAov = Number(c.avg_order_value) * (1 - d);
  const gmvUplift = Math.round(incrementalOrders * discountedAov);

  const cannibalizationPct = Math.min(
    0.6,
    Number(c.cannibalization_base) + d * 0.4 + Math.max(0, days - 3) * 0.012,
  );

  const marginPerOrder = discountedAov * (Number(c.base_margin) - d);
  const incrementalMargin = incrementalOrders * marginPerOrder;
  const cannibalizedOrderCost =
    baselineOrders * cannibalizationPct * Number(c.avg_order_value) * d;
  const promoCost = Math.max(1, cannibalizedOrderCost);
  const netRoi = Math.max(0, incrementalMargin / promoCost);

  const healthy = netRoi >= 1.5 && cannibalizationPct <= 0.25 && marginPerOrder > 0;

  return { gmvUplift, incrementalOrders, cannibalizationPct, netRoi, healthy };
}

export function formatQar(n: number, sign = true): string {
  const prefix = sign && n >= 0 ? "+" : n < 0 ? "-" : "";
  const abs = Math.abs(n);
  if (abs >= 1000) return `${prefix}QAR ${(abs / 1000).toFixed(abs >= 10000 ? 0 : 1)}K`;
  return `${prefix}QAR ${abs}`;
}

export function formatSignedInt(n: number): string {
  return `${n >= 0 ? "+" : ""}${n.toLocaleString()}`;
}

export function formatPctPoints(diff: number): string {
  // diff is fractional (0.05 = +5pp)
  const pp = diff * 100;
  return `${pp >= 0 ? "+" : ""}${pp.toFixed(1)}pp`;
}
