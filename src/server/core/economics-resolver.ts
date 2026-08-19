import { supabaseAdmin } from "@/integrations/supabase/client.server";

export type AuthoritativeEconomics = {
  id:string; commissionRate:number; vatRate:number; paymentFeeRate:number;
  fixedOrderFee:number; logisticsSubsidy:number; promotionContributionRate:number;
  marginFloorPct:number; channel:string; merchantId:string; effectiveFrom:string;
  effectiveTo:string|null; sourceContractId:string|null; approvedAt:string|null;
};

export async function resolveAuthoritativeEconomics(input:{accountId:string;merchantId:string;channel:string;at?:Date}):Promise<AuthoritativeEconomics|null>{
  const at=(input.at??new Date()).toISOString();
  const {data,error}=await supabaseAdmin.from("ps_economics_versions" as never).select("*")
    .eq("account_id",input.accountId).eq("merchant_id",input.merchantId).eq("channel",input.channel)
    .eq("status","approved").lte("effective_from",at).or(`effective_to.is.null,effective_to.gt.${at}`)
    .order("version",{ascending:false}).limit(1).maybeSingle();
  if(error) throw error;
  if(!data) return null;
  const row=data as unknown as Record<string,unknown>;
  return {id:String(row.id),commissionRate:Number(row.commission_rate),vatRate:Number(row.vat_rate),paymentFeeRate:Number(row.payment_fee_rate),fixedOrderFee:Number(row.fixed_order_fee),logisticsSubsidy:Number(row.logistics_subsidy),promotionContributionRate:Number(row.promotion_contribution_rate),marginFloorPct:Number(row.margin_floor_pct),channel:String(row.channel),merchantId:String(row.merchant_id),effectiveFrom:String(row.effective_from),effectiveTo:row.effective_to?String(row.effective_to):null,sourceContractId:row.source_contract_id?String(row.source_contract_id):null,approvedAt:row.approved_at?String(row.approved_at):null};
}

export async function resolveVerifiedCost(input:{accountId:string;merchantId:string;sku:string;at?:Date}){
  const at=(input.at??new Date()).toISOString();
  const {data,error}=await supabaseAdmin.from("ps_product_cost_versions" as never).select("id,amount,currency,source,effective_from,effective_to")
    .eq("account_id",input.accountId).eq("merchant_id",input.merchantId).eq("sku",input.sku)
    .lte("effective_from",at).or(`effective_to.is.null,effective_to.gt.${at}`).order("effective_from",{ascending:false}).limit(1).maybeSingle();
  if(error) throw error;
  return data as unknown as {id:string;amount:number;currency:string;source:string;effective_from:string;effective_to:string|null}|null;
}
