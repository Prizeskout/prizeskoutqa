// GET /api/repricing/catalog?merchant_id=...&access_code=...
//
// Returns every product in the merchant's catalog with the latest
// decide-engine recommendation, ready for the repricing dashboard.
//
// Auth: ps_access_codes table (access_code → merchant_id).

import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export type RepricingProduct = {
  ingest_event_id: string;
  decide_result_id: string;
  sku: string;
  name_en: string;
  name_ar: string;
  source_platform: string;
  item_id: string;
  current_price: number;
  recommended_price: number;
  net_margin_pct: number;
  floor_breached: boolean;
  decision_action: string;
  currency: string;
  status: string;
  repriced_at: string | null;
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

        // Fetch all decide results for this account
        const { data: decideRows, error: decideErr } = await supabaseAdmin
          .from("ps_decide_results")
          .select("id, sku, recommended_price, net_margin_pct, floor_breached, decision_action, ingest_event_id, created_at")
          .eq("account_id", accountId)
          .order("created_at", { ascending: false });

        if (decideErr) {
          return json({ error: "Failed to load recommendations" }, 500);
        }

        if (!decideRows?.length) {
          return json({ products: [] });
        }

        // Collect all ingest_event_ids (dedup by sku, take latest per sku first)
        const seenSkus = new Set<string>();
        const latestByIngestId = new Map<string, typeof decideRows[0]>();
        for (const row of decideRows) {
          if (!row.sku || seenSkus.has(row.sku)) continue;
          seenSkus.add(row.sku);
          latestByIngestId.set(row.ingest_event_id, row);
        }

        const ingestIds = Array.from(latestByIngestId.keys());

        // Fetch the corresponding ingest events
        const { data: ingestRows } = await supabaseAdmin
          .from("ps_ingest_events")
          .select("id, sku, item_name_en, item_name_ar, source_platform, item_id, current_retail_price, currency, status")
          .in("id", ingestIds)
          .eq("account_id", accountId);

        const eventMap = new Map((ingestRows ?? []).map(e => [e.id, e]));

        const products: RepricingProduct[] = [];
        for (const [ingestId, decide] of latestByIngestId) {
          const evt = eventMap.get(ingestId);
          if (!evt || !evt.item_id) continue;

          products.push({
            ingest_event_id: evt.id,
            decide_result_id: decide.id,
            sku: decide.sku ?? evt.sku ?? "",
            name_en: evt.item_name_en ?? "",
            name_ar: (evt as unknown as Record<string, unknown>).item_name_ar as string ?? "",
            source_platform: evt.source_platform ?? "",
            item_id: evt.item_id,
            current_price: Number(evt.current_retail_price ?? 0),
            recommended_price: Number(decide.recommended_price ?? 0),
            net_margin_pct: Number(decide.net_margin_pct ?? 0),
            floor_breached: Boolean(decide.floor_breached),
            decision_action: decide.decision_action ?? "hold",
            currency: evt.currency ?? "SAR",
            status: evt.status ?? "received",
            repriced_at: evt.status === "repriced" ? new Date().toISOString() : null,
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
