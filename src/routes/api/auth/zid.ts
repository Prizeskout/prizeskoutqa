// GET /api/auth/zid
//
// Initiates the Zid OAuth 2.0 authorization flow.
// Redirects the merchant's browser to Zid's consent screen.
//
// Query params:
//   merchant_id  — the ps_merchant_id stored in localStorage (passed by the UI)
//
// Required env vars (set in Cloudflare dashboard → Workers → Settings → Variables):
//   ZID_CLIENT_ID      — from partner.zid.sa
//   ZID_CLIENT_SECRET  — from partner.zid.sa

import { createFileRoute } from "@tanstack/react-router";

const ZID_AUTH_URL = "https://oauth.zid.sa/oauth/authorize";

export const Route = createFileRoute("/api/auth/zid")({
  server: {
    handlers: {
      GET: ({ request }) => {
        const clientId = process.env.ZID_CLIENT_ID;
        if (!clientId) {
          return new Response(
            JSON.stringify({ error: "ZID_CLIENT_ID is not configured." }),
            { status: 503, headers: { "Content-Type": "application/json" } },
          );
        }

        const url = new URL(request.url);
        const merchantId = url.searchParams.get("merchant_id") ?? "";
        if (!merchantId) {
          return new Response(
            JSON.stringify({ error: "merchant_id query param is required." }),
            { status: 400, headers: { "Content-Type": "application/json" } },
          );
        }

        const redirectUri = `${url.origin}/api/auth/zid/callback`;

        const params = new URLSearchParams({
          client_id:     clientId,
          redirect_uri:  redirectUri,
          response_type: "code",
          state:         merchantId,
        });

        return Response.redirect(`${ZID_AUTH_URL}?${params}`, 302);
      },
    },
  },
});
