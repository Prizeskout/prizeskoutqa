import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { dispatchToAggregators, type DispatchToAggregatorsParams } from "./defend-handler";
import { getTalabatCatalogJob, getValidTalabatAccessToken, readTalabatCatalogPrice, type TalabatEnvironment } from "./talabat-client";

const backoffMs=(attempt:number)=>Math.min(15*60_000,Math.round(2**attempt*1000*(.75+Math.random()*.5)));

export async function enqueueDispatch(params:DispatchToAggregatorsParams & {channel:string;economicsVersionId:string}){
  const dedupeKey=`dispatch:${params.ingestEventId}:${params.channel}:${params.newPrice}`;
  const {data,error}=await supabaseAdmin.from("ps_dispatch_queue").upsert({
    account_id:params.accountId,licensee_id:params.licenseeId,ingest_event_id:params.ingestEventId,
    decide_result_id:params.decideResultId,merchant_id:params.merchantId,channel:params.channel,sku:params.sku,
    old_price:params.oldPrice,target_price:params.newPrice,currency:params.currency,
    region:params.region,dedupe_key:dedupeKey,
    economics_version_id:params.economicsVersionId,state:"queued",available_at:new Date().toISOString(),
  },{onConflict:"dedupe_key",ignoreDuplicates:true}).select("id,state").maybeSingle();
  if(error) throw error;
  return data as unknown as {id:string;state:string}|null;
}

export async function processDispatchQueue(workerId:string,limit=10){
  // The database claims jobs under row locks, reclaims expired leases, and
  // applies max_concurrency + requests_per_minute before any worker can race.
  const {data,error}=await supabaseAdmin.rpc("ps_lease_dispatch_jobs",{p_owner:workerId,p_limit:Math.min(limit,25)});
  if(error) throw error;
  const jobs=(data??[]) as unknown as Array<Record<string,unknown>>;
  const results=[] as Array<{id:string;state:string}>;
  for(const job of jobs){
    const id=String(job.id); const attempts=Number(job.attempts);
    try{
      const dispatch=await dispatchToAggregators({ingestEventId:String(job.ingest_event_id),decideResultId:String(job.decide_result_id),accountId:String(job.account_id),licenseeId:String(job.licensee_id),merchantId:String(job.merchant_id),sku:String(job.sku),region:String(job.region),oldPrice:Number(job.old_price),newPrice:Number(job.target_price),currency:String(job.currency),auditSnapshot:{economics_version_id:job.economics_version_id,queue_id:id}});
      const acceptedResult=dispatch.results.find(r=>r.status==="success");
      const accepted=Boolean(acceptedResult);
      const dead=!accepted&&attempts>=Number(job.max_attempts);
      const nextState=accepted?"confirming":dead?"dead_letter":"queued";
      await supabaseAdmin.from("ps_dispatch_queue").update({state:nextState,upstream_job_id:acceptedResult?.upstream_job_id??null,accepted_at:accepted?new Date().toISOString():null,available_at:accepted||dead?null:new Date(Date.now()+backoffMs(attempts)).toISOString(),last_error:accepted?null:"No channel accepted dispatch",lease_owner:null,lease_expires_at:null,updated_at:new Date().toISOString()}).eq("id",id).eq("lease_owner",workerId);
      results.push({id,state:nextState});
    }catch(error){
      const dead=attempts>=Number(job.max_attempts);
      await supabaseAdmin.from("ps_dispatch_queue").update({state:dead?"dead_letter":"queued",available_at:dead?null:new Date(Date.now()+backoffMs(attempts)).toISOString(),last_error:String(error).slice(0,800),lease_owner:null,lease_expires_at:null,updated_at:new Date().toISOString()}).eq("id",id).eq("lease_owner",workerId);
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
  await supabaseAdmin.from("ps_dispatch_queue").upsert({account_id:job.account_id,licensee_id:job.licensee_id,ingest_event_id:job.ingest_event_id,decide_result_id:job.decide_result_id,merchant_id:job.merchant_id,channel:job.channel,sku:job.sku,old_price:job.target_price,target_price:job.old_price,currency:job.currency,region:job.region,economics_version_id:job.economics_version_id,state:"rollback_queued",priority:1,available_at:new Date().toISOString(),rollback_reason:"live_price_confirmation_failed",parent_dispatch_id:job.id,dedupe_key:`rollback:${job.id}`},{onConflict:"dedupe_key",ignoreDuplicates:true});
  return {confirmed:false,rollbackQueued:true};
}

type ConfirmationResult={queueId:string;state:string;message?:string};

async function reconcileTalabatJob(job:Record<string,unknown>,pollStatus:boolean):Promise<ConfirmationResult>{
  const queueId=String(job.id);
  const {data:channel}=await supabaseAdmin.from("ps_merchant_channels")
    .select("id,manager_token,bearer_token,metadata,status")
    .eq("account_id",String(job.account_id)).eq("merchant_id",String(job.merchant_id))
    .eq("platform","talabat").eq("status","connected").maybeSingle();
  if(!channel)return {queueId,state:"confirming",message:"Talabat channel is no longer connected."};
  const metadata=(channel.metadata??{}) as Record<string,unknown>;
  const chainId=typeof metadata.chain_id==="string"?metadata.chain_id:"";
  const vendorId=typeof metadata.vendor_id==="string"?metadata.vendor_id:"";
  const environment:TalabatEnvironment=metadata.environment==="sandbox"?"sandbox":"production";
  if(!chainId||!vendorId)return {queueId,state:"confirming",message:"Talabat chain or vendor ID is missing."};
  const token=await getValidTalabatAccessToken({...channel,metadata});
  if(!token.accessToken)return {queueId,state:"confirming",message:token.error??"Talabat access token unavailable."};

  if(pollStatus){
    const statusResult=await getTalabatCatalogJob({chainId,jobId:String(job.upstream_job_id),accessToken:token.accessToken,environment});
    if(!statusResult.ok)return {queueId,state:"confirming",message:statusResult.message??"Could not read Talabat job status."};
    const status=String(statusResult.data?.job_status??statusResult.data?.status??"").toUpperCase();
    if(status==="FAILED"){
      await supabaseAdmin.from("ps_dispatch_queue").update({state:"dead_letter",last_error:"Talabat reported that the catalogue job failed.",updated_at:new Date().toISOString()}).eq("id",queueId).eq("state","confirming");
      return {queueId,state:"dead_letter"};
    }
    if(status!=="COMPLETED")return {queueId,state:"confirming",message:`Talabat job is ${status||"still pending"}.`};
  }

  const readback=await readTalabatCatalogPrice({chainId,vendorId,sku:String(job.sku),accessToken:token.accessToken,environment});
  if(!readback.ok||!readback.data)return {queueId,state:"confirming",message:readback.message??"Talabat catalogue readback failed."};
  const confirmation=await recordLiveConfirmation({queueId,livePrice:readback.data.price,confirmedBy:"talabat_catalog_readback"});
  return {queueId,state:confirmation.confirmed?"confirmed":"dead_letter"};
}

export async function reconcileTalabatConfirmationByJobId(jobId:string):Promise<ConfirmationResult|null>{
  const {data:job}=await supabaseAdmin.from("ps_dispatch_queue").select("*")
    .eq("channel","talabat").eq("state","confirming").eq("upstream_job_id",jobId).maybeSingle();
  return job?reconcileTalabatJob(job as unknown as Record<string,unknown>,false):null;
}

export async function reconcileConfirmingDispatches(limit=10):Promise<ConfirmationResult[]>{
  const now=Date.now();
  const {data}=await supabaseAdmin.from("ps_dispatch_queue").select("*")
    .eq("channel","talabat").eq("state","confirming").not("upstream_job_id","is",null)
    .lte("accepted_at",new Date(now-60_000).toISOString()).order("accepted_at").limit(Math.min(limit,25));
  const results:ConfirmationResult[]=[];
  for(const raw of data??[]){
    const job=raw as unknown as Record<string,unknown>;
    const acceptedAt=Date.parse(String(job.accepted_at));
    if(Number.isFinite(acceptedAt)&&now-acceptedAt>30*60_000){
      await supabaseAdmin.from("ps_dispatch_queue").update({state:"dead_letter",last_error:"Talabat confirmation deadline exceeded after 30 minutes.",updated_at:new Date().toISOString()}).eq("id",String(job.id)).eq("state","confirming");
      results.push({queueId:String(job.id),state:"dead_letter",message:"Confirmation deadline exceeded."});
      continue;
    }
    try{
      const result=await reconcileTalabatJob(job,true);
      if(result.state==="confirming"&&result.message){
        await supabaseAdmin.from("ps_dispatch_queue").update({last_error:result.message.slice(0,800),updated_at:new Date().toISOString()}).eq("id",result.queueId).eq("state","confirming");
      }
      results.push(result);
    }catch(error){
      const message=error instanceof Error?error.message:String(error);
      await supabaseAdmin.from("ps_dispatch_queue").update({last_error:`Confirmation check failed: ${message}`.slice(0,800),updated_at:new Date().toISOString()}).eq("id",String(job.id)).eq("state","confirming");
      results.push({queueId:String(job.id),state:"confirming",message});
    }
  }
  return results;
}
