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
import { authorizePricePublication, pricesMatch, validPriceActionKey } from "@/server/core/price-action-safety";
import { publicationEvidenceBlockers } from "@/server/core/pricing-evidence";
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
          idempotency_key?: string;
          approval_confirmed?: boolean;
        } | null;

        const merchantId    = body?.merchant_id?.trim();
        const accessCode    = body?.access_code?.trim().toUpperCase();
        const ingestEventId = body?.ingest_event_id?.trim();
        const targetPrice   = Number(body?.target_price);
        const idempotencyKey = body?.idempotency_key?.trim();

        if (!merchantId || !accessCode || !ingestEventId) {
          return json({ error: "Your PrizeSkout session or selected product is incomplete.", action: "Refresh the dashboard, select the product again, and retry." }, 400);
        }
        if (isNaN(targetPrice) || targetPrice <= 0) {
          return json({ error: "Enter a price greater than zero.", action: "Review the new selling price and try again." }, 400);
        }
        if (!validPriceActionKey(idempotencyKey)) {
          return json({ error: "This price action is missing a valid replay-protection key.", action: "Review and approve the price again." }, 400);
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
            .select("id, item_id, source_platform, merchant_id, currency, sku, item_name_en, base_cost, current_retail_price, raw_payload")
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
        const {data:decision}=await (supabaseAdmin as any).from("ps_decide_results").select("id,base_cost,current_retail_price,commission_rate,vat_rate,payment_fee_rate,fixed_order_fee,promotion_contribution_rate,logistics_subsidy,economics_version_id,margin_policy_version,cost_observed_at,cost_evidence_expires_at,decision_expires_at,evidence_channel,evidence_item_id,evidence_currency").eq("account_id",accountId).eq("ingest_event_id",ingestEventId).order("created_at",{ascending:false}).limit(1).maybeSingle();
        const rawPayload=evt.raw_payload as Record<string,unknown>|null;
        if(!decision?.economics_version_id||rawPayload?.cost_source!=="platform_catalog"){
          return json({ok:false,error:"This price cannot be published until the product cost and approved channel agreement are both verified."},409);
        }
        const {data:economicsRow}=await (supabaseAdmin as any).from("ps_economics_versions").select("id,account_id,merchant_id,channel,status,effective_from,effective_to,source_contract_id").eq("id",decision.economics_version_id).maybeSingle();
        const evidenceBlockers=publicationEvidenceBlockers({
          activePolicyVersion:policy.version,decisionPolicyVersion:decision.margin_policy_version==null?null:Number(decision.margin_policy_version),
          decisionExpiresAt:decision.decision_expires_at,costObservedAt:decision.cost_observed_at,costEvidenceExpiresAt:decision.cost_evidence_expires_at,
          sourcePlatform:evt.source_platform,itemId:evt.item_id,currency:evt.currency??"SAR",
          evidenceChannel:decision.evidence_channel,evidenceItemId:decision.evidence_item_id,evidenceCurrency:decision.evidence_currency,
          decisionEconomicsVersionId:String(decision.economics_version_id),accountId,merchantId:evt.merchant_id??merchantId,
          economics:economicsRow?{id:String(economicsRow.id),accountId:String(economicsRow.account_id),merchantId:String(economicsRow.merchant_id),channel:String(economicsRow.channel),status:String(economicsRow.status),effectiveFrom:String(economicsRow.effective_from),effectiveTo:economicsRow.effective_to?String(economicsRow.effective_to):null,sourceContractId:economicsRow.source_contract_id?String(economicsRow.source_contract_id):null}:null,
        });
        if(!pricesMatch(Number(evt.current_retail_price),Number(decision.current_retail_price)))evidenceBlockers.push("catalogue_price_changed");
        if(Math.abs(Number(evt.base_cost)-Number(decision.base_cost))>=0.00005)evidenceBlockers.push("cost_snapshot_changed");
        if(evidenceBlockers.length){
          return json({ok:false,error:"This recommendation is no longer backed by current, applicable pricing evidence. Refresh the catalogue and review it again. No price was changed.",evidence_blockers:evidenceBlockers},409);
        }
        const targetAnalysis=decide({region:"SA",baseCost:Number(decision.base_cost),currentRetailPrice:targetPrice,commissionRate:Number(decision.commission_rate),vatRate:Number(decision.vat_rate),paymentFeeRate:Number(decision.payment_fee_rate??0),fixedOrderFee:Number(decision.fixed_order_fee??0),promotionContributionRate:Number(decision.promotion_contribution_rate??0),logisticsSubsidy:Number(decision.logistics_subsidy??0),marginFloorPct:policy.marginFloorPct,minimumContributionAmount:policy.minimumContributionAmount});
        if(targetAnalysis.floorBreached){
          return json({ok:false,error:`This price would keep ${(targetAnalysis.netMarginPct*100).toFixed(1)}% and ${targetAnalysis.netMargin.toFixed(2)} in contribution. The active ${policy.scope} policy requires at least ${(policy.marginFloorPct*100).toFixed(1)}% and ${policy.minimumContributionAmount.toFixed(2)}. No price was changed.`},409);
        }

        const currentPrice=Number(evt.current_retail_price??0);
        if(!Number.isFinite(currentPrice)||currentPrice<=0){
          return json({ok:false,error:"The current catalogue price is missing or invalid. Sync the product again before publishing."},409);
        }
        const increasePct=currentPrice>0?(targetPrice-currentPrice)/currentPrice:0;
        if(increasePct>policy.maxPriceIncreasePct+Number.EPSILON){
          return json({ok:false,error:`This change is ${(increasePct*100).toFixed(1)}%. Active policy v${policy.version} allows at most ${(policy.maxPriceIncreasePct*100).toFixed(1)}%. Activate a different policy before publishing.`},409);
        }

        const authorization=authorizePricePublication({approvalMode:policy.approvalMode,merchantConfirmed:body?.approval_confirmed===true});
        if(authorization.reason==="suggestions_only"){
          return json({ok:false,error:"This channel is set to Suggestions only, so PrizeSkout cannot publish the price. Change the active margin policy if you want in-app publishing."},409);
        }
        if(authorization.reason==="merchant_approval_required"){
          return json({ok:false,error:"This price requires explicit merchant approval before it can be published."},409);
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

        const actionId=crypto.randomUUID();
        const actionRow={
          id:actionId,account_id:accountId,ingest_event_id:ingestEventId,decide_result_id:decision.id,
          platform:source_platform,item_id,currency:currency??"SAR",idempotency_key:idempotencyKey,
          actor_type:authorization.allowed?authorization.actorType:"merchant",
          approval_mode:policy.approvalMode,
          approval_source:authorization.allowed?authorization.approvalSource:"merchant_click",
          approved_by:body?.approval_confirmed===true?merchantId:null,
          approved_at:new Date().toISOString(),approval_expires_at:new Date(Date.now()+5*60_000).toISOString(),
          policy_version:policy.version,economics_version_id:decision.economics_version_id,
          cost_observed_at:decision.cost_observed_at,decision_expires_at:decision.decision_expires_at,economics_effective_to:economicsRow?.effective_to??null,
          expected_current_price:currentPrice,target_price:targetPrice,state:"authorized",
        };
        const {error:actionError}=await (supabaseAdmin as any).from("ps_price_actions").insert(actionRow);
        if(actionError){
          const {data:existing}=await (supabaseAdmin as any).from("ps_price_actions").select("id,state,target_price,ingest_event_id,result_payload").eq("account_id",accountId).eq("idempotency_key",idempotencyKey).maybeSingle();
          if(existing){
            if(String(existing.ingest_event_id)!==ingestEventId||Math.abs(Number(existing.target_price)-targetPrice)>=0.005){
              return json({ok:false,error:"That replay-protection key was already used for a different price action."},409);
            }
            if(existing.result_payload&&!["authorized","publishing"].includes(String(existing.state))){
              const saved=existing.result_payload as Record<string,unknown>;
              const {response_status,...replayedPayload}=saved;
              return json({...replayedPayload,replayed:true,action_id:existing.id},Number(response_status??200));
            }
            return json({ok:false,error:"This exact price action is already being processed.",action_id:existing.id},409);
          }
          const {data:active}=await (supabaseAdmin as any).from("ps_price_actions").select("id").eq("account_id",accountId).eq("platform",source_platform).eq("item_id",item_id).in("state",["authorized","publishing"]).maybeSingle();
          if(active)return json({ok:false,error:"Another price action for this product is already being processed.",action_id:active.id},409);
          if(["42P01","PGRST205"].includes(String(actionError.code??""))){
            return json({ok:false,error:"Live publication is unavailable because the price-action safety ledger is not ready.",action:"Apply migration 20260825000000_price_action_safety.sql, then retry. No price was changed."},503);
          }
          return json({ok:false,error:"The price action could not be safely authorized. No price was changed.",support_reference:String(actionError.code??"ledger_insert")},500);
        }

        // Compare against the platform immediately before the write. A stale
        // catalogue snapshot must never overwrite a newer merchant change.
        const liveBefore=await fetchLiveProductPrice(source_platform,{
          bearer_token:sourceBearerToken,manager_token:channel.manager_token??null,
          store_id:String((channel.metadata as Record<string,unknown>|null)?.store_id??"")||null,
        },item_id);
        if(!liveBefore.success||!pricesMatch(currentPrice,liveBefore.price)){
          const reason=!liveBefore.success||liveBefore.price==null
            ? liveBefore.message??"The current live price could not be verified."
            : `The live price changed from ${currentPrice} to ${liveBefore.price} after this recommendation was created.`;
          await (supabaseAdmin as any).from("ps_price_actions").update({state:"rejected_stale_price",live_price_before:liveBefore.price,failure_reason:reason,updated_at:new Date().toISOString(),result_payload:{ok:false,error:`${reason} Refresh the catalogue and review a new recommendation.`,response_status:409}}).eq("id",actionId).eq("state","authorized");
          return json({ok:false,error:`${reason} Refresh the catalogue and review a new recommendation.`,action_id:actionId},409);
        }
        const {data:claimed,error:claimError}=await (supabaseAdmin as any).from("ps_price_actions").update({state:"publishing",live_price_before:liveBefore.price,updated_at:new Date().toISOString()}).eq("id",actionId).eq("state","authorized").select("id").maybeSingle();
        if(claimError||!claimed){
          return json({ok:false,error:"The price action could not acquire its publication lock. No price was changed.",action_id:actionId},409);
        }

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
          confirmed=readback.success&&pricesMatch(targetPrice,livePrice);
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

        const responsePayload={
          ok: result.success&&confirmed,
          platform: source_platform,
          httpStatus: result.httpStatus,
          accepted:result.success,
          confirmed,
          live_price:livePrice,
          rolled_back:rolledBack,
          original_price:currentPrice,
          target_price:targetPrice,
          action_id:actionId,
          downstream:downstreamPropagation?{channel:"jahez_via_mazeed",status:"pending",event_id:downstreamPropagation.id,message:"Confirmed in Zid. Waiting for independent Jahez verification."}:null,
          downstream_warning:downstreamWarning,
          message: confirmed
            ? "The price was updated and confirmed on the live store."
            : result.success
              ? `The platform accepted the request, but PrizeSkout could not confirm the live price. ${rolledBack ? "The original price was restored." : "We could not confirm that the original price was restored; please check the platform."}`
              : friendlyFailure?.error,
          action: friendlyFailure?.action ?? friendlyConfirmation?.action,
          support_reference: friendlyFailure?.support_reference ?? friendlyConfirmation?.support_reference,
        };
        const terminalState=confirmed?"confirmed":!result.success?"platform_failed":rolledBack?"rolled_back":"rollback_failed";
        await (supabaseAdmin as any).from("ps_price_actions").update({
          state:terminalState,live_price_after:livePrice,platform_http_status:result.httpStatus,
          failure_reason:confirmed?null:responsePayload.message,result_payload:{...responsePayload,response_status:confirmed?200:502},updated_at:new Date().toISOString(),
        }).eq("id",actionId).eq("state","publishing");
        return json(responsePayload,confirmed?200:502);
      },
    },
  },
});
