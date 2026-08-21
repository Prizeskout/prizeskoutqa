import {supabaseAdmin} from "@/integrations/supabase/client.server";
import type {ExpectedPayoutResult} from "./expected-payout";
import type {MerchantDocumentKind} from "./merchant-evidence-intake";
import type {MerchantEvidenceSourceKind} from "./merchant-evidence";
import {persistNormalizedCommerceEvents} from "./normalized-commerce-events";
import {runNormalizedReconciliationShadow} from "./normalized-reconciliation-shadow";
import {approveEvidenceLayouts} from "./evidence-layout-drift";
import {sanitizeOcrEvidenceDraft, type OcrEvidenceDraft} from "./ocr-evidence-extractor";
import {matchEvidenceAgreement} from "./evidence-agreement-matcher";
import {saveContractDraft} from "./contract-terms";
import type {ContractExtraction} from "./contract-extractor";

export const EVIDENCE_REVIEW_VERSION = "evidence-review-v1";

export async function createEvidenceReviewDraft(input:{
  accountId:string; merchantId:string; evidenceItemId:string; processingAttemptId?:string|null;
  processorVersion:string; documentKind:MerchantDocumentKind; platform:string|null;
  extractionPayload:Record<string,unknown>; citations?:unknown[]; missingInformation?:string[];
  warnings?:string[]; confidence?:number|null;
}) {
  const db=supabaseAdmin as any;
  const {data:prior,error:priorError}=await db.from("ps_evidence_review_drafts").select("revision").eq("evidence_item_id",input.evidenceItemId).eq("processor_version",input.processorVersion).order("revision",{ascending:false}).limit(1).maybeSingle();
  if(priorError)throw new Error(priorError.message);
  const {data,error}=await db.from("ps_evidence_review_drafts").insert({account_id:input.accountId,merchant_id:input.merchantId,evidence_item_id:input.evidenceItemId,processing_attempt_id:input.processingAttemptId??null,processor_version:input.processorVersion,revision:Number(prior?.revision??0)+1,document_kind:input.documentKind,platform:input.platform,extraction_payload:input.extractionPayload,source_citations:input.citations??[],missing_information:input.missingInformation??[],warnings:input.warnings??[],confidence:input.confidence??null}).select("id,created_at").single();
  if(error||!data)throw new Error(error?.message??"Evidence review draft could not be stored.");
  return {reviewDraftId:String(data.id),createdAt:String(data.created_at)};
}

const cleanText=(value:unknown,max:number)=>typeof value==="string"?value.trim().slice(0,max):"";
const allowedKinds=new Set(["order_export","order_summary","settlement_report","payout_notice","credit_note","promotion_confirmation","contract","contract_amendment","adjustment_notice","merchant_confirmation","unknown"]);
const numberOr=(value:unknown,fallback:number|null=0)=>typeof value==="number"&&Number.isFinite(value)?value:fallback;
const stringList=(value:unknown,limit:number)=>Array.isArray(value)?value.filter((item):item is string=>typeof item==="string"&&Boolean(item.trim())).map(item=>item.trim()).slice(0,limit):[];

async function createAgreementDraftFromReview(input:{accountId:string;evidenceItemId:string;decisionId:string;filename:string|null;contentSha256:string|null;payload:Record<string,unknown>}){
  const extraction=(input.payload.extraction&&typeof input.payload.extraction==="object"?input.payload.extraction:input.payload) as Partial<ContractExtraction>;
  const platform=cleanText(extraction.platform,80).toLowerCase(),effectiveFrom=cleanText(extraction.effective_from,10);
  if(!platform)throw new Error("Confirm the agreement platform before creating its draft.");
  if(!/^\d{4}-\d{2}-\d{2}$/.test(effectiveFrom))throw new Error("Confirm the agreement effective date before creating its draft.");
  const commission=numberOr(extraction.commission_rate_pct,null);
  if(commission===null||commission<0||commission>=100)throw new Error("Confirm a valid commission percentage before creating the agreement draft. Enter 0 when the agreement explicitly has no marketplace commission.");
  return saveContractDraft(input.accountId,{
    platform,contract_name:cleanText(extraction.contract_name,160)||`${platform.toUpperCase()} agreement`,commission_rate_pct:commission,
    vat_on_fees_pct:numberOr(extraction.vat_on_fees_pct)!,payment_fee_pct:numberOr(extraction.payment_fee_pct)!,fixed_order_fee:numberOr(extraction.fixed_order_fee)!,delivery_contribution:numberOr(extraction.delivery_contribution)!,
    commission_base:["gross_before_discount","net_after_discount","eligible_sales"].includes(String(extraction.commission_base))?extraction.commission_base as "gross_before_discount"|"net_after_discount"|"eligible_sales":"unknown",
    promotion_funding_platform_pct:numberOr(extraction.promotion_funding_platform_pct,null),refund_liability:["merchant","platform","shared","conditional"].includes(String(extraction.refund_liability))?extraction.refund_liability as "merchant"|"platform"|"shared"|"conditional":"unknown",cancellation_liability:["merchant","platform","shared","conditional"].includes(String(extraction.cancellation_liability))?extraction.cancellation_liability as "merchant"|"platform"|"shared"|"conditional":"unknown",
    settlement_frequency:cleanText(extraction.settlement_frequency,100)||null,settlement_days:numberOr(extraction.settlement_days,null),settlement_day_basis:null,settlement_schedule_type:null,settlement_weekday:null,settlement_month_days:[],settlement_cutoff_hour:null,settlement_timezone:null,settlement_weekend_days:[],settlement_holidays:[],settlement_reserve_days:0,minimum_payout_threshold:null,
    dispute_deadline_days:numberOr(extraction.dispute_deadline_days,null),advertising_commitment:numberOr(extraction.advertising_commitment,null),minimum_spend:numberOr(extraction.minimum_spend,null),currency:cleanText(extraction.currency,8).toUpperCase()||null,coverage_legal_entity:cleanText(extraction.coverage_legal_entity,180)||null,coverage_brands:stringList(extraction.coverage_brands,100),coverage_branches:stringList(extraction.coverage_branches,250),effective_from:effectiveFrom,effective_to:/^\d{4}-\d{2}-\d{2}$/.test(cleanText(extraction.effective_to,10))?cleanText(extraction.effective_to,10):null,
    source_file_name:input.filename,source_sha256:input.contentSha256,notes:"Created from merchant-reviewed Evidence Inbox extraction. Agreement approval is still required.",extraction_json:extraction as Record<string,unknown>,extraction_model:cleanText(input.payload.model,120)||null,extraction_confidence:numberOr(extraction.confidence,null),extracted_at:new Date().toISOString(),source_evidence_item_id:input.evidenceItemId,source_review_decision_id:input.decisionId,
  });
}

function reviewedResult(payload:Record<string,unknown>,kind:string):ExpectedPayoutResult {
  if(payload.format==="structured"&&payload.result&&typeof payload.result==="object")return payload.result as ExpectedPayoutResult;
  const draft=sanitizeOcrEvidenceDraft(payload);
  return {ok:true,source:"upload",platform:draft.platform??undefined,currency:draft.currency??undefined,branch_external_id:draft.branch_external_id,brand:draft.brand??undefined,legal_entity:draft.legal_entity,period_start:draft.period_start??undefined,period_end:draft.period_end??undefined,expected_payout:draft.payout_total??undefined,sub_total_sum:draft.gross_total??undefined,commission_amount:draft.commission_total??undefined,additional_charges:draft.other_charges_total??undefined,settlement_reference:draft.settlement_references[0]??null,settlement_references:draft.settlement_references,order_references:draft.order_references,adjustment_amount:draft.adjustment_amount,adjustment_direction:draft.adjustment_direction,adjustment_reason:draft.adjustment_reason,promotion_discount_total:draft.promotion_discount_total,platform_funding_amount:draft.platform_funding_amount,merchant_funding_amount:draft.merchant_funding_amount,cancellation_amount:draft.cancellation_amount,received_amount:draft.received_amount,confirmation_reference:draft.confirmation_reference,settlement_rows:[],transaction_rows:[],daily_rows:[],accounting_blockers:kind==="settlement_report"?draft.missing_information:[]};
}

export async function decideEvidenceReview(input:{accountId:string;merchantId:string;draftId:string;decision:"approved"|"rejected";reviewedPayload:Record<string,unknown>;correctionSummary?:string;reviewerUserId?:string|null;reviewerEmail?:string|null}) {
  const db=supabaseAdmin as any;
  const {data:draft,error}=await db.from("ps_evidence_review_drafts").select("*,ps_merchant_evidence_items(source_kind,source_provider,original_filename,content_sha256)").eq("id",input.draftId).eq("account_id",input.accountId).eq("merchant_id",input.merchantId).maybeSingle();
  if(error||!draft)throw new Error(error?.message??"Review draft was not found.");
  if(draft.status!=="pending")throw new Error("This document has already received a final decision.");
  if(input.decision==="approved"&&draft.extraction_payload?.format==="unsupported")throw new Error("This document layout has no verified parser and cannot be approved for financial calculations.");
  const kind=allowedKinds.has(cleanText(input.reviewedPayload.document_kind??draft.document_kind,60))?cleanText(input.reviewedPayload.document_kind??draft.document_kind,60):"unknown";
  const decisionRow={account_id:input.accountId,merchant_id:input.merchantId,evidence_item_id:draft.evidence_item_id,review_draft_id:draft.id,decision:input.decision,reviewed_payload:input.reviewedPayload,correction_summary:cleanText(input.correctionSummary,1000)||null,reviewer_user_id:input.reviewerUserId??null,reviewer_email:cleanText(input.reviewerEmail,320)||null};
  const {data:decision,error:decisionError}=await db.from("ps_evidence_review_decisions").insert(decisionRow).select("id,decided_at").single();
  if(decisionError||!decision)throw new Error(decisionError?.message??"Review decision could not be recorded.");
  const {error:statusError}=await db.from("ps_evidence_review_drafts").update({status:input.decision}).eq("id",draft.id).eq("account_id",input.accountId).eq("merchant_id",input.merchantId).eq("status","pending");
  if(statusError)throw new Error(statusError.message);
  if(input.decision==="rejected")return {decisionId:String(decision.id),decidedAt:String(decision.decided_at),eventCount:0};
  await approveEvidenceLayouts(input.accountId,String(draft.evidence_item_id),cleanText(input.reviewerEmail,320)||cleanText(input.reviewerUserId,160)||"verified merchant");
  const item=Array.isArray(draft.ps_merchant_evidence_items)?draft.ps_merchant_evidence_items[0]:draft.ps_merchant_evidence_items;
  if(kind==="contract"||kind==="contract_amendment"){
    const contractDraft=await createAgreementDraftFromReview({accountId:input.accountId,evidenceItemId:String(draft.evidence_item_id),decisionId:String(decision.id),filename:item?.original_filename??null,contentSha256:item?.content_sha256??null,payload:input.reviewedPayload});
    return {decisionId:String(decision.id),decidedAt:String(decision.decided_at),eventCount:0,contractDraftId:contractDraft.id,contractDraftStatus:contractDraft.status};
  }
  const result=reviewedResult(input.reviewedPayload,kind),raw=(input.reviewedPayload.format==="structured"&&input.reviewedPayload.result&&typeof input.reviewedPayload.result==="object"?input.reviewedPayload.result:input.reviewedPayload) as Record<string,unknown>;
  const platform=cleanText(result.platform??input.reviewedPayload.platform??draft.platform??item?.source_provider,120)||"unknown";
  const agreement=await matchEvidenceAgreement({accountId:input.accountId,merchantId:input.merchantId,evidenceItemId:String(draft.evidence_item_id),reviewDecisionId:String(decision.id),context:{platform,periodStart:cleanText(result.period_start,10)||null,periodEnd:cleanText(result.period_end,10)||null,currency:cleanText(result.currency,12)||null,branch:cleanText(raw.branch_external_id??raw.branch,160)||null,brand:cleanText(raw.brand,160)||null,legalEntity:cleanText(raw.legal_entity,200)||null}});
  const normalized=await persistNormalizedCommerceEvents({accountId:input.accountId,merchantId:input.merchantId,evidenceItemId:String(draft.evidence_item_id),sourceKind:String(item?.source_kind??"file_upload") as MerchantEvidenceSourceKind,sourceProvider:platform,documentKind:kind as MerchantDocumentKind,result});
  const shadow=await runNormalizedReconciliationShadow({accountId:input.accountId,evidenceItemId:String(draft.evidence_item_id),contractTermId:agreement.state==="automatic"?String(agreement.contract_term_id):null,requireExplicitContract:true});
  return {decisionId:String(decision.id),decidedAt:String(decision.decided_at),eventCount:normalized.eventCount,shadowRunId:shadow.runId,agreementMatch:{state:agreement.state,contractTermId:agreement.contract_term_id,score:agreement.match_score,blockers:agreement.blockers}};
}
