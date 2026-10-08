import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { verifyMerchantAccess } from "@/server/core/byok-connect";

const json = (data: unknown, status = 200) => Response.json(data, { status, headers: { "Cache-Control": "private, no-store" } });

export const Route = createFileRoute("/api/dashboard/v2/activity")({ server: { handlers: { GET: async ({ request }) => {
  const merchantId = (request.headers.get("x-merchant-id") ?? "").trim();
  const accessCode = request.headers.get("x-access-code") ?? "";
  if (!await verifyMerchantAccess(merchantId, accessCode)) return json({ error: "Unauthorized" }, 403);
  const db = supabaseAdmin as any;
  const [audit, channels, costs] = await Promise.all([
    db.from("ps_govern_audit_log").select("id,trace_id,event_type,merchant_id,sku,source_platform,target_channel,summary_en,data_route,pdpl_compliant,payload_hash,created_at").eq("account_id", merchantId).order("created_at", { ascending: false }).limit(100),
    db.from("ps_merchant_channels").select("id,platform,status,connected_at,last_verified_at,updated_at,error_message").eq("account_id", merchantId).order("updated_at", { ascending: false }).limit(100),
    db.from("ps_product_cost_evidence").select("id,sku,brand_external_id,branch_external_id,currency,unit_cost,effective_from,effective_to,source_provider,created_at").eq("account_id", merchantId).order("created_at", { ascending: false }).limit(200),
  ]);
  return json({ ok: true, audit: audit.error ? { state: "unavailable", rows: [], blocker: "Governed audit history is unavailable." } : { state: "available", rows: audit.data ?? [] }, channels: channels.error ? { state: "unavailable", rows: [], blocker: "Channel connection records are unavailable." } : { state: "available", rows: channels.data ?? [] }, costs: costs.error ? { state: "unavailable", rows: [], blocker: "Product-cost evidence is unavailable." } : { state: "available", rows: costs.data ?? [] } });
} } } });
