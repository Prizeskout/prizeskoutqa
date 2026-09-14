import assert from "node:assert/strict";
import { classifyOrderRisk, normalizeUrbanPiperOrder } from "../src/server/core/order-guard";

const received = normalizeUrbanPiperOrder({
  order: {
    next_state: "Acknowledged",
    details: {
      id: 812345,
      created: 1_789_243_200_000,
      biz_id: "biz-qa-22",
      channel: "talabat",
      state: "Placed",
      order_total: 146.5,
      currency: "qar",
    },
    store: { id: 991, merchant_ref_id: "west-bay" },
  },
});
assert.equal(received.externalOrderId, "812345");
assert.equal(received.externalBusinessId, "biz-qa-22");
assert.equal(received.externalBranchId, "west-bay");
assert.equal(received.channel, "talabat");
assert.equal(received.status, "watching");
assert.equal(received.currency, "QAR");
assert.equal(received.orderTotal, 146.5);

const statusUpdate = normalizeUrbanPiperOrder({
  order: {
    details: { id: 812345, biz_id: "biz-qa-22", created: 1_789_243_200_000, state: "Acknowledged" },
    store: { id: 991 },
  },
});
assert.equal(statusUpdate.status, "acknowledged");
assert.equal(statusUpdate.externalBranchId, "991");

const accepted = normalizeUrbanPiperOrder({
  data: {
    order_id: "UP-44",
    biz_id: "biz-qa-22",
    status: "accepted",
    created_at: "2026-09-13T10:00:00.000Z",
    expected_pickup_time: 1_789_294_200_000,
  },
});
// UrbanPiper auto-acceptance must not masquerade as a human branch acknowledgement.
assert.equal(accepted.status, "watching");
assert.equal(accepted.expectedReadyAt, "2026-09-13T10:10:00.000Z");

const kitchenAcknowledged = normalizeUrbanPiperOrder({
  order_id: "UP-44B",
  biz_id: "biz-qa-22",
  status: "kitchen_acknowledged",
  created_at: "2026-09-13T10:00:00.000Z",
});
assert.equal(kitchenAcknowledged.status, "acknowledged");

const completed = normalizeUrbanPiperOrder({
  order_id: "UP-45",
  biz_id: "biz-qa-22",
  event_type: "order_completed",
  created_at: "2026-09-13T10:00:00.000Z",
});
assert.equal(completed.status, "completed");

assert.throws(() => normalizeUrbanPiperOrder({ order: { biz_id: "biz-qa-22" } }), /order id/i);
assert.throws(() => normalizeUrbanPiperOrder({ order: { id: "UP-46" } }), /business id/i);

const risk = (status: string, ageSeconds: number, acknowledgedAgeSeconds = 0, late = false) =>
  classifyOrderRisk({
    status,
    ageSeconds,
    acknowledgedAgeSeconds,
    readyDeadlineMissed: late,
    acknowledgementSeconds: 60,
    managerEscalationSeconds: 120,
    criticalEscalationSeconds: 180,
    preparationStallSeconds: 900,
  });
assert.equal(risk("watching", 59), "watching");
assert.equal(risk("watching", 60), "attention");
assert.equal(risk("watching", 120), "manager");
assert.equal(risk("watching", 180), "critical");
assert.equal(risk("preparing", 180, 120), "watching");
assert.equal(risk("preparing", 1_000, 900), "critical");
assert.equal(risk("preparing", 100, 50, true), "critical");
assert.equal(risk("completed", 1_000), "cleared");

console.log(
  "Order Guard contract verified: payload normalization, lifecycle mapping, and validation pass.",
);
