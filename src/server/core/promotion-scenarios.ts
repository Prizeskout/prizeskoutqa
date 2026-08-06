import { supabaseAdmin } from "@/integrations/supabase/client.server";

export type SavedPromotionScenario = {
  id:string; account_id:string; name:string; platform:string;
  status:"draft"|"pending_approval"|"approved"|"ready_to_launch"|"running"|"completed"|"cancelled";
  inputs:Record<string,unknown>; results:Record<string,unknown>;
  promised_platform_funding:number|null; actual_platform_funding:number|null;
  funding_variance:number|null; approved_by:string|null; approved_at:string|null;
  finance_approved_by:string|null; finance_approved_at:string|null;
  operations_approved_by:string|null; operations_approved_at:string|null;
  launch_manifest:Array<{channel:string;status:"connected"|"manual"|"launched";instruction:string;partner_campaign_id?:string;confirmed_at?:string}>; launch_prepared_at:string|null;
  created_at:string; updated_at:string;
};

const missingTable=(error:{code?:string;message?:string}|null)=>Boolean(error&&(error.code==="42P01"||/ps_promotion_scenarios/i.test(error.message??"")));
const table=()=>(supabaseAdmin as any).from("ps_promotion_scenarios");

export async function listPromotionScenarios(accountId:string):Promise<SavedPromotionScenario[]>{
  const {data,error}=await table().select("*").eq("account_id",accountId).order("created_at",{ascending:false}).limit(100);
  if(error&&!missingTable(error))throw error;
  return (data??[]) as SavedPromotionScenario[];
}

export async function savePromotionScenario(accountId:string,input:Omit<SavedPromotionScenario,"id"|"account_id"|"created_at"|"updated_at"|"approved_by"|"approved_at"|"finance_approved_by"|"finance_approved_at"|"operations_approved_by"|"operations_approved_at"|"launch_manifest"|"launch_prepared_at">){
  const {data,error}=await table().insert({...input,account_id:accountId}).select("*").single();
  if(error)throw error;
  return data as SavedPromotionScenario;
}

export async function updatePromotionScenario(accountId:string,id:string,patch:Partial<Pick<SavedPromotionScenario,"status"|"promised_platform_funding"|"actual_platform_funding"|"funding_variance"|"approved_by"|"approved_at"|"finance_approved_by"|"finance_approved_at"|"operations_approved_by"|"operations_approved_at"|"launch_manifest"|"launch_prepared_at">>){
  const {data,error}=await table().update({...patch,updated_at:new Date().toISOString()}).eq("account_id",accountId).eq("id",id).select("*").single();
  if(error)throw error;
  return data as SavedPromotionScenario;
}

export async function approvePromotionScenario(accountId:string,id:string,role:"finance"|"operations",reviewer:string){
  const {data:current,error}=await table().select("*").eq("account_id",accountId).eq("id",id).single() as {data:SavedPromotionScenario|null;error:{message?:string}|null};
  if(error||!current)throw new Error("Promotion scenario not found.");
  if(!["draft","pending_approval"].includes(current.status))throw new Error("Only a draft scenario can be approved.");
  const other=role==="finance"?current.operations_approved_by:current.finance_approved_by;
  if(other&&other.trim().toLowerCase()===reviewer.trim().toLowerCase())throw new Error("Finance and Operations approvals must come from different people.");
  const now=new Date().toISOString();
  const financeApproved=role==="finance"||Boolean(current.finance_approved_at);
  const operationsApproved=role==="operations"||Boolean(current.operations_approved_at);
  return updatePromotionScenario(accountId,id,{
    ...(role==="finance"?{finance_approved_by:reviewer,finance_approved_at:now}:{operations_approved_by:reviewer,operations_approved_at:now}),
    status:financeApproved&&operationsApproved?"approved":"pending_approval",
    ...(financeApproved&&operationsApproved?{approved_by:`${role==="finance"?reviewer:current.finance_approved_by} / ${role==="operations"?reviewer:current.operations_approved_by}`,approved_at:now}:{}),
  });
}

export async function preparePromotionLaunch(accountId:string,id:string,channels:string[]){
  const {data:current,error}=await table().select("*").eq("account_id",accountId).eq("id",id).eq("status","approved").single() as {data:SavedPromotionScenario|null;error:{message?:string}|null};
  if(error||!current)throw new Error("The scenario requires Finance and Operations approval before launch preparation.");
  const normalized=[...new Set(channels.map(value=>value.trim().toLowerCase()).filter(Boolean))];
  if(!normalized.length)throw new Error("Choose at least one target channel.");
  const {data:connections}=await supabaseAdmin.from("ps_merchant_channels").select("platform,status").eq("account_id",accountId);
  const connected=new Set((connections??[]).filter(item=>item.status==="connected").map(item=>item.platform));
  const launch_manifest=normalized.map(channel=>({
    channel,status:connected.has(channel)?"connected" as const:"manual" as const,
    instruction:connected.has(channel)
      ? `Connection verified. Review the campaign in ${channel.toUpperCase()} and confirm its partner campaign identifier before marking it running.`
      : `Connect ${channel.toUpperCase()} or create the campaign manually, then record the partner campaign identifier.`,
  }));
  return updatePromotionScenario(accountId,id,{status:"ready_to_launch",launch_manifest,launch_prepared_at:new Date().toISOString()});
}

export async function confirmPromotionChannelLaunch(accountId:string,id:string,channel:string,partnerCampaignId:string){
  const {data:current,error}=await table().select("*").eq("account_id",accountId).eq("id",id).in("status",["ready_to_launch","running"]).single() as {data:SavedPromotionScenario|null;error:{message?:string}|null};
  if(error||!current)throw new Error("Prepare the approved campaign for channel launch first.");
  const target=channel.trim().toLowerCase();
  if(!current.launch_manifest.some(item=>item.channel===target))throw new Error("That channel is not included in this launch manifest.");
  const confirmedAt=new Date().toISOString();
  const launch_manifest=current.launch_manifest.map(item=>item.channel===target?{...item,status:"launched" as const,partner_campaign_id:partnerCampaignId,confirmed_at:confirmedAt}:item);
  const status=launch_manifest.every(item=>item.status==="launched")?"running":"ready_to_launch";
  return updatePromotionScenario(accountId,id,{launch_manifest,status});
}
