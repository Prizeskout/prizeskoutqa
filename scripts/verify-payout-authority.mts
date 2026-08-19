import assert from "node:assert/strict";
import { reconcile, type ClassifiedDocument } from "../src/lib/commission-audit";

const documents: ClassifiedDocument[] = [
  {
    id: "statement",
    file_name: "salla-settlement.csv",
    document_type: "statement",
    platform_guess: "salla",
    result: {
      platform: "salla",
      period_start: "2026-08-01",
      period_end: "2026-08-01",
      sub_total_sum: 100,
      commission_amount: 25,
      effective_commission_pct: 25,
      expected_payout: 75,
      commission_rate_pct: 10,
    },
  },
  {
    id: "receipt",
    file_name: "bank receipt",
    document_type: "merchant_received",
    platform_guess: "salla",
    result: {
      platform: "salla",
      period_start: "2026-08-01",
      period_end: "2026-08-01",
      received_amount: 70,
      evidence_level: "document_supported",
    },
  },
];

const unverified = reconcile(documents, 10);
assert.equal(unverified.assurance.assertions.find(a => a.id === "authorization")?.status, "missing");
assert.equal(unverified.assurance.claimsReadyAmount, 0);
assert.ok(unverified.assurance.estimatedExposure > 0);

const approved = reconcile(documents, 10, {
  source: "approved_contract",
  platform: "salla",
  contractId: "contract-1",
  contractName: "Salla Pay 2026",
  reviewedBy: "Finance",
  effectiveFrom: "2026-01-01",
  effectiveTo: "2026-12-31",
});
assert.equal(approved.assurance.assertions.find(a => a.id === "authorization")?.status, "passed");
assert.match(
  approved.assurance.assertions.find(a => a.id === "authorization")?.detail ?? "",
  /Salla Pay 2026 authorizes the 10% rate/,
);

const expired = reconcile(documents, 10, {
  source: "approved_contract",
  platform: "salla",
  contractId: "contract-old",
  contractName: "Expired terms",
  effectiveFrom: "2025-01-01",
  effectiveTo: "2025-12-31",
});
assert.equal(expired.assurance.assertions.find(a => a.id === "authorization")?.status, "missing");
assert.equal(expired.assurance.claimsReadyAmount, 0);

const wrongPlatform = reconcile(documents, 10, {
  source: "approved_contract",
  platform: "talabat",
  contractId: "contract-talabat",
  contractName: "Talabat terms",
  effectiveFrom: "2026-01-01",
  effectiveTo: "2026-12-31",
});
assert.equal(wrongPlatform.assurance.assertions.find(a => a.id === "authorization")?.status, "missing");
assert.match(wrongPlatform.assurance.assertions.find(a => a.id === "authorization")?.detail ?? "", /does not match the platform/);

const evidenced:ClassifiedDocument={...documents[1],result:{...documents[1].result,currency:"SAR",evidence_sha256:"same-bank-file"}};
const duplicate=reconcile([documents[0],evidenced,{...evidenced,id:"receipt-copy",file_name:"bank receipt copy"}],10);
assert.ok(duplicate.findings.some(f=>f.id==="duplicate-bank-evidence"));
assert.equal(duplicate.fourWay.stages.find(stage=>stage.id==="merchant_receipt")?.amount,70);

const mixed=reconcile([{...documents[0],result:{...documents[0].result,currency:"SAR"}},{...documents[1],result:{...documents[1].result,currency:"USD",evidence_sha256:"usd-receipt"}}],10);
assert.ok(mixed.findings.some(f=>f.id==="mixed-currency-evidence"));
assert.equal(mixed.fourWay.links.find(link=>link.from==="platform_settlement")?.status,"not_testable");

console.log("Payout authority verification passed.");
