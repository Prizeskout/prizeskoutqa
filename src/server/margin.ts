// Single source of truth for margin arithmetic.
// Both the API endpoints and the pricing engine import from here so they
// can never disagree on how margin is computed.

export type ChannelCosts = {
  commission_pct: number;    // marketplace take rate  (e.g. 0.18 for Talabat)
  delivery_cost: number;     // fixed per-order QAR cost (e.g. 8 for own website)
  payment_pct: number;       // payment gateway %       (e.g. 0.02 for card)
  returns_provision: number; // per-unit QAR reserve for returns
};

export type LandedInputs = {
  unit_cost: number;
  freight: number;
  duty_pct: number;          // applied to unit_cost, not price
};

/** Supply-chain cost to get one unit into your warehouse. */
export function landedCost(inputs: LandedInputs): number {
  return inputs.unit_cost + inputs.freight + inputs.unit_cost * inputs.duty_pct;
}

export type MarginBreakdown = {
  price: number;
  landed_cost: number;
  channel_cost: number;
  total_cost: number;
  margin: number;
  margin_pct: number;
  breakdown: {
    commission: number;
    delivery: number;
    payment: number;
    returns_provision: number;
  };
};

/**
 * Full margin at a given selling price.
 *   margin = price − landed_cost − price×commission_pct − delivery_cost
 *            − price×payment_pct − returns_provision
 */
export function computeMargin(
  price: number,
  landed: number,
  channel: ChannelCosts,
): MarginBreakdown {
  const commission = price * channel.commission_pct;
  const delivery   = channel.delivery_cost;
  const payment    = price * channel.payment_pct;
  const returns    = channel.returns_provision;
  const channel_cost = commission + delivery + payment + returns;
  const total_cost   = landed + channel_cost;
  const margin       = price - total_cost;
  const margin_pct   = price > 0 ? margin / price : 0;
  return {
    price, landed_cost: landed, channel_cost, total_cost, margin, margin_pct,
    breakdown: { commission, delivery, payment, returns_provision: returns },
  };
}

/**
 * Minimum price at which margin = 0.
 * Solve: price×(1 − commission_pct − payment_pct) = landed + delivery + returns
 */
export function breakevenPrice(landed: number, channel: ChannelCosts): number {
  const denom = 1 - channel.commission_pct - channel.payment_pct;
  if (denom <= 0) return Infinity;
  return (landed + channel.delivery_cost + channel.returns_provision) / denom;
}

/**
 * Minimum price at which margin_pct ≥ target_margin_pct (default 5%).
 * Solve: price×(1 − target − commission_pct − payment_pct) = landed + delivery + returns
 */
export function minViablePrice(
  landed: number,
  channel: ChannelCosts,
  target_margin_pct = 0.05,
): number {
  const denom = 1 - target_margin_pct - channel.commission_pct - channel.payment_pct;
  if (denom <= 0) return Infinity;
  return (landed + channel.delivery_cost + channel.returns_provision) / denom;
}

/**
 * Price floor guaranteeing at least min_margin_qar absolute margin after ALL costs.
 * Used by the nominal_floor_qar pricing rule when channel data is available.
 * Solve: price×(1 − commission_pct − payment_pct) = landed + delivery + returns + min_margin_qar
 */
export function absoluteMarginFloor(
  landed: number,
  channel: ChannelCosts,
  min_margin_qar: number,
): number {
  const denom = 1 - channel.commission_pct - channel.payment_pct;
  if (denom <= 0) return Infinity;
  return (landed + channel.delivery_cost + channel.returns_provision + min_margin_qar) / denom;
}

export function r2(n: number): number { return Math.round(n * 100) / 100; }
export function r4(n: number): number { return Math.round(n * 10000) / 10000; }
