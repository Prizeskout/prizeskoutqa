import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { V1Context, V1Result } from "@/server/v1-handlers";
import { processEngineQueue } from "@/server/core/engine-orchestrator";
import { backgroundTask } from "@/server/cf-ctx";

const db=supabaseAdmin as any;
const forbidden=():V1Result=>({status:403,body:{error:{code:"forbidden",message:"This operation requires the admin scope."}}});

export async function handleEngineHealth(_request:Request,ctx:V1Context):Promise<V1Result>{
  if(!ctx.scopes.includes("admin")&&!ctx.scopes.includes("read"))return forbidden();
  const {data,error}=await db.from("ps_engine_work_items").select("state,created_at,updated_at,attempt").eq("account_id",ctx.accountId).limit(5000);
  if(error)throw new Error(error.message);
  const now=Date.now(),counts:Record<string,number>={}; let oldestPendingMs=0;
  for(const row of data??[]){counts[row.state]=(counts[row.state]??0)+1;if(!["completed","cancelled"].includes(row.state))oldestPendingMs=Math.max(oldestPendingMs,now-Date.parse(row.created_at));}
  return {status:200,body:{data:{status:(counts.dead_letter??0)>0?"degraded":oldestPendingMs>15*60_000?"delayed":"healthy",counts,oldest_pending_seconds:Math.round(oldestPendingMs/1000),checked_at:new Date().toISOString()}}};
}

export async function handleListEngineWork(request:Request,ctx:V1Context):Promise<V1Result>{
  if(!ctx.scopes.includes("admin")&&!ctx.scopes.includes("read"))return forbidden();
  const url=new URL(request.url),state=url.searchParams.get("state"),limit=Math.min(Math.max(Number(url.searchParams.get("limit"))||50,1),200);
  let query=db.from("ps_engine_work_items").select("id,event_id,work_kind,state,priority,attempt,max_attempts,available_at,last_error,result,created_at,updated_at,completed_at,ps_engine_events(event_type,source,source_event_id,merchant_id,correlation_id)").eq("account_id",ctx.accountId).order("created_at",{ascending:false}).limit(limit);
  if(state)query=query.eq("state",state);
  const {data,error}=await query;if(error)throw new Error(error.message);
  return {status:200,body:{data:data??[]}};
}

export async function handleGetEngineWork(_request:Request,ctx:V1Context,id:string):Promise<V1Result>{
  if(!ctx.scopes.includes("admin")&&!ctx.scopes.includes("read"))return forbidden();
  const {data:work,error}=await db.from("ps_engine_work_items").select("*").eq("id",id).eq("account_id",ctx.accountId).maybeSingle();
  if(error)throw new Error(error.message);if(!work)return {status:404,body:{error:{code:"not_found",message:"Engine work item not found."}}};
  const [{data:event,error:eventError},{data:transitions,error:transitionError},{data:approvals,error:approvalError}]=await Promise.all([
    db.from("ps_engine_events").select("*").eq("id",work.event_id).eq("account_id",ctx.accountId).maybeSingle(),
    db.from("ps_engine_transitions").select("id,from_state,to_state,actor,reason,detail,created_at").eq("work_item_id",id).eq("account_id",ctx.accountId).order("created_at",{ascending:true}),
    db.from("ps_engine_approval_requests").select("id,approval_scope,requested_by,context,expires_at,created_at,ps_engine_approval_decisions(id,decision,decided_by,reason,context,created_at)").eq("work_item_id",id).eq("account_id",ctx.accountId).order("created_at",{ascending:true}),
  ]);
  if(eventError||transitionError||approvalError)throw new Error(eventError?.message??transitionError?.message??approvalError?.message);
  return {status:200,body:{data:{...work,event,transitions:transitions??[],approvals:approvals??[]}}};
}

export async function handleReplayEngineWork(request:Request,ctx:V1Context,id:string):Promise<V1Result>{
  if(!ctx.scopes.includes("admin"))return forbidden();
  const body=await request.json().catch(()=>({})) as {reason?:unknown}; const reason=typeof body.reason==="string"?body.reason.trim().slice(0,500):"";
  if(!reason)return {status:422,body:{error:{code:"validation_failed",message:"A replay reason is required."}}};
  const {data:work,error:findError}=await db.from("ps_engine_work_items").select("id,state").eq("id",id).eq("account_id",ctx.accountId).maybeSingle();
  if(findError)throw new Error(findError.message);if(!work)return {status:404,body:{error:{code:"not_found",message:"Engine work item not found."}}};
  if(work.state!=="dead_letter")return {status:409,body:{error:{code:"invalid_state",message:"Only dead-lettered work can be replayed."}}};
  const {data,error}=await db.rpc("ps_engine_transition",{p_work_item_id:id,p_owner:"",p_to_state:"queued",p_actor:`api_key:${ctx.apiKeyId}`,p_reason:"manual_replay",p_detail:{reason},p_available_at:new Date().toISOString(),p_last_error:null});
  if(error)throw new Error(error.message);backgroundTask(processEngineQueue(`replay:${crypto.randomUUID()}`,5));return {status:202,body:{data:{id,state:"queued",replay_reason:reason,updated_at:data?.updated_at??new Date().toISOString()}}};
}

export async function handleResumeEngineWork(request:Request,ctx:V1Context,id:string):Promise<V1Result>{
  if(!ctx.scopes.includes("admin"))return forbidden();
  const body=await request.json().catch(()=>({})) as {reason?:unknown;evidence_reference?:unknown};
  const reason=typeof body.reason==="string"?body.reason.trim().slice(0,500):"",evidenceReference=typeof body.evidence_reference==="string"?body.evidence_reference.trim().slice(0,500):"";
  if(!reason||!evidenceReference)return {status:422,body:{error:{code:"validation_failed",message:"A reason and evidence_reference are required."}}};
  const {data:work,error:findError}=await db.from("ps_engine_work_items").select("id,state").eq("id",id).eq("account_id",ctx.accountId).maybeSingle();
  if(findError)throw new Error(findError.message);if(!work)return {status:404,body:{error:{code:"not_found",message:"Engine work item not found."}}};
  if(work.state!=="waiting_evidence")return {status:409,body:{error:{code:"invalid_state",message:"Only work waiting for evidence can be resumed here."}}};
  const {data,error}=await db.rpc("ps_engine_transition",{p_work_item_id:id,p_owner:"",p_to_state:"queued",p_actor:`api_key:${ctx.apiKeyId}`,p_reason:"evidence_supplied",p_detail:{reason,evidence_reference:evidenceReference},p_available_at:new Date().toISOString(),p_last_error:null});
  if(error)throw new Error(error.message);backgroundTask(processEngineQueue(`evidence:${crypto.randomUUID()}`,5));return {status:202,body:{data:{id,state:"queued",evidence_reference:evidenceReference,updated_at:data?.updated_at??new Date().toISOString()}}};
}

export async function handleListEngineApprovals(_request:Request,ctx:V1Context):Promise<V1Result>{
  if(!ctx.scopes.includes("admin")&&!ctx.scopes.includes("read"))return forbidden();
  const {data,error}=await db.from("ps_engine_approval_requests").select("id,work_item_id,approval_scope,requested_by,context,expires_at,created_at,ps_engine_approval_decisions(id,decision,decided_by,reason,context,created_at)").eq("account_id",ctx.accountId).order("created_at",{ascending:false}).limit(200);
  if(error)throw new Error(error.message);return {status:200,body:{data:data??[]}};
}

export async function handleDecideEngineApproval(request:Request,ctx:V1Context,id:string):Promise<V1Result>{
  if(!ctx.scopes.includes("admin"))return forbidden();
  const body=await request.json().catch(()=>({})) as {decision?:unknown;reason?:unknown;context?:unknown};
  const decision=body.decision==="approved"||body.decision==="rejected"?body.decision:null,reason=typeof body.reason==="string"?body.reason.trim().slice(0,500):"";
  if(!decision||!reason)return {status:422,body:{error:{code:"validation_failed",message:"decision must be approved or rejected and reason is required."}}};
  const context=body.context&&typeof body.context==="object"&&!Array.isArray(body.context)?body.context:{};
  const {data,error}=await db.rpc("ps_engine_decide_approval",{p_request_id:id,p_account_id:ctx.accountId,p_decision:decision,p_decided_by:`api_key:${ctx.apiKeyId}`,p_reason:reason,p_context:context});
  if(error){const message=String(error.message);return {status:/expired|already decided|not waiting/.test(message)?409:404,body:{error:{code:"approval_failed",message}}};}
  if(decision==="approved")backgroundTask(processEngineQueue(`approval:${crypto.randomUUID()}`,5));
  return {status:200,body:{data:{request_id:id,decision,work_item_id:data?.id,state:data?.state}}};
}
