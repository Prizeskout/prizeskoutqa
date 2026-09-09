import assert from "node:assert/strict";
import {fetchFoodicsOrderEvidence, mapFoodicsOrder} from "../src/server/core/foodics-evidence-adapter.ts";

const fixture = {order: {
  id: "order-1", reference: "00850", reference_x: "TAL-1001", number: 850,
  business_date: "2026-08-27", subtotal_price: 100, discount_amount: 10,
  total_price: 105, status: 4, closed_at: "2026-08-27 12:30:00",
  updated_at: "2026-08-27 12:31:00", branch: {id: "branch-1", reference: "B01"},
  customer: {email: "must-not-survive@example.test"}, payments: [{card: "must-not-survive"}],
}};

const mapped = mapFoodicsOrder(fixture, "sar");
assert.ok(mapped);
assert.equal(mapped.order_id, "TAL-1001");
assert.equal(mapped.branch_external_id, "branch-1");
assert.equal(mapped.currency, "SAR");
assert.equal(mapped.gross_amount, 100);
assert.equal(mapped.discount_amount, 10);
assert.equal(mapped.final, true);
assert.equal("customer" in mapped, false);
assert.equal("payments" in mapped, false);

const calls: URL[] = [];
const fetchImpl = async (input: URL | RequestInfo) => {
  const url = input instanceof URL ? input : new URL(String(input));
  calls.push(url);
  return new Response(JSON.stringify({data: [fixture]}), {status: 200, headers: {"Content-Type": "application/json"}});
};
const page = await fetchFoodicsOrderEvidence({accessToken: "read-token", currency: "SAR", cursor: "849", branchIds: ["branch-1"], fetchImpl});
assert.equal(page.records.length, 1);
assert.equal(page.cursorAfter, "00850");
assert.equal(page.deliveryComplete, true);
assert.equal(calls[0].pathname, "/v2.1/orders");
assert.equal(calls[0].searchParams.get("sort"), "reference");
assert.equal(calls[0].searchParams.get("filter[reference_after]"), "849");
assert.equal(calls[0].searchParams.get("include"), "branch,original_order");

console.log("Foodics read-only evidence adapter fixtures passed.");
