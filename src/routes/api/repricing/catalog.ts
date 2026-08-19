// GET /api/repricing/catalog?merchant_id=...&access_code=...
//
// Returns every product in the merchant's catalog with the latest
// decide-engine recommendation, ready for the repricing dashboard.
//
// Auth: ps_access_codes table (access_code → merchant_id).

import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { decide as calculateMargin } from "@/server/core/decide-engine";
import { getMerchantMarginPolicy, resolveMerchantMarginPolicy } from "@/server/core/merchant-pricing-config";
import { publicationEvidenceBlockers } from "@/server/core/pricing-evidence";

export type RepricingProduct = {
  ingest_event_id: string;
  decide_result_id: string | null;
  sku: string;
  name_en: string;
  name_ar: string;
  source_platform: string;
  item_id: string;
  current_price: number;
  recommended_price: number;
  net_margin_pct: number | null;
  floor_breached: boolean;
  decision_action: string;
  currency: string;
  status: string;
  inventory_status: string;
  inventory_quantity: number | null;
  inventory_is_infinite: boolean;
  repriced_at: string | null;
  margin_floor_pct: number;
  commission_rate: number;
  cost_confidence: "verified" | "estimated" | "unknown";
  base_cost: number | null;
  preview?: { required_price:number|null; allowed_price:number|null; current_margin_pct:number; projected_margin_at_required:number|null; projected_margin_at_allowed:number|null; floor_breached:boolean; required_increase_pct:number; allowed_increase_pct:number; maximum_increase_pct:number; margin_floor_pct:number; minimum_contribution_amount:number; policy_version:number; policy_scope:"global"|"channel"; approval_mode:"recommend_only"|"auto_within_limit"|"approval_every_change"; evidence_blockers:string[]; outcome:"safe"|"blocked_missing_cost"|"blocked_missing_economics"|"blocked_stale_evidence"|"within_limit"|"cannot_reach_target_within_limit" };
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export const Route = createFileRoute("/api/repricing/catalog")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const merchantId = url.searchParams.get("merchant_id")?.trim();
        const accessCode = url.searchParams.get("access_code")?.trim().toUpperCase();
        const previewFloor=Number(url.searchParams.get("preview_floor"));
        const previewMaxIncrease=Number(url.searchParams.get("preview_max_increase"));
        const previewMinimumContribution=Number(url.searchParams.get("preview_minimum_contribution")??0);
        let previewOverrides:Array<{channel:string;marginFloorPct:number;minimumContributionAmount:number;maxPriceIncreasePct:number}>=[];
        try{const parsed=JSON.parse(url.searchParams.get("preview_channel_overrides")??"[]");if(Array.isArray(parsed))previewOverrides=parsed.filter(item=>item&&typeof item.channel==="string");}catch{previewOverrides=[];}
        const wantsPreview=previewFloor>0&&previewFloor<1&&previewMaxIncrease>=0&&previewMaxIncrease<=1;

        if (!merchantId || !accessCode) {
          return json({ error: "Your PrizeSkout session is incomplete.", action: "Open the dashboard again and retry." }, 400);
        }

        // Validate access code
        const { data: codeRow } = await supabaseAdmin
          .from("ps_access_codes" as never)
          .select("merchant_id")
          .eq("code", accessCode)
          .maybeSingle() as { data: { merchant_id: string } | null };

        if (!codeRow || codeRow.merchant_id !== merchantId) {
          return json({ error: "Your PrizeSkout session has expired.", action: "Sign in or reopen PrizeSkout from your connected platform." }, 403);
        }

        const accountId = merchantId;
        const activePolicy=await getMerchantMarginPolicy(accountId);

        // Use the complete economics snapshot that produced the decision. This
        // keeps the preview consistent with the active contract, including
        // payment fees, fixed fees and merchant-funded promotions.
        const { data: decideRows, error: decideErr } = await (supabaseAdmin as any)
          .from("ps_decide_results")
          .select("id, sku, base_cost, current_retail_price, recommended_price, net_margin_pct, margin_floor_pct, commission_rate, vat_rate, payment_fee_rate, fixed_order_fee, promotion_contribution_rate, logistics_subsidy, floor_breached, decision_action, ingest_event_id, economics_version_id, margin_policy_version, cost_observed_at, cost_evidence_expires_at, decision_expires_at, evidence_channel, evidence_item_id, evidence_currency, created_at")
          .eq("account_id", accountId)
          .order("created_at", { ascending: false });

        if (decideErr) {
          return json({ error: "We could not load your price recommendations.", action: "Refresh the page and try again. No prices were changed." }, 500);
        }

        // The catalog is the source of truth for what was synced. A product
        // without a decision (usually because cost is missing) must still be
        // visible so the merchant can fix it.
        const { data: ingestRows, error:ingestError } = await supabaseAdmin
          .from("ps_ingest_events")
          .select("id, merchant_id, sku, item_name_en, item_name_ar, source_platform, item_id, current_retail_price, currency, status, inventory_status, raw_payload")
          .eq("account_id", accountId)
          .order("created_at",{ascending:false});
        if(ingestError)return json({error:"We could not load your synced products.",action:"Refresh the page or sync the connected store again. No prices were changed."},500);
        const channels=[...new Set((ingestRows??[]).map(row=>row.source_platform).filter((value):value is string=>!!value))];
        const policies=new Map((await Promise.all(channels.map(async channel=>[channel,await resolveMerchantMarginPolicy(accountId,channel)] as const))));
        const economicsIds=[...new Set<string>((decideRows??[]).map((row:any)=>String(row.economics_version_id??"")).filter((value:string)=>!!value))];
        const {data:economicsRows}=economicsIds.length?await (supabaseAdmin as any).from("ps_economics_versions").select("id,account_id,merchant_id,channel,status,effective_from,effective_to,source_contract_id").in("id",economicsIds):{data:[]};
        const economicsById=new Map((economicsRows??[]).map((row:any)=>[String(row.id),row]));

        const decisionByEvent=new Map<string,any>();
        for(const row of decideRows??[])if(!decisionByEvent.has(row.ingest_event_id))decisionByEvent.set(row.ingest_event_id,row);
        const seenProducts=new Set<string>();

        const products: RepricingProduct[] = [];
        for (const evt of ingestRows??[]) {
          if(!evt.item_id)continue;
          const productKey=`${evt.source_platform}:${evt.item_id}`;
          if(seenProducts.has(productKey))continue;
          seenProducts.add(productKey);
          const rawPayload = evt.raw_payload as Record<string, unknown> | null;
          const costSource = String(rawPayload?.cost_source ?? "unknown");
          const missingEconomics = rawPayload?.economics_source === "approved_contract_required";
          // Never reuse a historical recommendation after a refresh establishes
          // that approved channel terms are currently unavailable.
          const decision=missingEconomics ? undefined : decisionByEvent.get(evt.id);

          const currentPrice=Number(evt.current_retail_price??0);
          const resolvedPolicy=policies.get(evt.source_platform??"")??activePolicy;
          const previewOverride=previewOverrides.find(item=>item.channel===evt.source_platform);
          const effectiveFloor=wantsPreview?(previewOverride?.marginFloorPct??previewFloor):resolvedPolicy.marginFloorPct;
          const effectiveMaxIncrease=wantsPreview?(previewOverride?.maxPriceIncreasePct??previewMaxIncrease):resolvedPolicy.maxPriceIncreasePct;
          const effectiveMinimumContribution=wantsPreview?(previewOverride?.minimumContributionAmount??previewMinimumContribution):resolvedPolicy.minimumContributionAmount;
          const economics=decision?{region:"SA",baseCost:Number(decision.base_cost),commissionRate:Number(decision.commission_rate),vatRate:Number(decision.vat_rate),paymentFeeRate:Number(decision.payment_fee_rate??0),fixedOrderFee:Number(decision.fixed_order_fee??0),promotionContributionRate:Number(decision.promotion_contribution_rate??0),logisticsSubsidy:Number(decision.logistics_subsidy),marginFloorPct:effectiveFloor,minimumContributionAmount:effectiveMinimumContribution}:null;
          const currentAnalysis=costSource==="platform_catalog"&&economics?calculateMargin({...economics,currentRetailPrice:currentPrice}):null;
          const requiredPrice=currentAnalysis?.recommendedPrice??null;
          const maximumAllowedPrice=currentPrice>0?Math.round(currentPrice*(1+effectiveMaxIncrease)*100)/100:null;
          const allowedPrice=requiredPrice==null?null:maximumAllowedPrice==null?requiredPrice:Math.min(requiredPrice,maximumAllowedPrice);
          const projectedRequired=requiredPrice&&economics?calculateMargin({...economics,currentRetailPrice:requiredPrice}):null;
          const projectedAllowed=allowedPrice&&economics?calculateMargin({...economics,currentRetailPrice:allowedPrice}):null;
          const requiredIncrease=requiredPrice&&currentPrice>0?(requiredPrice-currentPrice)/currentPrice:0;
          const allowedIncrease=allowedPrice&&currentPrice>0?(allowedPrice-currentPrice)/currentPrice:0;
          const economicsRow:any=decision?.economics_version_id?economicsById.get(String(decision.economics_version_id)):null;
          const evidenceBlockers=decision?publicationEvidenceBlockers({activePolicyVersion:resolvedPolicy.version,decisionPolicyVersion:decision.margin_policy_version==null?null:Number(decision.margin_policy_version),decisionExpiresAt:decision.decision_expires_at,costObservedAt:decision.cost_observed_at,costEvidenceExpiresAt:decision.cost_evidence_expires_at,sourcePlatform:evt.source_platform??"",itemId:evt.item_id,currency:evt.currency??"SAR",evidenceChannel:decision.evidence_channel,evidenceItemId:decision.evidence_item_id,evidenceCurrency:decision.evidence_currency,decisionEconomicsVersionId:decision.economics_version_id?String(decision.economics_version_id):null,accountId,merchantId:evt.merchant_id??accountId,economics:economicsRow?{id:String(economicsRow.id),accountId:String(economicsRow.account_id),merchantId:String(economicsRow.merchant_id),channel:String(economicsRow.channel),status:String(economicsRow.status),effectiveFrom:String(economicsRow.effective_from),effectiveTo:economicsRow.effective_to?String(economicsRow.effective_to):null,sourceContractId:economicsRow.source_contract_id?String(economicsRow.source_contract_id):null}:null}):[];
          products.push({
            ingest_event_id: evt.id,
            decide_result_id: decision?.id??null,
            sku: decision?.sku ?? evt.sku ?? "",
            name_en: evt.item_name_en ?? "",
            name_ar: (evt as unknown as Record<string, unknown>).item_name_ar as string ?? "",
            source_platform: evt.source_platform ?? "",
            item_id: evt.item_id,
            current_price: Number(evt.current_retail_price ?? 0),
            recommended_price: requiredPrice ?? currentPrice,
            net_margin_pct: currentAnalysis?.netMarginPct??(decision?Number(decision.net_margin_pct):null),
            floor_breached: currentAnalysis?.floorBreached??Boolean(decision?.floor_breached),
            decision_action: decision?.decision_action ?? (missingEconomics ? "blocked_missing_economics" : "blocked_missing_cost"),
            currency: evt.currency ?? "SAR",
            status: evt.status ?? "received",
            inventory_status: evt.inventory_status ?? "unknown",
            inventory_quantity: rawPayload?.quantity == null ? null : Number(rawPayload.quantity),
            inventory_is_infinite: Boolean(rawPayload?.is_infinite),
            repriced_at: evt.status === "repriced" ? new Date().toISOString() : null,
            margin_floor_pct: Number(decision?.margin_floor_pct ?? 0.18),
            commission_rate: Number(decision?.commission_rate ?? 0),
            cost_confidence: costSource === "platform_catalog"
              ? "verified"
              : costSource.startsWith("estimated_") ? "estimated" : "unknown",
            base_cost: costSource === "platform_catalog" && decision
              ? Number(decision.base_cost)
              : null,
            preview:currentAnalysis?{required_price:requiredPrice==null?null:Math.round(requiredPrice*100)/100,allowed_price:allowedPrice==null?null:Math.round(allowedPrice*100)/100,current_margin_pct:currentAnalysis.netMarginPct,projected_margin_at_required:projectedRequired?.netMarginPct??null,projected_margin_at_allowed:projectedAllowed?.netMarginPct??null,floor_breached:currentAnalysis.floorBreached,required_increase_pct:requiredIncrease,allowed_increase_pct:allowedIncrease,maximum_increase_pct:effectiveMaxIncrease,margin_floor_pct:effectiveFloor,minimum_contribution_amount:effectiveMinimumContribution,policy_version:resolvedPolicy.version,policy_scope:resolvedPolicy.scope,approval_mode:resolvedPolicy.approvalMode,evidence_blockers:evidenceBlockers,outcome:evidenceBlockers.length?"blocked_stale_evidence":!currentAnalysis.floorBreached?"safe":requiredIncrease<=effectiveMaxIncrease?"within_limit":"cannot_reach_target_within_limit"}:{required_price:null,allowed_price:null,current_margin_pct:Number(decision?.net_margin_pct??0),projected_margin_at_required:null,projected_margin_at_allowed:null,floor_breached:Boolean(decision?.floor_breached),required_increase_pct:0,allowed_increase_pct:0,maximum_increase_pct:effectiveMaxIncrease,margin_floor_pct:effectiveFloor,minimum_contribution_amount:effectiveMinimumContribution,policy_version:resolvedPolicy.version,policy_scope:resolvedPolicy.scope,approval_mode:resolvedPolicy.approvalMode,evidence_blockers:evidenceBlockers,outcome:missingEconomics?"blocked_missing_economics":"blocked_missing_cost"},
          });
        }

        // Sort: floor-breached first, then by abs(price change) descending
        products.sort((a, b) => {
          if (a.preview?.floor_breached && !b.preview?.floor_breached) return -1;
          if (!a.preview?.floor_breached && b.preview?.floor_breached) return 1;
          const aDelta = Math.abs((a.preview?.required_price??a.current_price) - a.current_price);
          const bDelta = Math.abs((b.preview?.required_price??b.current_price) - b.current_price);
          return bDelta - aDelta;
        });

        return json({ products });
      },
    },
  },
});
