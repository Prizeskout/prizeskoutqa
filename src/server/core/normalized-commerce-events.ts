import {supabaseAdmin} from "@/integrations/supabase/client.server";
import type {ExpectedPayoutResult} from "./expected-payout";
import {evidenceFingerprint, type EvidenceStrength, type MerchantEvidenceSourceKind} from "./merchant-evidence";
import {appendEvidenceProcessingAttempt, type MerchantDocumentKind} from "./merchant-evidence-intake";

export const NORMALIZED_COMMERCE_VERSION = "commerce-normalizer-v2";

type NormalizedEventKind = "order_snapshot" | "cancellation" | "refund" | "commercial_adjustment" | "settlement_line" | "payout_total" | "promotion_term" | "receipt_confirmation";

export type NormalizedCommerceEvent = {
  account_id: string;
  merchant_id: string;
  evidence_item_id: string;
  source_kind: MerchantEvidenceSourceKind;
  source_provider: string;
  external_event_id: string;
  event_kind: NormalizedEventKind;
  channel: string | null;
  branch_external_id: string | null;
  order_external_id: string | null;
  settlement_reference: string | null;
  occurred_at: string | null;
  currency: string | null;
  gross_amount: number | null;
  discount_amount: number | null;
  tax_amount: number | null;
  fee_amount: number | null;
  net_amount: number | null;
  normalized_payload: Record<string, unknown>;
  normalization_version: string;
  evidence_strength: EvidenceStrength;
  limitations: string[];
  event_fingerprint: string;
};

type BuildInput = {
  accountId: string;
  merchantId: string;
  evidenceItemId: string;
  sourceKind: MerchantEvidenceSourceKind;
  sourceProvider: string;
  documentKind: MerchantDocumentKind;
  result: ExpectedPayoutResult;
};

const finite = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value);
const money = (value: number) => Math.round(value * 100) / 100;
const clean = (value: string | null | undefined) => value?.trim() || null;
const eventTime = (value: string | null | undefined) => {
  const candidate = clean(value);
  if (!candidate) return null;
  const timestamp = /^\d{4}-\d{2}-\d{2}$/.test(candidate) ? `${candidate}T00:00:00.000Z` : candidate;
  return Number.isNaN(Date.parse(timestamp)) ? null : new Date(timestamp).toISOString();
};

function finishEvent(row: Omit<NormalizedCommerceEvent, "event_fingerprint">): NormalizedCommerceEvent {
  return {...row, event_fingerprint: evidenceFingerprint(row)};
}

/**
 * Converts only detail actually present in the document. Daily summary rows
 * are deliberately not expanded into fictional orders.
 */
export function buildNormalizedCommerceEvents(input: BuildInput) {
  const events: NormalizedCommerceEvent[] = [];
  const limitations: string[] = [];
  const provider = input.sourceProvider.trim().toLowerCase() || "unknown";
  const channel = clean(input.result.platform)?.toLowerCase() ?? provider;
  const currency = clean(input.result.currency)?.toUpperCase() ?? null;
  const base = {
    account_id: input.accountId.trim(), merchant_id: input.merchantId.trim(), evidence_item_id: input.evidenceItemId,
    source_kind: input.sourceKind, source_provider: provider, channel, branch_external_id: clean(input.result.branch_external_id),
    discount_amount: null as null, tax_amount: null as null, normalization_version: NORMALIZED_COMMERCE_VERSION,
  };

  for (const row of input.result.transaction_rows ?? []) {
    const orderId = clean(row.order_id);
    if (!orderId || !finite(row.gross_sales) || !finite(row.refund_amount)) {
      limitations.push("At least one transaction row was skipped because its order ID or amount was invalid.");
      continue;
    }
    const occurredAt = eventTime(row.date);
    const rowLimitations = occurredAt ? [] : ["The source did not provide a usable order date."];
    events.push(finishEvent({
      ...base,
      external_event_id: `order:${orderId}:${row.date || "undated"}`,
      event_kind: "order_snapshot",
      order_external_id: orderId,
      settlement_reference: null,
      occurred_at: occurredAt,
      currency,
      gross_amount: money(row.gross_sales),
      fee_amount: null,
      net_amount: money(row.gross_sales - row.refund_amount),
      normalized_payload: {status: row.status, eligible: row.eligible, claims_ready: row.claims_ready ?? false, refund_amount: money(row.refund_amount)},
      evidence_strength: row.claims_ready ? "strong" : "partial",
      limitations: row.claims_ready ? rowLimitations : [...rowLimitations, "This order is not yet supported by complete claim-ready evidence."],
    }));
    if (row.refund_amount > 0) events.push(finishEvent({
      ...base,
      external_event_id: `refund:${orderId}:${row.date || "undated"}:${money(row.refund_amount)}`,
      event_kind: "refund",
      order_external_id: orderId,
      settlement_reference: null,
      occurred_at: occurredAt,
      currency,
      gross_amount: null,
      fee_amount: null,
      net_amount: -money(row.refund_amount),
      normalized_payload: {status: row.status, refund_amount: money(row.refund_amount)},
      evidence_strength: row.claims_ready ? "strong" : "partial",
      limitations: rowLimitations,
    }));
  }

  for (const [index, row] of (input.result.settlement_rows ?? []).entries()) {
    const reference = clean(row.settlement_reference);
    if (!reference || !finite(row.amount)) {
      limitations.push("At least one settlement row was skipped because its reference or amount was invalid.");
      continue;
    }
    const orderId = clean(row.order_id);
    const rowLimitations = orderId ? [] : ["This settlement amount is not allocated to a specific order."];
    events.push(finishEvent({
      ...base,
      external_event_id: `settlement:${reference}:${orderId ?? index}`,
      event_kind: "settlement_line",
      order_external_id: orderId,
      settlement_reference: reference,
      occurred_at: eventTime(input.result.period_end),
      currency: clean(row.currency)?.toUpperCase() ?? currency,
      gross_amount: null,
      fee_amount: null,
      net_amount: money(row.amount),
      normalized_payload: {allocated_to_order: Boolean(orderId)},
      evidence_strength: orderId ? "strong" : "partial",
      limitations: rowLimitations,
    }));
  }

  if (input.documentKind === "settlement_report" && finite(input.result.expected_payout)) {
    const reference = clean(input.result.settlement_reference);
    const periodKey = `${input.result.period_start ?? "unknown"}:${input.result.period_end ?? "unknown"}`;
    events.push(finishEvent({
      ...base,
      external_event_id: `payout:${reference ?? periodKey}`,
      event_kind: "payout_total",
      order_external_id: null,
      settlement_reference: reference,
      occurred_at: eventTime(input.result.period_end),
      currency,
      gross_amount: finite(input.result.sub_total_sum) ? money(input.result.sub_total_sum) : null,
      fee_amount: finite(input.result.commission_amount) ? money(input.result.commission_amount) : null,
      net_amount: money(input.result.expected_payout),
      normalized_payload: {
        period_start: input.result.period_start ?? null, period_end: input.result.period_end ?? null,
        additional_charges: input.result.additional_charges ?? null, additional_income: input.result.additional_income ?? null,
        stated_by_source: true,
      },
      evidence_strength: "strong",
      limitations: reference ? [] : ["The payout total has no settlement reference and can only be matched by platform and period."],
    }));
  }

  const singleOrder = (input.result.order_references ?? []).map(clean).filter((value): value is string => Boolean(value)).filter((value,index,all)=>all.indexOf(value)===index);
  const singleSettlement = (input.result.settlement_references ?? []).map(clean).filter((value): value is string => Boolean(value)).filter((value,index,all)=>all.indexOf(value)===index);
  const orderId = singleOrder.length === 1 ? singleOrder[0] : null;
  const settlementReference = singleSettlement.length === 1 ? singleSettlement[0] : clean(input.result.settlement_reference);
  const occurredAt = eventTime(input.result.period_end);

  if (finite(input.result.cancellation_amount)) events.push(finishEvent({
    ...base, external_event_id:`cancellation:${orderId ?? input.evidenceItemId}`, event_kind:"cancellation",
    order_external_id:orderId, settlement_reference:settlementReference, occurred_at:occurredAt, currency,
    gross_amount:money(input.result.cancellation_amount), fee_amount:null, net_amount:-money(input.result.cancellation_amount),
    normalized_payload:{allocated_to_order:Boolean(orderId)}, evidence_strength:orderId?"strong":"partial",
    limitations:orderId?[]:["The cancellation amount is not allocated to one specific order."],
  }));

  if (["credit_note","adjustment_notice"].includes(input.documentKind) && finite(input.result.adjustment_amount)) {
    const direction=input.result.adjustment_direction;
    const signed=direction==="credit"?money(input.result.adjustment_amount):direction==="debit"?-money(input.result.adjustment_amount):null;
    events.push(finishEvent({
      ...base, external_event_id:`adjustment:${input.result.confirmation_reference ?? input.evidenceItemId}`, event_kind:"commercial_adjustment",
      order_external_id:orderId, settlement_reference:settlementReference, occurred_at:occurredAt, currency,
      gross_amount:money(input.result.adjustment_amount), fee_amount:null, net_amount:signed,
      normalized_payload:{direction,reason:input.result.adjustment_reason??null,allocated_to_order:Boolean(orderId)},
      evidence_strength:signed!==null&&(orderId||settlementReference)?"strong":"partial",
      limitations:[...(signed===null?["The document does not establish whether the adjustment is a credit or debit."]:[]),...(!orderId&&!settlementReference?["The adjustment is not allocated to a specific order or settlement."]:[])],
    }));
  }

  if (input.documentKind === "promotion_confirmation" && [input.result.promotion_discount_total,input.result.platform_funding_amount,input.result.merchant_funding_amount].some(finite)) events.push(finishEvent({
    ...base, external_event_id:`promotion:${input.result.confirmation_reference ?? input.evidenceItemId}`, event_kind:"promotion_term",
    order_external_id:orderId, settlement_reference:settlementReference, occurred_at:occurredAt, currency,
    gross_amount:null, discount_amount:finite(input.result.promotion_discount_total)?money(input.result.promotion_discount_total):null,
    fee_amount:null, net_amount:null,
    normalized_payload:{platform_funding_amount:finite(input.result.platform_funding_amount)?money(input.result.platform_funding_amount):null,merchant_funding_amount:finite(input.result.merchant_funding_amount)?money(input.result.merchant_funding_amount):null,allocated_to_order:Boolean(orderId)},
    evidence_strength:orderId?"strong":"partial", limitations:orderId?[]:["Promotion funding is retained as batch evidence and is not allocated to an order."],
  }));

  if (input.documentKind === "merchant_confirmation" && finite(input.result.received_amount)) events.push(finishEvent({
    ...base, external_event_id:`receipt:${input.result.confirmation_reference ?? input.evidenceItemId}`, event_kind:"receipt_confirmation",
    order_external_id:null, settlement_reference:settlementReference, occurred_at:occurredAt, currency,
    gross_amount:null, fee_amount:null, net_amount:money(input.result.received_amount),
    normalized_payload:{confirmation_reference:clean(input.result.confirmation_reference),merchant_confirmed:true},
    evidence_strength:settlementReference&&clean(input.result.confirmation_reference)?"confirmed":"partial",
    limitations:settlementReference?[]:["The payment confirmation has no settlement reference and cannot be matched automatically."],
  }));

  if ((input.result.daily_rows?.length ?? 0) > 0 && (input.result.transaction_rows?.length ?? 0) === 0) {
    limitations.push("Daily totals were retained as summary evidence and were not converted into fictional order records.");
  }
  if (events.length === 0) limitations.push("This document does not contain enough item-level detail for normalized commerce events.");
  return {events, limitations: [...new Set(limitations)]};
}

export async function persistNormalizedCommerceEvents(input: BuildInput) {
  const built = buildNormalizedCommerceEvents(input);
  const db = supabaseAdmin as any;
  if (built.events.length) {
    const {error} = await db.from("ps_normalized_commerce_events").upsert(built.events, {
      onConflict: "account_id,source_provider,event_kind,external_event_id,event_fingerprint",
      ignoreDuplicates: true,
    });
    if (error) throw new Error(error.message ?? "Normalized commerce events could not be stored.");
  }
  const {data: prior, error: priorError} = await db.from("ps_evidence_processing_attempts")
    .select("attempt_number").eq("evidence_item_id", input.evidenceItemId)
    .eq("processor_version", NORMALIZED_COMMERCE_VERSION).order("attempt_number", {ascending: false}).limit(1).maybeSingle();
  if (priorError) throw new Error(priorError.message ?? "Normalization attempt history could not be read.");
  await appendEvidenceProcessingAttempt({
    evidenceItemId: input.evidenceItemId, accountId: input.accountId,
    processorVersion: NORMALIZED_COMMERCE_VERSION, attemptNumber: Number(prior?.attempt_number ?? 0) + 1,
    state: built.events.length ? "normalized" : "needs_review", detectedDocumentKind: input.documentKind,
    extractionSummary: {event_count: built.events.length, event_kinds: [...new Set(built.events.map(event => event.event_kind))]},
    limitations: built.limitations,
  });
  return {eventCount: built.events.length, limitations: built.limitations};
}
