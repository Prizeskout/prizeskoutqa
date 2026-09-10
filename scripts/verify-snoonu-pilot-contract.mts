import assert from "node:assert/strict";
import { isFreshSnoonuTimestamp, normalizeSnoonuPilotEvent, parseSnoonuPilotEnvelope, signSnoonuPilotPayload, verifySnoonuPilotSignature } from "../src/server/core/snoonu-pilot-contract";

const fixture = {
  schema_version: "2026-09-09", event_id: "evt_sn_001", event_type: "order.created",
  occurred_at: "2026-09-09T12:00:00.000Z", merchant: { id: "sn_merchant_42" }, branch: { id: "sn_branch_doha_1" },
  data: { order_id: "SN-1001", currency: "QAR", gross_amount: 100, commission_amount: 20,
    discount_amount: 5, refund_amount: 0, net_amount: 75, status: "delivered", line_items: [{ sku: "SKU-1", quantity: 2 }] },
};
const parsed = parseSnoonuPilotEnvelope(fixture);
assert.equal(normalizeSnoonuPilotEvent(parsed).net_amount, 75);
assert.throws(() => parseSnoonuPilotEnvelope({ ...fixture, event_type: "unknown" }), /Unsupported event_type/);
const raw = JSON.stringify(fixture), timestamp = "1788955200", secret = "pilot-secret-not-for-production";
const signature = await signSnoonuPilotPayload(raw, timestamp, secret);
assert.equal(await verifySnoonuPilotSignature(raw, timestamp, secret, `sha256=${signature}`), true);
assert.equal(await verifySnoonuPilotSignature(`${raw} `, timestamp, secret, signature), false);
assert.equal(isFreshSnoonuTimestamp(timestamp, 1_788_955_200_000), true);
assert.equal(isFreshSnoonuTimestamp(timestamp, 1_788_956_000_001), false);
console.log("Snoonu pilot contract fixtures passed.");
