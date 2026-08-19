export type PromotionProduct = {
  sku: string;
  name: string;
  current_price: number;
  net_margin_pct: number | null;
  source_platform: string;
  unit_cost?: number | null;
  cost_confidence?: "verified" | "estimated" | "unknown";
};

export type PromotionInputs = {
  discount_pct: number;
  platform_funding_pct: number;
  commission_pct: number;
  vat_on_fees_pct: number;
  payment_fee_pct: number;
  fixed_order_fee: number;
  commission_base: "gross_before_discount" | "net_after_discount" | "eligible_sales" | "unknown";
  expected_conversion_lift_pct: number;
  baseline_orders: number;
  duration_days: number;
  minimum_margin_pct: number;
};

export type PromotionProductResult = {
  sku: string;
  name: string;
  eligible: boolean;
  exclusion_reason: string | null;
  selling_price: number;
  campaign_price: number;
  inferred_product_cost: number | null;
  cost_basis: "verified" | "inferred" | "missing";
  merchant_discount: number;
  platform_funding: number;
  commission: number;
  vat_on_fees: number;
  payment_fee: number;
  expected_contribution: number | null;
  expected_margin_pct: number | null;
  baseline_contribution: number | null;
  maximum_affordable_discount_pct: number | null;
};

export type PromotionSimulation = {
  products: PromotionProductResult[];
  eligible_products: number;
  excluded_products: number;
  baseline_orders: number;
  expected_orders: number;
  break_even_orders: number | null;
  baseline_contribution: number;
  campaign_contribution: number;
  incremental_contribution: number;
  beats_baseline: boolean;
  meets_margin_floor: boolean;
  approval_ready: boolean;
  profitable: boolean;
  assumptions: string[];
};

const round = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

export function validatePromotionInputs(inputs: PromotionInputs) {
  const errors: string[] = [];
  const percent = (label: string, value: number) => {
    if (!Number.isFinite(value) || value < 0 || value > 100) errors.push(`${label} must be between 0% and 100%.`);
  };
  percent("Discount", inputs.discount_pct);
  percent("Platform funding", inputs.platform_funding_pct);
  percent("Commission", inputs.commission_pct);
  percent("VAT on fees", inputs.vat_on_fees_pct);
  percent("Payment fee", inputs.payment_fee_pct);
  percent("Minimum margin", inputs.minimum_margin_pct);
  if (!Number.isFinite(inputs.fixed_order_fee) || inputs.fixed_order_fee < 0) errors.push("Fixed order fee cannot be negative.");
  if (!Number.isFinite(inputs.expected_conversion_lift_pct) || inputs.expected_conversion_lift_pct < -100 || inputs.expected_conversion_lift_pct > 1000) errors.push("Expected order lift must be between -100% and 1,000%.");
  if (!Number.isFinite(inputs.baseline_orders) || inputs.baseline_orders <= 0) errors.push("Baseline orders must be greater than zero.");
  if (!Number.isFinite(inputs.duration_days) || inputs.duration_days <= 0 || !Number.isInteger(inputs.duration_days)) errors.push("Duration must be a whole number of at least one day.");
  if (inputs.commission_base === "unknown") errors.push("Select the contractual commission base.");
  if (inputs.commission_base === "eligible_sales") errors.push("Eligible sales needs an order-level contractual eligibility rule before it can be simulated.");
  return errors;
}

function contribution(price: number, cost: number, discountPct: number, inputs: PromotionInputs) {
  const discount = price * clamp(discountPct, 0, 100) / 100;
  const platformFunding = discount * clamp(inputs.platform_funding_pct, 0, 100) / 100;
  const merchantDiscount = discount - platformFunding;
  const campaignPrice = price - discount;
  const feeBase = inputs.commission_base === "gross_before_discount" ? price : campaignPrice;
  const commission = feeBase * clamp(inputs.commission_pct, 0, 100) / 100;
  const percentagePaymentFee = campaignPrice * clamp(inputs.payment_fee_pct, 0, 100) / 100;
  const paymentFee = percentagePaymentFee + Math.max(0, inputs.fixed_order_fee);
  const vat = (commission + paymentFee) * clamp(inputs.vat_on_fees_pct, 0, 100) / 100;
  const value = campaignPrice + platformFunding - commission - vat - paymentFee - cost;
  return { value, campaignPrice, platformFunding, merchantDiscount, commission, vat, paymentFee };
}

export function simulatePromotion(products: PromotionProduct[], inputs: PromotionInputs): PromotionSimulation {
  const results = products.map((product): PromotionProductResult => {
    const verifiedCostAvailable = product.cost_confidence === "verified" && product.unit_cost != null && product.unit_cost >= 0;
    const inferredCostAvailable = product.net_margin_pct != null && Number.isFinite(product.net_margin_pct);
    if (!(product.current_price > 0) || (!verifiedCostAvailable && !inferredCostAvailable)) {
      return {
        sku: product.sku, name: product.name, eligible: false,
        exclusion_reason: "Verified product cost or current margin is missing.",
        selling_price: product.current_price, campaign_price: product.current_price,
        inferred_product_cost: null, cost_basis: "missing", merchant_discount: 0, platform_funding: 0,
        commission: 0, vat_on_fees: 0, payment_fee: 0, expected_contribution: null,
        expected_margin_pct: null, baseline_contribution: null, maximum_affordable_discount_pct: null,
      };
    }
    const hasVerifiedCost = verifiedCostAvailable;
    const cost = hasVerifiedCost
      ? product.unit_cost!
      : product.current_price * (1 - product.net_margin_pct! / 100);
    const baseline = contribution(product.current_price, cost, 0, inputs);
    const campaign = contribution(product.current_price, cost, inputs.discount_pct, inputs);
    let low = 0, high = 90;
    for (let i = 0; i < 32; i++) {
      const mid = (low + high) / 2;
      const test = contribution(product.current_price, cost, mid, inputs);
      const margin = test.campaignPrice > 0 ? test.value / test.campaignPrice * 100 : -Infinity;
      if (margin >= inputs.minimum_margin_pct) low = mid; else high = mid;
    }
    return {
      sku: product.sku, name: product.name, eligible: true, exclusion_reason: null,
      selling_price: round(product.current_price), campaign_price: round(campaign.campaignPrice),
      inferred_product_cost: round(cost), merchant_discount: round(campaign.merchantDiscount),
      cost_basis: hasVerifiedCost ? "verified" : "inferred",
      platform_funding: round(campaign.platformFunding), commission: round(campaign.commission),
      vat_on_fees: round(campaign.vat), payment_fee: round(campaign.paymentFee),
      expected_contribution: round(campaign.value),
      expected_margin_pct: round(campaign.campaignPrice > 0 ? campaign.value / campaign.campaignPrice * 100 : 0),
      baseline_contribution: round(baseline.value), maximum_affordable_discount_pct: round(low),
    };
  });
  const eligible = results.filter(p => p.eligible);
  // Until an explicit product mix is supplied, use an equal-weight product
  // average. Summing every selected SKU incorrectly assumes each order buys
  // one unit of every product.
  const baselinePerOrder = eligible.length ? eligible.reduce((sum, p) => sum + (p.baseline_contribution ?? 0), 0) / eligible.length : 0;
  const campaignPerOrder = eligible.length ? eligible.reduce((sum, p) => sum + (p.expected_contribution ?? 0), 0) / eligible.length : 0;
  const baselineOrders = Math.max(0, Math.round(inputs.baseline_orders));
  const expectedOrders = Math.max(0, Math.round(baselineOrders * (1 + inputs.expected_conversion_lift_pct / 100)));
  const baselineContribution = baselinePerOrder * baselineOrders;
  const campaignContribution = campaignPerOrder * expectedOrders;
  const breakEvenOrders = campaignPerOrder > 0 ? Math.ceil(baselineContribution / campaignPerOrder) : null;
  const beatsBaseline = campaignContribution >= baselineContribution;
  const meetsMarginFloor = eligible.length > 0 && eligible.every(product => (product.expected_margin_pct ?? -Infinity) >= inputs.minimum_margin_pct);
  const approvalReady = eligible.length > 0 && results.every(product => product.cost_basis === "verified") && inputs.commission_base !== "unknown" && inputs.commission_base !== "eligible_sales";
  return {
    products: results, eligible_products: eligible.length, excluded_products: results.length - eligible.length,
    baseline_orders: baselineOrders, expected_orders: expectedOrders, break_even_orders: breakEvenOrders,
    baseline_contribution: round(baselineContribution), campaign_contribution: round(campaignContribution),
    incremental_contribution: round(campaignContribution - baselineContribution), beats_baseline: beatsBaseline,
    meets_margin_floor: meetsMarginFloor, approval_ready: approvalReady,
    profitable: approvalReady && beatsBaseline && meetsMarginFloor,
    assumptions: [
      results.every(product => product.cost_basis === "verified")
        ? "Product cost is verified from the connected catalogue economics snapshot."
        : "Products without verified cost use a clearly labelled inference from current net margin.",
      "Expected conversion lift is merchant-entered and is not presented as a forecast certainty.",
      "Order economics use an equal product mix until explicit per-SKU order weights are supplied.",
      inputs.commission_base === "unknown"
        ? "Commission base is unknown; net-after-discount is used provisionally."
        : `Commission is calculated on ${inputs.commission_base.replaceAll("_", " ")}.`,
    ],
  };
}

export function reconcilePromotionFunding(promised: number, actual: number) {
  if (!Number.isFinite(promised) || promised < 0 || !Number.isFinite(actual) || actual < 0) {
    throw new Error("Promised and actual platform funding must be zero or greater.");
  }
  const variance = round(actual - promised);
  return {
    promised: round(promised), actual: round(actual), variance,
    status: variance === 0 ? "matched" : variance < 0 ? "underfunded" : "overfunded",
  } as const;
}
