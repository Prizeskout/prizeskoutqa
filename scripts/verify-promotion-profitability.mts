import assert from "node:assert/strict";
import { simulatePromotion, type PromotionInputs, type PromotionProduct } from "../src/lib/promotion-profitability";

const inputs: PromotionInputs = {
  discount_pct: 10,
  platform_funding_pct: 20,
  commission_pct: 10,
  vat_on_fees_pct: 15,
  payment_fee_pct: 2,
  fixed_order_fee: 0,
  commission_base: "net_after_discount",
  expected_conversion_lift_pct: 20,
  baseline_orders: 100,
  duration_days: 7,
  minimum_margin_pct: 5,
};

const products: PromotionProduct[] = [
  { sku: "verified", name: "Verified cost", current_price: 100, net_margin_pct: 80, source_platform: "zid", unit_cost: 60, cost_confidence: "verified" },
  { sku: "inferred", name: "Inferred cost", current_price: 100, net_margin_pct: 40, source_platform: "zid" },
  { sku: "missing", name: "Missing cost", current_price: 100, net_margin_pct: null, source_platform: "zid" },
];

const result = simulatePromotion(products, inputs);
assert.equal(result.eligible_products, 2);
assert.equal(result.excluded_products, 1);
assert.deepEqual(result.products.map(product => product.cost_basis), ["verified", "inferred", "missing"]);
assert.equal(result.products[0].inferred_product_cost, 60, "verified catalogue cost must override margin inference");
assert.equal(result.products[1].inferred_product_cost, 60, "missing catalogue cost should use labelled margin inference");
assert.equal(result.products[2].expected_contribution, null, "missing evidence must exclude the product");

const downside = simulatePromotion(products, { ...inputs, expected_conversion_lift_pct: 5 });
const upside = simulatePromotion(products, { ...inputs, expected_conversion_lift_pct: 35 });
assert.ok(upside.expected_orders > downside.expected_orders);
assert.ok(upside.campaign_contribution > downside.campaign_contribution);

console.log("Promotion profitability verification passed.");
