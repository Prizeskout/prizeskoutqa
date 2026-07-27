import {supabaseAdmin} from "@/integrations/supabase/client.server";
export type GroupControls={id:string;account_id:string;group_name:string;legal_entities:unknown[];brands:unknown[];branches:unknown[];members:unknown[];finance_approved_by:string|null;finance_approved_at:string|null;operations_approved_by:string|null;operations_approved_at:string|null;created_at:string;updated_at:string};
export async function getGroupControls(accountId:string){
  const {data,error}=await supabaseAdmin.from("ps_group_controls").select("*").eq("account_id",accountId).maybeSingle();
  if(error&&error.code!=="42P01")throw error;return data as GroupControls|null;
}
export async function saveGroupControls(accountId:string,input:Pick<GroupControls,"group_name"|"legal_entities"|"brands"|"branches"|"members">){
  const {data,error}=await supabaseAdmin.from("ps_group_controls").upsert({account_id:accountId,...input,finance_approved_by:null,finance_approved_at:null,operations_approved_by:null,operations_approved_at:null,updated_at:new Date().toISOString()},{onConflict:"account_id"}).select("*").single();
  if(error)throw error;return data as GroupControls;
}
export async function approveGroupControls(accountId:string,role:"finance"|"operations",reviewer:string){
  const now=new Date().toISOString();const patch=role==="finance"?{finance_approved_by:reviewer,finance_approved_at:now}:{operations_approved_by:reviewer,operations_approved_at:now};
  const {data,error}=await supabaseAdmin.from("ps_group_controls").update({...patch,updated_at:now}).eq("account_id",accountId).select("*").single();
  if(error)throw error;return data as GroupControls;
}
