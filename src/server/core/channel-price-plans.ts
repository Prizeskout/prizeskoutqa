import {supabaseAdmin} from "@/integrations/supabase/client.server";
export type SavedChannelPricePlan={id:string;account_id:string;name:string;status:"draft"|"approved"|"partially_published"|"published"|"cancelled";channel_config:unknown[];rows:unknown[];approved_by:string|null;approved_at:string|null;published_at:string|null;created_at:string;updated_at:string};
export async function listChannelPricePlans(accountId:string){
  const {data,error}=await supabaseAdmin.from("ps_channel_price_plans").select("*").eq("account_id",accountId).order("created_at",{ascending:false}).limit(50);
  if(error&&error.code!=="42P01")throw error;
  return (data??[]) as SavedChannelPricePlan[];
}
export async function saveChannelPricePlan(accountId:string,name:string,channelConfig:unknown[],rows:unknown[]){
  const {data,error}=await supabaseAdmin.from("ps_channel_price_plans").insert({account_id:accountId,name,status:"draft",channel_config:channelConfig,rows}).select("*").single();
  if(error)throw error;return data as SavedChannelPricePlan;
}
export async function approveChannelPricePlan(accountId:string,id:string,reviewer:string){
  const {data,error}=await supabaseAdmin.from("ps_channel_price_plans").update({status:"approved",approved_by:reviewer,approved_at:new Date().toISOString(),updated_at:new Date().toISOString()}).eq("account_id",accountId).eq("id",id).eq("status","draft").select("*").single();
  if(error)throw error;return data as SavedChannelPricePlan;
}
