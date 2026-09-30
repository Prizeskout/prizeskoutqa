import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { checkRateLimit, tooManyRequests } from "@/server/rate-limit";
import { metadataObject, resolveZidEmbeddedChannel } from "@/server/core/zid-embedded";
import { getValidZidCredentials } from "@/server/core/zid-token";
import { syncPlatformCatalog } from "@/server/core/platform-sync";

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
});

export const Route = createFileRoute("/api/embedded/zid/sync")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const rate = checkRateLimit(request, { name: "zid-embedded-sync", max: 12, windowMs: 15 * 60_000 });
        if (rate.limited) return tooManyRequests(rate.retryAfterSeconds);
        const body = await request.json().catch(() => null) as { token?: string } | null;
        const token = body?.token?.trim() ?? "";
        if (!token) return json({ error: "Zid did not provide an embedded session." }, 400);
        const channel = await resolveZidEmbeddedChannel(token);
        if (!channel) return json({ error: "This Zid session is no longer active. Reactivate PrizeSkout from Zid." }, 404);
        try {
          const credentials = await getValidZidCredentials(channel);
          const metadata = metadataObject(channel.metadata);
          const result = await syncPlatformCatalog({
            platform: "zid",
            creds: {
              bearer_token: credentials.bearerToken,
              manager_token: credentials.managerToken,
              store_id: typeof metadata.store_id === "string" ? metadata.store_id : null,
            },
            accountId: channel.account_id,
            licenseeId: channel.licensee_id,
            merchantId: channel.merchant_id,
            region: "SA",
          });
          const refreshedAt = new Date().toISOString();
          await supabaseAdmin.from("ps_merchant_channels").update({
            metadata: {
              ...metadata,
              initial_catalog_sync_at: refreshedAt,
              initial_catalog_sync_items_found: result.items_found,
              initial_catalog_sync_items_stored: result.items_stored,
              initial_catalog_sync_error: null,
            },
            last_verified_at: refreshedAt,
            error_message: null,
            updated_at: refreshedAt,
          }).eq("id", channel.id);
          return json({ ok: true, syncState: "complete", syncItems: result.items_stored });
        } catch (error) {
          const message = error instanceof Error ? error.message : "Zid catalogue synchronization failed.";
          const metadata = metadataObject(channel.metadata);
          await supabaseAdmin.from("ps_merchant_channels").update({
            metadata: { ...metadata, initial_catalog_sync_error: message.slice(0, 400) },
            error_message: message.slice(0, 400),
            updated_at: new Date().toISOString(),
          }).eq("id", channel.id);
          return json({ error: message }, 502);
        }
      },
    },
  },
});
