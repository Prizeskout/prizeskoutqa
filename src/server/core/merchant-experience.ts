import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { Json } from "@/integrations/supabase/types";
import type { ZidProfitBrief } from "./zid-profit-brief";
import { getRepricingHistory } from "./dispatch-history";
import { listRecoveryCases } from "./recovery-cases";
import { activateMerchantMarginPolicy, getMerchantMarginPolicy, type ApprovalMode } from "./merchant-pricing-config";

async function persistAttention(accountId:string,fingerprint:string,row:Record<string,unknown>){
  const {data:existing}=await supabaseAdmin.from("ps_attention_items").select("id,status").eq("account_id",accountId).eq("fingerprint",fingerprint).maybeSingle();
  if(existing)return supabaseAdmin.from("ps_attention_items").update(row).eq("id",existing.id);
  return supabaseAdmin.from("ps_attention_items").insert({account_id:accountId,fingerprint,status:"open",...row} as never);
}

export async function syncProfitBriefAttention(accountId:string,brief:ZidProfitBrief){
  const activeFingerprints:string[]=[];
  for(const order of brief.orders){
    if(!order.attention)continue;
    const fingerprint=`zid-order:${order.id}:${order.attention.startsWith("Product costs")?"missing-cost":order.contribution!<0?"loss":"floor"}`;
    activeFingerprints.push(fingerprint);
    const loss=order.contribution!=null&&order.contribution<0?Math.abs(order.contribution):null;
    await persistAttention(accountId,fingerprint,{item_type:loss?"loss_order":"order_evidence",title:loss?`Order ${order.code} lost ${brief.currency} ${loss.toFixed(2)}`:`Order ${order.code} needs cost evidence`,detail:order.attention,priority:loss?"high":"medium",amount:loss,currency:brief.currency,evidence_strength:loss?"verified":"unknown",source_route:"revenue_hub",copilot_prompt:loss?`Why did Zid order ${order.code} lose money?`:`Show the products in Zid order ${order.code} whose costs need confirmation.`,context:{order_id:order.id,order_code:order.code} as Json});
    if(loss)await supabaseAdmin.from("ps_value_ledger").upsert({account_id:accountId,category:"identified",source_type:"zid_order",source_id:order.id,label:`Verified loss detected on order ${order.code}`,amount:loss,currency:brief.currency,evidence_strength:"verified",metadata:{order_code:order.code} as Json},{onConflict:"account_id,source_type,source_id,category"});
  }
  for(const coupon of brief.coupons.filter(item=>item.risk==="review")){
    const fingerprint=`zid-coupon:${coupon.id}:floor-risk`;activeFingerprints.push(fingerprint);
    await persistAttention(accountId,fingerprint,{item_type:"coupon_risk",title:`Coupon ${coupon.code} needs review`,detail:`${coupon.products_below_floor} verified-cost product${coupon.products_below_floor===1?"":"s"} would fall below the active margin floor.`,priority:"high",amount:null,currency:brief.currency,evidence_strength:"strong",source_route:"revenue_hub",copilot_prompt:`Explain why coupon ${coupon.code} is unsafe and prepare a safer promotion.`,context:{coupon_id:coupon.id,coupon_code:coupon.code} as Json});
  }
  if(activeFingerprints.length){
    const {data:stale}=await supabaseAdmin.from("ps_attention_items").select("id,fingerprint,status").eq("account_id",accountId).in("item_type",["loss_order","order_evidence","coupon_risk"]).in("status",["open","assigned","snoozed"]);
    const staleIds=(stale??[]).filter(item=>!activeFingerprints.includes(item.fingerprint)).map(item=>item.id);
    if(staleIds.length)await supabaseAdmin.from("ps_attention_items").update({status:"resolved",resolution_note:"Resolved by fresh Zid readback.",resolved_at:new Date().toISOString()}).in("id",staleIds);
  }
}

export async function getMerchantExperience(accountId:string){
  const [dispatches,recoveryCases]=await Promise.all([getRepricingHistory(accountId,30),listRecoveryCases(accountId).catch(()=>[])]);
  for(const dispatch of dispatches.filter(item=>!["success","confirmed","completed"].includes(item.status.toLowerCase()))){
    await persistAttention(accountId,`dispatch:${dispatch.id}`,{item_type:"channel_failure",title:`${dispatch.target_channel??"Channel"} price update needs attention`,detail:dispatch.upstream_message??`The price update for ${dispatch.sku??"a product"} was not confirmed.`,priority:"high",amount:null,currency:dispatch.currency,evidence_strength:"verified",source_route:"history",copilot_prompt:`Explain the failed ${dispatch.target_channel??"channel"} price update for SKU ${dispatch.sku??"unknown"} and show the safest next step.`,context:{dispatch_id:dispatch.id,sku:dispatch.sku} as Json});
  }
  for(const recovery of recoveryCases){
    if(recovery.status==="recovered"&&recovery.recovered_amount>0)await supabaseAdmin.from("ps_value_ledger").upsert({account_id:accountId,category:"recovered",source_type:"recovery_case",source_id:recovery.id,label:recovery.title,amount:recovery.recovered_amount,currency:"QAR",evidence_strength:"verified",metadata:{platform:recovery.platform} as Json},{onConflict:"account_id,source_type,source_id,category"});
    if(!["recovered","closed","rejected"].includes(recovery.status))await persistAttention(accountId,`recovery:${recovery.id}`,{item_type:"payout_recovery",title:recovery.title,detail:recovery.explanation_en,priority:recovery.severity==="critical"?"critical":"high",amount:recovery.exception_amount,currency:"QAR",evidence_strength:recovery.confidence==="high"?"strong":"estimated",source_route:"history",copilot_prompt:`Review recovery case ${recovery.title} and tell me what evidence or action is still required.`,context:{recovery_case_id:recovery.id,platform:recovery.platform} as Json});
  }
  const now=new Date().toISOString(),weekAgo=new Date(Date.now()-7*86400000).toISOString();
  await supabaseAdmin.from("ps_attention_items").update({status:"open",snoozed_until:null}).eq("account_id",accountId).eq("status","snoozed").lte("snoozed_until",now);
  const [items,ledger,settings,recentResolved,profitSnapshot,proofs,firstEngagement]=await Promise.all([
    supabaseAdmin.from("ps_attention_items").select("*").eq("account_id",accountId).order("updated_at",{ascending:false}).limit(100),
    supabaseAdmin.from("ps_value_ledger").select("*").eq("account_id",accountId).order("occurred_at",{ascending:false}).limit(200),
    supabaseAdmin.from("ps_merchant_experience_settings").select("*").eq("account_id",accountId).maybeSingle(),
    supabaseAdmin.from("ps_attention_items").select("id").eq("account_id",accountId).eq("status","resolved").gte("resolved_at",weekAgo),
    supabaseAdmin.from("ps_zid_profit_snapshots").select("summary,created_at").eq("account_id",accountId).order("created_at",{ascending:false}).limit(1).maybeSingle(),
    supabaseAdmin.from("ps_outcome_proofs" as never).select("id,outcome_type,status,source_type,source_id,title,amount,currency,evidence_strength,before_state,after_state,evidence,approved_at,executed_at,verified_at,occurred_at").eq("account_id",accountId).order("occurred_at",{ascending:false}).limit(100),
    supabaseAdmin.from("ps_merchant_engagement_events").select("created_at").eq("account_id",accountId).order("created_at",{ascending:true}).limit(1).maybeSingle(),
  ]);
  const entries=ledger.data??[],totals=entries.reduce<Record<string,number>>((sum,row)=>{sum[row.category]=(sum[row.category]??0)+Number(row.amount);return sum;},{});
  const proofEntries=(proofs.data??[]) as any[],verified=proofEntries.filter(row=>row.status==="verified"),actioned=proofEntries.filter(row=>["merchant_approved","executed","verified"].includes(row.status));
  const proofTotals=proofEntries.reduce<Record<string,Record<string,number>>>((all,row)=>{const currency=String(row.currency);all[currency]??={identified:0,protected:0,recovered:0,verified:0};all[currency][row.outcome_type]=(all[currency][row.outcome_type]??0)+Number(row.amount);if(row.status==="verified")all[currency].verified+=Number(row.amount);return all;},{});
  const firstProof=proofEntries.length?proofEntries[proofEntries.length-1]:null,startedAt=firstEngagement.data?.created_at;
  return {items:items.data??[],ledger:entries,totals,recent_resolved:recentResolved.data?.length??0,profit_brief:profitSnapshot.data?.summary??null,settings:settings.data??{account_id:accountId,automation_level:"recommend",weekly_review_enabled:true,progressive_mode:true},outcome_proof:{entries:proofEntries,totals:proofTotals,verified_count:verified.length,actioned_count:actioned.length,approval_rate:proofEntries.length?actioned.length/proofEntries.length:0,time_to_first_value_hours:firstProof&&startedAt?Math.max(0,(new Date(firstProof.occurred_at).getTime()-new Date(startedAt).getTime())/3600000):null}};
}

export async function updateAttention(accountId:string,input:{id:string;action:string;value?:string}){
  const patch=input.action==="resolve"?{status:"resolved",resolution_note:(input.value??"Resolved by merchant").slice(0,500),resolved_at:new Date().toISOString()}:input.action==="dismiss"?{status:"dismissed",resolution_note:(input.value??"Dismissed by merchant").slice(0,500),resolved_at:new Date().toISOString()}:input.action==="assign"?{status:"assigned",assigned_to:(input.value??"Merchant").slice(0,160)}:input.action==="request_approval"?{status:"waiting_approval",assigned_to:(input.value??"Finance approver").slice(0,160)}:input.action==="snooze"?{status:"snoozed",snoozed_until:new Date(Date.now()+Number(input.value??1)*86400000).toISOString()}:{};
  const base=supabaseAdmin.from("ps_attention_items").update(patch).eq("account_id",accountId).eq("id",input.id).select("*").maybeSingle();
  const {data,error}=await base;if(error)throw error;
  await supabaseAdmin.from("ps_merchant_engagement_events").insert({account_id:accountId,event_name:`attention_${input.action}`,object_id:input.id,metadata:{value:input.value??null} as Json});
  return data;
}

export async function trackMerchantEngagement(accountId:string,eventName:string,objectId?:string){
  const allowed=["today_viewed","weekly_review_opened","copilot_from_attention","attention_deep_link_opened"];
  if(!allowed.includes(eventName))return;
  await supabaseAdmin.from("ps_merchant_engagement_events").insert({account_id:accountId,event_name:eventName,object_id:objectId||null});
}

export async function saveExperienceSettings(accountId:string,input:{automationLevel:string;weeklyReview:boolean;progressiveMode:boolean}){
  const allowed=["observe","recommend","approve","auto_protect"];
  if(!allowed.includes(input.automationLevel))throw new Error("Invalid automation level.");
  const {data,error}=await supabaseAdmin.from("ps_merchant_experience_settings").upsert({account_id:accountId,automation_level:input.automationLevel,weekly_review_enabled:input.weeklyReview,progressive_mode:input.progressiveMode},{onConflict:"account_id"}).select("*").single();if(error)throw error;
  const policy=await getMerchantMarginPolicy(accountId),approvalMode:ApprovalMode=input.automationLevel==="auto_protect"?"auto_within_limit":input.automationLevel==="approve"?"approval_every_change":"recommend_only";
  if(policy.approvalMode!==approvalMode){const activated=await activateMerchantMarginPolicy(accountId,{marginFloorPct:policy.marginFloorPct,minimumContributionAmount:policy.minimumContributionAmount,maxPriceIncreasePct:policy.maxPriceIncreasePct,approvalMode,overrides:policy.overrides,activatedBy:"Merchant automation controls"});if(!activated.ok)throw new Error(activated.error??"Protection policy could not be updated.");}
  return data;
}
