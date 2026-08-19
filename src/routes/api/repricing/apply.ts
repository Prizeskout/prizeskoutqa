// POST /api/repricing/apply
//
// Pushes an updated price to the merchant's connected platform (Salla, Zid,
// Foodics) for a specific product, then marks the ingest event as repriced.
//
// Body:
//   merchant_id     — the merchant UUID from localStorage
//   access_code     — ps_access_code from localStorage (validates the caller)
//   ingest_event_id — which product to reprice (from /api/repricing/catalog)
//   target_price    — the new price (recommended or manual override)
//
// Returns: { ok, platform, message?, httpStatus }

import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { fetchLiveProductPrice, pushPriceToSourcePlatform } from "@/server/core/platform-sync";
import { getValidSallaAccessToken } from "@/server/core/salla-token";
import { resolveMerchantMarginPolicy } from "@/server/core/merchant-pricing-config";
import { decide } from "@/server/core/decide-engine";
import { recordPendingJahezPropagation } from "@/server/core/zid-jahez-bridge";
import { toMerchantError } from "@/server/merchant-errors";

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export const Route = createFileRoute("/api/repricing/apply")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = await request.json().catch(() => null) as {
          merchant_id?: string;
          access_code?: string;
          ingest_event_id?: string;
          target_price?: number;
        } | null;

        const merchantId    = body?.merchant_id?.trim();
        const accessCode    = body?.access_code?.trim().toUpperCase();
        const ingestEventId = body?.ingest_event_id?.trim();
        const targetPrice   = Number(body?.target_price);

        if (!merchantId || !accessCode || !ingestEventId) {
          return json({ error: "Your PrizeSkout session or selected product is incomplete.", action: "Refresh the dashboard, select the product again, and retry." }, 400);
        }
        if (isNaN(targetPrice) || targetPrice <= 0) {
          return json({ error: "Enter a price greater than zero.", action: "Review the new selling price and try again." }, 400);
        }

        // 1. Validate access code — confirm the caller owns this merchant_id
        const accountId = merchantId;
        const [codeResult, eventResult] = await Promise.all([
          supabaseAdmin
            .from("ps_access_codes" as never)
            .select("merchant_id")
            .eq("code", accessCode)
            .maybeSingle(),
          supabaseAdmin
            .from("ps_ingest_events")
            .select("id, item_id, source_platform, currency, sku, item_name_en, current_retail_price, raw_payload")
            .eq("id", ingestEventId)
            .eq("account_id", accountId)
            .maybeSingle(),
        ]);
        const codeRow = codeResult.data as { merchant_id: string } | null;

        if (!codeRow || codeRow.merchant_id !== merchantId) {
          return json({ error: "Your PrizeSkout session has expired.", action: "Sign in or reopen PrizeSkout from your connected platform." }, 403);
        }

        // 2. Fetch the ingest event (ownership check via account_id)
        const evt = eventResult.data;

        if (!evt?.item_id || !evt?.source_platform) {
          return json({ error: "We could not find that product in your latest catalogue.", action: "Sync the connected store, then select the product again." }, 404);
        }

        const policy=await resolveMerchantMarginPolicy(accountId,evt.source_platform);
        const {data:decision}=await supabaseAdmin.from("ps_decide_results").select("base_cost,commission_rate,vat_rate,payment_fee_rate,fixed_order_fee,promotion_contribution_rate,logistics_subsidy,economics_version_id").eq("account_id",accountId).eq("ingest_event_id",ingestEventId).order("created_at",{ascending:false}).limit(1).maybeSingle();
        const rawPayload=evt.raw_payload as Record<string,unknown>|null;
        if(!decision?.economics_version_id||rawPayload?.cost_source!=="platform_catalog"){
          return json({ok:false,error:"This price cannot be published until the product cost and approved channel agreement are both verified."},409);
        }
        const targetAnalysis=decide({region:"SA",baseCost:Number(decision.base_cost),currentRetailPrice:targetPrice,commissionRate:Number(decision.commission_rate),vatRate:Number(decision.vat_rate),paymentFeeRate:Number(decision.payment_fee_rate??0),fixedOrderFee:Number(decision.fixed_order_fee??0),promotionContributionRate:Number(decision.promotion_contribution_rate??0),logisticsSubsidy:Number(decision.logistics_subsidy??0),marginFloorPct:policy.marginFloorPct,minimumContributionAmount:policy.minimumContributionAmount});
        if(targetAnalysis.floorBreached){
          return json({ok:false,error:`This price would keep ${(targetAnalysis.netMarginPct*100).toFixed(1)}% and ${targetAnalysis.netMargin.toFixed(2)} in contribution. The active ${policy.scope} policy requires at least ${(policy.marginFloorPct*100).toFixed(1)}% and ${policy.minimumContributionAmount.toFixed(2)}. No price was changed.`},409);
        }

        const currentPrice=Number(evt.current_retail_price??0);
        const increasePct=currentPrice>0?(targetPrice-currentPrice)/currentPrice:0;
        if(increasePct>policy.maxPriceIncreasePct+Number.EPSILON){
          return json({ok:false,error:`This change is ${(increasePct*100).toFixed(1)}%. Active policy v${policy.version} allows at most ${(policy.maxPriceIncreasePct*100).toFixed(1)}%. Activate a different policy before publishing.`},409);
        }

        const { item_id, source_platform, currency } = evt;

        // 3. Get connected channel credentials for this platform
        const { data: channel } = await supabaseAdmin
          .from("ps_merchant_channels")
          .select("id, bearer_token, manager_token, platform, metadata")
          .eq("account_id", accountId)
          .eq("platform", source_platform)
          .eq("status", "connected")
          .maybeSingle();

        if (!channel?.bearer_token) {
          return json({
            ok: false,
            error: `${source_platform} channel is not connected. Connect it from Settings → Channels.`,
          }, 400);
        }

        const sourceBearerToken = source_platform === "salla"
          ? await getValidSallaAccessToken(channel)
          : channel.bearer_token;

        // 4. Push the new price to the platform
        const result = await pushPriceToSourcePlatform(
          source_platform,
          {
            bearer_token: sourceBearerToken,
            manager_token: channel.manager_token ?? null,
            store_id: String((channel.metadata as Record<string, unknown> | null)?.store_id ?? "") || null,
          },
          item_id,
          targetPrice,
          currency ?? "SAR",
        );

        // 5. API acceptance is not completion. Read the product back from the
        // platform and restore the original price when confirmation fails.
        let confirmed=false;
        let livePrice:number|null=null;
        let rolledBack=false;
        let verificationMessage:string|undefined;
        if(result.success){
          const readback=await fetchLiveProductPrice(source_platform,{
            bearer_token:sourceBearerToken,manager_token:channel.manager_token??null,
            store_id:String((channel.metadata as Record<string,unknown>|null)?.store_id??"")||null,
          },item_id);
          livePrice=readback.price;
          confirmed=readback.success&&livePrice!=null&&Math.abs(livePrice-targetPrice)<0.005;
          if(!confirmed){
            const rollback=await pushPriceToSourcePlatform(source_platform,{
              bearer_token:sourceBearerToken,manager_token:channel.manager_token??null,
              store_id:String((channel.metadata as Record<string,unknown>|null)?.store_id??"")||null,
            },item_id,currentPrice,currency??"SAR");
            rolledBack=rollback.success;
            verificationMessage=readback.message??"The platform did not return the expected live price.";
          }
        }

        let downstreamPropagation:{id:string;status:"pending"}|null=null;
        let downstreamWarning:string|null=null;
        if (confirmed) {
          await supabaseAdmin
            .from("ps_ingest_events")
            .update({
              current_retail_price: targetPrice,
              status: "repriced",
            })
            .eq("id", ingestEventId)
            .eq("account_id", accountId);
          if(source_platform==="zid"&&evt.sku){
            try{downstreamPropagation=await recordPendingJahezPropagation({accountId,ingestEventId,sku:evt.sku,price:targetPrice,zidLivePrice:livePrice??targetPrice});}
            catch(error){downstreamWarning=toMerchantError(error,"prepare the Jahez follow-up").error;}
          }
        }

        const friendlyFailure = !result.success
          ? toMerchantError(new Error(result.message ?? `Platform returned HTTP ${result.httpStatus}`), "publish this price")
          : null;
        const friendlyConfirmation = result.success && !confirmed
          ? toMerchantError(new Error(verificationMessage ?? "Live price confirmation failed"), "confirm the new live price")
          : null;

        return json({
          ok: result.success&&confirmed,
          platform: source_platform,
          httpStatus: result.httpStatus,
          accepted:result.success,
          confirmed,
          live_price:livePrice,
          rolled_back:rolledBack,
          original_price:currentPrice,
          target_price:targetPrice,
          action_id:`PS-ACT-${Date.now().toString(36).toUpperCase()}`,
          downstream:downstreamPropagation?{channel:"jahez_via_mazeed",status:"pending",event_id:downstreamPropagation.id,message:"Confirmed in Zid. Waiting for independent Jahez verification."}:null,
          downstream_warning:downstreamWarning,
          message: confirmed
            ? "The price was updated and confirmed on the live store."
            : result.success
              ? `The platform accepted the request, but PrizeSkout could not confirm the live price. ${rolledBack ? "The original price was restored." : "We could not confirm that the original price was restored; please check the platform."}`
              : friendlyFailure?.error,
          action: friendlyFailure?.action ?? friendlyConfirmation?.action,
          support_reference: friendlyFailure?.support_reference ?? friendlyConfirmation?.support_reference,
        });
      },
    },
  },
});
