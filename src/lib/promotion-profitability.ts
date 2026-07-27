export type PromotionProduct = {
  sku: string;
  name: string;
  current_price: number;
  net_margin_pct: number | null;
  source_platform: string;
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
  profitable: boolean;
  assumptions: string[];
};

const round = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

function contribution(price: number, cost: number, discountPct: number, inputs: PromotionInputs) {
  const discount = price * clamp(discountPct, 0, 100) / 100;
  const platformFunding = discount * clamp(inputs.platform_funding_pct, 0, 100) / 100;
  const merchantDiscount = discount - platformFunding;
  const campaignPrice = price - discount;
  const feeBase = inputs.commission_base === "gross_before_discount" ? price : campaignPrice;
  const commission = feeBase * inputs.commission_pct / 100;
  const vat = commission * inputs.vat_on_fees_pct / 100;
  const paymentFee = campaignPrice * inputs.payment_fee_pct / 100 + inputs.fixed_order_fee;
  const value = campaignPrice + platformFunding - commission - vat - paymentFee - cost;
  return { value, campaignPrice, platformFunding, merchantDiscount, commission, vat, paymentFee };
}

export function simulatePromotion(products: PromotionProduct[], inputs: PromotionInputs): PromotionSimulation {
  const results = products.map((product): PromotionProductResult => {
    if (!(product.current_price > 0) || product.net_margin_pct == null || !Number.isFinite(product.net_margin_pct)) {
      return {
        sku: product.sku, name: product.name, eligible: false,
        exclusion_reason: "Verified product cost or current margin is missing.",
        selling_price: product.current_price, campaign_price: product.current_price,
        inferred_product_cost: null, merchant_discount: 0, platform_funding: 0,
        commission: 0, vat_on_fees: 0, payment_fee: 0, expected_contribution: null,
        expected_margin_pct: null, baseline_contribution: null, maximum_affordable_discount_pct: null,
      };
    }
    // The catalogue currently exposes net margin rather than cost. Keep this
    // inference explicit so it can be replaced by verified cost-lineage data.
    const cost = product.current_price * (1 - product.net_margin_pct / 100);
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
      platform_funding: round(campaign.platformFunding), commission: round(campaign.commission),
      vat_on_fees: round(campaign.vat), payment_fee: round(campaign.paymentFee),
      expected_contribution: round(campaign.value),
      expected_margin_pct: round(campaign.campaignPrice > 0 ? campaign.value / campaign.campaignPrice * 100 : 0),
      baseline_contribution: round(baseline.value), maximum_affordable_discount_pct: round(low),
    };
  });
  const eligible = results.filter(p => p.eligible);
  const baselinePerOrder = eligible.reduce((sum, p) => sum + (p.baseline_contribution ?? 0), 0);
  const campaignPerOrder = eligible.reduce((sum, p) => sum + (p.expected_contribution ?? 0), 0);
  const baselineOrders = Math.max(0, Math.round(inputs.baseline_orders));
  const expectedOrders = Math.max(0, Math.round(baselineOrders * (1 + inputs.expected_conversion_lift_pct / 100)));
  const baselineContribution = baselinePerOrder * baselineOrders;
  const campaignContribution = campaignPerOrder * expectedOrders;
  const breakEvenOrders = campaignPerOrder > 0 ? Math.ceil(baselineContribution / campaignPerOrder) : null;
  return {
    products: results, eligible_products: eligible.length, excluded_products: results.length - eligible.length,
    baseline_orders: baselineOrders, expected_orders: expectedOrders, break_even_orders: breakEvenOrders,
    baseline_contribution: round(baselineContribution), campaign_contribution: round(campaignContribution),
    incremental_contribution: round(campaignContribution - baselineContribution),
    profitable: eligible.length > 0 && campaignContribution >= baselineContribution,
    assumptions: [
      "Product cost is inferred from the catalogue net-margin value until verified cost lineage is available.",
      "Expected conversion lift is merchant-entered and is not presented as a forecast certainty.",
      inputs.commission_base === "unknown"
        ? "Commission base is unknown; net-after-discount is used provisionally."
        : `Commission is calculated on ${inputs.commission_base.replaceAll("_", " ")}.`,
    ],
  };
}

export function reconcilePromotionFunding(promised: number, actual: number) {
  const variance = round(actual - promised);
  return {
    promised: round(promised), actual: round(actual), variance,
    status: variance === 0 ? "matched" : variance < 0 ? "underfunded" : "overfunded",
  } as const;
}
