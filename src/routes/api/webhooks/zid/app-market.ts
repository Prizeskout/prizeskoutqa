import { createFileRoute } from "@tanstack/react-router";
import { handleZidAppMarketWebhook } from "@/server/core/platform-webhooks";

export const Route = createFileRoute("/api/webhooks/zid/app-market")({
  server: {
    handlers: {
      POST: ({ request }) => handleZidAppMarketWebhook(request),
      GET: () =>
        new Response(JSON.stringify({ ok: true, endpoint: "zid-app-market-webhook" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
    },
  },
});
