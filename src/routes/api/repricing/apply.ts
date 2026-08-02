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
import { getMerchantMarginPolicy } from "@/server/core/merchant-pricing-config";

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
          return json({ error: "merchant_id, access_code, and ingest_event_id are required" }, 400);
        }
        if (isNaN(targetPrice) || targetPrice <= 0) {
          return json({ error: "target_price must be a positive number" }, 400);
        }

        // 1. Validate access code — confirm the caller owns this merchant_id
        const { data: codeRow } = await supabaseAdmin
          .from("ps_access_codes" as never)
          .select("merchant_id")
          .eq("code", accessCode)
          .maybeSingle() as { data: { merchant_id: string } | null };

        if (!codeRow || codeRow.merchant_id !== merchantId) {
          return json({ error: "Invalid access code" }, 403);
        }

        const accountId = merchantId;

        // 2. Fetch the ingest event (ownership check via account_id)
        const { data: evt } = await supabaseAdmin
          .from("ps_ingest_events")
          .select("id, item_id, source_platform, currency, sku, item_name_en, current_retail_price")
          .eq("id", ingestEventId)
          .eq("account_id", accountId)
          .maybeSingle();

        if (!evt?.item_id || !evt?.source_platform) {
          return json({ error: "Product not found for this account" }, 404);
        }

        const policy=await getMerchantMarginPolicy(accountId);
        const currentPrice=Number(evt.current_retail_price??0);
        const increasePct=currentPrice>0?(targetPrice-currentPrice)/currentPrice:0;
        if(increasePct>policy.maxPriceIncreasePct+Number.EPSILON){
          return json({ok:false,error:`This change is ${(increasePct*100).toFixed(1)}%. Active policy v${policy.version} allows at most ${(policy.maxPriceIncreasePct*100).toFixed(1)}%. Activate a different policy before publishing.`},409);
        }

        const { item_id, source_platform, currency } = evt;

        // 3. Get connected channel credentials for this platform
        const { data: channel } = await supabaseAdmin
          .from("ps_merchant_channels")
          .select("bearer_token, manager_token, platform, metadata")
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

        // 4. Push the new price to the platform
        const result = await pushPriceToSourcePlatform(
          source_platform,
          {
            bearer_token: channel.bearer_token,
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
            bearer_token:channel.bearer_token,manager_token:channel.manager_token??null,
            store_id:String((channel.metadata as Record<string,unknown>|null)?.store_id??"")||null,
          },item_id);
          livePrice=readback.price;
          confirmed=readback.success&&livePrice!=null&&Math.abs(livePrice-targetPrice)<0.005;
          if(!confirmed){
            const rollback=await pushPriceToSourcePlatform(source_platform,{
              bearer_token:channel.bearer_token,manager_token:channel.manager_token??null,
              store_id:String((channel.metadata as Record<string,unknown>|null)?.store_id??"")||null,
            },item_id,currentPrice,currency??"SAR");
            rolledBack=rollback.success;
            verificationMessage=readback.message??`Expected ${targetPrice}, received ${livePrice??"no live price"}.`;
          }
        }

        if (confirmed) {
          await supabaseAdmin
            .from("ps_ingest_events")
            .update({
              current_retail_price: targetPrice,
              status: "repriced",
            })
            .eq("id", ingestEventId)
            .eq("account_id", accountId);
        }

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
          message:confirmed?"Price updated and confirmed live":result.success?`Live confirmation failed. ${rolledBack?"The original price was restored.":"Automatic rollback could not be confirmed."} ${verificationMessage??""}`:result.message??"Platform rejected the price update",
        });
      },
    },
  },
});
