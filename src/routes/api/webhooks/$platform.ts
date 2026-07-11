// Unauthenticated inbound webhook receiver for Salla, Foodics, and Zid.
//
// URL: POST /api/webhooks/{platform}   (platform = salla | foodics | zid)
//
// These endpoints are called by the platforms themselves, not by API-key
// callers, so they bypass the /api/public/v1 auth layer entirely.
// Authentication is done inside each handler via HMAC-SHA-256 signature
// verification against the per-channel webhook_secret stored in Supabase.

import { createFileRoute } from "@tanstack/react-router";
import {
  handleSallaWebhook,
  handleFoodicsWebhook,
  handleZidWebhook,
} from "@/server/core/platform-webhooks";

const SUPPORTED = new Set(["salla", "foodics", "zid"]);

function notFound(platform: string): Response {
  return new Response(
    JSON.stringify({ error: `Unknown platform: ${platform}. Supported: salla, foodics, zid.` }),
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
