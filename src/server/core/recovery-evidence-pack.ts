import {supabaseAdmin} from "@/integrations/supabase/client.server";
import {evidenceFingerprint} from "./merchant-evidence";

export const RECOVERY_EVIDENCE_PACK_VERSION="recovery-evidence-pack-v1";

export function fingerprintRecoveryEvidenceManifest(manifest:Record<string,unknown>){return evidenceFingerprint(manifest);}

export async function prepareRecoveryEvidencePack(accountId:string,recoveryCaseId:string){
  const db=supabaseAdmin as any,{data:recovery,error}=await db.from("ps_recovery_cases").select("*").eq("account_id",accountId).eq("id",recoveryCaseId).maybeSingle();
  if(error||!recovery)throw new Error(error?.message??"Recovery case was not found.");
  if(!recovery.reconciliation_finding_id||!recovery.reconciliation_run_id)throw new Error("This case is not linked to a retained reconciliation finding.");
  const [{data:finding,error:findingError},{data:run,error:runError},{data:allocations,error:allocationError},{data:runEvidence,error:evidenceError}]=await Promise.all([
    db.from("ps_reconciliation_findings").select("*").eq("account_id",accountId).eq("id",recovery.reconciliation_finding_id).maybeSingle(),
    db.from("ps_settlement_reconciliation_runs").select("id,platform,currency,period_start,period_end,engine_version,input_fingerprint,status,summary,created_at").eq("account_id",accountId).eq("id",recovery.reconciliation_run_id).maybeSingle(),
    db.from("ps_settlement_reconciliation_allocations").select("id,order_id,settlement_reference,expected_amount,settled_amount,variance,state,match_basis,evidence").eq("account_id",accountId).eq("run_id",recovery.reconciliation_run_id).order("order_id",{ascending:true}),
    db.from("ps_reconciliation_run_evidence").select("evidence_item_id,evidence_role").eq("account_id",accountId).eq("run_id",recovery.reconciliation_run_id).order("evidence_item_id",{ascending:true}),
  ]);
  if(findingError||!finding)throw new Error(findingError?.message??"Recovery finding was not found.");if(runError||!run)throw new Error(runError?.message??"Reconciliation run was not found.");if(allocationError)throw new Error(allocationError.message);if(evidenceError)throw new Error(evidenceError.message);
  const evidenceIds=(runEvidence??[]).map((row:any)=>row.evidence_item_id),{data:documents,error:documentError}=evidenceIds.length?await db.from("ps_merchant_evidence_items").select("id,source_kind,source_provider,source_external_id,document_kind,observed_at,received_at,media_type,original_filename,content_sha256").eq("account_id",accountId).in("id",evidenceIds).order("id",{ascending:true}):{data:[],error:null};
  if(documentError)throw new Error(documentError.message);
  const {data:contract,error:contractError}=recovery.contract_term_id?await db.from("ps_marketplace_contract_terms").select("id,platform,contract_name,commission_rate_pct,vat_on_fees_pct,payment_fee_pct,fixed_order_fee,delivery_contribution,commission_base,promotion_funding_platform_pct,refund_liability,cancellation_liability,settlement_frequency,settlement_days,dispute_deadline_days,currency,coverage_legal_entity,coverage_brands,coverage_branches,effective_from,effective_to,status,source_file_name,source_sha256,extraction_json,approved_at,reviewed_by").eq("account_id",accountId).eq("id",recovery.contract_term_id).maybeSingle():{data:null,error:null};
  if(contractError)throw new Error(contractError.message);
  const roleMap=new Map((runEvidence??[]).map((row:any)=>[row.evidence_item_id,row.evidence_role]));
  const manifest={pack_version:RECOVERY_EVIDENCE_PACK_VERSION,recovery_case:{id:recovery.id,platform:recovery.platform,exception_key:recovery.exception_key,title:recovery.title,status:recovery.status,exception_amount:recovery.exception_amount,claims_ready_amount:recovery.claims_ready_amount,confidence:recovery.confidence,explanation_en:recovery.explanation_en,explanation_ar:recovery.explanation_ar},finding,reconciliation_run:run,allocations:allocations??[],agreement:contract??null,documents:(documents??[]).map((document:any)=>({...document,evidence_role:roleMap.get(document.id)??"mixed"}))};
  const fingerprint=fingerprintRecoveryEvidenceManifest(manifest),{data:existing}=await db.from("ps_recovery_evidence_packs").select("id,manifest_fingerprint,created_at").eq("account_id",accountId).eq("recovery_case_id",recovery.id).eq("manifest_fingerprint",fingerprint).maybeSingle();
  if(existing)return {...existing,approved:false,duplicate:true};
  const {data:pack,error:packError}=await db.from("ps_recovery_evidence_packs").insert({account_id:accountId,recovery_case_id:recovery.id,pack_version:RECOVERY_EVIDENCE_PACK_VERSION,manifest,manifest_fingerprint:fingerprint}).select("id,manifest_fingerprint,created_at").single();
  if(packError||!pack)throw new Error(packError?.message??"Evidence pack could not be stored.");return {...pack,approved:false,duplicate:false};
}

export async function approveRecoveryEvidencePack(accountId:string,packId:string,approvedBy:string){
  const db=supabaseAdmin as any,{data:pack,error}=await db.from("ps_recovery_evidence_packs").select("id,recovery_case_id,manifest_fingerprint").eq("account_id",accountId).eq("id",packId).maybeSingle();if(error||!pack)throw new Error(error?.message??"Evidence pack was not found.");
  const reviewer=approvedBy.trim().slice(0,160);if(!reviewer)throw new Error("Approver name is required.");
  const {data:approval,error:approvalError}=await db.from("ps_recovery_evidence_pack_approvals").insert({account_id:accountId,pack_id:pack.id,approved_by:reviewer,approval_statement:"I reviewed this evidence manifest and approve it for use in the recovery case. No external submission is authorized by this approval."}).select("id,approved_by,approved_at").single();
  if(approvalError){if(approvalError.code==="23505")throw new Error("This evidence pack is already approved.");throw new Error(approvalError.message);}return {...approval,pack_id:pack.id,recovery_case_id:pack.recovery_case_id,manifest_fingerprint:pack.manifest_fingerprint};
}

export async function getRecoveryEvidencePack(accountId:string,packId:string){
  const db=supabaseAdmin as any,{data,error}=await db.from("ps_recovery_evidence_packs").select("id,recovery_case_id,pack_version,manifest,manifest_fingerprint,created_at,ps_recovery_evidence_pack_approvals(id,approved_by,approval_statement,approved_at)").eq("account_id",accountId).eq("id",packId).maybeSingle();if(error||!data)throw new Error(error?.message??"Evidence pack was not found.");return data;
}

export async function requireApprovedRecoveryEvidencePack(accountId:string,recoveryCaseId:string){
  const db=supabaseAdmin as any,{data,error}=await db.from("ps_recovery_evidence_packs").select("id,manifest_fingerprint,created_at,ps_recovery_evidence_pack_approvals(id,approved_by,approved_at)").eq("account_id",accountId).eq("recovery_case_id",recoveryCaseId).order("created_at",{ascending:false}).limit(20);if(error)throw new Error(error.message);
  const approved=(data??[]).find((pack:any)=>Array.isArray(pack.ps_recovery_evidence_pack_approvals)?pack.ps_recovery_evidence_pack_approvals.length:Boolean(pack.ps_recovery_evidence_pack_approvals));if(!approved)throw new Error("Prepare and approve the recovery evidence pack before recording submission.");return approved;
}
