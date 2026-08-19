import assert from "node:assert/strict";
import {pricingEvidenceWindow,publicationEvidenceBlockers} from "../src/server/core/pricing-evidence.ts";

const now=new Date("2026-08-19T12:00:00Z"),window=pricingEvidenceWindow(now);
const base={now,activePolicyVersion:3,decisionPolicyVersion:3,decisionExpiresAt:window.decisionExpiresAt,costObservedAt:window.costObservedAt,costEvidenceExpiresAt:window.costEvidenceExpiresAt,sourcePlatform:"zid",itemId:"p1",currency:"SAR",evidenceChannel:"zid",evidenceItemId:"p1",evidenceCurrency:"SAR",decisionEconomicsVersionId:"e1",accountId:"a1",merchantId:"a1",economics:{id:"e1",accountId:"a1",merchantId:"a1",channel:"zid",status:"approved",effectiveFrom:"2026-01-01T00:00:00Z",effectiveTo:null,sourceContractId:"c1"}};
assert.deepEqual(publicationEvidenceBlockers(base),[]);
assert.deepEqual(publicationEvidenceBlockers({...base,decisionPolicyVersion:2}),["policy_version_changed"]);
assert.ok(publicationEvidenceBlockers({...base,costEvidenceExpiresAt:"2026-08-19T11:59:00Z"}).includes("cost_evidence_stale"));
assert.ok(publicationEvidenceBlockers({...base,economics:{...base.economics,effectiveTo:"2026-08-19T11:00:00Z"}}).includes("contract_not_effective"));
assert.ok(publicationEvidenceBlockers({...base,evidenceItemId:"p2"}).includes("product_scope_mismatch"));
console.log("Pricing evidence freshness, policy binding, and applicability verified.");
