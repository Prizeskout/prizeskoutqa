import { createFileRoute } from "@tanstack/react-router";
import { handleTalabatPluginAvailability } from "@/server/core/platform-webhooks";

export const Route = createFileRoute("/api/talabat/plugin/remoteId/$remoteId/availability")({
  server: { handlers: {
    PUT: ({ request, params }) => handleTalabatPluginAvailability(request, params.remoteId),
  } },
});
