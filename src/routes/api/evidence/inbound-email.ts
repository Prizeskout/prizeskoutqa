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
const MAX_BODY = 45 * 1024 * 1024;
const MAX_TOTAL_RETAINED = 30 * 1024 * 1024;
const MAX_ATTACHMENTS = 25;
const ALLOWED_MEDIA = new Set(["application/pdf","text/csv","application/csv","application/vnd.ms-excel","application/vnd.openxmlformats-officedocument.spreadsheetml.sheet","image/png","image/jpeg","image/webp","message/rfc822","text/plain"]);

class InboundRequestError extends Error {
  constructor(message: string, readonly status: number) { super(message); }
}

async function readBoundedBody(request: Request) {
  const declared = Number(request.headers.get("content-length") ?? 0);
  if (Number.isFinite(declared) && declared > MAX_BODY) throw new InboundRequestError("Inbound message exceeds the request limit.", 413);
  if (!request.body) return "";
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const {done, value} = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > MAX_BODY) {
      await reader.cancel();
      throw new InboundRequestError("Inbound message exceeds the request limit.", 413);
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  try { return new TextDecoder("utf-8", {fatal: true}).decode(bytes); }
  catch { throw new InboundRequestError("Inbound message must be valid UTF-8 JSON.", 400); }
}

export function decodeInboundBase64(value: string) {
  const normalized = value.trim();
  if (!normalized || normalized.length % 4 !== 0 || !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(normalized)) {
    throw new InboundRequestError("Inbound evidence contains invalid Base64 data.", 400);
  }
  return Buffer.from(normalized, "base64");
}

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
    const rawBody = await readBoundedBody(request);
    if (!verifyInboundEmailSignature(rawBody, request.headers.get("x-prizeskout-signature"))) return response({error: "Invalid signature"}, 401);
    let message: InboundMessage;
    try { message = JSON.parse(rawBody) as InboundMessage; }
    catch { return response({error: "Inbound message must be valid JSON."}, 400); }
    const mailbox = await resolveEvidenceMailbox(String(message.recipient ?? ""));
    if (!mailbox) return response({error: "Unknown or inactive recipient"}, 404);
    const messageId = String(message.message_id ?? "").trim().slice(0, 500);
    if (!messageId) return response({error: "message_id is required"}, 400);
    const inputs: {bytes: Buffer; filename: string; mediaType: string; kind: MerchantDocumentKind; suffix: string}[] = [];
    const attachments = Array.isArray(message.attachments) ? message.attachments : [];
    if (attachments.length > MAX_ATTACHMENTS) return response({error: `A message may contain at most ${MAX_ATTACHMENTS} attachments.`}, 413);
    if (message.raw_email_base64) inputs.push({bytes: decodeInboundBase64(message.raw_email_base64), filename: `${safeName(messageId)}.eml`, mediaType: "message/rfc822", kind: inferEmailDocumentKind(String(message.subject ?? ""), ""), suffix: "message"});
    for (const [index, attachment] of attachments.entries()) {
      if (!attachment.content_base64) continue;
      const mediaType = String(attachment.content_type || "").toLowerCase().split(";")[0].trim();
      if (!ALLOWED_MEDIA.has(mediaType)) continue;
      inputs.push({bytes: decodeInboundBase64(attachment.content_base64), filename: safeName(attachment.filename || `attachment-${index + 1}`), mediaType, kind: inferEmailDocumentKind(String(message.subject ?? ""), String(attachment.filename ?? "")), suffix: `attachment:${index}`});
    }
    if (!inputs.length) return response({error: "The message contains no retained email or attachments."}, 400);
    if (inputs.reduce((sum, item) => sum + item.bytes.length, 0) > MAX_TOTAL_RETAINED) return response({error: "Inbound evidence exceeds the total retained-size limit."}, 413);
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
  } catch (error) { return response({error: error instanceof Error ? error.message : "Inbound evidence could not be accepted."}, error instanceof InboundRequestError ? error.status : 422); }
  },
}}});
