import assert from "node:assert/strict";
import {
  buildTalabatOrderUpdate,
  constantTimeTokenMatch,
  parseTalabatCallback,
  talabatStaticToken,
  validateTalabatOrderUpdate,
} from "../src/server/core/talabat-contract.ts";

const officialOrderFixture = JSON.stringify({
  order_id: "9d4a63b5-3e07-4440-96af-aa04797da3a0",
  order_code: "wxfr-2440-rtbs",
  order_type: "DELIVERY",
  client: { chain_id: "79d3a074-0f4c-44ac-892c-787fdfb04ba1", country_code: "qa", store_id: "nbet" },
  items: [{ _id: "item-1", sku: "HSMVTE", status: "IN_CART", pricing: { quantity: 1, unit_price: 39.75 } }],
  payment: { order_total: 41.75, sub_total: 39.75, delivery_fee: 1, total_taxes: 1, type: "PAID" },
  status: "RECEIVED",
  sys: { created_at: "2024-09-30T10:00:36.947Z", updated_at: "2024-09-30T10:05:36.947Z" },
  transport_type: "LOGISTICS_DELIVERY",
  promotion_status: "AVAILABLE",
});

const order = await parseTalabatCallback(officialOrderFixture, "order");
assert.equal(order.kind, "order");
assert.equal(order.vendorId, "nbet");
assert.equal(order.orderId, "9d4a63b5-3e07-4440-96af-aa04797da3a0");
assert.equal(order.occurredAt, "2024-09-30T10:05:36.947Z");
assert.equal(order.eventKey, (await parseTalabatCallback(officialOrderFixture, "order")).eventKey, "retry key must be deterministic");

const catalog = await parseTalabatCallback(JSON.stringify({
  job_id: "a946a2c7-f4e7-46ac-ae63-8a5497cb0ad9",
  status: "COMPLETED",
  platform_vendor_id: "naez",
  download_url: "https://example.com/feedback.csv",
}), "catalog");
assert.equal(catalog.kind, "catalog");
assert.equal(catalog.vendorId, "naez");
assert.equal(catalog.eventKey, "a946a2c7-f4e7-46ac-ae63-8a5497cb0ad9:COMPLETED");

assert.equal(talabatStaticToken("secret-token"), "secret-token");
assert.equal(talabatStaticToken("Bearer secret-token"), "secret-token");
assert.equal(constantTimeTokenMatch("secret-token", "secret-token"), true);
assert.equal(constantTimeTokenMatch("wrong-token", "secret-token"), false);

const items = [{ _id: "item-1", sku: "HSMVTE", status: "IN_CART", pricing: { quantity: 1, unit_price: 39.75 } }];
assert.equal(validateTalabatOrderUpdate({ orderId: order.orderId, status: "READY_FOR_PICKUP", transportType: "LOGISTICS_DELIVERY", items }), null);
assert.match(validateTalabatOrderUpdate({ orderId: order.orderId, status: "DISPATCHED", transportType: "LOGISTICS_DELIVERY", items }) ?? "", /ready for pickup/i);
assert.match(validateTalabatOrderUpdate({ orderId: order.orderId, status: "CANCELLED", transportType: "LOGISTICS_DELIVERY", items }) ?? "", /reason/i);
assert.deepEqual(buildTalabatOrderUpdate({ orderId: order.orderId, status: "CANCELLED", cancellationReason: "ITEM_UNAVAILABLE", items }), {
  order_id: order.orderId,
  status: "CANCELLED",
  items: [{ _id: "item-1", sku: "HSMVTE", status: "IN_CART", pricing: { pricing_type: "UNIT", quantity: 1, unit_price: 39.75, weight: 0, weighted_pieces: 0 } }],
  cancellation: { reason: "ITEM_UNAVAILABLE" },
});

console.log("Talabat Partner API contract fixtures passed.");
