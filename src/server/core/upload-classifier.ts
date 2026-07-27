// Interprets a merchant's free-text description of an uploaded payout
// document or manual entry ("what Talabat paid me" vs "what they
// compiled") — classification only, never computation. The model is never
// asked to produce or verify a dollar figure; it only reads a short factual
// summary of what was already parsed/typed and decides which role the
// document plays in the audit. All arithmetic and every mismatch finding
// continue to come exclusively from src/lib/commission-audit.ts's
// deterministic reconcile() — see that file's header comment.
//
// Mirrors the Anthropic tool-calling pattern from ai-insights.functions.ts
// (guaranteed structured output, not prompted-JSON-and-parse) with the
// Haiku model + API-key/error handling from api/copilot/compile.ts (a short
// classification call has the same cost profile as Copilot's chat mode, not
// AI Insights' long-context analysis).
import Anthropic from "@anthropic-ai/sdk";
import type { ExpectedPayoutResult } from "./expected-payout";

const MODEL = "claude-haiku-4-5-20251001";
const DESCRIPTION_MAX_LEN = 500;

export type UploadRole = "platform_statement" | "daily_log" | "merchant_received" | "unknown";

export type UploadClassification = {
  role: UploadRole;
  platform: string | null;
  confidence: number;
  restated: string;
  accounting_basis: "gross_before_deductions" | "net_after_deductions" | "unclear";
  suggested_document_type: "daily_log" | "statement" | "summary_pdf" | "merchant_received" | "keep_detected";
  audit_use: string;
  risks: string[];
  blocking_question: string | null;
};

export type ClassifyUploadResult =
  | { ok: true; classification: UploadClassification }
  | { ok: false; error: string };

export type ClassifyUploadInput = {
  description: string;
  // Factual, read-only context built from what was already parsed/typed —
  // see buildParsedSummary. Never a number the model is asked to touch.
  parsedSummary: string;
  // What the deterministic parser/form already decided, told to the model
  // as a hint it can disagree with (surfacing a mismatch) but never asked
  // to confirm or restate as if it verified it.
  structuralHint: "daily_log" | "statement" | "summary_pdf" | "manual_entry";
};

const SYSTEM_PROMPT = `You are a document-classification assistant for PrizeSkout's Commission Audit feature. A merchant is adding payout-related documents one at a time and describing each one in their own words. Your only job is to interpret what the merchant's description says the document represents.

You never compute, verify, or restate any dollar figures. Any numbers you are given (order counts, totals, dates) are read-only context to help you interpret intent — do not recite, adjust, or reason about whether they are correct.

Classify the document's role as one of:
- platform_statement: the delivery platform's OWN compiled payout/earnings statement, summary report, or payout data of any kind that came FROM the platform (e.g. "what Talabat paid me", "what Talabat says they paid me", "the earnings report Snoonu sent", "what they compiled", "Talabat's payout summary"). Any phrasing that describes a platform's own export or report as showing what it paid belongs here — including casual phrasing like "paid me" — as long as the document itself is something the platform produced (a file, an export, a report).
- daily_log: a raw per-order or per-day sales/orders export (e.g. "my daily orders CSV", "orders per day")
- merchant_received: specifically the merchant's OWN external record — money that landed in their bank/accounting system, entered by the merchant themselves, NOT sourced from the platform (e.g. "what actually hit our bank account", "our accounting shows", "our own bank record"). This is normally a manually-typed amount, not an uploaded file. Only use this when the description clearly points to a source outside the platform (a bank, an accounting system) — a description merely saying a platform "paid" or "gave" the merchant something is platform_statement, not this.
- unknown: the description doesn't make the role clear

You are also told what the file/entry was ALREADY structurally determined to be by a separate, reliable deterministic system (in "structural_hint"). Treat this as strong prior evidence — for an uploaded file, only classify a role other than what structural_hint implies if the merchant's description is unambiguous and explicitly contradicts it (e.g. structural_hint says this is a daily orders export, but the merchant explicitly wrote "this is our bank statement"). Casual or ambiguous phrasing should NOT override the structural hint.

If the description names a delivery platform (Talabat, Snoonu, Jahez, Deliveroo), report it in "platform"; otherwise "unknown".

"restated" is one short plain-English sentence restating what the merchant seems to be telling us, shown back to them for confirmation — not a summary of the numbers.

Also extract actionable audit context:
- accounting_basis: gross before deductions, net after deductions, or unclear.
- suggested_document_type: the best UI type, or keep_detected when structural parsing should stand.
- audit_use: one concise sentence explaining what this evidence can actually prove.
- risks: up to 3 short evidence or reconciliation risks grounded only in the supplied context.
- blocking_question: the single most important question needed for reliable reconciliation, or null.

These are recommendations only. Never say a document is verified and never activate an override.
Return ONLY a tool call to classify_upload.`;

const TOOL_SCHEMA: Anthropic.Tool = {
  name: "classify_upload",
  description: "Classify what a merchant's uploaded payout document (or manually-entered figure) represents, based on the merchant's own free-text description.",
  input_schema: {
    type: "object",
    properties: {
      role: {
        type: "string",
        enum: ["platform_statement", "daily_log", "merchant_received", "unknown"],
      },
      platform: {
        type: "string",
        enum: ["talabat", "snoonu", "jahez", "deliveroo", "unknown"],
      },
      confidence: { type: "number", minimum: 0, maximum: 1 },
      restated: { type: "string", maxLength: 200 },
      accounting_basis: { type: "string", enum: ["gross_before_deductions", "net_after_deductions", "unclear"] },
      suggested_document_type: { type: "string", enum: ["daily_log", "statement", "summary_pdf", "merchant_received", "keep_detected"] },
      audit_use: { type: "string", maxLength: 240 },
      risks: { type: "array", items: { type: "string", maxLength: 160 }, maxItems: 3 },
      blocking_question: { type: ["string", "null"], maxLength: 200 },
    },
    required: ["role", "platform", "confidence", "restated", "accounting_basis", "suggested_document_type", "audit_use", "risks", "blocking_question"],
    additionalProperties: false,
  },
};

export async function classifyUpload(input: ClassifyUploadInput): Promise<ClassifyUploadResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return { ok: false, error: "AI classification not configured." };

  const description = input.description.trim().slice(0, DESCRIPTION_MAX_LEN);
  if (!description) return { ok: false, error: "No description to classify." };

  const client = new Anthropic({ apiKey });
  try {
    const message = await client.messages.create({
      model: MODEL,
      max_tokens: 600,
      system: SYSTEM_PROMPT,
      messages: [{
        role: "user",
        content: `Merchant's description: "${description}"\n\nWhat was structurally parsed from this document: ${input.parsedSummary}\n\n(For reference only — the deterministic parser/form already categorized this as: ${input.structuralHint})`,
      }],
      tools: [TOOL_SCHEMA],
      tool_choice: { type: "tool", name: "classify_upload" },
    });

    const toolUse = message.content.find((b): b is Anthropic.ToolUseBlock => b.type === "tool_use");
    if (!toolUse) return { ok: false, error: "AI returned no classification." };

    const raw = toolUse.input as Partial<UploadClassification>;
    const roles: UploadRole[] = ["platform_statement", "daily_log", "merchant_received", "unknown"];
    const role = roles.includes(raw.role as UploadRole) ? (raw.role as UploadRole) : "unknown";
    const platform = raw.platform && raw.platform !== "unknown" ? raw.platform : null;
    const confidence = typeof raw.confidence === "number" ? Math.max(0, Math.min(1, raw.confidence)) : 0;
    const restated = typeof raw.restated === "string" ? raw.restated.slice(0, 200) : "";

    const accounting_basis = ["gross_before_deductions", "net_after_deductions", "unclear"].includes(raw.accounting_basis ?? "")
      ? raw.accounting_basis! : "unclear";
    const suggestedTypes = ["daily_log", "statement", "summary_pdf", "merchant_received", "keep_detected"];
    const suggested_document_type = suggestedTypes.includes(raw.suggested_document_type ?? "")
      ? raw.suggested_document_type! : "keep_detected";
    const audit_use = typeof raw.audit_use === "string" ? raw.audit_use.slice(0, 240) : "";
    const risks = Array.isArray(raw.risks) ? raw.risks.filter(r => typeof r === "string").slice(0, 3).map(r => r.slice(0, 160)) : [];
    const blocking_question = typeof raw.blocking_question === "string" && raw.blocking_question.trim()
      ? raw.blocking_question.slice(0, 200) : null;

    return { ok: true, classification: {
      role, platform, confidence, restated, accounting_basis,
      suggested_document_type: suggested_document_type as UploadClassification["suggested_document_type"],
      audit_use, risks, blocking_question,
    } };
  } catch (err: unknown) {
    if (err instanceof Anthropic.APIError) {
      if (err.status === 429) return { ok: false, error: "AI rate limit reached — try again in a moment." };
      if (err.status === 402 || err.status === 529) return { ok: false, error: "AI classification temporarily unavailable." };
      console.error("[upload-classifier] Anthropic API error", err.status, err.message);
      return { ok: false, error: `AI classification error (${err.status}).` };
    }
    console.error("[upload-classifier] classification failed:", err);
    return { ok: false, error: "AI classification failed." };
  }
}

// Factual summary of what the deterministic parser already extracted — the
// only "numbers" the model sees, provided purely as intent-disambiguating
// context. It is told explicitly (see SYSTEM_PROMPT) never to recite or
// verify these.
export function buildParsedSummary(result: ExpectedPayoutResult): string {
  const parts: string[] = [];
  if (result.order_count != null) parts.push(`${result.order_count} orders`);
  if (result.sub_total_sum != null) parts.push(`Gross Sales ${result.sub_total_sum}`);
  if (result.expected_payout != null) parts.push(`Total Payout ${result.expected_payout}`);
  if (result.effective_commission_pct != null) parts.push(`effective commission ${result.effective_commission_pct}%`);
  if (result.brand) parts.push(`brand "${result.brand}"`);
  if (result.period_start && result.period_end) parts.push(`period ${result.period_start} to ${result.period_end}`);
  return parts.length > 0 ? parts.join(", ") : "No structured figures were extracted from this file.";
}
