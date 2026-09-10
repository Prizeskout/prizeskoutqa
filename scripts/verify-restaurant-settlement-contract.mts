import assert from "node:assert/strict";
import { prepareRestaurantSettlementBatch } from "../src/server/restaurant-settlement-handlers";

const valid = {
  batch_id: "talabat:settlement:42",
  source_provider: " Talabat ",
  channel: " Talabat ",
  schema_version: "2026-09-05",
  delivery_complete: true,
  settlements: [
    {
      external_event_id: "line-1",
      settlement_reference: "SET-42",
      order_external_id: "ORDER-42",
      occurred_at: "2026-09-05T12:00:00+03:00",
      currency: "qar",
      settled_amount: 81,
      gross_sales_amount: 100,
      commission_amount: 15,
      tax_on_fees_amount: 0,
      other_fee_amount: 5,
      adjustment_amount: 1,
    },
  ],
  receipts: [
    {
      external_event_id: "receipt-1",
      bank_reference: "BANK-42",
      settlement_reference: "SET-42",
      occurred_at: "2026-09-06T10:00:00+03:00",
      currency: "qar",
      received_amount: 81,
    },
  ],
};
const batch = prepareRestaurantSettlementBatch(valid);
assert.equal(batch.source_provider, "talabat");
assert.equal(batch.channel, "talabat");
assert.equal(batch.settlements[0].settled_amount, 81);
assert.equal(batch.receipts[0].currency, "QAR");
assert.throws(
  () =>
    prepareRestaurantSettlementBatch({
      ...valid,
      settlements: [{ ...valid.settlements[0], settled_amount: 80 }],
    }),
  /does not reconcile/,
);
assert.throws(
  () =>
    prepareRestaurantSettlementBatch({
      ...valid,
      receipts: [{ ...valid.receipts[0], external_event_id: "line-1" }],
    }),
  /duplicated/,
);
assert.throws(
  () => prepareRestaurantSettlementBatch({ ...valid, settlements: [], receipts: [] }),
  /between 1 and 5,000/,
);
console.log("Restaurant settlement API contract verification passed.");
