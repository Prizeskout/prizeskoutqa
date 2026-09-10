import assert from "node:assert/strict";
import {summarizeEconomicTwin} from "../src/server/core/dashboard-stats";

const events=[
  {id:"1",event_kind:"order_snapshot",channel:"snoonu",branch_external_id:"doha-01",currency:"QAR",gross_amount:100,discount_amount:10,fee_amount:20,net_amount:70,normalized_payload:{product_cost_amount:30,refund_amount:0,lines:[{sku:"BURGER",gross_amount:100,discount_amount:10,net_amount:90,product_cost_amount:30}]}},
  {id:"2",event_kind:"payout_total",currency:"QAR",net_amount:70,normalized_payload:{}},
  {id:"3",event_kind:"receipt_confirmation",currency:"QAR",net_amount:65,normalized_payload:{}},
];
const result=summarizeEconomicTwin(events,[{claims_ready_amount:5,recovered_amount:1}]);
assert.equal(result.gross_sales,100);
assert.equal(result.contribution,40);
assert.equal(result.contribution_margin_pct,57.14);
assert.equal(result.expected_payout,70);
assert.equal(result.actual_payout,65);
assert.equal(result.variance,-5);
assert.equal(result.recoverable_amount,4);
assert.equal(result.by_channel[0].key,"snoonu");
assert.equal(result.by_branch[0].key,"doha-01");
assert.equal(result.by_sku[0].key,"BURGER");
console.log("Economic Twin dashboard aggregation verified.");
