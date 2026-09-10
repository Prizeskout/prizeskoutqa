import assert from "node:assert/strict";
import {
  prepareRestaurantOrderBatch,
  selectEffectiveProductCost,
  summarizeRestaurantOrderEconomics,
} from "../src/server/restaurant-commerce-handlers";

const valid = {
  batch_id: "odoo:2026-09-05:001",
  source_provider: " Odoo ",
  schema_version: "2026-09-05",
  delivery_complete: true,
  declared_record_count: 1,
  orders: [
    {
      external_event_id: "pos.order:42:v1",
      external_order_id: "ORDER-42",
      occurred_at: "2026-09-05T12:00:00+03:00",
      business_date: "2026-09-05",
      currency: "qar",
      channel: " Talabat ",
      status: "paid",
      final: true,
      legal_entity_external_id: "ma-group",
      brand_external_id: "vamos",
      branch_external_id: "vamos-01",
      revenue_center_external_id: "pos-config-2",
      gross_amount: 100,
      discount_amount: 10,
      tax_amount: 0,
      service_charge_amount: 0,
      delivery_charge_amount: 5,
      net_amount: 95,
      lines: [
        {
          external_line_id: "line-1",
          sku: "BURGER-1",
          name: "Burger",
          quantity: 2,
          gross_amount: 100,
          discount_amount: 10,
          tax_amount: 0,
        },
      ],
    },
  ],
};

const batch = prepareRestaurantOrderBatch(valid);
assert.equal(batch.source_provider, "odoo");
assert.equal(batch.orders[0].channel, "talabat");
assert.equal(batch.orders[0].net_amount, 95);
assert.equal(batch.orders[0].lines[0].net_amount, 90);
assert.throws(
  () => prepareRestaurantOrderBatch({ ...valid, schema_version: "v1" }),
  /schema_version/,
);
assert.throws(
  () => prepareRestaurantOrderBatch({ ...valid, declared_record_count: 2 }),
  /declared 2/,
);
assert.throws(
  () => prepareRestaurantOrderBatch({ ...valid, orders: [{ ...valid.orders[0], net_amount: 94 }] }),
  /does not reconcile/,
);
assert.throws(
  () =>
    prepareRestaurantOrderBatch({
      ...valid,
      orders: [valid.orders[0], valid.orders[0]],
      declared_record_count: 2,
    }),
  /duplicated/,
);

const economics = summarizeRestaurantOrderEconomics({
  id: "event-1",
  order_external_id: "ORDER-42",
  source_provider: "odoo",
  channel: "talabat",
  currency: "QAR",
  gross_amount: 105,
  discount_amount: 10,
  tax_amount: 0,
  fee_amount: 0,
  net_amount: 95,
  normalized_payload: {
    business_date: "2026-09-05",
    brand_external_id: "vamos",
    product_cost_amount: 40,
    lines: [],
  },
  evidence_strength: "strong",
  limitations: [],
  normalization_version: "v1",
});
assert.equal(economics.economics.contribution_amount, 55);
assert.equal(economics.completeness, "contribution_available");
const withoutCost = summarizeRestaurantOrderEconomics({
  id: "event-2",
  order_external_id: "ORDER-43",
  net_amount: 95,
  normalized_payload: {},
  evidence_strength: "partial",
  limitations: [],
});
assert.equal(withoutCost.economics.contribution_amount, null);
assert.equal(withoutCost.completeness, "order_economics_without_product_cost");

const costs = [
  { id: "global", sku: "BURGER-1", currency: "QAR", unit_cost: 11, effective_from: "2026-01-01" },
  {
    id: "brand",
    sku: "BURGER-1",
    brand_external_id: "vamos",
    currency: "QAR",
    unit_cost: 12,
    effective_from: "2026-01-01",
  },
  {
    id: "branch-old",
    sku: "BURGER-1",
    brand_external_id: "vamos",
    branch_external_id: "vamos-01",
    currency: "QAR",
    unit_cost: 13,
    effective_from: "2026-01-01",
    effective_to: "2026-08-31",
  },
  {
    id: "branch-current",
    sku: "BURGER-1",
    brand_external_id: "vamos",
    branch_external_id: "vamos-01",
    currency: "QAR",
    unit_cost: 14,
    effective_from: "2026-09-01",
  },
];
assert.equal(
  selectEffectiveProductCost(costs, {
    sku: "BURGER-1",
    currency: "QAR",
    businessDate: "2026-09-05",
    brandExternalId: "vamos",
    branchExternalId: "vamos-01",
  })?.id,
  "branch-current",
);
const costed = summarizeRestaurantOrderEconomics(
  {
    id: "event-3",
    order_external_id: "ORDER-44",
    currency: "QAR",
    branch_external_id: "vamos-01",
    net_amount: 95,
    normalized_payload: {
      business_date: "2026-09-05",
      brand_external_id: "vamos",
      lines: [{ sku: "BURGER-1", quantity: 2 }],
    },
  },
  costs,
);
assert.equal(costed.economics.product_cost_amount, 28);
assert.equal(costed.economics.contribution_amount, 67);
assert.equal(costed.cost_evidence.coverage, "complete");

console.log("Restaurant commerce API contract verification passed.");
