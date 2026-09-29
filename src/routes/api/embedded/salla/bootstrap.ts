import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { secureAccessCode } from "@/server/onboarding-capability";
import { checkRateLimit, tooManyRequests } from "@/server/rate-limit";

type Introspection = {
  success?: boolean;
  data?: { merchant_id?: string | number; user_id?: string | number; exp?: string };
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

export const Route = createFileRoute("/api/embedded/salla/bootstrap")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const rate = checkRateLimit(request, { name: "salla-embedded-bootstrap", max: 90, windowMs: 15 * 60_000 });
        if (rate.limited) return tooManyRequests(rate.retryAfterSeconds);

        const appId = process.env.SALLA_APP_ID;
        const body = await request.json().catch(() => null) as { token?: string } | null;
        const token = body?.token?.trim();
        if (!appId || !token) return json({ error: "Salla session is not configured." }, 400);

        const response = await fetch("https://api.salla.dev/exchange-authority/v1/introspect", {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json", "S-Source": appId },
          body: JSON.stringify({ token }),
        }).catch(() => null);
        if (!response?.ok) return json({ error: "The Salla session could not be verified." }, 401);
        const verified = await response.json() as Introspection;
        const sallaMerchantId = String(verified.data?.merchant_id ?? "");
        if (!verified.success || !sallaMerchantId) return json({ error: "The Salla session is invalid or expired." }, 401);

        const { data: channel } = await supabaseAdmin
          .from("ps_merchant_channels")
          .select("account_id,status,error_message,connected_at,webhook_registered_at,metadata")
          .eq("platform", "salla")
          .eq("merchant_id", sallaMerchantId)
          .maybeSingle();
        if (!channel || channel.status !== "connected") {
          return json({ error: "PrizeSkout is still completing the store connection. Reopen the app in a moment." }, 409);
        }

        let { data: access } = await supabaseAdmin
          .from("ps_access_codes")
          .select("code")
          .eq("merchant_id", channel.account_id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (!access) {
          const code = secureAccessCode("SA");
          const result = await supabaseAdmin.from("ps_access_codes")
            .insert({ code, merchant_id: channel.account_id, store_name: `Salla Store ${sallaMerchantId}` })
            .select("code")
            .single();
          access = result.data;
        }
        if (!access?.code) return json({ error: "PrizeSkout could not create the merchant session." }, 500);

        const metadata = channel.metadata && typeof channel.metadata === "object" && !Array.isArray(channel.metadata)
          ? channel.metadata as Record<string, unknown>
          : {};
        return json({
          ok: true,
          merchantId: channel.account_id,
          accessCode: access.code,
          storeName: typeof metadata.store_name === "string" ? metadata.store_name : "Your Salla store",
          connectedAt: channel.connected_at,
          webhooksReady: Boolean(channel.webhook_registered_at),
          syncState: typeof metadata.initial_catalog_sync_at === "string" ? "complete" : "in_progress",
          syncItems: typeof metadata.initial_catalog_sync_items_stored === "number" ? metadata.initial_catalog_sync_items_stored : null,
          syncError: typeof metadata.initial_catalog_sync_error === "string" ? metadata.initial_catalog_sync_error : null,
        });
      },
    },
  },
});
