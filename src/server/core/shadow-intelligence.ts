import type { SupabaseClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { Json } from "@/integrations/supabase/types";
import { predictShadowMargin } from "./shadow-intelligence-engine";

type ShadowDatabase = {
  public: {
    Tables: {
      ps_shadow_intelligence_settings: {
        Row: { account_id:string; enabled:boolean; evaluation_only:boolean };
        Insert: { account_id:string; enabled?:boolean; evaluation_only?:boolean };
        Update: { enabled?:boolean; evaluation_only?:boolean };
        Relationships: [];
      };
      ps_intelligence_model_versions: {
        Row: { id:string; model_key:string; version:number; status:string };
        Insert: { model_key:string; version:number; model_kind:string; status?:string };
        Update: { status?:string };
        Relationships: [];
      };
      ps_shadow_predictions: {
        Row: { id:string; decide_result_id:string; model_version_id:string };
        Insert: {
          account_id:string; licensee_id:string; merchant_id:string; region:string;
          ingest_event_id:string; decide_result_id:string; model_version_id:string; sku:string;
          observed_price:number; candidate_price:number; predicted_margin:number;
          predicted_margin_pct:number; predicted_demand_change_pct:number|null;
          risk_level:string; confidence:number; recommendation:string;
          explanation_codes:string[]; feature_snapshot:Json; horizon_hours?:number;
        };
        Update: Record<string, never>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

const shadowDb = supabaseAdmin as unknown as SupabaseClient<ShadowDatabase>;

/**
 * Records research predictions only. Two independent switches must be on:
 * the deployment flag and an account-level opt-in. Failures never touch the
 * normal decide/dispatch pipeline because this runner is called separately.
 */
export async function runShadowIntelligence(limitPerAccount=100) {
  if (process.env.PS_SHADOW_INTELLIGENCE_ENABLED !== "true") {
    return { enabled:false, accounts:0, recorded:0, message:"Shadow intelligence is disabled." };
  }

  const {data:settings,error:settingsError}=await shadowDb.from("ps_shadow_intelligence_settings")
    .select("account_id,enabled,evaluation_only").eq("enabled",true).eq("evaluation_only",true).limit(100);
  if(settingsError)throw settingsError;

  const {data:model,error:modelError}=await shadowDb.from("ps_intelligence_model_versions")
    .select("id,model_key,version,status").eq("model_key","margin-baseline").eq("version",1).eq("status","shadow").maybeSingle();
  if(modelError)throw modelError;
  if(!model)return {enabled:true,accounts:settings?.length??0,recorded:0,message:"No active shadow baseline model."};

  let recorded=0;
  for(const setting of settings??[]){
    const {data:decisions,error}=await supabaseAdmin.from("ps_decide_results")
      .select("id,ingest_event_id,account_id,licensee_id,merchant_id,region,sku,base_cost,current_retail_price,recommended_price,commission_rate,vat_rate,logistics_subsidy,margin_floor_pct,floor_breached")
      .eq("account_id",setting.account_id).order("created_at",{ascending:false}).limit(Math.max(1,Math.min(limitPerAccount,500)));
    if(error)throw error;
    if(!decisions?.length)continue;

    const decisionIds=decisions.map(decision=>decision.id);
    const {data:existing,error:existingError}=await shadowDb.from("ps_shadow_predictions")
      .select("decide_result_id").eq("model_version_id",model.id).in("decide_result_id",decisionIds);
    if(existingError)throw existingError;
    const seen=new Set((existing??[]).map(row=>row.decide_result_id));

    const rows=decisions.filter(decision=>!seen.has(decision.id)).map(decision=>{
      const prediction=predictShadowMargin({
        baseCost:Number(decision.base_cost),currentPrice:Number(decision.current_retail_price),
        recommendedPrice:decision.recommended_price===null?null:Number(decision.recommended_price),
        commissionRate:Number(decision.commission_rate),vatRate:Number(decision.vat_rate),
        logisticsSubsidy:Number(decision.logistics_subsidy),marginFloorPct:Number(decision.margin_floor_pct),
        floorBreached:Boolean(decision.floor_breached),
      });
      return {
        account_id:decision.account_id,licensee_id:decision.licensee_id,merchant_id:decision.merchant_id,
        region:decision.region,ingest_event_id:decision.ingest_event_id,decide_result_id:decision.id,
        model_version_id:model.id,sku:decision.sku,observed_price:prediction.observedPrice,
        candidate_price:prediction.candidatePrice,predicted_margin:prediction.predictedMargin,
        predicted_margin_pct:prediction.predictedMarginPct,predicted_demand_change_pct:null,
        risk_level:prediction.riskLevel,confidence:prediction.confidence,recommendation:prediction.recommendation,
        explanation_codes:prediction.explanationCodes,feature_snapshot:prediction.featureSnapshot as Json,
      };
    });
    if(!rows.length)continue;
    const {error:insertError}=await shadowDb.from("ps_shadow_predictions").upsert(rows,{onConflict:"decide_result_id,model_version_id,horizon_hours",ignoreDuplicates:true});
    if(insertError)throw insertError;
    recorded+=rows.length;
  }
  return {enabled:true,accounts:settings?.length??0,recorded};
}
