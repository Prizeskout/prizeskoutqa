import {createHash} from "node:crypto";

export const MERCHANT_EVIDENCE_SOURCE_KINDS = [
  "connected_mailbox",
  "forwarded_email",
  "file_upload",
  "watched_folder",
  "local_connector",
  "protected_integration_copy",
  "optional_api",
] as const;

export type MerchantEvidenceSourceKind = typeof MERCHANT_EVIDENCE_SOURCE_KINDS[number];
export type EvidenceStrength = "confirmed" | "strong" | "partial" | "insufficient";
export type ReconciliationConclusion =
  | "confirmed_discrepancy"
  | "probable_discrepancy"
  | "unallocated_batch_difference"
  | "insufficient_evidence"
  | "reconciled";

export type ReconciliationEvidence = {
  hasOrderTruth: boolean;
  hasContractTruth: boolean;
  hasPayoutTruth: boolean;
  hasOrderLevelPayoutAllocation: boolean;
  variance: number | null;
  evidenceStrength?: EvidenceStrength;
};

/**
 * Classifies only what the supplied evidence can defend. A batch variance is
 * never promoted to an order-level discrepancy without an allocation source.
 */
export function classifyReconciliationEvidence(input: ReconciliationEvidence): ReconciliationConclusion {
  if (!input.hasContractTruth || !input.hasPayoutTruth || input.variance === null) {
    return "insufficient_evidence";
  }
  if (Math.abs(input.variance) < 0.005) return "reconciled";
  if (!input.hasOrderTruth || !input.hasOrderLevelPayoutAllocation) {
    return "unallocated_batch_difference";
  }
  return (input.evidenceStrength ?? "confirmed") === "confirmed"
    ? "confirmed_discrepancy"
    : "probable_discrepancy";
}

export function evidenceFingerprint(value: unknown) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}
