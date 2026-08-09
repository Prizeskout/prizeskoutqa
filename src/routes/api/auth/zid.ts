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
import { getPublicOrigin } from "@/server/public-origin";
import { verifyMerchantBootstrap } from "@/server/merchant-bootstrap";

const ZID_AUTH_URL = "https://oauth.zid.sa/oauth/authorize";

// Zid determines granted scopes from the partner dashboard selection.
// The scope param is not required by Zid's OAuth spec; only request the
// embedded_apps scope which is mandatory when the Embedded App toggle is on.
const SCOPES = "embedded_apps_tokens_write";

export const Route = createFileRoute("/api/auth/zid")({
  server: {
    handlers: {
      GET: async ({ request }) => {
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
        const allowed = await verifyMerchantBootstrap(merchantId, url.searchParams.get("onboarding_token") ?? "");
        if (!allowed) return new Response(JSON.stringify({ error: "Unauthorized merchant connection request." }), { status: 401, headers: { "Content-Type": "application/json" } });

        // Optional return path after OAuth (only internal paths allowed)
        const rawReturn = url.searchParams.get("return_to") ?? "";
        const returnTo  = rawReturn.startsWith("/") && !rawReturn.startsWith("//") ? rawReturn : "";

        const redirectUri = `${getPublicOrigin(request)}/api/auth/zid/callback`;

        const nonce = crypto.randomUUID().replace(/-/g, "");
        // Cookie encodes: nonce:merchantId:returnTo (returnTo may be empty)
        const cookieVal = `${nonce}:${merchantId}:${returnTo}`;

        const params = new URLSearchParams({
          client_id:     clientId,
          redirect_uri:  redirectUri,
          response_type: "code",
          scope:         SCOPES,
          state:         nonce,
        });

        return new Response(null, {
          status: 302,
          headers: {
            "Location": `${ZID_AUTH_URL}?${params}`,
            "Set-Cookie": `__ps_zid_n=${cookieVal}; HttpOnly; SameSite=Lax; Path=/api/auth/zid; Max-Age=600`,
          },
        });
      },
    },
  },
});
