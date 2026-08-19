import assert from "node:assert/strict";
import {classifyOrder,commissionBaseForOrder,duplicateOrderIds} from "../src/server/core/payout-order-accounting.ts";
import {parseAggregatorDailyCsv} from "../src/server/core/payout-csv-parser.ts";

assert.equal(classifyOrder({order_id:"1",status:"delivered",payment:{sub_total:100}}).eligibility,"eligible");
assert.equal(classifyOrder({order_id:"2",status:"cancelled",payment:{sub_total:100}}).eligibility,"cancelled");
assert.equal(classifyOrder({order_id:"3",status:"delivered",payment:{sub_total:100,refund_amount:25}}).eligibility,"refunded");
assert.equal(classifyOrder({order_id:"4",status:"preparing",payment:{sub_total:100}}).eligibility,"pending");
assert.deepEqual(commissionBaseForOrder({payment:{sub_total:80,gross_before_discount:100}},80,"gross_before_discount"),{amount:100,evidenced:true});
assert.equal(commissionBaseForOrder({payment:{sub_total:80}},80,"eligible_sales").evidenced,false);
assert.deepEqual([...duplicateOrderIds([{order_id:"1"},{order_id:"1"},{order_id:"2"}])],["1"]);
const parsed=parseAggregatorDailyCsv(`Date,Order ID,Sales,Status,Refund Amount
2026-08-01,1,100,Delivered,0
2026-08-01,2,50,Cancelled,0
2026-08-01,3,80,Delivered,20
2026-08-01,DUP,40,Delivered,0
2026-08-01,DUP,40,Delivered,0`,10,"talabat");
assert.equal(parsed.ok,true);
assert.equal(parsed.sub_total_sum,160);
assert.equal(parsed.expected_payout,144);
assert.deepEqual(parsed.duplicate_order_ids,["DUP"]);
assert.equal(parsed.transaction_rows?.length,3);
console.log("Payout order eligibility, refund, commission-base, and duplicate controls verified.");
