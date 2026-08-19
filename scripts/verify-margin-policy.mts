import assert from "node:assert/strict";
import { evaluatePolicyControl } from "../src/server/core/margin-policy.ts";
import { decide, REGIONAL_COMMISSION } from "../src/server/core/decide-engine.ts";

assert.equal(REGIONAL_COMMISSION.QA,.19,"Qatar scenario ceiling must be 19%, never the old 22% guess");

const base={currentPrice:100,recommendedPrice:110,floorBreached:true,maxPriceIncreasePct:.15} as const;
assert.equal(evaluatePolicyControl({...base,approvalMode:"recommend_only"}).mayAutoApply,false);
assert.equal(evaluatePolicyControl({...base,approvalMode:"approval_every_change"}).outcome,"waiting_for_approval");
assert.equal(evaluatePolicyControl({...base,approvalMode:"auto_within_limit"}).mayAutoApply,true);
assert.equal(evaluatePolicyControl({...base,recommendedPrice:120,approvalMode:"auto_within_limit"}).outcome,"cannot_reach_target_within_limit");
assert.equal(evaluatePolicyControl({...base,floorBreached:false,approvalMode:"auto_within_limit"}).outcome,"no_change");
assert.equal(evaluatePolicyControl({...base,approvalMode:"auto_within_limit",evidenceReady:false}).outcome,"blocked_missing_evidence");

const vatOnFees=decide({region:"SA",baseCost:50,currentRetailPrice:100,commissionRate:.20,vatRate:.15,marginFloorPct:.18});
assert.equal(vatOnFees.netRevenue,77,"15% fee VAT must apply to the 20 commission, not the full sale");
assert.equal(vatOnFees.netMargin,27);

const cashFloor=decide({region:"SA",baseCost:50,currentRetailPrice:100,commissionRate:.20,vatRate:.15,marginFloorPct:.18,minimumContributionAmount:30});
assert.equal(cashFloor.floorBreached,true);
assert.ok(cashFloor.recommendedPrice && cashFloor.recommendedPrice>103);
const restored=decide({region:"SA",baseCost:50,currentRetailPrice:cashFloor.recommendedPrice!,commissionRate:.20,vatRate:.15,marginFloorPct:.18,minimumContributionAmount:30});
assert.ok(restored.netMargin>=29.999);
console.log("Margin policy, fee-VAT basis, cash floor, and evidence gates verified.");
