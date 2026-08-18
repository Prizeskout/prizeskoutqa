import assert from "node:assert/strict";
import { predictShadowMargin } from "../src/server/core/shadow-intelligence-engine";

const safe = predictShadowMargin({
  baseCost: 40,currentPrice: 80,recommendedPrice: 90,commissionRate: .2,
  vatRate: .05,logisticsSubsidy: 0,marginFloorPct: .2,floorBreached: true,
});
assert.equal(safe.candidatePrice,90);
assert.equal(safe.predictedMargin,31.1);
assert.equal(safe.predictedDemandChangePct,null);
assert.equal(safe.recommendation,"consider_reprice");
assert.equal(safe.confidence,.35);

const unsafe = predictShadowMargin({
  baseCost: 70,currentPrice: 80,recommendedPrice: 82,commissionRate: .2,
  vatRate: .05,logisticsSubsidy: 0,marginFloorPct: .18,floorBreached: true,
});
assert.equal(unsafe.riskLevel,"high");
assert.equal(unsafe.recommendation,"observe");

const invalid = predictShadowMargin({
  baseCost: 1,currentPrice: 0,recommendedPrice: null,commissionRate: .2,
  vatRate: 0,logisticsSubsidy: 0,marginFloorPct: .18,floorBreached: false,
});
assert.equal(invalid.recommendation,"insufficient_evidence");
assert.equal(invalid.confidence,0);

console.log("Shadow intelligence isolation and baseline verification passed.");
