import { supabaseAdmin } from "@/integrations/supabase/client.server";

export type SavedPromotionScenario = {
  id:string; account_id:string; name:string; platform:string;
  status:"draft"|"approved"|"running"|"completed"|"cancelled";
  inputs:Record<string,unknown>; results:Record<string,unknown>;
  promised_platform_funding:number|null; actual_platform_funding:number|null;
  funding_variance:number|null; approved_by:string|null; approved_at:string|null;
  created_at:string; updated_at:string;
};

const missingTable=(error:{code?:string;message?:string}|null)=>Boolean(error&&(error.code==="42P01"||/ps_promotion_scenarios/i.test(error.message??"")));

export async function listPromotionScenarios(accountId:string):Promise<SavedPromotionScenario[]>{
  const {data,error}=await supabaseAdmin.from("ps_promotion_scenarios").select("*").eq("account_id",accountId).order("created_at",{ascending:false}).limit(100);
  if(error&&!missingTable(error))throw error;
  return (data??[]) as SavedPromotionScenario[];
}

export async function savePromotionScenario(accountId:string,input:Omit<SavedPromotionScenario,"id"|"account_id"|"created_at"|"updated_at"|"approved_by"|"approved_at">){
  const {data,error}=await supabaseAdmin.from("ps_promotion_scenarios").insert({...input,account_id:accountId}).select("*").single();
  if(error)throw error;
  return data as SavedPromotionScenario;
}

export async function updatePromotionScenario(accountId:string,id:string,patch:Partial<Pick<SavedPromotionScenario,"status"|"promised_platform_funding"|"actual_platform_funding"|"funding_variance"|"approved_by"|"approved_at">>){
  const {data,error}=await supabaseAdmin.from("ps_promotion_scenarios").update({...patch,updated_at:new Date().toISOString()}).eq("account_id",accountId).eq("id",id).select("*").single();
  if(error)throw error;
  return data as SavedPromotionScenario;
}
