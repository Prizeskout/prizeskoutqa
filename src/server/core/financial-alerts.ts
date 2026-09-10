import {supabaseAdmin} from "@/integrations/supabase/client.server";
import {createNotification} from "@/server/notifications";
import type {EconomicTwinDimension,EconomicTwinSummary} from "./dashboard-stats";

type Rule={id:string;name:string;metric:"gross_sales"|"contribution"|"payout_variance"|"margin"|"recoverable_amount";operator:"gt"|"gte"|"lt"|"lte";threshold:number;severity:"info"|"warning"|"critical";platform:string|null;branch_external_id:string|null;enabled:boolean};
const compare=(value:number,operator:Rule["operator"],threshold:number)=>operator==="gt"?value>threshold:operator==="gte"?value>=threshold:operator==="lt"?value<threshold:value<=threshold;
function dimension(rule:Rule,twin:EconomicTwinSummary):EconomicTwinDimension|null{
  if(rule.branch_external_id)return twin.by_branch.find(row=>row.key===rule.branch_external_id)??null;
  if(rule.platform)return twin.by_channel.find(row=>row.key.toLowerCase()===rule.platform!.toLowerCase())??null;
  return null;
}
export function evaluateFinancialRule(rule:Rule,twin:EconomicTwinSummary){
  const scoped=dimension(rule,twin);let value:number|null=null;
  if(rule.metric==="gross_sales")value=scoped?.gross_sales??twin.gross_sales;
  if(rule.metric==="contribution")value=scoped?.contribution??twin.contribution;
  if(rule.metric==="margin")value=scoped?.margin_pct??twin.contribution_margin_pct;
  if(rule.metric==="payout_variance"&&!scoped)value=Math.abs(twin.variance);
  if(rule.metric==="recoverable_amount"&&!scoped)value=twin.recoverable_amount;
  return {triggered:value!==null&&compare(value,rule.operator,Number(rule.threshold)),value};
}
export async function evaluateFinancialAlerts(accountId:string,twin:EconomicTwinSummary){
  if(!twin.orders)return;
  const {data,error}=await (supabaseAdmin as any).from("ps_alert_rules").select("id,name,metric,operator,threshold,severity,platform,branch_external_id,enabled").eq("account_id",accountId).eq("enabled",true);
  if(error){console.error("Financial alert rule lookup failed",error);return;}
  for(const rule of (data??[]) as Rule[]){const result=evaluateFinancialRule(rule,twin);if(!result.triggered)continue;const scope=rule.branch_external_id?`branch ${rule.branch_external_id}`:rule.platform??"restaurant";await createNotification({userId:accountId,category:"pricing",severity:rule.severity==="critical"?"error":rule.severity,title:rule.name,body:`${rule.metric.replaceAll("_"," ")} is ${result.value} for ${scope}; rule ${rule.operator} ${rule.threshold}.`,linkTo:"/dashboard/settings?tab=notifications",preferenceKey:"margin_breach",dedupeKey:`financial-rule:${rule.id}:${result.value}`,dedupeWindowMinutes:1440});}
}
