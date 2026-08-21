import {supabaseAdmin} from "@/integrations/supabase/client.server";
import type {EvidenceLayoutDetection} from "./evidence-layout-registry";

export function classifyLayoutDrift(currentFingerprint:string,approvedFingerprints:string[]){return {drift:approvedFingerprints.length>0&&!approvedFingerprints.includes(currentFingerprint),firstSeen:approvedFingerprints.length===0};}

export async function recordEvidenceLayouts(input:{accountId:string;merchantId:string;evidenceItemId:string;sourceProvider:string;layouts:EvidenceLayoutDetection[]}){
  const db=supabaseAdmin as any,observations=[] as any[];let drift=false;
  for(const layout of input.layouts.filter(row=>row.supported&&row.profile)){
    const {data:history,error}=await db.from("ps_evidence_layout_observations").select("format_fingerprint,ps_evidence_layout_approvals(id)").eq("account_id",input.accountId).eq("source_provider",input.sourceProvider).eq("layout_profile",layout.profile);if(error&&error.code!=="42P01")throw new Error(error.message);
    const approved=(history??[]).filter((row:any)=>Array.isArray(row.ps_evidence_layout_approvals)?row.ps_evidence_layout_approvals.length:Boolean(row.ps_evidence_layout_approvals)).map((row:any)=>row.format_fingerprint),classification=classifyLayoutDrift(layout.formatFingerprint,approved);drift ||= classification.drift;
    const {data,error:insertError}=await db.from("ps_evidence_layout_observations").upsert({account_id:input.accountId,merchant_id:input.merchantId,evidence_item_id:input.evidenceItemId,source_provider:input.sourceProvider,layout_profile:layout.profile,format_fingerprint:layout.formatFingerprint,headers:layout.headers},{onConflict:"evidence_item_id,layout_profile,format_fingerprint"}).select("id,format_fingerprint").single();if(insertError&&insertError.code!=="42P01")throw new Error(insertError.message);if(data)observations.push(data);
  }
  return {drift,observations};
}

export async function approveEvidenceLayouts(accountId:string,evidenceItemId:string,approvedBy:string){const db=supabaseAdmin as any,{data,error}=await db.from("ps_evidence_layout_observations").select("id").eq("account_id",accountId).eq("evidence_item_id",evidenceItemId);if(error){if(error.code==="42P01")return;throw new Error(error.message);}if(data?.length){const {error:approvalError}=await db.from("ps_evidence_layout_approvals").upsert(data.map((row:any)=>({account_id:accountId,observation_id:row.id,approved_by:approvedBy})),{onConflict:"observation_id",ignoreDuplicates:true});if(approvalError)throw new Error(approvalError.message);}}
