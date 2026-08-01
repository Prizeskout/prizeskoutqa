import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { DEFAULT_MARGIN_FLOOR } from "./decide-engine";
import type { ApprovalMode } from "./margin-policy";
export type { ApprovalMode } from "./margin-policy";

export type MerchantMarginPolicy = { marginFloorPct:number; maxPriceIncreasePct:number; approvalMode:ApprovalMode; version:number; activatedBy:string|null; activatedAt:string|null };

const fallback:MerchantMarginPolicy={marginFloorPct:DEFAULT_MARGIN_FLOOR,maxPriceIncreasePct:.15,approvalMode:"recommend_only",version:1,activatedBy:null,activatedAt:null};

export async function getMerchantMarginPolicy(accountId:string):Promise<MerchantMarginPolicy>{
  if(!accountId)return fallback;
  const {data}=await supabaseAdmin.from("ps_merchant_pricing_config").select("margin_floor_pct,max_price_increase_pct,approval_mode,active_version,activated_by,activated_at").eq("account_id",accountId).maybeSingle();
  if(!data)return fallback;
  return {marginFloorPct:Number(data.margin_floor_pct),maxPriceIncreasePct:Number(data.max_price_increase_pct),approvalMode:data.approval_mode as ApprovalMode,version:Number(data.active_version),activatedBy:data.activated_by,activatedAt:data.activated_at};
}
export async function getMerchantMarginFloor(accountId:string){return (await getMerchantMarginPolicy(accountId)).marginFloorPct;}

export async function activateMerchantMarginPolicy(accountId:string,input:{marginFloorPct:number;maxPriceIncreasePct:number;approvalMode:ApprovalMode;activatedBy:string}):Promise<{ok:boolean;policy?:MerchantMarginPolicy;error?:string}>{
  if(!accountId)return {ok:false,error:"account_id required"};
  if(!(input.marginFloorPct>0&&input.marginFloorPct<1))return {ok:false,error:"Contribution margin must be between 0% and 100%."};
  if(!(input.maxPriceIncreasePct>=0&&input.maxPriceIncreasePct<=1))return {ok:false,error:"Maximum price increase must be between 0% and 100%."};
  if(!["recommend_only","auto_within_limit","approval_every_change"].includes(input.approvalMode))return {ok:false,error:"Invalid approval mode."};
  const current=await getMerchantMarginPolicy(accountId),version=current.version+1,now=new Date().toISOString();
  const {error:historyError}=await supabaseAdmin.from("ps_margin_policy_versions").insert({account_id:accountId,version,contribution_margin_floor_pct:input.marginFloorPct,max_price_increase_pct:input.maxPriceIncreasePct,approval_mode:input.approvalMode,status:"active",activated_by:input.activatedBy,activated_at:now});
  if(historyError)return {ok:false,error:"Failed to create policy version."};
  await supabaseAdmin.from("ps_margin_policy_versions").update({status:"superseded",superseded_at:now}).eq("account_id",accountId).eq("status","active").neq("version",version);
  const {error}=await supabaseAdmin.from("ps_merchant_pricing_config").upsert({account_id:accountId,margin_floor_pct:input.marginFloorPct,max_price_increase_pct:input.maxPriceIncreasePct,approval_mode:input.approvalMode,active_version:version,activated_by:input.activatedBy,activated_at:now,updated_at:now},{onConflict:"account_id"});
  if(error)return {ok:false,error:"Failed to activate policy."};
  return {ok:true,policy:{marginFloorPct:input.marginFloorPct,maxPriceIncreasePct:input.maxPriceIncreasePct,approvalMode:input.approvalMode,version,activatedBy:input.activatedBy,activatedAt:now}};
}

export async function listMerchantMarginPolicyVersions(accountId:string){const {data}=await supabaseAdmin.from("ps_margin_policy_versions").select("*").eq("account_id",accountId).order("version",{ascending:false}).limit(20);return data??[];}
