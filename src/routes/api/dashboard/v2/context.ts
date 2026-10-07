import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { verifyMerchantAccess } from "@/server/core/byok-connect";
import { summarizeDashboardV2Context } from "@/server/core/dashboard-v2-context";

const json = (data: unknown, status = 200) => Response.json(data, { status, headers: { "Cache-Control": "private, no-store" } });

export const Route = createFileRoute("/api/dashboard/v2/context")({ server: { handlers: { GET: async ({ request }) => {
  const merchantId = (request.headers.get("x-merchant-id") ?? "").trim();
  const accessCode = request.headers.get("x-access-code") ?? "";
  if (!await verifyMerchantAccess(merchantId, accessCode)) return json({ error: "Unauthorized" }, 403);
  const db = supabaseAdmin as any;
  const [workspace, settings, entities, channels] = await Promise.all([
    db.from("ps_restaurant_workspaces").select("name,country_code,currency").eq("account_id", merchantId).maybeSingle(),
    db.from("user_account_settings").select("company_name,country,currency").eq("user_id", merchantId).maybeSingle(),
    db.from("ps_enterprise_entities").select("id,name,entity_type,active").eq("account_id", merchantId).in("entity_type", ["brand", "branch"]).order("created_at"),
    db.from("ps_merchant_channels").select("platform,status").eq("account_id", merchantId),
  ]);
  const errors = [workspace, settings, entities, channels].filter((result) => result.error).map((result) => String(result.error.message ?? "Scope source unavailable."));
  return json({ ok: true, context: summarizeDashboardV2Context({ workspace: workspace.data, settings: settings.data, entities: entities.data, channels: channels.data, errors }) });
} } } });
