import {supabaseAdmin} from "@/integrations/supabase/client.server";
import {evidenceFingerprint} from "./merchant-evidence";
import {getApprovedContractTerm,getApprovedContractTermById,type ContractTerm} from "./contract-terms";
import {reconcileSettlementEvidence, type BankReceipt, type ExpectedOrder, type SettlementLine} from "./settlement-reconciliation";
import type {ExpectedPayoutResult} from "./expected-payout";
import {classifyReconciliationEvidence,type EvidenceStrength} from "./merchant-evidence";

export const NORMALIZED_RECONCILIATION_VERSION = "normalized-cross-document-reconciliation-v2";

export type CommerceEventRow = {
  evidence_item_id?:string;
  event_kind: string;
  channel: string | null;
  order_external_id: string | null;
  settlement_reference: string | null;
  occurred_at: string | null;
  currency: string | null;
  gross_amount: number | null;
  discount_amount?:number|null;
  net_amount: number | null;
  normalized_payload: Record<string, unknown> | null;
  evidence_strength: string;
  event_fingerprint: string;
};

export function reconciliationCoverage(events:CommerceEventRow[]){
  const dates=events.flatMap(event=>[event.occurred_at?.slice(0,10),typeof event.normalized_payload?.period_start==="string"?event.normalized_payload.period_start:null,typeof event.normalized_payload?.period_end==="string"?event.normalized_payload.period_end:null]).filter((value):value is string=>Boolean(value)&&/^\d{4}-\d{2}-\d{2}$/.test(value!)).sort();
  return {start:dates[0]??null,end:dates.at(-1)??null};
}

const money = (value: number) => Math.round(value * 100) / 100;
const numeric = (value: unknown) => typeof value === "number" && Number.isFinite(value) ? value : 0;

/** Uses approved commercial terms to calculate what each normalized order
 * should settle for. It never treats a platform payout total as order truth. */
export function buildNormalizedReconciliationInput(events: CommerceEventRow[], contract: ContractTerm | null) {
  const limitations: string[] = [];
  const orderEvents = events.filter(event => event.event_kind === "order_snapshot" && event.order_external_id);
  const lineEvents = events.filter(event => event.event_kind === "settlement_line");
  const payoutEvents = events.filter(event => event.event_kind === "payout_total");
  const receiptEvents = events.filter(event => event.event_kind === "receipt_confirmation");
  const orders: ExpectedOrder[] = [];

  if (orderEvents.length && (!contract || contract.commission_base === "unknown")) {
    limitations.push("An approved, applicable channel agreement is required to calculate expected payouts from these orders.");
  } else if (contract) {
    for (const event of orderEvents) {
      const gross = numeric(event.gross_amount),discount=numeric(event.discount_amount);
      const refund = numeric(event.normalized_payload?.refund_amount);
      const cancelled=numeric(event.normalized_payload?.cancellation_amount)>0||event.normalized_payload?.eligible===false;
      const eligible = cancelled?0:Math.max(0,gross-discount-refund);
      const commissionBase = contract.commission_base === "gross_before_discount" ? gross : eligible;
      const commission = commissionBase * contract.commission_rate_pct / 100;
      const vat = commission * contract.vat_on_fees_pct / 100;
      const paymentFee = eligible * contract.payment_fee_pct / 100;
      const expected = Math.max(0, eligible - commission - vat - paymentFee - contract.fixed_order_fee - contract.delivery_contribution);
      orders.push({
        orderId: event.order_external_id!, amount: money(expected),
        currency: (event.currency || contract.currency || "UNKNOWN").toUpperCase(),
        final: event.normalized_payload?.eligible === true,
        evidenceReady: event.evidence_strength === "confirmed" || event.evidence_strength === "strong",
      });
    }
  }

  const settlements: SettlementLine[] = lineEvents
    .filter(event => event.settlement_reference && typeof event.net_amount === "number")
    .map(event => ({
      settlementReference: event.settlement_reference!, orderId: event.order_external_id,
      amount: money(event.net_amount!), currency: (event.currency || contract?.currency || "UNKNOWN").toUpperCase(),
    }));
  if (!settlements.length) for (const event of payoutEvents.filter(event => typeof event.net_amount === "number")) {
    settlements.push({
      settlementReference: event.settlement_reference || `aggregate:${event.event_fingerprint}`,
      orderId: null, amount: money(event.net_amount!),
      currency: (event.currency || contract?.currency || "UNKNOWN").toUpperCase(),
    });
  }
  const receipts:BankReceipt[]=receiptEvents.filter(event=>event.settlement_reference&&typeof event.net_amount==="number").map(event=>({
    bankReference:typeof event.normalized_payload?.confirmation_reference==="string"&&event.normalized_payload.confirmation_reference.trim()?event.normalized_payload.confirmation_reference:event.event_fingerprint,
    settlementReference:event.settlement_reference,amount:money(event.net_amount!),currency:(event.currency||contract?.currency||"UNKNOWN").toUpperCase(),
    evidenceReady:event.evidence_strength==="confirmed"||event.evidence_strength==="strong",
  }));
  if(receiptEvents.length>receipts.length)limitations.push("At least one payment confirmation has no explicit settlement reference and was not matched automatically.");
  if(events.some(event=>event.event_kind==="commercial_adjustment"))limitations.push("Commercial adjustments are retained separately and do not change an order expectation without explicit allocation rules.");
  if(events.some(event=>event.event_kind==="promotion_term"))limitations.push("Promotion funding is retained separately and does not change an order expectation without explicit order allocation.");
  if (payoutEvents.length && !lineEvents.length) limitations.push("The payout is a batch total without order-level allocation, so no order-level discrepancy is claimed.");
  if (!orderEvents.length) limitations.push("No item-level order evidence is available for this evidence set.");
  if (!settlements.length) limitations.push("No platform settlement amount is available for this evidence set.");
  return {orders, settlements, receipts, limitations: [...new Set(limitations)]};
}

export function compareShadowParity(normalizedExpected: number | null, compatibilityExpected: number | null, tolerance = 0.01) {
  if (normalizedExpected === null || compatibilityExpected === null) return {state: "not_comparable" as const, difference: null};
  const difference = money(normalizedExpected - compatibilityExpected);
  return {state: Math.abs(difference) <= tolerance ? "matching" as const : "mismatch" as const, difference};
}

export function classifyAllocationFinding(input:{expectedAmount:number;settledAmount:number|null;orderId:string|null;matchBasis:string;contractTermId:string|null;evidenceStrength:EvidenceStrength;blockers:string[]}){
  const variance=input.settledAmount===null?null:money(input.settledAmount-input.expectedAmount);
  const conclusion=classifyReconciliationEvidence({hasOrderTruth:Boolean(input.orderId),hasContractTruth:Boolean(input.contractTermId),hasPayoutTruth:input.settledAmount!==null,hasOrderLevelPayoutAllocation:input.matchBasis==="exact_order_reference",variance,evidenceStrength:input.evidenceStrength});
  const recoverability=conclusion==="confirmed_discrepancy"&&variance!==null&&variance<0&&!input.blockers.length?"claims_ready":conclusion==="confirmed_discrepancy"||conclusion==="probable_discrepancy"||conclusion==="unallocated_batch_difference"?"review_required":conclusion==="insufficient_evidence"?"evidence_required":"none";
  const explanation=conclusion==="confirmed_discrepancy"?"Order, agreement and allocated payout evidence support a specific discrepancy.":conclusion==="probable_discrepancy"?"The records suggest a discrepancy, but supporting evidence is incomplete.":conclusion==="unallocated_batch_difference"?"The payout differs at batch level, but the evidence cannot assign it to a specific order.":conclusion==="insufficient_evidence"?"The available records cannot support a reliable payout conclusion.":"The reported payout agrees with the supported expectation.";
  return {conclusion,recoverability,variance,explanation};
}

export function assessReconciliationReadiness(input:{orderCount:number;settlementCount:number;contractTermId:string|null;allocatedSettlementCount:number;strongOrderCount:number;currencyCount:number}){
  const checks=[{key:"orders",ready:input.orderCount>0,missing:"Add an approved order-level export for this period."},{key:"agreement",ready:Boolean(input.contractTermId),missing:"Approve or confirm the applicable platform agreement."},{key:"payout",ready:input.settlementCount>0,missing:"Add an approved settlement or payout report for this period."},{key:"allocation",ready:input.allocatedSettlementCount>0,missing:"Order-level settlement allocation is missing; only a batch conclusion is possible."},{key:"order_evidence",ready:input.strongOrderCount===input.orderCount&&input.orderCount>0,missing:"Some orders are not final or do not yet have strong supporting evidence."},{key:"currency",ready:input.currencyCount<=1,missing:"The evidence contains multiple currencies and must be separated."}];
  const readyCount=checks.filter(check=>check.ready).length,score=Math.round(readyCount/checks.length*100),missing=checks.filter(check=>!check.ready).map(check=>check.missing);
  return {state:score===100?"ready" as const:input.orderCount&&input.settlementCount&&input.contractTermId?"partial" as const:"blocked" as const,score,checks,missing};
}

export function retainCurrentEventRevisions<T extends {id?:string}>(events:T[],currentEventIds:Iterable<string>){const current=new Set(currentEventIds);return events.filter(event=>Boolean(event.id)&&current.has(event.id!));}

async function currentEventRevisions(db:any,events:Array<{id?:string}>){const ids=events.map(event=>event.id).filter((id):id is string=>Boolean(id));if(!ids.length)return [];const {data,error}=await db.from("ps_normalized_event_heads").select("current_event_id").in("current_event_id",ids);if(error)throw new Error(error.message);return retainCurrentEventRevisions(events,(data??[]).map((row:any)=>row.current_event_id));}

/** Reconciles only normalized values that passed merchant review. Related
 * evidence is combined by platform and an explicit overlapping date window. */
export async function runNormalizedReconciliationShadow(input: {accountId: string; evidenceItemId: string; compatibilityResult?: ExpectedPayoutResult; contractTermId?:string|null; requireExplicitContract?:boolean}) {
  const db = supabaseAdmin as any;
  const {data, error} = await db.from("ps_normalized_commerce_events")
    .select("id,evidence_item_id,event_kind,channel,order_external_id,settlement_reference,occurred_at,currency,gross_amount,discount_amount,net_amount,normalized_payload,evidence_strength,event_fingerprint")
    .eq("account_id", input.accountId).eq("evidence_item_id", input.evidenceItemId);
  if (error) throw new Error(error.message ?? "Normalized evidence could not be read.");
  const seedEvents = await currentEventRevisions(db,(data ?? []) as Array<CommerceEventRow&{id:string}>) as CommerceEventRow[];
  const seedChannels = [...new Set(seedEvents.map(event => event.channel).filter((value): value is string => Boolean(value)))];
  const seedCoverage=reconciliationCoverage(seedEvents);
  let events=seedEvents;
  if(seedChannels.length===1&&seedCoverage.start&&seedCoverage.end&&input.contractTermId){
    const {data:relatedRaw,error:relatedError}=await db.from("ps_normalized_commerce_events").select("id,evidence_item_id,event_kind,channel,order_external_id,settlement_reference,occurred_at,currency,gross_amount,discount_amount,net_amount,normalized_payload,evidence_strength,event_fingerprint").eq("account_id",input.accountId).eq("channel",seedChannels[0]).gte("occurred_at",`${seedCoverage.start}T00:00:00.000Z`).lte("occurred_at",`${seedCoverage.end}T23:59:59.999Z`);
    if(relatedError)throw new Error(relatedError.message);
    const related=await currentEventRevisions(db,relatedRaw??[]);
    const relatedIds=[...new Set((related??[]).map((event:any)=>event.evidence_item_id).filter(Boolean))],{data:matches,error:matchError}=relatedIds.length?await db.from("ps_evidence_agreement_matches").select("evidence_item_id,contract_term_id,state,revision").eq("account_id",input.accountId).in("evidence_item_id",relatedIds).order("revision",{ascending:false}):{data:[],error:null};
    if(matchError)throw new Error(matchError.message);
    const latestMatches=new Map<string,any>();for(const match of matches??[]){if(!latestMatches.has(match.evidence_item_id))latestMatches.set(match.evidence_item_id,match);}const compatibleIds=new Set([...latestMatches.values()].filter((match:any)=>["automatic","confirmed"].includes(match.state)&&match.contract_term_id===input.contractTermId).map((match:any)=>match.evidence_item_id));compatibleIds.add(input.evidenceItemId);
    events=(related??[]).filter((event:any)=>compatibleIds.has(event.evidence_item_id)) as CommerceEventRow[];
  }
  const channels = [...new Set(events.map(event => event.channel).filter((value): value is string => Boolean(value)))];
  const platform = channels.length === 1 ? channels[0] : channels.length ? "mixed" : "unknown";
  const coverage=reconciliationCoverage(events),dates=[coverage.start,coverage.end].filter((value):value is string=>Boolean(value));
  const contract = input.contractTermId
    ? await getApprovedContractTermById(input.accountId,input.contractTermId)
    : input.requireExplicitContract ? null
    : platform !== "mixed" && platform !== "unknown" ? await getApprovedContractTerm(input.accountId, platform, dates[0]) : null;
  const prepared = buildNormalizedReconciliationInput(events, contract);
  const result = reconcileSettlementEvidence({orders: prepared.orders, settlements: prepared.settlements, receipts: prepared.receipts});
  const currencies = [...new Set([...prepared.orders.map(row => row.currency), ...prepared.settlements.map(row => row.currency),...prepared.receipts.map(row=>row.currency)])];
  const currency = currencies.length === 1 ? currencies[0] : currencies.length ? "MIXED" : "UNKNOWN";
  const status = !prepared.orders.length || !prepared.settlements.length
    ? "insufficient_evidence" : result.exceptions ? "completed_with_exceptions" : "completed";
  const normalizedExpected = prepared.orders.length ? money(prepared.orders.reduce((sum, row) => sum + row.amount, 0)) : null;
  const compatibilityExpected = input.compatibilityResult
    ? input.compatibilityResult.claims_ready_payout ?? input.compatibilityResult.estimated_payout ?? input.compatibilityResult.expected_payout ?? null
    : null;
  const parity = compareShadowParity(normalizedExpected, compatibilityExpected);
  const readiness=assessReconciliationReadiness({orderCount:prepared.orders.length,settlementCount:prepared.settlements.length,contractTermId:contract?.id??null,allocatedSettlementCount:prepared.settlements.filter(row=>Boolean(row.orderId)).length,strongOrderCount:prepared.orders.filter(row=>row.final&&row.evidenceReady).length,currencyCount:currencies.length});
  const evidenceItemIds=[...new Set(events.map(event=>event.evidence_item_id).filter((value):value is string=>Boolean(value)))].sort();
  const inputFingerprint = evidenceFingerprint({engine: NORMALIZED_RECONCILIATION_VERSION, evidenceItemIds, events: events.map(event => event.event_fingerprint).sort(), contract: contract?.id ?? null});
  const summary = {
    reviewed_evidence_only: true, evidence_item_ids: evidenceItemIds, counts: result.counts,
    claims_ready_amount: result.claimsReadyAmount, exceptions: result.exceptions,
    order_count: prepared.orders.length, settlement_count: prepared.settlements.length, receipt_confirmation_count:prepared.receipts.length,
    contract_term_id: contract?.id ?? null, normalized_expected_amount: normalizedExpected,
    compatibility_expected_amount: compatibilityExpected, parity, limitations: prepared.limitations,
    readiness,
  };
  const {data: existing, error: existingError} = await db.from("ps_settlement_reconciliation_runs")
    .select("id,status,summary").eq("account_id", input.accountId).eq("platform", platform)
    .eq("currency", currency).eq("input_fingerprint", inputFingerprint).maybeSingle();
  if (existingError) throw new Error(existingError.message);
  if (existing) return {runId: existing.id as string, status: existing.status as string, summary: existing.summary, duplicate: true};
  const {data: run, error: runError} = await db.from("ps_settlement_reconciliation_runs").insert({
    account_id: input.accountId, platform, currency, period_start: dates[0] ?? null, period_end: dates.at(-1) ?? null,
    engine_version: NORMALIZED_RECONCILIATION_VERSION, input_fingerprint: inputFingerprint, status, summary,
  }).select("id").single();
  if (runError || !run) throw new Error(runError?.message ?? "Shadow reconciliation could not be stored.");
  if(evidenceItemIds.length){
    const roles=new Map<string,Set<string>>();for(const event of events){if(!event.evidence_item_id)continue;const set=roles.get(event.evidence_item_id)??new Set<string>();set.add(event.event_kind==="order_snapshot"?"order":event.event_kind==="settlement_line"||event.event_kind==="payout_total"?"settlement":event.event_kind==="receipt_confirmation"?"confirmation":"adjustment");roles.set(event.evidence_item_id,set);}
    const {error:manifestError}=await db.from("ps_reconciliation_run_evidence").insert(evidenceItemIds.map(id=>({run_id:run.id,evidence_item_id:id,account_id:input.accountId,evidence_role:(roles.get(id)?.size??0)>1?"mixed":[...(roles.get(id)??["mixed"])][0]})));
    if(manifestError)throw new Error(manifestError.message);
  }
  if (result.allocations.length) {
    const {error: allocationError} = await db.from("ps_settlement_reconciliation_allocations").insert(result.allocations.map(row => ({
      run_id: run.id, account_id: input.accountId, platform, currency,
      order_id: row.orderId, settlement_reference: row.settlementReference, bank_reference: row.bankReference,
      expected_amount: row.expectedAmount, settled_amount: row.settledAmount,
      received_amount: row.receivedAmount, variance: row.variance, state: row.state, match_basis: row.matchBasis,
      evidence: {reviewed_evidence_only: true, evidence_item_ids:evidenceItemIds, blockers: row.blockers},
    })));
    if (allocationError) throw new Error(allocationError.message);
  }
  const {data:storedAllocations,error:storedError}=await db.from("ps_settlement_reconciliation_allocations").select("id,order_id,settlement_reference,expected_amount,settled_amount,match_basis,evidence").eq("run_id",run.id);
  if(storedError)throw new Error(storedError.message);
  if(storedAllocations?.length){
    const eventStrength=new Map(events.filter(event=>event.order_external_id).map(event=>[event.order_external_id,event.evidence_strength as EvidenceStrength]));
    const findings=storedAllocations.map((allocation:any)=>{
      const blockers=Array.isArray(allocation.evidence?.blockers)?allocation.evidence.blockers:[],classified=classifyAllocationFinding({expectedAmount:Number(allocation.expected_amount),settledAmount:allocation.settled_amount===null?null:Number(allocation.settled_amount),orderId:allocation.order_id,matchBasis:allocation.match_basis,contractTermId:contract?.id??null,evidenceStrength:eventStrength.get(allocation.order_id)??"partial",blockers});
      return {run_id:run.id,allocation_id:allocation.id,account_id:input.accountId,evidence_item_id:input.evidenceItemId,contract_term_id:contract?.id??null,conclusion:classified.conclusion,recoverability:classified.recoverability,order_external_id:allocation.order_id,settlement_reference:allocation.settlement_reference,currency,expected_amount:Number(allocation.expected_amount),reported_amount:allocation.settled_amount===null?null:Number(allocation.settled_amount),variance:classified.variance,evidence_strength:eventStrength.get(allocation.order_id)??"partial",explanation:classified.explanation,blockers};
    });
    const {error:findingError}=await db.from("ps_reconciliation_findings").insert(findings);
    if(findingError)throw new Error(findingError.message);
  }
  return {runId: run.id as string, status, summary, duplicate: false};
}
