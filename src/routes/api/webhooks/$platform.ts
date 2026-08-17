// Unauthenticated inbound webhook receiver for Salla, Foodics, Zid, and Keeta.
//
// URL: POST /api/webhooks/{platform}   (platform = salla | foodics | zid | keeta)
//
// These endpoints are called by the platforms themselves, not by API-key
// callers, so they bypass the /api/public/v1 auth layer entirely.
// Authentication is done inside each handler (HMAC-SHA-256 for Salla/Foodics,
// Basic Auth for Zid, app-level request signing for Keeta — see
// src/server/core/platform-webhooks.ts for each).

import { createFileRoute } from "@tanstack/react-router";
import {
  handleSallaWebhook,
  handleFoodicsWebhook,
  handleZidWebhook,
  handleKeetaWebhook,
  handleTalabatWebhook,
} from "@/server/core/platform-webhooks";

const SUPPORTED = new Set(["salla", "foodics", "zid", "keeta", "talabat"]);

function notFound(platform: string): Response {
  return new Response(
    JSON.stringify({ error: `Unknown platform: ${platform}. Supported: salla, foodics, zid, keeta, talabat.` }),
    { status: 404, headers: { "Content-Type": "application/json" } },
  );
}

async function handle(request: Request, platform: string): Promise<Response> {
  if (request.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json", Allow: "POST" },
    });
  }

  if (!SUPPORTED.has(platform)) return notFound(platform);

  if (platform === "salla")   return handleSallaWebhook(request);
  if (platform === "foodics") return handleFoodicsWebhook(request);
  if (platform === "zid")     return handleZidWebhook(request);
  if (platform === "keeta")   return handleKeetaWebhook(request);
  if (platform === "talabat") return handleTalabatWebhook(request);

  return notFound(platform);
}

export const Route = createFileRoute("/api/webhooks/$platform")({
  server: {
    handlers: {
      POST: ({ request, params }) => handle(request, params.platform ?? ""),
      // Platforms sometimes send HEAD or GET to verify the endpoint is reachable
      GET: ({ params }) =>
        new Response(
          JSON.stringify({ ok: true, platform: params.platform, endpoint: "prizeskout-webhook-receiver" }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
    },
  },
});
