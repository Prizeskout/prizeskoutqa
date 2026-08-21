import {createFileRoute} from "@tanstack/react-router";
import {supabaseAdmin} from "@/integrations/supabase/client.server";
import {verifyMerchantAccess} from "@/server/core/byok-connect";
import {decideEvidenceReview} from "@/server/core/evidence-review";
import {confirmEvidenceAgreement} from "@/server/core/evidence-agreement-matcher";
import {createRecoveryCaseFromFinding} from "@/server/core/recovery-cases";

const json=(data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers:{"Content-Type":"application/json"}});
const storagePath=(reference:string|null)=>reference?.startsWith("merchant-evidence/")?reference.slice("merchant-evidence/".length):null;

export const Route=createFileRoute("/api/evidence/reviews")({server:{handlers:{
  GET:async({request})=>{try{
    const url=new URL(request.url),merchantId=(request.headers.get("x-merchant-id")??"").trim(),accessCode=request.headers.get("x-access-code")??"";
    if(!await verifyMerchantAccess(merchantId,accessCode))return json({error:"Unauthorized"},403);
    const db=supabaseAdmin as any,draftId=url.searchParams.get("draft_id");
    const {data:jobs,error:jobsError}=await db.from("ps_evidence_processing_jobs").select("id,evidence_item_id,state,attempts,max_attempts,last_error,created_at,updated_at").eq("account_id",merchantId).eq("merchant_id",merchantId).order("updated_at",{ascending:false}).limit(200);
    if(jobsError)throw new Error(jobsError.message);
    const {data:lastRun}=await db.from("ps_evidence_processor_runs").select("state,started_at,finished_at,error_message").order("started_at",{ascending:false}).limit(1).maybeSingle();
    let query=db.from("ps_evidence_review_drafts").select("id,evidence_item_id,document_kind,platform,extraction_payload,source_citations,missing_information,warnings,confidence,status,created_at,revision").eq("account_id",merchantId).eq("merchant_id",merchantId).order("created_at",{ascending:false});
    if(draftId)query=query.eq("id",draftId);else query=query.limit(100);
    const {data:drafts,error}=await query;if(error)throw new Error(error.message);
    const itemIds=[...new Set((drafts??[]).map((row:any)=>row.evidence_item_id))];
    const {data:items,error:itemError}=itemIds.length?await db.from("ps_merchant_evidence_items").select("id,original_filename,media_type,received_at,source_kind,source_provider,storage_reference").eq("account_id",merchantId).in("id",itemIds):{data:[],error:null};
    if(itemError)throw new Error(itemError.message);
    const itemMap=new Map((items??[]).map((item:any)=>[item.id,item]));
    const draftIds=(drafts??[]).map((row:any)=>row.id),{data:decisions,error:decisionError}=draftIds.length?await db.from("ps_evidence_review_decisions").select("review_draft_id,decision,reviewer_email,decided_at,correction_summary").eq("account_id",merchantId).in("review_draft_id",draftIds):{data:[],error:null};
    if(decisionError)throw new Error(decisionError.message);
    const decisionMap=new Map((decisions??[]).map((decision:any)=>[decision.review_draft_id,decision]));
    const evidenceIds=(drafts??[]).map((row:any)=>row.evidence_item_id),{data:agreementMatches,error:agreementError}=evidenceIds.length?await db.from("ps_evidence_agreement_matches").select("id,evidence_item_id,state,contract_term_id,match_score,reasons,blockers,candidate_contract_ids,confirmed_by,confirmed_at,revision,rematch_reason").eq("account_id",merchantId).in("evidence_item_id",evidenceIds).order("revision",{ascending:true}):{data:[],error:null};
    if(agreementError)throw new Error(agreementError.message);
    const candidateIds=[...new Set((agreementMatches??[]).flatMap((match:any)=>match.candidate_contract_ids??[]))],{data:contracts}=candidateIds.length?await db.from("ps_marketplace_contract_terms").select("id,contract_name,platform,effective_from,effective_to,currency,coverage_branches").eq("account_id",merchantId).in("id",candidateIds):{data:[]};
    const contractMap=new Map((contracts??[]).map((term:any)=>[term.id,term])),agreementMap=new Map((agreementMatches??[]).map((match:any)=>[match.evidence_item_id,{...match,candidates:(match.candidate_contract_ids??[]).map((id:string)=>contractMap.get(id)).filter(Boolean)}]));
    const {data:runEvidence,error:manifestError}=evidenceIds.length?await db.from("ps_reconciliation_run_evidence").select("run_id,evidence_item_id").eq("account_id",merchantId).in("evidence_item_id",evidenceIds):{data:[],error:null};
    if(manifestError)throw new Error(manifestError.message);
    const runIds=[...new Set((runEvidence??[]).map((row:any)=>row.run_id))];
    const {data:reconciliationRuns}=runIds.length?await db.from("ps_settlement_reconciliation_runs").select("id,status,summary,created_at").eq("account_id",merchantId).in("id",runIds):{data:[]};
    const runMap=new Map((reconciliationRuns??[]).map((run:any)=>[run.id,run]));
    const {data:findings,error:findingError}=runIds.length?await db.from("ps_reconciliation_findings").select("id,evidence_item_id,run_id,conclusion,recoverability,order_external_id,settlement_reference,currency,expected_amount,reported_amount,variance,evidence_strength,explanation,blockers,created_at").eq("account_id",merchantId).in("run_id",runIds).order("created_at",{ascending:false}):evidenceIds.length?await db.from("ps_reconciliation_findings").select("id,evidence_item_id,run_id,conclusion,recoverability,order_external_id,settlement_reference,currency,expected_amount,reported_amount,variance,evidence_strength,explanation,blockers,created_at").eq("account_id",merchantId).in("evidence_item_id",evidenceIds).order("created_at",{ascending:false}):{data:[],error:null};
    if(findingError)throw new Error(findingError.message);
    const findingIds=(findings??[]).map((finding:any)=>finding.id),{data:recoveryCases}=findingIds.length?await db.from("ps_recovery_cases").select("id,reconciliation_finding_id,status").eq("account_id",merchantId).in("reconciliation_finding_id",findingIds):{data:[]};
    const recoveryMap=new Map((recoveryCases??[]).map((item:any)=>[item.reconciliation_finding_id,item]));
    const evidenceByRun=new Map<string,string[]>();for(const row of runEvidence??[]){const list=evidenceByRun.get(row.run_id)??[];list.push(row.evidence_item_id);evidenceByRun.set(row.run_id,list);}
    const findingMap=new Map<string,any[]>();for(const finding of findings??[]){for(const evidenceId of evidenceByRun.get(finding.run_id)??[finding.evidence_item_id]){const list=findingMap.get(evidenceId)??[];list.push({...finding,recovery_case:recoveryMap.get(finding.id)??null});findingMap.set(evidenceId,list);}}
    const reviews=await Promise.all((drafts??[]).map(async(draft:any)=>{
      const item=itemMap.get(draft.evidence_item_id) as any,path=storagePath(item?.storage_reference??null);let original_url:string|null=null;
      if(draftId&&path){const {data}=await supabaseAdmin.storage.from("merchant-evidence").createSignedUrl(path,300);original_url=data?.signedUrl??null;}
      const evidenceRuns=(runEvidence??[]).filter((row:any)=>row.evidence_item_id===draft.evidence_item_id).map((row:any)=>runMap.get(row.run_id)).filter(Boolean).sort((a:any,b:any)=>String(b.created_at).localeCompare(String(a.created_at)));
      return {...draft,decision_record:decisionMap.get(draft.id)??null,agreement_match:agreementMap.get(draft.evidence_item_id)??null,reconciliation_findings:findingMap.get(draft.evidence_item_id)??[],reconciliation_run:evidenceRuns[0]??null,item:item?{id:item.id,original_filename:item.original_filename,media_type:item.media_type,received_at:item.received_at,source_kind:item.source_kind,source_provider:item.source_provider}:null,original_url};
    }));
    const queued=(jobs??[]).filter((job:any)=>job.state==="queued"),leased=(jobs??[]).filter((job:any)=>job.state==="leased"),failed=(jobs??[]).filter((job:any)=>job.state==="dead_letter");
    const failedItemIds=failed.map((job:any)=>job.evidence_item_id),{data:failedItems}=failedItemIds.length?await db.from("ps_merchant_evidence_items").select("id,original_filename,received_at").eq("account_id",merchantId).in("id",failedItemIds):{data:[]};
    const failedItemMap=new Map((failedItems??[]).map((item:any)=>[item.id,item]));
    const lastHeartbeat=lastRun?.finished_at??lastRun?.started_at??null,stalled=Boolean((queued.length||leased.length)&&(!lastHeartbeat||Date.now()-Date.parse(lastHeartbeat)>15*60_000));
    return json({ok:true,reviews,processing_status:{queued:queued.length,processing:leased.length,completed:(jobs??[]).filter((job:any)=>job.state==="completed").length,failed:failed.length,stalled,last_heartbeat:lastHeartbeat,last_run_state:lastRun?.state??null,failed_documents:failed.map((job:any)=>({...job,original_filename:(failedItemMap.get(job.evidence_item_id) as any)?.original_filename??null}))}});
  }catch(error){return json({error:error instanceof Error?error.message:"Reviews could not be loaded."},422);}},
  POST:async({request})=>{try{
    const body=await request.json() as Record<string,unknown>,merchantId=String(body.merchant_id??"").trim(),accessCode=String(body.access_code??"");
    if(!await verifyMerchantAccess(merchantId,accessCode))return json({error:"Unauthorized"},403);
    if(body.action==="retry_failed"){
      const {data,error}=await (supabaseAdmin as any).from("ps_evidence_processing_jobs").update({state:"queued",attempts:0,available_at:new Date().toISOString(),lease_owner:null,lease_expires_at:null,last_error:null,updated_at:new Date().toISOString()}).eq("id",String(body.job_id??"")).eq("account_id",merchantId).eq("merchant_id",merchantId).eq("state","dead_letter").select("id").maybeSingle();
      if(error||!data)return json({error:error?.message??"Failed document was not found."},404);
      return json({ok:true,job_id:data.id});
    }
    if(body.action==="confirm_agreement"){
      const {data:accessIdentity}=await (supabaseAdmin as any).from("ps_access_codes").select("email").eq("merchant_id",merchantId).eq("code",accessCode.trim().toUpperCase()).maybeSingle();
      const result=await confirmEvidenceAgreement({accountId:merchantId,merchantId,matchId:String(body.match_id??""),contractTermId:String(body.contract_term_id??""),confirmedBy:String(accessIdentity?.email??`access-code:${accessCode.trim().toUpperCase().slice(-4)}`)});
      return json({ok:true,...result});
    }
    if(body.action==="prepare_recovery"){
      const recoveryCase=await createRecoveryCaseFromFinding(merchantId,String(body.finding_id??""));
      return json({ok:true,recovery_case_id:recoveryCase.id,status:recoveryCase.status});
    }
    const decision=body.decision==="approved"?"approved":body.decision==="rejected"?"rejected":null;
    if(!decision)return json({error:"Choose approve or reject."},400);
    if(!body.reviewed_payload||typeof body.reviewed_payload!=="object"||Array.isArray(body.reviewed_payload))return json({error:"Reviewed values are required."},400);
    const {data:accessIdentity}=await (supabaseAdmin as any).from("ps_access_codes").select("email").eq("merchant_id",merchantId).eq("code",accessCode.trim().toUpperCase()).maybeSingle();
    const result=await decideEvidenceReview({accountId:merchantId,merchantId,draftId:String(body.draft_id??""),decision,reviewedPayload:body.reviewed_payload as Record<string,unknown>,correctionSummary:String(body.correction_summary??""),reviewerEmail:String(accessIdentity?.email??`access-code:${accessCode.trim().toUpperCase().slice(-4)}`)});
    return json({ok:true,...result});
  }catch(error){return json({error:error instanceof Error?error.message:"Review decision could not be saved."},422);}}
}}});
