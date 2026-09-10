import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { engineRetryDelayMs, nextFailureState, type EngineWorkState } from "./engine-state-machine";

type Json = Record<string, unknown>;
export type EngineEventInput = { accountId:string; merchantId?:string|null; eventType:string; source:string; sourceEventId:string; schemaVersion:string; payload:Json; workKind:string; occurredAt?:string|null; priority?:number };
type Work = { id:string; account_id:string; event_id:string; work_kind:string; state:EngineWorkState; attempt:number; max_attempts:number };
type Event = { id:string; account_id:string; merchant_id:string|null; event_type:string; source:string; payload:Json };
type Outcome = { state:"completed"|"waiting_evidence"|"waiting_approval"|"verifying"|"dead_letter"; reason:string; detail?:Json; approval?:{scope:string;expiresAt:string} };

const db = supabaseAdmin as any;

export async function acceptEngineEvent(input:EngineEventInput) {
  const {data,error}=await db.rpc("ps_engine_accept_event",{p_account_id:input.accountId,p_merchant_id:input.merchantId??"",p_event_type:input.eventType,p_source:input.source,p_source_event_id:input.sourceEventId,p_schema_version:input.schemaVersion,p_payload:input.payload,p_work_kind:input.workKind,p_occurred_at:input.occurredAt??null,p_priority:input.priority??50});
  if(error) throw new Error(`Engine event was not accepted: ${error.message}`);
  return Array.isArray(data)?data[0]:data;
}

async function transition(work:Work,owner:string,state:EngineWorkState,reason:string,detail:Json={},availableAt:string|null=null,lastError:string|null=null){
  const {data,error}=await db.rpc("ps_engine_transition",{p_work_item_id:work.id,p_owner:owner,p_to_state:state,p_actor:`worker:${owner}`,p_reason:reason,p_detail:detail,p_available_at:availableAt,p_last_error:lastError});
  if(error) throw new Error(error.message); return data;
}

async function execute(event:Event,work:Work):Promise<Outcome>{
  if(work.work_kind==="normalize_partner_event"){
    const receiptId=String(event.payload.receipt_id??"");
    if(!receiptId) return {state:"waiting_evidence",reason:"partner_receipt_missing"};
    const {data,error}=await db.from("ps_snoonu_webhook_events").select("id,status,event_type").eq("id",receiptId).maybeSingle();
    if(error) throw new Error(error.message);
    return data?{state:"completed",reason:"partner_event_normalized",detail:{receipt_id:data.id,event_type:data.event_type}}:{state:"waiting_evidence",reason:"partner_receipt_not_visible"};
  }
  if(work.work_kind==="normalize_connector_event"){
    const platform=String(event.payload.platform??"").toLowerCase(),receiptId=String(event.payload.receipt_id??"");
    const tables:Record<string,string>={salla:"ps_salla_webhook_events",zid:"ps_zid_webhook_events",keeta:"ps_keeta_webhook_events",talabat:"ps_talabat_webhook_events"};
    const table=tables[platform];if(!table||!receiptId)return {state:"dead_letter",reason:"connector_receipt_reference_invalid",detail:{platform,receipt_id:receiptId}};
    const {data,error}=await db.from(table).select("id,status,error_message").eq("id",receiptId).eq("account_id",event.account_id).maybeSingle();
    if(error)throw new Error(error.message);if(!data)return {state:"waiting_evidence",reason:"connector_receipt_not_visible",detail:{platform,receipt_id:receiptId}};
    if(data.status==="failed")return {state:"dead_letter",reason:"connector_processing_failed",detail:{platform,receipt_id:data.id,error:data.error_message}};
    if(data.status==="processed")return {state:"completed",reason:"connector_event_normalized",detail:{platform,receipt_id:data.id}};
    throw new Error(`${platform} receipt ${receiptId} is still ${data.status}`);
  }
  if(work.work_kind==="assess_order_economics"){
    const ids=Array.isArray(event.payload.normalized_event_ids)?event.payload.normalized_event_ids.map(String):[];
    if(!ids.length) return {state:"waiting_evidence",reason:"normalized_orders_missing"};
    const {data,error}=await db.from("ps_normalized_commerce_events").select("id,evidence_strength,limitations").eq("account_id",event.account_id).in("id",ids);
    if(error) throw new Error(error.message);
    const incomplete=(data??[]).filter((row:any)=>row.evidence_strength!=="strong");
    return incomplete.length?{state:"waiting_evidence",reason:"order_evidence_incomplete",detail:{events:ids.length,incomplete:incomplete.length}}:{state:"completed",reason:"order_economics_evidence_ready",detail:{events:ids.length}};
  }
  if(work.work_kind==="reconcile_settlement_evidence"){
    return event.payload.contract_term_id?{state:"completed",reason:"settlement_ready_for_explicit_reconciliation",detail:{contract_term_id:event.payload.contract_term_id}}:{state:"waiting_evidence",reason:"contract_terms_required"};
  }
  if(work.work_kind==="audit_reconciliation_outcome"){
    const runId=String(event.payload.reconciliation_run_id??"");
    if(!runId)return {state:"waiting_evidence",reason:"reconciliation_run_required"};
    const [{data:run,error:runError},{data:findings,error:findingsError}]=await Promise.all([
      db.from("ps_settlement_reconciliation_runs").select("id,status,summary").eq("id",runId).eq("account_id",event.account_id).maybeSingle(),
      db.from("ps_reconciliation_findings").select("id,conclusion,recoverability").eq("run_id",runId).eq("account_id",event.account_id),
    ]);
    if(runError||findingsError)throw new Error(runError?.message??findingsError?.message);
    if(!run)return {state:"waiting_evidence",reason:"reconciliation_run_not_visible"};
    return {state:"completed",reason:"reconciliation_outcome_verified",detail:{reconciliation_run_id:run.id,status:run.status,finding_count:(findings??[]).length,recoverable_findings:(findings??[]).filter((row:any)=>row.recoverability==="recoverable").length}};
  }
  if(work.work_kind==="audit_price_action_outcome"){
    const actionId=String(event.payload.action_id??"");
    const {data,error}=await db.from("ps_price_actions").select("id,state,platform,item_id,target_price,live_price_after,failure_reason").eq("id",actionId).eq("account_id",event.account_id).maybeSingle();
    if(error)throw new Error(error.message);if(!data)return {state:"waiting_evidence",reason:"price_action_not_visible"};
    const failed=["platform_failed","confirmation_failed","rollback_failed"].includes(String(data.state));
    return {state:failed?"dead_letter":"completed",reason:failed?"price_action_requires_recovery":"price_action_outcome_verified",detail:{action_id:data.id,state:data.state,platform:data.platform,item_id:data.item_id,target_price:data.target_price,live_price_after:data.live_price_after,failure_reason:data.failure_reason}};
  }
  if(work.work_kind==="supervise_dispatch"){
    const dispatchId=String(event.payload.dispatch_id??"");
    const {data,error}=await db.from("ps_dispatch_queue").select("id,state,channel,sku,target_price,confirmed_at,last_error").eq("id",dispatchId).eq("account_id",event.account_id).maybeSingle();
    if(error)throw new Error(error.message);if(!data)return {state:"waiting_evidence",reason:"dispatch_not_visible"};
    if(data.state==="confirmed")return {state:"completed",reason:"live_dispatch_verified",detail:{dispatch_id:data.id,channel:data.channel,sku:data.sku,target_price:data.target_price,confirmed_at:data.confirmed_at}};
    if(data.state==="dead_letter")return {state:"dead_letter",reason:"dispatch_requires_recovery",detail:{dispatch_id:data.id,channel:data.channel,sku:data.sku,error:data.last_error}};
    throw new Error(`Dispatch ${dispatchId} is still ${data.state}`);
  }
  if(work.work_kind==="authorize_store_manager_task"){
    const taskId=String(event.payload.task_id??"");
    if(!taskId)return {state:"waiting_evidence",reason:"store_manager_task_required"};
    const {data,error}=await db.from("ps_store_manager_tasks").select("id,status,risk_level,task_type,title,approved_by,approved_at").eq("id",taskId).eq("account_id",event.account_id).maybeSingle();
    if(error)throw new Error(error.message);if(!data)return {state:"waiting_evidence",reason:"store_manager_task_not_visible"};
    if(data.status==="waiting_approval")return {state:"waiting_approval",reason:"merchant_approval_required",detail:{task_id:data.id,task_type:data.task_type,risk_level:data.risk_level,title:data.title},approval:{scope:`store_manager:${data.task_type}`,expiresAt:new Date(Date.now()+24*60*60_000).toISOString()}};
    if(data.status==="cancelled")return {state:"dead_letter",reason:"store_manager_task_cancelled",detail:{task_id:data.id}};
    return {state:"completed",reason:"store_manager_task_authorized",detail:{task_id:data.id,status:data.status,approved_by:data.approved_by,approved_at:data.approved_at}};
  }
  return {state:"dead_letter",reason:"unknown_work_kind"};
}

export async function processEngineQueue(owner=crypto.randomUUID(),limit=20){
  const {error:recoveryError}=await db.rpc("ps_engine_recover_stalled",{p_actor:`worker:${owner}`,p_limit:Math.min(Math.max(limit*2,10),100)});
  if(recoveryError) throw new Error(`Engine recovery sweep failed: ${recoveryError.message}`);
  const {data,error}=await db.rpc("ps_engine_lease_work",{p_owner:owner,p_limit:Math.min(Math.max(limit,1),50)});
  if(error) throw new Error(error.message); const results:Json[]=[];
  for(const work of (data??[]) as Work[]){
    try{
      await transition(work,owner,"processing","worker_started");
      const {data:event,error:eventError}=await db.from("ps_engine_events").select("*").eq("id",work.event_id).single();
      if(eventError||!event) throw new Error(eventError?.message??"Engine event missing");
      const outcome=await execute(event as Event,work);
      if(outcome.state==="waiting_approval"&&outcome.approval){
        const {error:approvalError}=await db.rpc("ps_engine_request_approval",{p_work_item_id:work.id,p_owner:owner,p_scope:outcome.approval.scope,p_requested_by:`worker:${owner}`,p_context:outcome.detail??{},p_expires_at:outcome.approval.expiresAt});
        if(approvalError)throw new Error(approvalError.message);
      }else await transition(work,owner,outcome.state,outcome.reason,outcome.detail??{});
      results.push({work_item_id:work.id,state:outcome.state});
    }catch(error){
      const message=error instanceof Error?error.message:String(error),state=nextFailureState(work.attempt,work.max_attempts);
      const available=state==="retry_scheduled"?new Date(Date.now()+engineRetryDelayMs(work.attempt,work.id.charCodeAt(0))).toISOString():null;
      await transition(work,owner,state,"worker_failed",{},available,message.slice(0,800));
      results.push({work_item_id:work.id,state,error:message});
    }
  }
  return {leased:(data??[]).length,results};
}
