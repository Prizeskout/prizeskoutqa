import {supabaseAdmin} from "@/integrations/supabase/client.server";
import type {Json} from "@/integrations/supabase/types";
import {assessEvidenceSourceHealth} from "./evidence-source-connections";

type EvidenceSource={id:string;provider:string;connection_kind:string;status:string;last_sync_at:string|null;last_success_at:string|null;last_error:string|null;expected_sync_interval_minutes:number|null};

const providerName=(value:string)=>value.trim().split(/[\s_-]+/).filter(Boolean).map(part=>part[0]?.toUpperCase()+part.slice(1)).join(" ")||"Evidence source";

export function buildEvidenceSourceAttention(source:EvidenceSource,now=Date.now()){
  const health=assessEvidenceSourceHealth(source,now);if(!health.attention)return null;
  const provider=providerName(source.provider),common={fingerprint:`evidence-source:${source.id}`,item_type:"evidence_source_health",amount:null,currency:null,evidence_strength:"unknown",source_route:"evidence",context:{connection_id:source.id,provider:source.provider,connection_kind:source.connection_kind,health_state:health.state,last_sync_at:source.last_sync_at,last_success_at:source.last_success_at} as Json};
  if(health.state==="failed")return {...common,title:`${provider} evidence sync failed`,detail:`PrizeSkout could not refresh this source${source.last_error?`: ${source.last_error.slice(0,300)}`:"."} Existing evidence remains available, but newer activity may be missing.`,priority:"high",copilot_prompt:`Explain why the ${provider} evidence source needs attention and show the safest troubleshooting steps.`};
  if(health.state==="late")return {...common,title:`${provider} evidence is late`,detail:"This source has not supplied evidence within its expected schedule. PrizeSkout cannot confirm whether newer orders, refunds, fees or settlements are complete until the source refreshes.",priority:"medium",copilot_prompt:`Show what evidence may be missing from the late ${provider} source and how to refresh it safely.`};
  if(health.state==="awaiting_first_sync")return {...common,title:`${provider} is waiting for its first evidence sync`,detail:"The source is authorized, but no successful evidence delivery has arrived yet. No financial coverage should be assumed until the first sync completes.",priority:"medium",copilot_prompt:`Show how to complete the first read-only evidence sync for ${provider}.`};
  return {...common,title:`Finish setting up ${provider} evidence`,detail:"This read-only evidence source has been registered but is not active yet. Complete its authorization and connector setup before relying on its coverage.",priority:"medium",copilot_prompt:`Show the remaining safe setup steps for the ${provider} evidence source.`};
}

export async function syncEvidenceSourceAttention(accountId:string){
  const db=supabaseAdmin as any,{data:sources,error}=await db.from("ps_evidence_source_connections").select("id,provider,connection_kind,status,last_sync_at,last_success_at,last_error,expected_sync_interval_minutes").eq("account_id",accountId);
  if(error){if(error.code==="42P01")return;throw new Error(error.message);}
  const warnings=(sources??[]).map((source:EvidenceSource)=>buildEvidenceSourceAttention(source)).filter(Boolean) as NonNullable<ReturnType<typeof buildEvidenceSourceAttention>>[],active=warnings.map(row=>row.fingerprint),now=new Date().toISOString();
  for(const warning of warnings){
    const {fingerprint,...row}=warning,{data:existing}=await db.from("ps_attention_items").select("id,status,resolution_note").eq("account_id",accountId).eq("fingerprint",fingerprint).maybeSingle();
    if(!existing)await db.from("ps_attention_items").insert({account_id:accountId,fingerprint,status:"open",...row});
    else if(!["dismissed"].includes(existing.status)&&!(existing.status==="resolved"&&existing.resolution_note!=="The evidence source is current or intentionally inactive."))await db.from("ps_attention_items").update({...row,status:existing.status==="resolved"?"open":existing.status,resolved_at:null,resolution_note:null}).eq("id",existing.id);
  }
  const {data:stale}=await db.from("ps_attention_items").select("id,fingerprint").eq("account_id",accountId).eq("item_type","evidence_source_health").in("status",["open","assigned","waiting_approval","snoozed"]);
  const staleIds=(stale??[]).filter((row:any)=>!active.includes(row.fingerprint)).map((row:any)=>row.id);
  if(staleIds.length)await db.from("ps_attention_items").update({status:"resolved",resolution_note:"The evidence source is current or intentionally inactive.",resolved_at:now}).in("id",staleIds);
}
