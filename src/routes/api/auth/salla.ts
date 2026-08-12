// GET /api/auth/salla
//
// Initiates the Salla OAuth 2.0 authorization flow.
// Redirects the merchant's browser to Salla's consent screen.
//
// Query params:
//   merchant_id  — the ps_merchant_id stored in localStorage (passed by the UI)
//
// Required env vars (set in Cloudflare dashboard → Workers → Settings → Variables):
//   SALLA_CLIENT_ID      — from apps.salla.dev
//   SALLA_CLIENT_SECRET  — from apps.salla.dev

import { createFileRoute, redirect } from "@tanstack/react-router";
import { getPublicOrigin } from "@/server/public-origin";
import { verifyMerchantBootstrap } from "@/server/merchant-bootstrap";
import { sallaScopeString } from "@/server/core/salla-contract";

const SALLA_AUTH_URL = "https://accounts.salla.sa/oauth2/auth";

export const Route = createFileRoute("/api/auth/salla")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const clientId = process.env.SALLA_CLIENT_ID;
        if (!clientId) {
          return new Response(
            JSON.stringify({ error: "SALLA_CLIENT_ID is not configured." }),
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
        const allowed = await verifyMerchantBootstrap(merchantId, url.searchParams.get("onboarding_token") ?? "");
        if (!allowed) return new Response(JSON.stringify({ error: "Unauthorized merchant connection request." }), { status: 401, headers: { "Content-Type": "application/json" } });

        // Optional return path after OAuth (only internal paths allowed)
        const rawReturn = url.searchParams.get("return_to") ?? "";
        const returnTo  = rawReturn.startsWith("/") && !rawReturn.startsWith("//") ? rawReturn : "";

        const redirectUri = `${getPublicOrigin(request)}/api/auth/salla/callback`;

        // CSRF protection: nonce in state param, cookie encodes "nonce:merchantId[:returnTo]"
        const nonce = crypto.randomUUID().replace(/-/g, "");
        const cookieVal = `${nonce}:${merchantId}:${returnTo}`;

        const params = new URLSearchParams({
          client_id:     clientId,
          redirect_uri:  redirectUri,
          response_type: "code",
          scope:         sallaScopeString(),
          state:         nonce,
        });

        return new Response(null, {
          status: 302,
          headers: {
            "Location": `${SALLA_AUTH_URL}?${params}`,
            "Set-Cookie": `__ps_salla_n=${cookieVal}; HttpOnly; SameSite=Lax; Path=/api/auth/salla; Max-Age=600`,
          },
        });
      },
    },
  },
});
