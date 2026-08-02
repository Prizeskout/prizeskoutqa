// GET /api/repricing/catalog?merchant_id=...&access_code=...
//
// Returns every product in the merchant's catalog with the latest
// decide-engine recommendation, ready for the repricing dashboard.
//
// Auth: ps_access_codes table (access_code → merchant_id).

import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { decide as calculateMargin } from "@/server/core/decide-engine";

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
  repriced_at: string | null;
  margin_floor_pct: number;
  commission_rate: number;
  cost_confidence: "verified" | "estimated" | "unknown";
  preview?: { recommended_price:number|null; net_margin_pct:number; floor_breached:boolean; increase_pct:number; outcome:"safe"|"blocked_missing_cost"|"within_limit"|"over_limit" };
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
        const wantsPreview=previewFloor>0&&previewFloor<1&&previewMaxIncrease>=0&&previewMaxIncrease<=1;

        if (!merchantId || !accessCode) {
          return json({ error: "merchant_id and access_code are required" }, 400);
        }

        // Validate access code
        const { data: codeRow } = await supabaseAdmin
          .from("ps_access_codes" as never)
          .select("merchant_id")
          .eq("code", accessCode)
          .maybeSingle() as { data: { merchant_id: string } | null };

        if (!codeRow || codeRow.merchant_id !== merchantId) {
          return json({ error: "Invalid access code" }, 403);
        }

        const accountId = merchantId;

        // Fetch decisions using the baseline columns so a web deploy remains
        // readable while a newly-added migration is still rolling out.
        const { data: decideRows, error: decideErr } = await supabaseAdmin
          .from("ps_decide_results")
          .select("id, sku, base_cost, current_retail_price, recommended_price, net_margin_pct, margin_floor_pct, commission_rate, vat_rate, logistics_subsidy, floor_breached, decision_action, ingest_event_id, created_at")
          .eq("account_id", accountId)
          .order("created_at", { ascending: false });

        if (decideErr) {
          return json({ error: "Failed to load recommendations" }, 500);
        }

        // The catalog is the source of truth for what was synced. A product
        // without a decision (usually because cost is missing) must still be
        // visible so the merchant can fix it.
        const { data: ingestRows, error:ingestError } = await supabaseAdmin
          .from("ps_ingest_events")
          .select("id, sku, item_name_en, item_name_ar, source_platform, item_id, current_retail_price, currency, status, inventory_status, raw_payload")
          .eq("account_id", accountId)
          .order("created_at",{ascending:false});
        if(ingestError)return json({error:"Failed to load synced catalog"},500);

        const decisionByEvent=new Map<string,(typeof decideRows)[number]>();
        for(const row of decideRows??[])if(!decisionByEvent.has(row.ingest_event_id))decisionByEvent.set(row.ingest_event_id,row);
        const seenProducts=new Set<string>();

        const products: RepricingProduct[] = [];
        for (const evt of ingestRows??[]) {
          if(!evt.item_id)continue;
          const productKey=`${evt.source_platform}:${evt.item_id}`;
          if(seenProducts.has(productKey))continue;
          seenProducts.add(productKey);
          const decision=decisionByEvent.get(evt.id);
          const rawPayload = evt.raw_payload as Record<string, unknown> | null;
          const costSource = String(rawPayload?.cost_source ?? "unknown");

          const currentPrice=Number(evt.current_retail_price??0);
          const preview=wantsPreview&&costSource==="platform_catalog"&&decision?calculateMargin({region:"SA",baseCost:Number(decision.base_cost),currentRetailPrice:currentPrice,commissionRate:Number(decision.commission_rate),vatRate:Number(decision.vat_rate),logisticsSubsidy:Number(decision.logistics_subsidy),marginFloorPct:previewFloor}):null;
          const uncappedRecommendation=preview?.recommendedPrice??null;
          const cappedRecommendation=uncappedRecommendation&&currentPrice>0?Math.min(uncappedRecommendation,currentPrice*(1+previewMaxIncrease)):uncappedRecommendation;
          const projected=cappedRecommendation&&decision?calculateMargin({region:"SA",baseCost:Number(decision.base_cost),currentRetailPrice:cappedRecommendation,commissionRate:Number(decision.commission_rate),vatRate:Number(decision.vat_rate),logisticsSubsidy:Number(decision.logistics_subsidy),marginFloorPct:previewFloor}):null;
          const previewIncrease=cappedRecommendation&&currentPrice>0?(cappedRecommendation-currentPrice)/currentPrice:0;
          const requiredIncrease=uncappedRecommendation&&currentPrice>0?(uncappedRecommendation-currentPrice)/currentPrice:0;
          products.push({
            ingest_event_id: evt.id,
            decide_result_id: decision?.id??null,
            sku: decision?.sku ?? evt.sku ?? "",
            name_en: evt.item_name_en ?? "",
            name_ar: (evt as unknown as Record<string, unknown>).item_name_ar as string ?? "",
            source_platform: evt.source_platform ?? "",
            item_id: evt.item_id,
            current_price: Number(evt.current_retail_price ?? 0),
            recommended_price: Number(decision?.recommended_price ?? currentPrice),
            net_margin_pct: decision?Number(decision.net_margin_pct):null,
            floor_breached: Boolean(decision?.floor_breached),
            decision_action: decision?.decision_action ?? "blocked_missing_cost",
            currency: evt.currency ?? "SAR",
            status: evt.status ?? "received",
            inventory_status: evt.inventory_status ?? "unknown",
            repriced_at: evt.status === "repriced" ? new Date().toISOString() : null,
            margin_floor_pct: Number(decision?.margin_floor_pct ?? 0.18),
            commission_rate: Number(decision?.commission_rate ?? 0),
            cost_confidence: costSource === "platform_catalog"
              ? "verified"
              : costSource.startsWith("estimated_") ? "estimated" : "unknown",
            ...(wantsPreview?{preview:preview?{recommended_price:cappedRecommendation==null?null:Math.round(cappedRecommendation*100)/100,net_margin_pct:projected?.netMarginPct??preview.netMarginPct,floor_breached:preview.floorBreached,increase_pct:previewIncrease,outcome:!preview.floorBreached?"safe":requiredIncrease<=previewMaxIncrease?"within_limit":"over_limit"}:{recommended_price:null,net_margin_pct:Number(decision?.net_margin_pct??0),floor_breached:Boolean(decision?.floor_breached),increase_pct:0,outcome:"blocked_missing_cost"}}:{}),
          });
        }

        // Sort: floor-breached first, then by abs(price change) descending
        products.sort((a, b) => {
          if (a.floor_breached && !b.floor_breached) return -1;
          if (!a.floor_breached && b.floor_breached) return 1;
          const aDelta = Math.abs(a.recommended_price - a.current_price);
          const bDelta = Math.abs(b.recommended_price - b.current_price);
          return bDelta - aDelta;
        });

        return json({ products });
      },
    },
  },
});
