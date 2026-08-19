import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { DEFAULT_MARGIN_FLOOR } from "./decide-engine";
import type { ApprovalMode } from "./margin-policy";
export type { ApprovalMode } from "./margin-policy";

export type ChannelMarginPolicyOverride = { channel:string; servicePath:string; marginFloorPct:number; minimumContributionAmount:number; maxPriceIncreasePct:number; approvalMode:ApprovalMode };
export type MerchantMarginPolicy = { marginFloorPct:number; minimumContributionAmount:number; maxPriceIncreasePct:number; approvalMode:ApprovalMode; version:number; activatedBy:string|null; activatedAt:string|null; overrides:ChannelMarginPolicyOverride[]; scope:"global"|"channel"; channel:string|null };

const fallback:MerchantMarginPolicy={marginFloorPct:DEFAULT_MARGIN_FLOOR,minimumContributionAmount:0,maxPriceIncreasePct:.15,approvalMode:"recommend_only",version:1,activatedBy:null,activatedAt:null,overrides:[],scope:"global",channel:null};

export async function getMerchantMarginPolicy(accountId:string):Promise<MerchantMarginPolicy>{
  if(!accountId)return fallback;
  const {data}=await (supabaseAdmin as any).from("ps_merchant_pricing_config").select("margin_floor_pct,minimum_contribution_amount,max_price_increase_pct,approval_mode,active_version,activated_by,activated_at").eq("account_id",accountId).maybeSingle();
  if(!data)return fallback;
  const {data:rows}=await (supabaseAdmin as any).from("ps_channel_margin_policy_overrides").select("channel,service_path,contribution_margin_floor_pct,minimum_contribution_amount,max_price_increase_pct,approval_mode").eq("account_id",accountId).eq("status","active");
  const overrides:ChannelMarginPolicyOverride[]=(rows??[]).map((row:any)=>({channel:String(row.channel),servicePath:String(row.service_path??"default"),marginFloorPct:Number(row.contribution_margin_floor_pct),minimumContributionAmount:Number(row.minimum_contribution_amount??0),maxPriceIncreasePct:Number(row.max_price_increase_pct),approvalMode:row.approval_mode as ApprovalMode}));
  return {marginFloorPct:Number(data.margin_floor_pct),minimumContributionAmount:Number((data as any).minimum_contribution_amount??0),maxPriceIncreasePct:Number(data.max_price_increase_pct),approvalMode:data.approval_mode as ApprovalMode,version:Number(data.active_version),activatedBy:data.activated_by,activatedAt:data.activated_at,overrides,scope:"global",channel:null};
}
export async function getMerchantMarginFloor(accountId:string){return (await getMerchantMarginPolicy(accountId)).marginFloorPct;}

export async function resolveMerchantMarginPolicy(accountId:string,channel:string,servicePath="default"):Promise<MerchantMarginPolicy>{
  const global=await getMerchantMarginPolicy(accountId);
  const override=global.overrides.find(item=>item.channel===channel&&item.servicePath===servicePath)
    ?? global.overrides.find(item=>item.channel===channel&&item.servicePath==="default");
  return override?{...global,...override,scope:"channel",channel}:global;
}

export async function activateMerchantMarginPolicy(accountId:string,input:{marginFloorPct:number;minimumContributionAmount?:number;maxPriceIncreasePct:number;approvalMode:ApprovalMode;activatedBy:string;overrides?:ChannelMarginPolicyOverride[]}):Promise<{ok:boolean;policy?:MerchantMarginPolicy;error?:string}>{
  if(!accountId)return {ok:false,error:"account_id required"};
  if(!(input.marginFloorPct>0&&input.marginFloorPct<1))return {ok:false,error:"Contribution margin must be between 0% and 100%."};
  if(!(input.maxPriceIncreasePct>=0&&input.maxPriceIncreasePct<=1))return {ok:false,error:"Maximum price increase must be between 0% and 100%."};
  if(!Number.isFinite(input.minimumContributionAmount??0)||(input.minimumContributionAmount??0)<0)return {ok:false,error:"Minimum cash contribution must be zero or greater."};
  if(!["recommend_only","auto_within_limit","approval_every_change"].includes(input.approvalMode))return {ok:false,error:"Invalid approval mode."};
  for(const item of input.overrides??[]){if(!item.channel||!(item.marginFloorPct>0&&item.marginFloorPct<1)||item.minimumContributionAmount<0||item.maxPriceIncreasePct<0||item.maxPriceIncreasePct>1||!["recommend_only","auto_within_limit","approval_every_change"].includes(item.approvalMode))return {ok:false,error:`${item.channel||"Channel"} override contains an invalid policy value.`};}
  const now=new Date().toISOString();
  const {data,error}=await (supabaseAdmin as any).rpc("activate_margin_policy_v2",{p_account_id:accountId,p_margin_floor:input.marginFloorPct,p_minimum_contribution:input.minimumContributionAmount??0,p_max_increase:input.maxPriceIncreasePct,p_approval_mode:input.approvalMode,p_activated_by:input.activatedBy,p_overrides:input.overrides??[]});
  if(error||!Number.isFinite(Number(data)))return {ok:false,error:"Failed to activate the complete margin policy. No partial policy was applied."};
  const version=Number(data);
  return {ok:true,policy:{marginFloorPct:input.marginFloorPct,minimumContributionAmount:input.minimumContributionAmount??0,maxPriceIncreasePct:input.maxPriceIncreasePct,approvalMode:input.approvalMode,version,activatedBy:input.activatedBy,activatedAt:now,overrides:input.overrides??[],scope:"global",channel:null}};
}

export async function listMerchantMarginPolicyVersions(accountId:string){const {data}=await supabaseAdmin.from("ps_margin_policy_versions").select("*").eq("account_id",accountId).order("version",{ascending:false}).limit(20);return data??[];}
