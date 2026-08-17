import assert from "node:assert/strict";
import { normalizeZidOrder, zidLocalizedText, zidNumber } from "../src/server/core/platform-webhooks";
import { zidTokenNeedsRefresh } from "../src/server/core/zid-token";
import { ZID_SUBSCRIBED_EVENTS } from "../src/server/core/zid-webhooks";

assert.deepEqual([...ZID_SUBSCRIBED_EVENTS], [
  "product.create", "product.update", "product.publish", "product.delete",
  "order.create", "order.status.update", "order.payment_status.update",
]);

assert.equal(zidNumber({ amount: "29.50" }), 29.5);
assert.equal(zidNumber("invalid"), 0);
assert.equal(zidLocalizedText({ en: "Coffee", ar: "قهوة" }, "ar"), "قهوة");

const order = normalizeZidOrder({
  id: 123, code: "Z-123", status: "ready",
  payment_status: { code: "paid" }, currency: { code: "SAR" },
  total: { amount: "84.25" }, products: [{ sku: "COF-1" }],
  updated_at: "2026-08-17T12:00:00Z",
});
assert.equal(order.orderCode, "Z-123");
assert.equal(order.paymentStatus, "paid");
assert.equal(order.total, 84.25);
assert.equal(order.items.length, 1);

const now = Date.parse("2026-08-17T00:00:00Z");
assert.equal(zidTokenNeedsRefresh({ expires_at: "2027-08-17T00:00:00Z" }, now), false);
assert.equal(zidTokenNeedsRefresh({ expires_at: "2026-09-01T00:00:00Z" }, now), true);
assert.equal(zidTokenNeedsRefresh({}, now), true);

console.log("Zid production contract checks passed.");
