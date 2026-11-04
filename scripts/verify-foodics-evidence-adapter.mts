import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
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

const puller = readFileSync("src/server/core/evidence-source-pull.ts", "utf8");
const leaseMigration = readFileSync("supabase/migrations/20260914000000_evidence_source_pull_leases.sql", "utf8");
assert.match(puller, /rpc\("ps_claim_due_evidence_sources"/);
assert.match(puller, /finally\s*{[\s\S]{0,100}await releaseSourceLease\(source\.id, runId\)/);
assert.match(leaseMigration, /for update skip locked/i);
assert.match(leaseMigration, /sync_lease_until = p_now \+ interval '10 minutes'/i);
assert.match(leaseMigration, /revoke all on function[\s\S]*from public, anon, authenticated/i);
assert.match(leaseMigration, /grant execute on function[\s\S]*to service_role/i);

console.log("Foodics read-only evidence adapter and atomic scheduler lease checks passed.");
