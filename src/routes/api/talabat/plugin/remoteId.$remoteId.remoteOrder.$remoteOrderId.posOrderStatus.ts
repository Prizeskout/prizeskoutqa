import { createFileRoute } from "@tanstack/react-router";
import { handleTalabatPluginOrderStatus } from "@/server/core/platform-webhooks";

export const Route = createFileRoute("/api/talabat/plugin/remoteId/$remoteId/remoteOrder/$remoteOrderId/posOrderStatus")({
  server: { handlers: {
    PUT: ({ request, params }) => handleTalabatPluginOrderStatus(request, params.remoteId, params.remoteOrderId),
  } },
});
