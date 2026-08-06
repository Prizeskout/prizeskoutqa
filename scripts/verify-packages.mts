import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  PLAN_PRICES_QAR_ANNUAL_MONTHLY,
  PLAN_PRICES_QAR_MONTHLY,
  PLANS,
  packageFeatureKeys,
} from "../src/lib/plan-config.ts";
import {
  PLAN_CAPABILITIES,
  PLAN_LIMITS,
  hasPlanCapability,
  minPlanForCapability,
  requiredPlanForRoute,
} from "../src/server/plans.ts";

assert.deepEqual(PLAN_PRICES_QAR_MONTHLY, { starter: 349, standard: 1099, enterprise: null }, "Monthly QAR prices changed");
assert.deepEqual(PLAN_PRICES_QAR_ANNUAL_MONTHLY, { starter: 279, standard: 879, enterprise: null }, "Annual QAR prices changed");
assert.deepEqual(
  PLANS.map((plan) => PLAN_LIMITS[plan].maxProducts),
  [50, 500, -1],
  "Product limits changed",
);

for (const capability of PLAN_CAPABILITIES.starter) {
  assert(PLAN_CAPABILITIES.standard.has(capability), `Growth lost Core capability: ${capability}`);
}
for (const capability of PLAN_CAPABILITIES.standard) {
  assert(PLAN_CAPABILITIES.enterprise.has(capability), `Enterprise lost Growth capability: ${capability}`);
}

assert.equal(hasPlanCapability("starter", "competitor_radar"), true);
assert.equal(hasPlanCapability("starter", "protected_price_actions"), true);
assert.equal(hasPlanCapability("starter", "store_assistant"), true);
assert.equal(minPlanForCapability("automated_repricing"), "standard");
assert.equal(minPlanForCapability("group_governance"), "enterprise");
assert.equal(requiredPlanForRoute("POST", "/v1/pricing/decisions"), "starter");
assert.equal(requiredPlanForRoute("GET", "/v1/embed/config"), "enterprise");

for (const locale of ["en", "ar", "fr"]) {
  const messages = JSON.parse(readFileSync(new URL(`../src/locales/${locale}.json`, import.meta.url), "utf8"));
  assert.equal(messages.plans.starterName, "Core", `${locale}: Starter display name was not replaced`);
  assert.equal(messages.plans.standardName, "Growth", `${locale}: Standard display name was not replaced`);
  for (const plan of PLANS) {
    const features = messages.plans.packages?.[plan]?.features;
    assert(Array.isArray(features), `${locale}: ${plan} package features are missing`);
    assert.equal(features.length, packageFeatureKeys(plan).length, `${locale}: ${plan} feature count drifted`);
    assert(features.every((feature: unknown) => typeof feature === "string" && feature.trim().length > 4));
  }
}

const landingSource = readFileSync(new URL("../src/routes/index.tsx", import.meta.url), "utf8");
assert(landingSource.includes("PLAN_PRICES_QAR_MONTHLY.starter"), "Core pricing is not using the shared catalogue");
assert(landingSource.includes("PLAN_PRICES_QAR_MONTHLY.standard"), "Growth pricing is not using the shared catalogue");
assert(landingSource.includes("monthly: null, annual: null"), "Enterprise custom pricing changed");
const gateSource = readFileSync(new URL("../src/components/dashboard/PlanGateModal.tsx", import.meta.url), "utf8");
assert(gateSource.includes("PLAN_PRICES_QAR_MONTHLY"), "Live-mode activation is not using QAR pricing");
assert(!gateSource.includes("$25") && !gateSource.includes("$50"), "Legacy USD prices remain in live-mode activation");

console.log("Package catalogue, entitlements, translations and unchanged prices verified.");
