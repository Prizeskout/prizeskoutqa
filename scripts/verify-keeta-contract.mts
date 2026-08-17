import assert from "node:assert/strict";
import { canonicalKeetaParams, parseKeetaWebhook } from "../src/server/core/keeta-contract";
import { normalizeKeetaOrder } from "../src/server/core/keeta-operations";

assert.equal(
  canonicalKeetaParams({ timestamp: 3, sig: "ignored", appId: 1, accessToken: "token" }),
  "accessToken=token&appId=1&timestamp=3",
);

const callback = parseKeetaWebhook({
  appId: 123,
  eventId: 1001,
  messageId: "msg-1",
  shopId: 456,
  timestamp: 1_700_000_000,
  message: JSON.stringify({ orderId: "order-1" }),
  sig: "abc",
});
assert.equal(callback.shopId, "456");
assert.deepEqual(callback.message, { orderId: "order-1" });
assert.equal(callback.signedParams.message, '{"orderId":"order-1"}');
assert.throws(() => parseKeetaWebhook({}), /Missing appId/);
assert.throws(() => parseKeetaWebhook({ appId: 1, eventId: 1, messageId: 1, shopId: 1, timestamp: 1, message: "{" , sig: "x" }), /Invalid message JSON/);

assert.deepEqual(normalizeKeetaOrder({ order: {
  orderId: "order-1", orderNo: "K-100", orderStatus: "placed", currency: "QAR",
  totalAmount: "58.00", productList: [{ sku: "tea" }],
} }), {
  external_order_id: "order-1", order_code: "K-100", status: "placed", currency: "QAR",
  subtotal: null, discount_total: null, delivery_fee: null, tax_total: null, total: 58,
  items: [{ sku: "tea" }], occurred_at: null,
});
assert.equal(normalizeKeetaOrder({ event: "shop.status" }), null);

console.log("Keeta contract fixtures passed.");
