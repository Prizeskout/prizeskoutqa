import assert from "node:assert/strict";
import {reconcileSettlementEvidence} from "../src/server/core/settlement-reconciliation.ts";

const result=reconcileSettlementEvidence({
  orders:[{orderId:"A",amount:100,currency:"QAR",final:true,evidenceReady:true},{orderId:"B",amount:80,currency:"QAR",final:true,evidenceReady:true},{orderId:"C",amount:50,currency:"QAR",final:true,evidenceReady:true}],
  settlements:[{settlementReference:"S1",orderId:"A",amount:100,currency:"QAR"},{settlementReference:"S2",orderId:"B",amount:70,currency:"QAR"}],
  receipts:[{bankReference:"BANK1",settlementReference:"S1",amount:100,currency:"QAR",evidenceReady:true},{bankReference:"BANK2",settlementReference:"S2",amount:70,currency:"QAR",evidenceReady:true}],
});
assert.equal(result.allocations.find(row=>row.orderId==="A")?.state,"reconciled");
assert.equal(result.allocations.find(row=>row.orderId==="B")?.state,"claim_ready");
assert.equal(result.claimsReadyAmount,10);
assert.equal(result.allocations.find(row=>row.orderId==="C")?.state,"awaiting_settlement");
const duplicate=reconcileSettlementEvidence({orders:[{orderId:"A",amount:10,currency:"QAR",final:true,evidenceReady:true}],settlements:[{settlementReference:"S1",orderId:"A",amount:10,currency:"QAR"},{settlementReference:"S2",orderId:"A",amount:10,currency:"QAR"}],receipts:[]});
assert.equal(duplicate.allocations[0].state,"ambiguous");
console.log("Exact-reference settlement matching, partial states, and duplicate quarantine verified.");
