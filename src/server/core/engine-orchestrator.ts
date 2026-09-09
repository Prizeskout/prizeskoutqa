import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { engineRetryDelayMs, nextFailureState, type EngineWorkState } from "./engine-state-machine";

type Json = Record<string, unknown>;
export type EngineEventInput = { accountId:string; merchantId?:string|null; eventType:string; source:string; sourceEventId:string; schemaVersion:string; payload:Json; workKind:string; occurredAt?:string|null; priority?:number };
type Work = { id:string; account_id:string; event_id:string; work_kind:string; state:EngineWorkState; attempt:number; max_attempts:number };
type Event = { id:string; account_id:string; merchant_id:string|null; event_type:string; source:string; payload:Json };
type Outcome = { state:"completed"|"waiting_evidence"|"waiting_approval"|"verifying"|"dead_letter"; reason:string; detail?:Json };

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
  return {state:"dead_letter",reason:"unknown_work_kind"};
}

export async function processEngineQueue(owner=crypto.randomUUID(),limit=20){
  const {data,error}=await db.rpc("ps_engine_lease_work",{p_owner:owner,p_limit:Math.min(Math.max(limit,1),50)});
  if(error) throw new Error(error.message); const results:Json[]=[];
  for(const work of (data??[]) as Work[]){
    try{
      await transition(work,owner,"processing","worker_started");
      const {data:event,error:eventError}=await db.from("ps_engine_events").select("*").eq("id",work.event_id).single();
      if(eventError||!event) throw new Error(eventError?.message??"Engine event missing");
      const outcome=await execute(event as Event,work);
      await transition(work,owner,outcome.state,outcome.reason,outcome.detail??{});
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
