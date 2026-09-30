import { createFileRoute } from "@tanstack/react-router";
import { checkRateLimit, tooManyRequests } from "@/server/rate-limit";
import { ensureZidAccessCode, metadataObject, resolveZidEmbeddedChannel } from "@/server/core/zid-embedded";

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
});

export const Route = createFileRoute("/api/embedded/zid/bootstrap")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const rate = checkRateLimit(request, { name: "zid-embedded-bootstrap", max: 90, windowMs: 15 * 60_000 });
        if (rate.limited) return tooManyRequests(rate.retryAfterSeconds);
        const body = await request.json().catch(() => null) as { token?: string } | null;
        const token = body?.token?.trim() ?? "";
        if (!token) return json({ error: "Zid did not provide an embedded session." }, 400);
        const channel = await resolveZidEmbeddedChannel(token);
        if (!channel) return json({ error: "This Zid session is no longer active. Reactivate PrizeSkout from Zid." }, 404);
        const metadata = metadataObject(channel.metadata);
        const accessCode = await ensureZidAccessCode(channel);
        return json({
          ok: true,
          merchantId: channel.account_id,
          accessCode,
          storeName: typeof metadata.store_name === "string" ? metadata.store_name : "Your Zid store",
          connectedAt: channel.connected_at,
          webhooksReady: Boolean(channel.webhook_registered_at),
          syncState: typeof metadata.initial_catalog_sync_at === "string" ? "complete" : channel.error_message ? "error" : "in_progress",
          syncItems: typeof metadata.initial_catalog_sync_items_stored === "number" ? metadata.initial_catalog_sync_items_stored : null,
          syncError: typeof metadata.initial_catalog_sync_error === "string" ? metadata.initial_catalog_sync_error : channel.error_message,
          welcomeAccepted: typeof metadata.welcome_email_provider_accepted_at === "string",
          welcomeUnavailable: metadata.welcome_email_error === "verified_store_email_unavailable",
        });
      },
    },
  },
});
