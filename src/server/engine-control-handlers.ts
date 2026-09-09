import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { V1Context, V1Result } from "@/server/v1-handlers";

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

export async function handleReplayEngineWork(request:Request,ctx:V1Context,id:string):Promise<V1Result>{
  if(!ctx.scopes.includes("admin"))return forbidden();
  const body=await request.json().catch(()=>({})) as {reason?:unknown}; const reason=typeof body.reason==="string"?body.reason.trim().slice(0,500):"";
  if(!reason)return {status:422,body:{error:{code:"validation_failed",message:"A replay reason is required."}}};
  const {data:work,error:findError}=await db.from("ps_engine_work_items").select("id,state").eq("id",id).eq("account_id",ctx.accountId).maybeSingle();
  if(findError)throw new Error(findError.message);if(!work)return {status:404,body:{error:{code:"not_found",message:"Engine work item not found."}}};
  if(work.state!=="dead_letter")return {status:409,body:{error:{code:"invalid_state",message:"Only dead-lettered work can be replayed."}}};
  const {data,error}=await db.rpc("ps_engine_transition",{p_work_item_id:id,p_owner:"",p_to_state:"queued",p_actor:`api_key:${ctx.apiKeyId}`,p_reason:"manual_replay",p_detail:{reason},p_available_at:new Date().toISOString(),p_last_error:null});
  if(error)throw new Error(error.message);return {status:202,body:{data:{id,state:"queued",replay_reason:reason,updated_at:data?.updated_at??new Date().toISOString()}}};
}
