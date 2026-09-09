import { createFileRoute } from "@tanstack/react-router";
import { handleTalabatCatalogStatus } from "@/server/core/platform-webhooks";

export const Route = createFileRoute("/api/talabat/plugin/catalog-status/$remoteId")({
  server: { handlers: {
    POST: ({ request, params }) => handleTalabatCatalogStatus(request, params.remoteId),
  } },
});
