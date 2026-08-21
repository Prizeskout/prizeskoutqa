import {supabaseAdmin} from "@/integrations/supabase/client.server";
import {
  MERCHANT_EVIDENCE_SOURCE_KINDS,
  type MerchantEvidenceSourceKind,
} from "./merchant-evidence";

export const MERCHANT_DOCUMENT_KINDS = [
  "order_export",
  "order_summary",
  "settlement_report",
  "payout_notice",
  "credit_note",
  "promotion_confirmation",
  "contract",
  "contract_amendment",
  "adjustment_notice",
  "merchant_confirmation",
  "unknown",
] as const;

export type MerchantDocumentKind = typeof MERCHANT_DOCUMENT_KINDS[number];
export type EvidenceProcessingState =
  | "accepted"
  | "processing"
  | "normalized"
  | "needs_review"
  | "quarantined"
  | "failed";

export type MerchantEvidenceIntake = {
  accountId: string;
  merchantId: string;
  sourceKind: MerchantEvidenceSourceKind;
  sourceProvider: string;
  sourceExternalId: string;
  documentKind: MerchantDocumentKind;
  contentSha256: string;
  observedAt?: string | null;
  mediaType?: string | null;
  originalFilename?: string | null;
  storageReference?: string | null;
  sourceMetadata?: Record<string, unknown>;
};

const cleanRequired = (value: string, label: string, max = 240) => {
  const cleaned = value.trim();
  if (!cleaned) throw new Error(`${label} is required.`);
  if (cleaned.length > max) throw new Error(`${label} is too long.`);
  return cleaned;
};

const cleanOptional = (value: string | null | undefined, max: number) => {
  const cleaned = value?.trim() || null;
  if (cleaned && cleaned.length > max) throw new Error("Evidence metadata value is too long.");
  return cleaned;
};

export function prepareMerchantEvidenceIntake(input: MerchantEvidenceIntake) {
  if (!MERCHANT_EVIDENCE_SOURCE_KINDS.includes(input.sourceKind)) throw new Error("Unsupported evidence source.");
  if (!MERCHANT_DOCUMENT_KINDS.includes(input.documentKind)) throw new Error("Unsupported document type.");
  const contentSha256 = input.contentSha256.trim().toLowerCase();
  if (!/^[a-f0-9]{64}$/.test(contentSha256)) throw new Error("Evidence SHA-256 must contain 64 hexadecimal characters.");
  const observedAt = cleanOptional(input.observedAt, 40);
  if (observedAt && Number.isNaN(Date.parse(observedAt))) throw new Error("Evidence observation time is invalid.");

  return {
    account_id: cleanRequired(input.accountId, "Account ID", 160),
    merchant_id: cleanRequired(input.merchantId, "Merchant ID", 160),
    source_kind: input.sourceKind,
    source_provider: cleanRequired(input.sourceProvider, "Source provider", 120).toLowerCase(),
    source_external_id: cleanRequired(input.sourceExternalId, "Source external ID", 500),
    document_kind: input.documentKind,
    observed_at: observedAt,
    media_type: cleanOptional(input.mediaType, 160),
    original_filename: cleanOptional(input.originalFilename, 500),
    storage_reference: cleanOptional(input.storageReference, 1000),
    content_sha256: contentSha256,
    source_metadata: input.sourceMetadata ?? {},
  };
}
/**
 * Registers evidence after bytes have already been stored privately. The
 * unique source identity plus content hash makes retries safe. No protected
 * integration calls this service synchronously.
 */
export async function registerMerchantEvidence(input: MerchantEvidenceIntake) {
  const row = prepareMerchantEvidenceIntake(input);
  const db = supabaseAdmin as any;
  const {data, error} = await db.from("ps_merchant_evidence_items").insert(row).select("id,received_at").single();
  if (!error && data) return {evidenceItemId: data.id as string, receivedAt: data.received_at as string, duplicate: false};
  if (error?.code !== "23505") throw new Error(error?.message ?? "Evidence intake failed.");

  const {data: existing, error: findError} = await db.from("ps_merchant_evidence_items")
    .select("id,received_at")
    .eq("account_id", row.account_id)
    .eq("source_kind", row.source_kind)
    .eq("source_provider", row.source_provider)
    .eq("source_external_id", row.source_external_id)
    .eq("content_sha256", row.content_sha256)
    .maybeSingle();
  if (findError || !existing) throw new Error(findError?.message ?? "Duplicate evidence could not be located.");
  return {evidenceItemId: existing.id as string, receivedAt: existing.received_at as string, duplicate: true};
}

export async function appendEvidenceProcessingAttempt(input: {
  evidenceItemId: string;
  accountId: string;
  processorVersion: string;
  attemptNumber: number;
  state: EvidenceProcessingState;
  detectedDocumentKind?: MerchantDocumentKind | null;
  extractionSummary?: Record<string, unknown>;
  limitations?: string[];
  errorCode?: string | null;
  errorMessage?: string | null;
}) {
  if (!Number.isInteger(input.attemptNumber) || input.attemptNumber < 1) throw new Error("Attempt number must be a positive integer.");
  if ((input.state === "quarantined" || input.state === "failed") && !input.errorCode) {
    throw new Error("Quarantined and failed attempts require an error code.");
  }
  const {data, error} = await (supabaseAdmin as any).from("ps_evidence_processing_attempts").insert({
    evidence_item_id: cleanRequired(input.evidenceItemId, "Evidence item ID", 80),
    account_id: cleanRequired(input.accountId, "Account ID", 160),
    processor_version: cleanRequired(input.processorVersion, "Processor version", 120),
    attempt_number: input.attemptNumber,
    state: input.state,
    detected_document_kind: input.detectedDocumentKind ?? null,
    extraction_summary: input.extractionSummary ?? {},
    limitations: input.limitations ?? [],
    error_code: cleanOptional(input.errorCode, 120),
    error_message: cleanOptional(input.errorMessage, 2000),
  }).select("id,created_at").single();
  if (error || !data) throw new Error(error?.message ?? "Evidence processing attempt could not be recorded.");
  return {attemptId: data.id as string, createdAt: data.created_at as string};
}
