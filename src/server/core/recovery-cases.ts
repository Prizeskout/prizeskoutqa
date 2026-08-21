import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { Json } from "@/integrations/supabase/types";
import {requireApprovedRecoveryEvidencePack} from "./recovery-evidence-pack";
import {assertRecoveryTransition,type RecoveryStatus} from "./recovery-lifecycle";

export type RecoveryCase={
  id:string;platform:string;exception_key:string;title:string;
  status:"evidence_required"|"draft"|"ready"|"submitted_manually"|"platform_review"|"accepted"|"rejected"|"recovered"|"closed";
  severity:string;exception_amount:number|null;claims_ready_amount:number;confidence:string;
  affected_orders:number|null;contract_term_id:string|null;contract_clause:string|null;
  regulatory_reference:string|null;evidence_sources:string[];calculation:Record<string,unknown>;
  explanation_en:string;explanation_ar:string;submission_deadline:string|null;owner:string|null;
  platform_response:string|null;recovered_amount:number;created_at:string;updated_at:string;
  submission_reference?:string|null;submitted_at?:string|null;submitted_by?:string|null;submission_evidence_hash?:string|null;
  reconciliation_finding_id?:string|null;reconciliation_run_id?:string|null;
  evidence_pack?:{id:string;manifest_fingerprint:string;created_at:string;approved:boolean;approved_by:string|null;approved_at:string|null}|null;
  timeline?:Array<{id:string;event_type:string;from_status:string|null;to_status:string|null;previous_recovered_amount:number|null;recovered_amount:number|null;platform_response:string|null;recorded_by:string|null;created_at:string}>;
};
const table=()=>(supabaseAdmin as any).from("ps_recovery_cases");
const unavailable=(error:any)=>error?.code==="42P01"||/ps_recovery_cases/i.test(error?.message??"");

async function fallbackChannel(accountId:string){
  const {data}=await supabaseAdmin.from("ps_merchant_channels").select("id,metadata").eq("account_id",accountId).order("created_at",{ascending:true}).limit(1).maybeSingle();
  return data;
}
export async function listRecoveryCases(accountId:string):Promise<RecoveryCase[]>{
  const {data,error}=await table().select("*").eq("account_id",accountId).order("created_at",{ascending:false});
  if(unavailable(error)){
    const channel=await fallbackChannel(accountId);
    const cases=(channel?.metadata as any)?.recovery_cases;
    return Array.isArray(cases)?cases:[];
  }
  if(error)throw new Error(error.message);
  const cases=(data??[]) as RecoveryCase[],ids=cases.map(item=>item.id),[{data:packs},{data:events}]=ids.length?await Promise.all([(supabaseAdmin as any).from("ps_recovery_evidence_packs").select("id,recovery_case_id,manifest_fingerprint,created_at,ps_recovery_evidence_pack_approvals(approved_by,approved_at)").eq("account_id",accountId).in("recovery_case_id",ids).order("created_at",{ascending:false}),(supabaseAdmin as any).from("ps_recovery_case_events").select("id,recovery_case_id,event_type,from_status,to_status,previous_recovered_amount,recovered_amount,platform_response,recorded_by,created_at").eq("account_id",accountId).in("recovery_case_id",ids).order("created_at",{ascending:false})]):[{data:[]},{data:[]}];
  const latest=new Map<string,any>();for(const pack of packs??[]){if(!latest.has(pack.recovery_case_id)){const approval=Array.isArray(pack.ps_recovery_evidence_pack_approvals)?pack.ps_recovery_evidence_pack_approvals[0]:pack.ps_recovery_evidence_pack_approvals;latest.set(pack.recovery_case_id,{id:pack.id,manifest_fingerprint:pack.manifest_fingerprint,created_at:pack.created_at,approved:Boolean(approval),approved_by:approval?.approved_by??null,approved_at:approval?.approved_at??null});}}
  const timelines=new Map<string,any[]>();for(const event of events??[]){const list=timelines.get(event.recovery_case_id)??[];if(list.length<25)list.push(event);timelines.set(event.recovery_case_id,list);}
  return cases.map(item=>({...item,evidence_pack:latest.get(item.id)??null,timeline:timelines.get(item.id)??[]}));
}
export async function createRecoveryCase(accountId:string,input:Omit<RecoveryCase,"id"|"created_at"|"updated_at">):Promise<RecoveryCase>{
  const now=new Date().toISOString();
  const {data,error}=await table().upsert({account_id:accountId,...input,updated_at:now},{onConflict:"account_id,exception_key"}).select("*").single();
  if(unavailable(error)){
    const channel=await fallbackChannel(accountId);
    if(!channel)throw new Error("Connect a platform before creating recovery cases.");
    const metadata=(channel.metadata as Record<string,unknown>|null)??{};
    const cases=Array.isArray(metadata.recovery_cases)?metadata.recovery_cases as RecoveryCase[]:[];
    const created={...input,id:crypto.randomUUID(),created_at:now,updated_at:now};
    const next=[created,...cases.filter(item=>item.exception_key!==input.exception_key)];
    const {error:updateError}=await supabaseAdmin.from("ps_merchant_channels").update({metadata:{...metadata,recovery_cases:next} as unknown as Json}).eq("id",channel.id);
    if(updateError)throw new Error(updateError.message);
    return created;
  }
  if(error||!data)throw new Error(error?.message??"Could not create recovery case.");
  return data as RecoveryCase;
}

type ReconciliationFindingForRecovery={id:string;run_id:string;account_id:string;contract_term_id:string|null;conclusion:string;recoverability:string;order_external_id:string|null;settlement_reference:string|null;currency:string;expected_amount:number|null;reported_amount:number|null;variance:number|null;evidence_strength:string;explanation:string;blockers:string[];evidence_item_id:string};

export function buildRecoveryCaseFromFinding(finding:ReconciliationFindingForRecovery):Omit<RecoveryCase,"id"|"created_at"|"updated_at">{
  const underpayment=typeof finding.variance==="number"&&finding.variance<0,claimsReady=finding.recoverability==="claims_ready"&&finding.conclusion==="confirmed_discrepancy"&&underpayment&&Boolean(finding.contract_term_id)&&!(finding.blockers?.length);
  const amount=underpayment?Math.round(Math.abs(finding.variance!)*100)/100:null,reference=finding.order_external_id?`order ${finding.order_external_id}`:finding.settlement_reference?`settlement ${finding.settlement_reference}`:"the reviewed payout batch";
  return {platform:"unknown",exception_key:`reconciliation:${finding.id}`,title:claimsReady?`Supported payout shortfall for ${reference}`:`Reconciliation evidence needed for ${reference}`,status:claimsReady?"ready":"evidence_required",severity:claimsReady?"warning":"review",exception_amount:amount,claims_ready_amount:claimsReady?amount??0:0,confidence:finding.evidence_strength==="confirmed"?"high":finding.evidence_strength==="strong"?"medium":"low",affected_orders:finding.order_external_id?1:null,contract_term_id:finding.contract_term_id,contract_clause:null,regulatory_reference:null,evidence_sources:[`evidence_item:${finding.evidence_item_id}`,`reconciliation_run:${finding.run_id}`,`finding:${finding.id}`],calculation:{expected_amount:finding.expected_amount,reported_amount:finding.reported_amount,variance:finding.variance,currency:finding.currency,conclusion:finding.conclusion,blockers:finding.blockers??[]},explanation_en:`${finding.explanation} PrizeSkout prepared this case from retained evidence; the merchant must review it before any external submission.`,explanation_ar:"أعدت برايزسكاوت هذه الحالة من الأدلة المحفوظة. يجب على التاجر مراجعتها قبل إرسال أي مطالبة خارجية.",submission_deadline:null,owner:null,platform_response:null,recovered_amount:0,reconciliation_finding_id:finding.id,reconciliation_run_id:finding.run_id};
}

export async function createRecoveryCaseFromFinding(accountId:string,findingId:string){
  const {data,error}=await (supabaseAdmin as any).from("ps_reconciliation_findings").select("id,run_id,account_id,evidence_item_id,contract_term_id,conclusion,recoverability,order_external_id,settlement_reference,currency,expected_amount,reported_amount,variance,evidence_strength,explanation,blockers,ps_settlement_reconciliation_runs(platform)").eq("id",findingId).eq("account_id",accountId).maybeSingle();
  if(error||!data)throw new Error(error?.message??"Reconciliation finding was not found.");
  const input=buildRecoveryCaseFromFinding(data as ReconciliationFindingForRecovery),run=Array.isArray(data.ps_settlement_reconciliation_runs)?data.ps_settlement_reconciliation_runs[0]:data.ps_settlement_reconciliation_runs;
  return createRecoveryCase(accountId,{...input,platform:String(run?.platform??"unknown").toLowerCase()});
}
export async function updateRecoveryCase(accountId:string,id:string,patch:Partial<RecoveryCase>,options?:{verifiedSubmission?:boolean}):Promise<RecoveryCase>{
  const {data:current,error:currentError}=await table().select("status,recovered_amount").eq("account_id",accountId).eq("id",id).maybeSingle();
  if(!unavailable(currentError)){if(currentError||!current)throw new Error(currentError?.message??"Recovery case not found.");if(patch.status){if(!(options?.verifiedSubmission&&current.status==="ready"&&patch.status==="submitted_manually"))assertRecoveryTransition(current.status as RecoveryStatus,patch.status);}const recovered=patch.recovered_amount;if(recovered!==undefined&&(!Number.isFinite(recovered)||recovered<0))throw new Error("Recovered amount must be zero or greater.");if(patch.status==="recovered"&&Number(recovered??current.recovered_amount)<=0)throw new Error("Record a positive recovered amount before marking the case recovered.");}
  const safe={status:patch.status,owner:patch.owner,submission_deadline:patch.submission_deadline,platform_response:patch.platform_response,recovered_amount:patch.recovered_amount,submission_reference:patch.submission_reference,submitted_at:patch.submitted_at,submitted_by:patch.submitted_by,submission_evidence_hash:patch.submission_evidence_hash,updated_at:new Date().toISOString()};
  const {data,error}=await table().update(safe).eq("account_id",accountId).eq("id",id).select("*").single();
  if(unavailable(error)){
    const channel=await fallbackChannel(accountId);
    if(!channel)throw new Error("Recovery case storage is unavailable.");
    const metadata=(channel.metadata as Record<string,unknown>|null)??{};
    const cases=Array.isArray(metadata.recovery_cases)?metadata.recovery_cases as RecoveryCase[]:[];
    const found=cases.find(item=>item.id===id);if(!found)throw new Error("Recovery case not found.");
    const updated={...found,...safe} as RecoveryCase;
    await supabaseAdmin.from("ps_merchant_channels").update({metadata:{...metadata,recovery_cases:cases.map(item=>item.id===id?updated:item)} as unknown as Json}).eq("id",channel.id);
    return updated;
  }
  if(error||!data)throw new Error(error?.message??"Could not update recovery case.");
  return data as RecoveryCase;
}

export async function recordRecoverySubmission(accountId:string,id:string,reference:string,submittedBy:string){
  const cases=await listRecoveryCases(accountId);
  const current=cases.find(item=>item.id===id);
  if(!current)throw new Error("Recovery case not found.");
  if(current.status!=="ready")throw new Error("Only a claims-ready case can be recorded as submitted.");
  if(current.claims_ready_amount<=0||!current.contract_term_id||!current.evidence_sources.length)throw new Error("Contract evidence, supporting sources, and a positive claims-ready amount are required.");
  if(current.reconciliation_finding_id)await requireApprovedRecoveryEvidencePack(accountId,id);
  const submittedAt=new Date().toISOString();
  const evidencePayload=JSON.stringify({case_id:id,exception_key:current.exception_key,amount:current.claims_ready_amount,contract_term_id:current.contract_term_id,evidence_sources:current.evidence_sources,reference,submitted_by:submittedBy,submitted_at:submittedAt});
  const digest=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(evidencePayload));
  const evidenceHash=Array.from(new Uint8Array(digest)).map(value=>value.toString(16).padStart(2,"0")).join("");
  const updated=await updateRecoveryCase(accountId,id,{status:"submitted_manually",submission_reference:reference,submitted_at:submittedAt,submitted_by:submittedBy,submission_evidence_hash:evidenceHash},{verifiedSubmission:true});
  const {error}=await (supabaseAdmin as any).from("ps_recovery_submission_events").insert({account_id:accountId,recovery_case_id:id,submission_reference:reference,submitted_by:submittedBy,evidence_hash:evidenceHash});
  if(error&&error.code!=="42P01")throw new Error(error.message);
  return updated;
}
