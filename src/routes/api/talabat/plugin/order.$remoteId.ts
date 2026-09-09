import { createFileRoute } from "@tanstack/react-router";
import { handleTalabatPluginOrder } from "@/server/core/platform-webhooks";

export const Route = createFileRoute("/api/talabat/plugin/order/$remoteId")({
  server: {
    handlers: {
      POST: ({ request, params }) => handleTalabatPluginOrder(request, params.remoteId),
    },
  },
});
