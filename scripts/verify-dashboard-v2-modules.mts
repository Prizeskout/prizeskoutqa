import assert from "node:assert/strict";
import { summarizeOrderModule, summarizePromotionModule } from "../src/server/core/dashboard-v2-modules";

const unavailable = summarizeOrderModule({ available: false });
assert.equal(unavailable.state, "unavailable");
assert.equal(unavailable.automation_rate_pct, null);

const orders = summarizeOrderModule({ available: true, source: { status: "active", last_event_at: "2026-10-06T00:00:00Z" }, rows: [
  { id: "1", external_order_id: "ORD-1", external_branch_id: "west-bay", channel: "talabat", status: "watching", risk_level: "critical", currency: "QAR", order_total: 80, placed_at: "2026-10-06T00:00:00Z" },
  { id: "2", external_order_id: "ORD-2", external_branch_id: "west-bay", channel: "snoonu", status: "completed", risk_level: "cleared", currency: "QAR", order_total: 60, placed_at: "2026-10-06T00:00:00Z" },
] });
assert.equal(orders.state, "available");
assert.deepEqual({ received: orders.received, live: orders.live, attention: orders.attention, critical: orders.critical }, { received: 2, live: 1, attention: 1, critical: 1 });
assert.equal(orders.branches[0]?.received, 2);
assert.equal(orders.automation_rate_pct, null, "automation must not be inferred from lifecycle rows");

const promotions = summarizePromotionModule({ available: true, rows: [{ id: "p1", name: "Lunch", platform: "talabat", status: "pending_approval", inputs: {}, results: { approval_ready: true }, created_at: "2026-10-06T00:00:00Z" }] });
assert.equal(promotions.state, "available");
assert.equal(promotions.counts.pending_approval, 1);
assert.equal(promotions.scenarios[0]?.evidence_ready, true);
assert.equal("contribution" in promotions.scenarios[0]!, false, "contract must not invent campaign contribution");

console.log("Dashboard V2 module contracts verified.");
