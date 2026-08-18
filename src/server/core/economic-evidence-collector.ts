import type {SupabaseClient} from "@supabase/supabase-js";
import {supabaseAdmin} from "@/integrations/supabase/client.server";
import type {Json} from "@/integrations/supabase/types";
import {gradeEconomicEvidence} from "./economic-evidence-quality";

type EvidenceDb={public:{Tables:{
  ps_shadow_intelligence_settings:{Row:{account_id:string;enabled:boolean;evaluation_only:boolean};Insert:Record<string,never>;Update:Record<string,never>;Relationships:[]};
  ps_shadow_predictions:{Row:{id:string;account_id:string;licensee_id:string;merchant_id:string;sku:string;source_platform:string|null;predicted_margin_pct:number;feature_snapshot:Json;created_at:string;horizon_hours:number};Insert:Record<string,never>;Update:Record<string,never>;Relationships:[]};
  ps_shadow_outcomes:{Row:{prediction_id:string};Insert:{prediction_id:string;account_id:string;outcome_window_start:string;outcome_window_end:string;actual_price:number|null;actual_units:number;actual_revenue:number;actual_margin:number|null;actual_margin_pct:number|null;absolute_error:number|null;prediction_error_pct:number|null;outcome_source:string;evidence:Json;quality_grade:string;completeness:number;training_eligible:boolean;limitations:string[]};Update:Record<string,never>;Relationships:[]};
  ps_economic_observations:{Row:{id:string};Insert:{account_id:string;licensee_id:string;merchant_id:string;prediction_id:string;source_platform:string;source_table:string;source_record_id:string;external_order_id:string;sku:string;event_type:string;observed_at:string;currency:string|null;units:number|null;revenue:number|null;cost:number|null;commission:number|null;tax_on_fees:number|null;reconstructed_margin:number|null;quality_grade:string;completeness:number;limitations:string[];evidence:Json;evidence_hash:string};Update:Record<string,never>;Relationships:[]};
  ps_salla_orders:{Row:{id:string;account_id:string;merchant_id:string;external_order_id:string;currency:string;status:string|null;payment_status:string|null;reconciliation_status:string;ordered_at:string|null};Insert:Record<string,never>;Update:Record<string,never>;Relationships:[]};
  ps_salla_order_items:{Row:{id:string;order_id:string;sku:string|null;quantity:number;unit_price:number|null;total:number|null;cost_total:number|null;raw_payload:Json};Insert:Record<string,never>;Update:Record<string,never>;Relationships:[]};
};Views:Record<string,never>;Functions:Record<string,never>;Enums:Record<string,never>;CompositeTypes:Record<string,never>}};

const db=supabaseAdmin as unknown as SupabaseClient<EvidenceDb>;
const n=(value:unknown)=>{const parsed=Number(value);return Number.isFinite(parsed)?parsed:null};
const round=(value:number,digits=4)=>Number(value.toFixed(digits));
async function hashEvidence(value:unknown){
  const digest=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(JSON.stringify(value)));
  return Array.from(new Uint8Array(digest)).map(byte=>byte.toString(16).padStart(2,"0")).join("");
}

/** Collects Salla evidence only where normalized SKU-level records exist. */
export async function collectEconomicEvidence(limit=100){
  if(process.env.PS_ECONOMIC_EVIDENCE_ENABLED!=="true")
    return {enabled:false,evaluated:0,observations:0,message:"Economic evidence collection is disabled."};

  const {data:settings,error:settingsError}=await db.from("ps_shadow_intelligence_settings")
    .select("account_id,enabled,evaluation_only").eq("enabled",true).eq("evaluation_only",true).limit(100);
  if(settingsError)throw settingsError;
  const accounts=(settings??[]).map(row=>row.account_id);
  if(!accounts.length)return {enabled:true,evaluated:0,observations:0};

  const cutoff=new Date(Date.now()-7*86_400_000).toISOString();
  const {data:predictions,error:predictionError}=await db.from("ps_shadow_predictions")
    .select("id,account_id,licensee_id,merchant_id,sku,source_platform,predicted_margin_pct,feature_snapshot,created_at,horizon_hours")
    .in("account_id",accounts).eq("source_platform","salla").lte("created_at",cutoff)
    .order("created_at").limit(Math.max(1,Math.min(limit,500)));
  if(predictionError)throw predictionError;
  if(!predictions?.length)return {enabled:true,evaluated:0,observations:0};

  const {data:completed,error:completedError}=await db.from("ps_shadow_outcomes")
    .select("prediction_id").in("prediction_id",predictions.map(row=>row.id));
  if(completedError)throw completedError;
  const done=new Set((completed??[]).map(row=>row.prediction_id));
  let evaluated=0,observations=0;

  for(const prediction of predictions.filter(row=>!done.has(row.id))){
    const windowStart=prediction.created_at;
    const windowEnd=new Date(Date.parse(windowStart)+Math.min(prediction.horizon_hours,168)*3_600_000).toISOString();
    const {data:orders,error:ordersError}=await db.from("ps_salla_orders")
      .select("id,external_order_id,currency,status,payment_status,reconciliation_status,ordered_at")
      .eq("account_id",prediction.account_id).eq("merchant_id",prediction.merchant_id)
      .gte("ordered_at",windowStart).lt("ordered_at",windowEnd).neq("reconciliation_status","cancelled");
    if(ordersError)throw ordersError;
    if(!orders?.length)continue;

    const orderById=new Map(orders.map(order=>[order.id,order]));
    const {data:items,error:itemsError}=await db.from("ps_salla_order_items")
      .select("id,order_id,sku,quantity,unit_price,total,cost_total,raw_payload")
      .in("order_id",orders.map(order=>order.id)).eq("sku",prediction.sku);
    if(itemsError)throw itemsError;
    if(!items?.length)continue;

    const features=(prediction.feature_snapshot&&typeof prediction.feature_snapshot==="object"&&!Array.isArray(prediction.feature_snapshot)
      ? prediction.feature_snapshot:{} ) as Record<string,Json|undefined>;
    const commissionRate=n(features.commissionRate)??0;
    const vatRate=n(features.vatRate)??0;
    const observationRows=[];
    let totalUnits=0,totalRevenue=0,totalCost=0,totalMargin=0,weightedCompleteness=0;
    let allTrainingEligible=true,overallGrade:"A"|"B"|"C"|"D"="A";
    const limitations=new Set<string>();

    for(const item of items){
      const order=orderById.get(item.order_id);if(!order)continue;
      const units=n(item.quantity);const revenue=n(item.total)??((n(item.unit_price)??0)*(units??0));const cost=n(item.cost_total);
      const quality=gradeEconomicEvidence({hasUnits:units!==null&&units>0,hasRevenue:revenue!==null,hasCost:cost!==null,orderReconciled:order.reconciliation_status==="reconciled",hasItemLevelSettlement:false});
      const commission=revenue===null?null:revenue*commissionRate;
      const taxOnFees=commission===null?null:commission*vatRate;
      const margin=revenue===null||cost===null||commission===null||taxOnFees===null?null:revenue-commission-taxOnFees-cost;
      const evidence={order_id:order.external_order_id,order_status:order.status,payment_status:order.payment_status,reconciliation_status:order.reconciliation_status,item_payload:item.raw_payload};
      observationRows.push({account_id:prediction.account_id,licensee_id:prediction.licensee_id,merchant_id:prediction.merchant_id,prediction_id:prediction.id,source_platform:"salla",source_table:"ps_salla_order_items",source_record_id:item.id,external_order_id:order.external_order_id,sku:prediction.sku,event_type:"order_item",observed_at:order.ordered_at??windowStart,currency:order.currency,units,revenue,cost,commission:commission===null?null:round(commission),tax_on_fees:taxOnFees===null?null:round(taxOnFees),reconstructed_margin:margin===null?null:round(margin),quality_grade:quality.grade,completeness:quality.completeness,limitations:quality.limitations,evidence:evidence as Json,evidence_hash:await hashEvidence(evidence)});
      totalUnits+=units??0;totalRevenue+=revenue??0;if(cost!==null)totalCost+=cost;if(margin!==null)totalMargin+=margin;
      weightedCompleteness+=quality.completeness;allTrainingEligible&&=quality.trainingEligible;
      if("ABCD".indexOf(quality.grade)>"ABCD".indexOf(overallGrade))overallGrade=quality.grade;
      quality.limitations.forEach(value=>limitations.add(value));
    }
    if(!observationRows.length)continue;
    const {error:observationError}=await db.from("ps_economic_observations").upsert(observationRows,{onConflict:"prediction_id,source_table,source_record_id,event_type",ignoreDuplicates:true});
    if(observationError)throw observationError;
    observations+=observationRows.length;
    const actualMarginPct=totalRevenue>0?totalMargin/totalRevenue:null;
    const predictedMarginPct=n(prediction.predicted_margin_pct);
    const predictionErrorPct=actualMarginPct!==null&&predictedMarginPct!==null?Math.abs(actualMarginPct-predictedMarginPct):null;
    const averagePrice=totalUnits>0?totalRevenue/totalUnits:null;
    const completeness=round(weightedCompleteness/observationRows.length,6);
    const outcomeEvidence={observation_count:observationRows.length,total_cost:round(totalCost),fee_basis:"contract_rate_reconstruction",window_hours:Math.min(prediction.horizon_hours,168)};
    const {error:outcomeError}=await db.from("ps_shadow_outcomes").insert({prediction_id:prediction.id,account_id:prediction.account_id,outcome_window_start:windowStart,outcome_window_end:windowEnd,actual_price:averagePrice===null?null:round(averagePrice),actual_units:round(totalUnits),actual_revenue:round(totalRevenue),actual_margin:actualMarginPct===null?null:round(totalMargin),actual_margin_pct:actualMarginPct===null?null:round(actualMarginPct,8),absolute_error:predictionErrorPct===null?null:round(predictionErrorPct,8),prediction_error_pct:predictionErrorPct===null?null:round(predictionErrorPct,8),outcome_source:"salla_normalized_order_items",evidence:outcomeEvidence as Json,quality_grade:overallGrade,completeness,training_eligible:allTrainingEligible&&overallGrade!=="C"&&overallGrade!=="D",limitations:[...limitations]});
    if(outcomeError)throw outcomeError;
    evaluated++;
  }
  return {enabled:true,evaluated,observations};
}
