import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { verifyMerchantAccess } from "@/server/core/byok-connect";

const json = (data: unknown, status = 200) => Response.json(data, { status, headers: { "Cache-Control": "private, no-store" } });

export const Route = createFileRoute("/api/dashboard/v2/activity")({ server: { handlers: { GET: async ({ request }) => {
  const merchantId = (request.headers.get("x-merchant-id") ?? "").trim();
  const accessCode = request.headers.get("x-access-code") ?? "";
  if (!await verifyMerchantAccess(merchantId, accessCode)) return json({ error: "Unauthorized" }, 403);
  const db = supabaseAdmin as any;
  const [audit, channels, immutableCosts] = await Promise.all([
    db.from("ps_govern_audit_log").select("id,trace_id,event_type,merchant_id,sku,source_platform,target_channel,summary_en,data_route,pdpl_compliant,payload_hash,created_at").eq("account_id", merchantId).order("created_at", { ascending: false }).limit(100),
    db.from("ps_merchant_channels").select("id,platform,status,connected_at,last_verified_at,updated_at,error_message").eq("account_id", merchantId).order("updated_at", { ascending: false }).limit(100),
    db.from("ps_product_cost_evidence").select("id,sku,brand_external_id,branch_external_id,currency,unit_cost,effective_from,effective_to,source_provider,created_at").eq("account_id", merchantId).order("created_at", { ascending: false }).limit(200),
  ]);
  const versionedCosts = immutableCosts.error
    ? await db.from("ps_product_cost_versions").select("id,sku,currency,amount,effective_from,effective_to,source,created_at").eq("account_id", merchantId).eq("merchant_id", merchantId).order("created_at", { ascending: false }).limit(200)
    : { data: null, error: null };
  const costRows = immutableCosts.error
    ? (versionedCosts.data ?? []).map((row: any) => ({ ...row, unit_cost: row.amount, source_provider: row.source }))
    : (immutableCosts.data ?? []);
  const costError = immutableCosts.error && versionedCosts.error;
  const evidenceActivity = audit.error || !(audit.data?.length)
    ? await db.from("ps_merchant_evidence_items").select("id,source_provider,source_external_id,document_kind,content_sha256,created_at").eq("account_id", merchantId).order("created_at", { ascending: false }).limit(100)
    : { data: null, error: null };
  const auditRows = audit.data?.length
    ? audit.data
    : (evidenceActivity.data ?? []).map((row: any) => ({
        id: row.id,trace_id:row.source_external_id,event_type:"evidence",merchant_id:merchantId,sku:"—",source_platform:row.source_provider,target_channel:null,
        summary_en:`Retained ${String(row.document_kind ?? "financial evidence").replaceAll("_", " ")}.`,data_route:"QA",pdpl_compliant:true,payload_hash:row.content_sha256,created_at:row.created_at,
      }));
  const auditError = audit.error && evidenceActivity.error;
  return json({ ok: true, audit: auditError ? { state: "unavailable", rows: [], blocker: "Activity history is unavailable." } : { state: "available", rows: auditRows }, channels: channels.error ? { state: "unavailable", rows: [], blocker: "Channel connection records are unavailable." } : { state: "available", rows: channels.data ?? [] }, costs: costError ? { state: "unavailable", rows: [], blocker: "Product-cost evidence is unavailable." } : { state: "available", rows: costRows } });
} } } });
