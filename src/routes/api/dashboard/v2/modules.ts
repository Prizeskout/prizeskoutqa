import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { verifyMerchantAccess } from "@/server/core/byok-connect";
import { summarizeOrderModule, summarizePromotionModule } from "@/server/core/dashboard-v2-modules";

const json = (data: unknown, status = 200) => Response.json(data, { status, headers: { "Cache-Control": "private, no-store" } });

export const Route = createFileRoute("/api/dashboard/v2/modules")({ server: { handlers: { GET: async ({ request }) => {
  const merchantId = (request.headers.get("x-merchant-id") ?? "").trim(), accessCode = request.headers.get("x-access-code") ?? "";
  if (!await verifyMerchantAccess(merchantId, accessCode)) return json({ error: "Unauthorized" }, 403);
  const db = supabaseAdmin as any;
  const [source, orders, promotions] = await Promise.all([
    db.from("ps_order_guard_sources").select("id,status,last_event_at").eq("account_id", merchantId).neq("status", "revoked").maybeSingle(),
    db.from("ps_order_guard_orders").select("id,external_order_id,external_branch_id,channel,status,risk_level,currency,order_total,placed_at").eq("account_id", merchantId).order("placed_at", { ascending: false }).limit(100),
    db.from("ps_promotion_scenarios").select("id,name,platform,status,inputs,results,created_at").eq("account_id", merchantId).order("created_at", { ascending: false }).limit(100),
  ]);
  return json({ ok: true, order_automation: summarizeOrderModule({ available: !source.error && !orders.error, source: source.data, rows: orders.data }), promotions: summarizePromotionModule({ available: !promotions.error, rows: promotions.data }) });
} } } });
