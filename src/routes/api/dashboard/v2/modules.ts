import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { verifyMerchantAccess } from "@/server/core/byok-connect";
import { summarizeOrderModule, summarizePromotionModule } from "@/server/core/dashboard-v2-modules";
import { dashboardV2DemoModules, isDashboardV2DemoWorkspace } from "@/server/core/dashboard-v2-demo-data";
import { dashboardV2PlatformDemo } from "@/server/core/dashboard-v2-platform-demo";

const json = (data: unknown, status = 200) => Response.json(data, { status, headers: { "Cache-Control": "private, no-store" } });

export const Route = createFileRoute("/api/dashboard/v2/modules")({ server: { handlers: { GET: async ({ request }) => {
  const merchantId = (request.headers.get("x-merchant-id") ?? "").trim(), accessCode = request.headers.get("x-access-code") ?? "";
  if (!await verifyMerchantAccess(merchantId, accessCode)) return json({ error: "Unauthorized" }, 403);
  const demoWorkspace = await (supabaseAdmin as any).from("ps_restaurant_workspaces").select("metadata").eq("account_id", merchantId).maybeSingle();
  if (!demoWorkspace.error && isDashboardV2DemoWorkspace(demoWorkspace.data)) {
    return json({ ok: true, ...dashboardV2DemoModules, platform_demo: dashboardV2PlatformDemo });
  }
  const requestedDays = Number(new URL(request.url).searchParams.get("days") ?? 30);
  const days = Number.isFinite(requestedDays) ? Math.max(1, Math.min(366, Math.floor(requestedDays))) : 30;
  const since = new Date(); since.setUTCDate(since.getUTCDate() - (days - 1)); since.setUTCHours(0, 0, 0, 0);
  const db = supabaseAdmin as any;
  const [source, orders, promotions] = await Promise.all([
    db.from("ps_order_guard_sources").select("id,status,last_event_at").eq("account_id", merchantId).neq("status", "revoked").maybeSingle(),
    db.from("ps_order_guard_orders").select("id,external_order_id,external_branch_id,channel,status,risk_level,currency,order_total,placed_at").eq("account_id", merchantId).gte("placed_at", since.toISOString()).order("placed_at", { ascending: false }).limit(100),
    db.from("ps_promotion_scenarios").select("id,name,platform,status,inputs,results,created_at").eq("account_id", merchantId).gte("created_at", since.toISOString()).order("created_at", { ascending: false }).limit(100),
  ]);
  return json({ ok: true, order_automation: summarizeOrderModule({ available: !source.error && !orders.error, source: source.data, rows: orders.data }), promotions: summarizePromotionModule({ available: !promotions.error, rows: promotions.data }) });
} } } });
