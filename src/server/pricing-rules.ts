import { absoluteMarginFloor, type ChannelCosts } from "./margin";

// Shared pricing rule schema + evaluator.
//
// pricing_rules DB rows gain two columns (via migration 20260618000001):
//   rule_type  text   — discriminant matching the type field in each params shape
//   params     jsonb  — strongly-typed parameters for that rule type
//
// Legacy rows (rule_type='legacy') are skipped by the evaluator.
//
// RULE TYPES
// ----------
// margin_floor_pct       never recommend below current_price × (1 − pct)
// nominal_floor_qar      never recommend below (unit_cost + min_margin_qar)
//                        requires margin_inputs; noData=true when unit_cost absent
// max_discount_pct       never recommend more than pct% off current_price
// moci_ceiling           absolute QAR hard cap (regulatory price ceiling)
// competitor_ceiling_pct never price more than pct% above the lowest relevant
//                        competitor (optional: lock to one named competitor)
// price_rounding         round final price to nearest `unit` QAR, optionally
//                        with a fractional suffix (e.g. 0.99)
//
// PRECEDENCE (enforced by evaluateRules)
// ------------------------------------------
// NON-OVERRIDABLE FLOORS:  margin_floor_pct, nominal_floor_qar
//   The highest floor established by any of these rules is computed before the
//   run loop. After every soft rule (competitor_ceiling_pct, max_discount_pct,
//   price_rounding) the price is re-clamped back up if it fell below this floor.
//   Nothing can override these floors — not competitor ceilings, not rounding.
//
// NON-OVERRIDABLE CEILING: moci_ceiling
//   The lowest MOCI ceiling is computed before the run loop. After every soft
//   rule the price is re-clamped back down if it exceeded this ceiling.
//
// SOFT rules (competitor_ceiling_pct, max_discount_pct) run in declared position
//   order AFTER hard floor/ceiling rules, then price_rounding runs last.
//   If a soft rule or rounding pushes through a hard boundary, it is silently
//   overridden and the effect record is annotated with an [OVERRIDE] suffix.
//
// All types accept an optional `category` filter. When set, the rule only
// applies when the product's category matches (case-insensitive).

export const RULE_TYPES = [
  "legacy",
  "margin_floor_pct",
  "nominal_floor_qar",
  "max_discount_pct",
  "moci_ceiling",
  "competitor_ceiling_pct",
  "price_rounding",
] as const;

export type RuleType = (typeof RULE_TYPES)[number];

// ============================================================================
// Param shapes — discriminated union
// ============================================================================

export type MarginFloorPctParams = {
  type: "margin_floor_pct";
  pct: number;
  category?: string;
};

export type NominalFloorQarParams = {
  type: "nominal_floor_qar";
  min_margin_qar: number;
  category?: string;
};

export type MaxDiscountPctParams = {
  type: "max_discount_pct";
  pct: number;
  category?: string;
};

export type MociCeilingParams = {
  type: "moci_ceiling";
  max_price: number;
  category?: string;
};

export type CompetitorCeilingPctParams = {
  type: "competitor_ceiling_pct";
  pct: number;
  competitor?: string;
  category?: string;
};

export type PriceRoundingParams = {
  type: "price_rounding";
  unit: number;
  mode?: "nearest" | "floor" | "ceil";
  suffix_cents?: number;
  category?: string;
};

export type RuleParams =
  | MarginFloorPctParams
  | NominalFloorQarParams
  | MaxDiscountPctParams
  | MociCeilingParams
  | CompetitorCeilingPctParams
  | PriceRoundingParams;

// ============================================================================
// StructuredRule
// ============================================================================

export type StructuredRule = {
  id: string;
  rule_text: string;
  rule_type: RuleType;
  params: RuleParams | Record<string, unknown>;
  enabled: boolean;
  position: number;
};

// ============================================================================
// RuleContext
// ============================================================================

export type RuleContext = {
  currentPrice: number;
  competitorMin: number | null;
  competitorPrices: Map<string, number>;
  unitCost: number | null;
  landedCost?: number | null;          // new: unit_cost + freight + duty
  channelCosts?: ChannelCosts | null;  // new: per-channel selling costs
  category: string;
};

// ============================================================================
// RuleEffect
// ============================================================================

export type RuleEffect = {
  ruleId: string;
  ruleType: RuleType;
  ruleText: string;
  /** Category filter matched (or no filter). */
  applicable: boolean;
  /** Rule changed the price (including post-soft-rule floor/ceiling overrides). */
  clamped: boolean;
  /**
   * Rule was applicable but could not be evaluated because required data is
   * missing (e.g. nominal_floor_qar when unit_cost is not in margin_inputs,
   * or competitor_ceiling_pct when no competitor price is available).
   * When true the price passes through unchanged and the rule is NOT enforced.
   */
  noData: boolean;
  reason: string;
  priceIn: number;
  priceOut: number;
};

// ============================================================================
// Internal helpers
// ============================================================================

function roundTo(
  n: number,
  unit: number,
  mode: "nearest" | "floor" | "ceil" = "nearest",
): number {
  if (unit <= 0) return n;
  if (mode === "floor") return Math.floor(n / unit) * unit;
  if (mode === "ceil") return Math.ceil(n / unit) * unit;
  return Math.round(n / unit) * unit;
}

function categoryMatches(
  ruleCategory: string | undefined,
  productCategory: string,
): boolean {
  if (!ruleCategory) return true;
  return ruleCategory.trim().toLowerCase() === productCategory.trim().toLowerCase();
}

/** Extract the hard-floor QAR value for a rule, or null if not applicable. */
function hardFloorValue(rule: StructuredRule, ctx: RuleContext): number | null {
  if (rule.rule_type === "margin_floor_pct") {
    const p = rule.params as MarginFloorPctParams;
    if (!categoryMatches(p.category, ctx.category) || ctx.currentPrice <= 0) return null;
    return ctx.currentPrice * (1 - p.pct);
  }
  if (rule.rule_type === "nominal_floor_qar") {
    const p = rule.params as NominalFloorQarParams;
    if (!categoryMatches(p.category, ctx.category) || ctx.unitCost === null) return null;
    if (ctx.channelCosts != null && ctx.landedCost != null) {
      return absoluteMarginFloor(ctx.landedCost, ctx.channelCosts, p.min_margin_qar);
    }
    return ctx.unitCost + p.min_margin_qar;
  }
  return null;
}

/** Extract the hard-ceiling QAR value for a rule, or null if not applicable. */
function hardCeilingValue(rule: StructuredRule, ctx: RuleContext): number | null {
  if (rule.rule_type === "moci_ceiling") {
    const p = rule.params as MociCeilingParams;
    if (!categoryMatches(p.category, ctx.category)) return null;
    return p.max_price;
  }
  return null;
}

const HARD_TYPES = new Set<RuleType>([
  "margin_floor_pct",
  "nominal_floor_qar",
  "moci_ceiling",
]);

function evalOne(
  priceIn: number,
  rule: StructuredRule,
  ctx: RuleContext,
): RuleEffect {
  const base = {
    ruleId: rule.id,
    ruleType: rule.rule_type,
    ruleText: rule.rule_text,
    priceIn,
    noData: false,
  };

  if (rule.rule_type === "legacy") {
    return {
      ...base,
      applicable: false,
      clamped: false,
      reason: "Legacy free-text rule — not evaluated by engine",
      priceOut: priceIn,
    };
  }

  const p = rule.params as RuleParams;
  if (!p || (p as { type?: string }).type !== rule.rule_type) {
    return {
      ...base,
      applicable: false,
      clamped: false,
      reason: `Params type mismatch (expected ${rule.rule_type})`,
      priceOut: priceIn,
    };
  }

  const applicable = categoryMatches(
    (p as { category?: string }).category,
    ctx.category,
  );
  if (!applicable) {
    return {
      ...base,
      applicable: false,
      clamped: false,
      reason: `Category filter "${(p as { category?: string }).category}" does not match "${ctx.category}"`,
      priceOut: priceIn,
    };
  }

  switch (p.type) {
    case "margin_floor_pct": {
      const floor = ctx.currentPrice * (1 - p.pct);
      if (priceIn < floor) {
        return {
          ...base,
          applicable: true,
          clamped: true,
          reason: `Margin floor: ${priceIn.toFixed(2)} → ${floor.toFixed(2)} (current QAR ${ctx.currentPrice.toFixed(2)} × (1−${(p.pct * 100).toFixed(0)}%))`,
          priceOut: floor,
        };
      }
      return {
        ...base,
        applicable: true,
        clamped: false,
        reason: `Margin floor: ${priceIn.toFixed(2)} ≥ floor ${floor.toFixed(2)} — passes`,
        priceOut: priceIn,
      };
    }

    case "nominal_floor_qar": {
      if (ctx.unitCost === null) {
        return {
          ...base, applicable: true, clamped: false, noData: true,
          reason: "Nominal QAR floor: unit_cost NOT in margin_inputs — CANNOT ENFORCE (missing COGS). Add margin_inputs via POST /v1/margin/costs to enable this rule.",
          priceOut: priceIn,
        };
      }
      let floor: number;
      let floorDesc: string;
      if (ctx.channelCosts != null && ctx.landedCost != null) {
        floor = absoluteMarginFloor(ctx.landedCost, ctx.channelCosts, p.min_margin_qar);
        const { commission_pct, payment_pct } = ctx.channelCosts;
        floorDesc = `full-cost floor (landed QAR ${ctx.landedCost.toFixed(2)}, ` +
          `comm ${(commission_pct * 100).toFixed(1)}% + pay ${(payment_pct * 100).toFixed(1)}%, ` +
          `+ QAR ${p.min_margin_qar} margin)`;
      } else {
        floor = ctx.unitCost + p.min_margin_qar;
        floorDesc = `unit_cost ${ctx.unitCost.toFixed(2)} + QAR ${p.min_margin_qar}`;
      }
      if (priceIn < floor) {
        return {
          ...base, applicable: true, clamped: true,
          reason: `Nominal QAR floor: ${priceIn.toFixed(2)} → ${floor.toFixed(2)} (${floorDesc})`,
          priceOut: floor,
        };
      }
      return {
        ...base, applicable: true, clamped: false,
        reason: `Nominal QAR floor: ${priceIn.toFixed(2)} ≥ floor ${floor.toFixed(2)} (${floorDesc}) — passes`,
        priceOut: priceIn,
      };
    }

    case "max_discount_pct": {
      const floor = ctx.currentPrice * (1 - p.pct);
      if (priceIn < floor) {
        return {
          ...base,
          applicable: true,
          clamped: true,
          reason: `Max discount: ${priceIn.toFixed(2)} → ${floor.toFixed(2)} (max ${(p.pct * 100).toFixed(0)}% off QAR ${ctx.currentPrice.toFixed(2)})`,
          priceOut: floor,
        };
      }
      return {
        ...base,
        applicable: true,
        clamped: false,
        reason: `Max discount: drop ${(((ctx.currentPrice - priceIn) / ctx.currentPrice) * 100).toFixed(1)}% ≤ limit ${(p.pct * 100).toFixed(0)}% — passes`,
        priceOut: priceIn,
      };
    }

    case "moci_ceiling": {
      if (priceIn > p.max_price) {
        return {
          ...base,
          applicable: true,
          clamped: true,
          reason: `MOCI ceiling: ${priceIn.toFixed(2)} → ${p.max_price.toFixed(2)} (hard regulatory cap)`,
          priceOut: p.max_price,
        };
      }
      return {
        ...base,
        applicable: true,
        clamped: false,
        reason: `MOCI ceiling: ${priceIn.toFixed(2)} ≤ cap ${p.max_price.toFixed(2)} — passes`,
        priceOut: priceIn,
      };
    }

    case "competitor_ceiling_pct": {
      let refPrice: number | null = null;
      let refLabel: string;
      if (p.competitor) {
        refPrice = ctx.competitorPrices.get(p.competitor.toLowerCase()) ?? null;
        refLabel = p.competitor;
      } else {
        refPrice = ctx.competitorMin;
        refLabel = "lowest competitor";
      }
      if (refPrice === null) {
        return {
          ...base,
          applicable: true,
          clamped: false,
          noData: true,
          reason: `Competitor ceiling: no price for "${p.competitor ?? "any competitor"}" — rule skipped (no competitor data)`,
          priceOut: priceIn,
        };
      }
      const ceiling = refPrice * (1 + p.pct);
      if (priceIn > ceiling) {
        return {
          ...base,
          applicable: true,
          clamped: true,
          reason: `Competitor ceiling: ${priceIn.toFixed(2)} → ${ceiling.toFixed(2)} (${refLabel} QAR ${refPrice.toFixed(2)} + ${(p.pct * 100).toFixed(0)}% allowance)`,
          priceOut: ceiling,
        };
      }
      return {
        ...base,
        applicable: true,
        clamped: false,
        reason: `Competitor ceiling: ${priceIn.toFixed(2)} ≤ ceiling ${ceiling.toFixed(2)} (${refLabel} QAR ${refPrice.toFixed(2)}) — passes`,
        priceOut: priceIn,
      };
    }

    case "price_rounding": {
      const rounded = roundTo(priceIn, p.unit, p.mode ?? "nearest");
      const withSuffix =
        p.suffix_cents !== undefined
          ? Math.floor(rounded) + p.suffix_cents
          : rounded;
      if (Math.abs(withSuffix - priceIn) < 0.001) {
        return {
          ...base,
          applicable: true,
          clamped: false,
          reason: `Rounding: ${priceIn.toFixed(2)} already conforms to nearest ${p.unit}`,
          priceOut: priceIn,
        };
      }
      return {
        ...base,
        applicable: true,
        clamped: true,
        reason: `Rounding: ${priceIn.toFixed(2)} → ${withSuffix.toFixed(2)} (nearest ${p.unit}${p.suffix_cents !== undefined ? `, suffix .${Math.round(p.suffix_cents * 100).toString().padStart(2, "0")}` : ""})`,
        priceOut: withSuffix,
      };
    }

    default: {
      const _: never = p;
      void _;
      return {
        ...base,
        applicable: false,
        clamped: false,
        reason: "Unknown rule type",
        priceOut: priceIn,
      };
    }
  }
}

// ============================================================================
// Public API
// ============================================================================

export type EvaluateRulesResult = {
  finalPrice: number;
  effects: RuleEffect[];
};

/**
 * Apply all enabled structured rules to a candidate price.
 *
 * Rule precedence (see module header for rationale):
 *   1. Hard floors (margin_floor_pct, nominal_floor_qar) — non-overridable.
 *      The maximum floor value across all applicable floor rules is computed
 *      up-front. After every soft rule and every rounding rule the price is
 *      re-clamped upward if it fell below this floor.
 *   2. Hard ceiling (moci_ceiling) — non-overridable.
 *      The minimum MOCI ceiling is computed up-front. After every soft/rounding
 *      rule the price is re-clamped downward if it exceeded this ceiling.
 *   3. Soft rules (competitor_ceiling_pct, max_discount_pct) — run in position
 *      order, subject to hard floor/ceiling enforcement after each.
 *   4. price_rounding — deferred last, also subject to hard floor/ceiling.
 *   5. legacy — always no-ops, always last.
 *
 * If a soft rule or rounding would push the price through a hard boundary, the
 * effect record is mutated in-place with an [OVERRIDE] annotation in `reason`
 * and `clamped` set to true.
 *
 * Note on floor > ceiling: if a margin floor exceeds the MOCI ceiling (invalid
 * rule configuration), the ceiling wins for the final price.
 */
export function evaluateRules(
  candidatePrice: number,
  ctx: RuleContext,
  rules: StructuredRule[],
): EvaluateRulesResult {
  // --- Pre-compute non-overridable hard floor and ceiling ---
  let hardFloor: number | null = null;
  let hardCeiling: number | null = null;

  for (const rule of rules) {
    if (!rule.enabled) continue;
    const f = hardFloorValue(rule, ctx);
    if (f !== null)
      hardFloor = hardFloor === null ? f : Math.max(hardFloor, f);
    const c = hardCeilingValue(rule, ctx);
    if (c !== null)
      hardCeiling = hardCeiling === null ? c : Math.min(hardCeiling, c);
  }

  // --- Run rules in declared order (non-rounding first, rounding last, legacy after) ---
  const hardRules = rules.filter((r) => HARD_TYPES.has(r.rule_type));
  const softRules = rules.filter(
    (r) =>
      !HARD_TYPES.has(r.rule_type) &&
      r.rule_type !== "price_rounding" &&
      r.rule_type !== "legacy",
  );
  const roundingRules = rules.filter((r) => r.rule_type === "price_rounding");
  const legacyRules = rules.filter((r) => r.rule_type === "legacy");

  const effects: RuleEffect[] = [];
  let price = candidatePrice;

  for (const rule of [...hardRules, ...softRules, ...roundingRules, ...legacyRules]) {
    const effect = evalOne(price, rule, ctx);
    effects.push(effect);
    let newPrice = effect.priceOut;

    // After any non-hard rule, re-enforce hard constraints.
    if (!HARD_TYPES.has(rule.rule_type) && rule.rule_type !== "legacy") {
      if (hardFloor !== null && newPrice < hardFloor) {
        effect.clamped = true;
        effect.priceOut = hardFloor;
        effect.reason +=
          ` [OVERRIDE → floored to ${hardFloor.toFixed(2)} by non-overridable margin/cost floor]`;
        newPrice = hardFloor;
      }
      if (hardCeiling !== null && newPrice > hardCeiling) {
        effect.clamped = true;
        effect.priceOut = hardCeiling;
        effect.reason +=
          ` [OVERRIDE → capped to ${hardCeiling.toFixed(2)} by MOCI regulatory ceiling]`;
        newPrice = hardCeiling;
      }
    }

    price = newPrice;
  }

  return { finalPrice: Math.max(0.01, price), effects };
}

/**
 * Map a DB row to a StructuredRule.
 * Rows with unrecognised rule_type (or missing rule_type column — pre-migration)
 * are mapped to 'legacy' and skipped by the evaluator.
 */
export function parseRuleRow(row: {
  id: string;
  rule_text: string;
  rule_type?: string | null;
  params?: unknown;
  enabled: boolean;
  position?: number;
}): StructuredRule {
  const ruleType = (RULE_TYPES as readonly string[]).includes(
    row.rule_type ?? "",
  )
    ? (row.rule_type as RuleType)
    : "legacy";

  return {
    id: row.id,
    rule_text: row.rule_text,
    rule_type: ruleType,
    params:
      typeof row.params === "object" && row.params !== null
        ? (row.params as RuleParams)
        : ({ type: "legacy" } as unknown as RuleParams),
    enabled: row.enabled,
    position: row.position ?? 0,
  };
}
