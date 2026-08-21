import {supabaseAdmin} from "@/integrations/supabase/client.server";
import type {Json} from "@/integrations/supabase/types";

type Finding={id:string;run_id:string;conclusion:string;recoverability:string;currency:string;variance:number|null;evidence_strength:string;explanation:string};
type RecoveryLink={reconciliation_finding_id:string|null};

export function buildReconciliationAttentionGroups(findings:Finding[],recoveries:RecoveryLink[]){
  const prepared=new Set(recoveries.map(row=>row.reconciliation_finding_id).filter(Boolean)),groups=new Map<string,{runId:string;recoverability:string;currency:string;findingIds:string[];amount:number;strength:string}>();
  for(const finding of findings){
    if(finding.conclusion==="reconciled"||prepared.has(finding.id))continue;
    const key=`${finding.run_id}:${finding.recoverability}:${finding.currency}`,group=groups.get(key)??{runId:finding.run_id,recoverability:finding.recoverability,currency:finding.currency,findingIds:[],amount:0,strength:finding.evidence_strength};
    group.findingIds.push(finding.id);if(typeof finding.variance==="number"&&finding.variance<0)group.amount+=Math.abs(finding.variance);groups.set(key,group);
  }
  return [...groups.values()].map(group=>({...group,amount:Math.round(group.amount*100)/100,fingerprint:`reconciliation:${group.runId}:${group.recoverability}:${group.currency}`}));
}

export async function syncReconciliationAttention(accountId:string){
  const db=supabaseAdmin as any;
  const {data:findings,error}=await db.from("ps_reconciliation_findings").select("id,run_id,conclusion,recoverability,currency,variance,evidence_strength,explanation").eq("account_id",accountId).order("created_at",{ascending:false}).limit(500);
  if(error){if(error.code==="42P01")return;throw new Error(error.message);}
  const ids=(findings??[]).map((row:any)=>row.id),{data:recoveries}=ids.length?await db.from("ps_recovery_cases").select("reconciliation_finding_id").eq("account_id",accountId).in("reconciliation_finding_id",ids):{data:[]};
  const groups=buildReconciliationAttentionGroups(findings??[],recoveries??[]),active=groups.map(group=>group.fingerprint);
  for(const group of groups){
    const claimsReady=group.recoverability==="claims_ready",evidenceNeeded=group.recoverability==="evidence_required",count=group.findingIds.length;
    const row={item_type:"payout_reconciliation",title:claimsReady?`${count} supported payout shortfall${count===1?"":"s"} ready to prepare`:evidenceNeeded?`${count} reconciliation item${count===1?" needs":"s need"} more evidence`:`${count} payout difference${count===1?" needs":"s need"} review`,detail:claimsReady?`PrizeSkout found ${group.currency} ${group.amount.toFixed(2)} in supported underpayments. Review and prepare recovery cases; nothing will be submitted automatically.`:evidenceNeeded?"The available records cannot support a reliable conclusion yet. Open the Evidence Inbox to see what is missing.":"PrizeSkout found differences that cannot yet be treated as claims-ready. Review the evidence and allocation details.",priority:claimsReady?"high":"medium",amount:group.amount||null,currency:group.currency,evidence_strength:claimsReady?"strong":group.strength==="strong"?"strong":"estimated",source_route:"evidence",copilot_prompt:"Review these payout reconciliation findings, explain the evidence strength, and show the safest next step without submitting anything externally.",context:{reconciliation_run_id:group.runId,finding_ids:group.findingIds,recoverability:group.recoverability} as Json,updated_at:new Date().toISOString()};
    const {data:existing}=await db.from("ps_attention_items").select("id,status").eq("account_id",accountId).eq("fingerprint",group.fingerprint).maybeSingle();
    if(existing){if(!["resolved","dismissed"].includes(existing.status))await db.from("ps_attention_items").update(row).eq("id",existing.id);}else await db.from("ps_attention_items").insert({account_id:accountId,fingerprint:group.fingerprint,status:"open",...row});
  }
  const {data:stale}=await db.from("ps_attention_items").select("id,fingerprint").eq("account_id",accountId).eq("item_type","payout_reconciliation").in("status",["open","assigned","waiting_approval","snoozed"]);
  const staleIds=(stale??[]).filter((row:any)=>!active.includes(row.fingerprint)).map((row:any)=>row.id);
  if(staleIds.length)await db.from("ps_attention_items").update({status:"resolved",resolution_note:"The finding was reconciled or moved into recovery work.",resolved_at:new Date().toISOString()}).in("id",staleIds);
}
