import assert from "node:assert/strict";
import {gradeEconomicEvidence} from "../src/server/core/economic-evidence-quality";

const verified=gradeEconomicEvidence({hasUnits:true,hasRevenue:true,hasCost:true,orderReconciled:true,hasItemLevelSettlement:true});
assert.deepEqual(verified,{grade:"A",completeness:1,trainingEligible:true,limitations:[]});

const reconstructed=gradeEconomicEvidence({hasUnits:true,hasRevenue:true,hasCost:true,orderReconciled:true,hasItemLevelSettlement:false});
assert.equal(reconstructed.grade,"B");
assert.equal(reconstructed.trainingEligible,true);
assert.deepEqual(reconstructed.limitations,["item_level_settlement_missing"]);

const partial=gradeEconomicEvidence({hasUnits:true,hasRevenue:true,hasCost:false,orderReconciled:false,hasItemLevelSettlement:false});
assert.equal(partial.grade,"C");
assert.equal(partial.trainingEligible,false);

const unusable=gradeEconomicEvidence({hasUnits:false,hasRevenue:false,hasCost:false,orderReconciled:false,hasItemLevelSettlement:false});
assert.equal(unusable.grade,"D");
assert.equal(unusable.completeness,0);

console.log("Economic evidence quality grading verified.");
