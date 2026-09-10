import assert from "node:assert/strict";
import { prepareProductCostBatch } from "../src/server/core/restaurant-costs";
const valid = {
  batch_id: "odoo:costs:2026-09-05",
  source_provider: " Odoo ",
  schema_version: "2026-09-05",
  costs: [
    {
      external_event_id: "product-7:2026-09-01",
      sku: "BURGER-1",
      brand_external_id: "vamos",
      branch_external_id: null,
      currency: "qar",
      unit_cost: 12.5,
      unit_of_measure: "unit",
      effective_from: "2026-09-01",
      cost_components: { ingredients: 10, packaging: 2.5 },
    },
  ],
};
const batch = prepareProductCostBatch(valid);
assert.equal(batch.source_provider, "odoo");
assert.equal(batch.costs[0].currency, "QAR");
assert.equal(batch.costs[0].unit_cost, 12.5);
assert.throws(
  () => prepareProductCostBatch({ ...valid, costs: [{ ...valid.costs[0], unit_cost: 13 }] }),
  /components/,
);
assert.throws(
  () =>
    prepareProductCostBatch({
      ...valid,
      costs: [{ ...valid.costs[0], effective_to: "2026-08-01" }],
    }),
  /ends before/,
);
assert.throws(
  () => prepareProductCostBatch({ ...valid, costs: [valid.costs[0], valid.costs[0]] }),
  /duplicated/,
);
console.log("Restaurant product cost contract verification passed.");
