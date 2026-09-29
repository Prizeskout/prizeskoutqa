import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { missingRequiredSallaScopes } from "@/server/core/salla-contract";
import { syncSallaCatalog } from "@/server/core/salla-catalog-sync";
import { checkRateLimit, tooManyRequests } from "@/server/rate-limit";

type Introspection = { success?: boolean; data?: { merchant_id?: string | number } };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });

export const Route = createFileRoute("/api/embedded/salla/sync")({
  server: { handlers: { POST: async ({ request }) => {
    const rate = checkRateLimit(request, { name: "salla-embedded-sync", max: 12, windowMs: 15 * 60_000 });
    if (rate.limited) return tooManyRequests(rate.retryAfterSeconds);
    const body = await request.json().catch(() => null) as { token?: string } | null;
    const token = body?.token?.trim();
    const appId = process.env.SALLA_APP_ID;
    if (!appId || !token) return json({ error: "Salla session is not configured." }, 400);
    const verifiedResponse = await fetch("https://api.salla.dev/exchange-authority/v1/introspect", {
      method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json", "S-Source": appId }, body: JSON.stringify({ token }),
    }).catch(() => null);
    if (!verifiedResponse?.ok) return json({ error: "The Salla session could not be verified." }, 401);
    const verified = await verifiedResponse.json() as Introspection;
    const merchantId = String(verified.data?.merchant_id ?? "");
    if (!verified.success || !merchantId) return json({ error: "The Salla session is invalid or expired." }, 401);
    const { data: channel } = await supabaseAdmin.from("ps_merchant_channels")
      .select("id,account_id,licensee_id,merchant_id,bearer_token,metadata,scopes,status")
      .eq("platform", "salla").eq("merchant_id", merchantId).maybeSingle();
    if (!channel || channel.status !== "connected") return json({ error: "The Salla store is not connected." }, 409);
    const missing = missingRequiredSallaScopes(channel.scopes ?? []);
    if (missing.length) return json({ error: "PrizeSkout needs the app permissions to be granted again.", code: "missing_scope", missingScopes: missing }, 409);
    try {
      const result = await syncSallaCatalog(channel);
      return json({ ok: true, itemsFound: result.items_found, itemsStored: result.items_stored });
    } catch (error) {
      return json({ error: error instanceof Error ? error.message : "Catalog sync failed.", code: "sync_failed" }, 502);
    }
  } } },
});
