import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { Json } from "@/integrations/supabase/types";

export type RecoveryCase={
  id:string;platform:string;exception_key:string;title:string;
  status:"evidence_required"|"draft"|"ready"|"submitted_manually"|"platform_review"|"accepted"|"rejected"|"recovered"|"closed";
  severity:string;exception_amount:number|null;claims_ready_amount:number;confidence:string;
  affected_orders:number|null;contract_term_id:string|null;contract_clause:string|null;
  regulatory_reference:string|null;evidence_sources:string[];calculation:Record<string,unknown>;
  explanation_en:string;explanation_ar:string;submission_deadline:string|null;owner:string|null;
  platform_response:string|null;recovered_amount:number;created_at:string;updated_at:string;
  submission_reference?:string|null;submitted_at?:string|null;submitted_by?:string|null;submission_evidence_hash?:string|null;
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
  return (data??[]) as RecoveryCase[];
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
export async function updateRecoveryCase(accountId:string,id:string,patch:Partial<RecoveryCase>):Promise<RecoveryCase>{
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
  const submittedAt=new Date().toISOString();
  const evidencePayload=JSON.stringify({case_id:id,exception_key:current.exception_key,amount:current.claims_ready_amount,contract_term_id:current.contract_term_id,evidence_sources:current.evidence_sources,reference,submitted_by:submittedBy,submitted_at:submittedAt});
  const digest=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(evidencePayload));
  const evidenceHash=Array.from(new Uint8Array(digest)).map(value=>value.toString(16).padStart(2,"0")).join("");
  const updated=await updateRecoveryCase(accountId,id,{status:"submitted_manually",submission_reference:reference,submitted_at:submittedAt,submitted_by:submittedBy,submission_evidence_hash:evidenceHash});
  const {error}=await (supabaseAdmin as any).from("ps_recovery_submission_events").insert({account_id:accountId,recovery_case_id:id,submission_reference:reference,submitted_by:submittedBy,evidence_hash:evidenceHash});
  if(error&&error.code!=="42P01")throw new Error(error.message);
  return updated;
}
