import {createHash} from "node:crypto";
import {createFileRoute} from "@tanstack/react-router";
import {supabaseAdmin} from "@/integrations/supabase/client.server";
import {appendEvidenceProcessingAttempt, registerMerchantEvidence, type MerchantDocumentKind} from "@/server/core/merchant-evidence-intake";
import {resolveEvidenceMailbox, verifyInboundEmailSignature} from "@/server/core/evidence-mailbox";

type Attachment = {filename?: string; content_type?: string; content_base64?: string};
type InboundMessage = {recipient?: string; message_id?: string; sender?: string; subject?: string; received_at?: string; raw_email_base64?: string; attachments?: Attachment[]};
const response = (data: unknown, status = 200) => new Response(JSON.stringify(data), {status, headers: {"Content-Type": "application/json"}});
const safeName = (value: string) => value.replace(/[^a-zA-Z0-9._-]+/g, "-").slice(-180) || "evidence";
const MAX_FILE = 15 * 1024 * 1024;
const ALLOWED_MEDIA = new Set(["application/pdf","text/csv","application/csv","application/vnd.ms-excel","application/vnd.openxmlformats-officedocument.spreadsheetml.sheet","image/png","image/jpeg","image/webp","message/rfc822","text/plain"]);

export function inferEmailDocumentKind(subject: string, filename: string): MerchantDocumentKind {
  const value = `${subject} ${filename}`.toLowerCase();
  if (/credit[ _-]?note|refund/.test(value)) return "credit_note";
  if (/promotion|campaign|discount/.test(value)) return "promotion_confirmation";
  if (/contract|agreement|terms|amendment/.test(value)) return /amend/.test(value) ? "contract_amendment" : "contract";
  if (/settlement|payout statement|remittance/.test(value)) return "settlement_report";
  if (/payout|payment notice/.test(value)) return "payout_notice";
  if (/order/.test(value)) return /summary|report/.test(value) ? "order_summary" : "order_export";
  return "unknown";
}

export const Route = createFileRoute("/api/evidence/inbound-email")({server:{handlers:{
  POST: async ({request}) => { try {
    const rawBody = await request.text();
    if (!verifyInboundEmailSignature(rawBody, request.headers.get("x-prizeskout-signature"))) return response({error: "Invalid signature"}, 401);
    const message = JSON.parse(rawBody) as InboundMessage;
    const mailbox = await resolveEvidenceMailbox(String(message.recipient ?? ""));
    if (!mailbox) return response({error: "Unknown or inactive recipient"}, 404);
    const messageId = String(message.message_id ?? "").trim().slice(0, 500);
    if (!messageId) return response({error: "message_id is required"}, 400);
    const inputs: {bytes: Buffer; filename: string; mediaType: string; kind: MerchantDocumentKind; suffix: string}[] = [];
    if (message.raw_email_base64) inputs.push({bytes: Buffer.from(message.raw_email_base64, "base64"), filename: `${safeName(messageId)}.eml`, mediaType: "message/rfc822", kind: inferEmailDocumentKind(String(message.subject ?? ""), ""), suffix: "message"});
    for (const [index, attachment] of (message.attachments ?? []).entries()) {
      if (!attachment.content_base64) continue;
      const mediaType = String(attachment.content_type || "").toLowerCase().split(";")[0].trim();
      if (!ALLOWED_MEDIA.has(mediaType)) continue;
      inputs.push({bytes: Buffer.from(attachment.content_base64, "base64"), filename: safeName(attachment.filename || `attachment-${index + 1}`), mediaType, kind: inferEmailDocumentKind(String(message.subject ?? ""), String(attachment.filename ?? "")), suffix: `attachment:${index}`});
    }
    if (!inputs.length) return response({error: "The message contains no retained email or attachments."}, 400);
    const accepted: {evidence_item_id: string; duplicate: boolean; document_kind: MerchantDocumentKind}[] = [];
    for (const item of inputs) {
      if (!item.bytes.length || item.bytes.length > MAX_FILE) continue;
      const hash = createHash("sha256").update(item.bytes).digest("hex");
      const path = `${mailbox.merchant_id}/email/${hash}/${item.filename}`;
      const {error: storageError} = await supabaseAdmin.storage.from("merchant-evidence").upload(path, item.bytes, {contentType: item.mediaType, upsert: false});
      if (storageError && !/already exists|duplicate/i.test(storageError.message)) throw storageError;
      const intake = await registerMerchantEvidence({
        accountId: mailbox.account_id, merchantId: mailbox.merchant_id, sourceKind: "forwarded_email",
        sourceProvider: "merchant-mailbox", sourceExternalId: `${messageId}:${item.suffix}`, documentKind: item.kind,
        contentSha256: hash, observedAt: message.received_at ?? null, mediaType: item.mediaType,
        originalFilename: item.filename, storageReference: `merchant-evidence/${path}`,
        sourceMetadata: {original_bytes_retained: true, sender: String(message.sender ?? "").slice(0, 320), subject: String(message.subject ?? "").slice(0, 500)},
      });
      if (!intake.duplicate) await appendEvidenceProcessingAttempt({evidenceItemId: intake.evidenceItemId, accountId: mailbox.account_id, processorVersion: "inbound-email-intake-v1", attemptNumber: 1, state: "accepted", detectedDocumentKind: item.kind, extractionSummary: {original_bytes_retained: true, source: "forwarded_email"}});
      accepted.push({evidence_item_id: intake.evidenceItemId, duplicate: intake.duplicate, document_kind: item.kind});
    }
    return response({ok: true, accepted, skipped: inputs.length - accepted.length});
  } catch (error) { return response({error: error instanceof Error ? error.message : "Inbound evidence could not be accepted."}, 422); }
  },
}}});
