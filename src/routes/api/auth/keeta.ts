// GET /api/auth/keeta
//
// Initiates the Keeta merchant self-authorization flow.
// Redirects the merchant's browser to Keeta's consent screen.
//
// Query params:
//   merchant_id  — the ps_merchant_id stored in localStorage (passed by the UI)
//
// Required env vars (set in Cloudflare dashboard → Workers → Settings → Variables):
//   KEETA_APP_ID      — numeric, issued by Keeta after developer approval
//   KEETA_APP_SECRET  — issued alongside KEETA_APP_ID (used at the callback/dispatch stage)

import { createFileRoute } from "@tanstack/react-router";
import { getPublicOrigin } from "@/server/public-origin";
import { KEETA_AUTHORIZE_URL } from "@/server/core/keeta-client";
import { verifyMerchantBootstrap } from "@/server/merchant-bootstrap";

export async function startKeetaOAuth(request: Request, callbackPath = "/api/auth/keeta/callback", cookiePath = "/api/auth/keeta") {
        const appId = process.env.KEETA_APP_ID;
        if (!appId) {
          return new Response(
            JSON.stringify({ error: "KEETA_APP_ID is not configured." }),
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

        const publicOrigin = getPublicOrigin(request);
        const redirectUri = `${publicOrigin}${callbackPath}`;
        const secureCookie = publicOrigin.startsWith("https://") ? "; Secure" : "";

        const nonce = crypto.randomUUID().replace(/-/g, "");
        // Cookie encodes: nonce:merchantId:returnTo (returnTo may be empty)
        const cookieVal = `${nonce}:${merchantId}:${returnTo}`;

        const params = new URLSearchParams({
          responseType: "authorization_code",
          appId,
          redirectUri,
          state: nonce,
          scope: "all",
        });

        return new Response(null, {
          status: 302,
          headers: {
            "Location": `${KEETA_AUTHORIZE_URL}?${params}`,
            "Set-Cookie": `__ps_keeta_n=${cookieVal}; HttpOnly${secureCookie}; SameSite=Lax; Path=${cookiePath}; Max-Age=600`,
          },
        });
}

export const Route = createFileRoute("/api/auth/keeta")({
  server: {
    handlers: {
      GET: async ({ request }) => startKeetaOAuth(request),
    },
  },
});
