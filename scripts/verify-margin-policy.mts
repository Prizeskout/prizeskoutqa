import assert from "node:assert/strict";
import { evaluatePolicyControl } from "../src/server/core/margin-policy.ts";

const base={currentPrice:100,recommendedPrice:110,floorBreached:true,maxPriceIncreasePct:.15} as const;
assert.equal(evaluatePolicyControl({...base,approvalMode:"recommend_only"}).mayAutoApply,false);
assert.equal(evaluatePolicyControl({...base,approvalMode:"approval_every_change"}).outcome,"waiting_for_approval");
assert.equal(evaluatePolicyControl({...base,approvalMode:"auto_within_limit"}).mayAutoApply,true);
assert.equal(evaluatePolicyControl({...base,recommendedPrice:120,approvalMode:"auto_within_limit"}).outcome,"blocked_over_maximum");
assert.equal(evaluatePolicyControl({...base,floorBreached:false,approvalMode:"auto_within_limit"}).outcome,"no_change");
console.log("Margin policy dispatch gates verified.");
