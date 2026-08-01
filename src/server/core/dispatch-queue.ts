import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { dispatchToAggregators, type DispatchToAggregatorsParams } from "./defend-handler";

const backoffMs=(attempt:number)=>Math.min(15*60_000,Math.round(2**attempt*1000*(.75+Math.random()*.5)));

export async function enqueueDispatch(params:DispatchToAggregatorsParams & {channel:string;economicsVersionId:string}){
  const {data,error}=await supabaseAdmin.from("ps_dispatch_queue").upsert({
    account_id:params.accountId,licensee_id:params.licenseeId,ingest_event_id:params.ingestEventId,
    decide_result_id:params.decideResultId,merchant_id:params.merchantId,channel:params.channel,sku:params.sku,
    old_price:params.oldPrice,target_price:params.newPrice,currency:params.currency,
    economics_version_id:params.economicsVersionId,state:"queued",available_at:new Date().toISOString(),
  },{onConflict:"ingest_event_id,channel,target_price",ignoreDuplicates:true}).select("id,state").maybeSingle();
  if(error) throw error;
  return data as unknown as {id:string;state:string}|null;
}

export async function processDispatchQueue(workerId:string,limit=10){
  const now=new Date();
  const {data}=await supabaseAdmin.from("ps_dispatch_queue").select("*").in("state",["queued","rollback_queued"])
    .lte("available_at",now.toISOString()).order("priority").order("created_at").limit(Math.min(limit,25));
  const jobs=(data??[]) as unknown as Array<Record<string,unknown>>;
  const results=[] as Array<{id:string;state:string}>;
  for(const job of jobs){
    const id=String(job.id); const attempts=Number(job.attempts)+1;
    const {data:limitRow}=await supabaseAdmin.from("ps_channel_rate_limits").select("requests_per_minute").eq("account_id",String(job.account_id)).eq("channel",String(job.channel)).maybeSingle();
    const minuteAgo=new Date(Date.now()-60_000).toISOString();
    const {count:recentCount}=await supabaseAdmin.from("ps_aggregator_dispatch_log").select("id",{count:"exact",head:true}).eq("account_id",String(job.account_id)).eq("target_channel",String(job.channel)).gte("created_at",minuteAgo);
    if((recentCount??0)>=(limitRow?.requests_per_minute??30)){
      await supabaseAdmin.from("ps_dispatch_queue").update({available_at:new Date(Date.now()+5_000).toISOString(),last_error:"Local rate limit deferred dispatch",updated_at:new Date().toISOString()}).eq("id",id);
      continue;
    }
    const priorState=String(job.state);
    const {data:leased}=await supabaseAdmin.from("ps_dispatch_queue").update({state:"leased",attempts,lease_owner:workerId,lease_expires_at:new Date(Date.now()+60_000).toISOString(),updated_at:new Date().toISOString()}).eq("id",id).eq("state",priorState).select("id").maybeSingle();
    if(!leased) continue;
    try{
      const dispatch=await dispatchToAggregators({ingestEventId:String(job.ingest_event_id),decideResultId:String(job.decide_result_id),accountId:String(job.account_id),licenseeId:String(job.licensee_id),merchantId:String(job.merchant_id),sku:String(job.sku),region:"SA",oldPrice:Number(job.old_price),newPrice:Number(job.target_price),currency:String(job.currency),auditSnapshot:{economics_version_id:job.economics_version_id,queue_id:id}});
      const acceptedResult=dispatch.results.find(r=>r.status==="success");
      const accepted=Boolean(acceptedResult);
      await supabaseAdmin.from("ps_dispatch_queue").update({state:accepted?"confirming":"queued",upstream_job_id:acceptedResult?.upstream_job_id??null,accepted_at:accepted?new Date().toISOString():null,available_at:accepted?null:new Date(Date.now()+backoffMs(attempts)).toISOString(),last_error:accepted?null:"No channel accepted dispatch",lease_owner:null,lease_expires_at:null,updated_at:new Date().toISOString()}).eq("id",id);
      results.push({id,state:accepted?"confirming":"queued"});
    }catch(error){
      const dead=attempts>=Number(job.max_attempts);
      await supabaseAdmin.from("ps_dispatch_queue").update({state:dead?"dead_letter":"queued",available_at:dead?null:new Date(Date.now()+backoffMs(attempts)).toISOString(),last_error:String(error).slice(0,800),lease_owner:null,lease_expires_at:null,updated_at:new Date().toISOString()}).eq("id",id);
      results.push({id,state:dead?"dead_letter":"queued"});
    }
  }
  return results;
}

export async function recordLiveConfirmation(input:{queueId:string;livePrice:number;confirmedBy:string}){
  const {data:job,error}=await supabaseAdmin.from("ps_dispatch_queue").select("*").eq("id",input.queueId).eq("state","confirming").maybeSingle();
  if(error||!job) throw new Error("Confirmation job not found");
  const matches=Math.abs(Number(job.target_price)-input.livePrice)<0.005;
  if(matches){
    await supabaseAdmin.from("ps_dispatch_queue").update({state:"confirmed",confirmed_at:new Date().toISOString(),last_error:null,updated_at:new Date().toISOString()}).eq("id",job.id);
    return {confirmed:true,rollbackQueued:false};
  }
  await supabaseAdmin.from("ps_dispatch_queue").update({state:"dead_letter",last_error:`Live readback mismatch from ${input.confirmedBy}: expected ${job.target_price}, got ${input.livePrice}`,rollback_reason:"live_price_confirmation_failed",updated_at:new Date().toISOString()}).eq("id",job.id);
  await supabaseAdmin.from("ps_dispatch_queue").upsert({account_id:job.account_id,licensee_id:job.licensee_id,ingest_event_id:job.ingest_event_id,decide_result_id:job.decide_result_id,merchant_id:job.merchant_id,channel:job.channel,sku:job.sku,old_price:job.target_price,target_price:job.old_price,currency:job.currency,economics_version_id:job.economics_version_id,state:"rollback_queued",priority:1,available_at:new Date().toISOString(),rollback_reason:"live_price_confirmation_failed"},{onConflict:"ingest_event_id,channel,target_price"});
  return {confirmed:false,rollbackQueued:true};
}
