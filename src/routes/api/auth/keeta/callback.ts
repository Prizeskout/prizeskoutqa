// GET /api/auth/keeta/callback
//
// Receives the authorization code from Keeta's merchant self-authorization
// flow, exchanges it for tokens (via the signed keeta-client helper),
// persists the channel, and registers the order-placement webhook.
//
// Keeta OAuth:
//   Authorize URL: https://merchant.mykeeta.com/m/web/openapi/authorize
//   Token URL:     https://open.mykeeta.com/api/open/base/oauth/token (signed POST)
//
// Unlike Zid/Salla, Keeta has no marketplace/app-store auto-install path, so
// there's no "no cookie, no code" fallback branch — a missing cookie is
// simply an error.
//
// Required env vars:
//   KEETA_APP_ID
//   KEETA_APP_SECRET

import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { exchangeKeetaCode, registerKeetaWebhook } from "@/server/core/keeta-client";
import { getPublicOrigin } from "@/server/public-origin";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function htmlRedirect(to: string): Response {
  return new Response(
    `<!doctype html><html><head><meta http-equiv="refresh" content="0;url=${escapeHtml(to)}"></head></html>`,
    { status: 200, headers: { "Content-Type": "text/html" } },
  );
}

function errorPage(message: string): Response {
  return new Response(
    `<!doctype html><html><body style="font-family:sans-serif;padding:40px">
      <h2>Connection failed</h2><p>${escapeHtml(message)}</p>
      <a href="/dashboard/revenue-hub">Return to dashboard</a>
    </body></html>`,
    { status: 400, headers: { "Content-Type": "text/html" } },
  );
}

export async function handleKeetaCallback(request: Request) {
        const appId     = process.env.KEETA_APP_ID;
        const appSecret = process.env.KEETA_APP_SECRET;

        if (!appId || !appSecret) {
          return errorPage("Keeta OAuth is not configured. Set KEETA_APP_ID and KEETA_APP_SECRET.");
        }

        const url      = new URL(request.url);
        const code     = url.searchParams.get("code");
        const state    = url.searchParams.get("state");   // nonce (CSRF protection)
        const errParam = url.searchParams.get("error");

        if (errParam) {
          return errorPage("Keeta declined the connection. Please try again.");
        }
        if (!code) {
          return errorPage("Missing authorization code. Please try connecting again.");
        }

        const rawCookie   = request.headers.get("cookie") ?? "";
        const cookieEntry = rawCookie.split(";").map(s => s.trim()).find(s => s.startsWith("__ps_keeta_n="));
        const cookieVal   = cookieEntry ? cookieEntry.slice("__ps_keeta_n=".length) : "";

        if (!cookieVal) {
          return errorPage("Session expired. Please try connecting again.");
        }

        // Verify CSRF nonce
        const colonIdx = cookieVal.indexOf(":");
        if (colonIdx < 1 || cookieVal.slice(0, colonIdx) !== (state ?? "")) {
          return errorPage("State verification failed. Please try connecting again.");
        }
        const afterNonce  = cookieVal.slice(colonIdx + 1);
        const secondColon = afterNonce.indexOf(":");
        const merchantId  = secondColon >= 0 ? afterNonce.slice(0, secondColon) : afterNonce;
        const returnTo    = secondColon >= 0 ? afterNonce.slice(secondColon + 1) : "";
        if (!merchantId) {
          return errorPage("Session expired. Please try connecting again.");
        }

        // 1. Exchange authorization code for tokens
        const tokenResult = await exchangeKeetaCode(code);
        if (!tokenResult.ok) {
          return errorPage(`Token exchange failed: ${tokenResult.message ?? "unknown error"}. Please try connecting again.`);
        }
        const tokens = tokenResult.data;
        if (!tokens?.accessToken) {
          return errorPage("Keeta did not return an access token. Please try again.");
        }

        // 2. Persist channel in ps_merchant_channels
        //    shopId is not returned by Keeta's OAuth flow (no discovery endpoint
        //    exists in their docs) — captured separately via a post-connect
        //    "finish setup" prompt, stored at metadata.shop_id.
        const now       = new Date().toISOString();
        const expiresAt = new Date(Date.now() + tokens.expiresIn * 1000).toISOString();

        const { data: row, error: upsertErr } = await supabaseAdmin
          .from("ps_merchant_channels")
          .upsert(
            {
              account_id:       merchantId,
              licensee_id:      merchantId,
              merchant_id:      merchantId,
              platform:         "keeta",
              bearer_token:     tokens.accessToken,
              manager_token:    null,
              scopes:           tokens.scope ? tokens.scope.split(" ") : [],
              status:           "connected",
              connected_at:     now,
              last_verified_at: now,
              updated_at:       now,
              // Keeta verifies webhooks via the same app-level sig scheme as
              // outbound calls, not a per-channel HMAC secret — left unset.
              webhook_secret:   null,
              metadata: {
                expires_at:    expiresAt,
                refresh_token: tokens.refreshToken,
                oauth:         true,
                shop_id:       null,
              },
            },
            { onConflict: "account_id,merchant_id,platform" },
          )
          .select("id")
          .single();

        if (upsertErr || !row) {
          return errorPage("Failed to save Keeta credentials. Please try again.");
        }

        // 3. Register the order-placement webhook (non-fatal — Keeta's other
        //    event types have no consumer in the pipeline yet, see
        //    platform-webhooks.ts's handleKeetaWebhook for why).
        try {
          const webhookUrl = `${getPublicOrigin(request)}/api/webhooks/keeta`;
          const whResult = await registerKeetaWebhook(1001, webhookUrl);
          if (whResult.ok) {
            await supabaseAdmin
              .from("ps_merchant_channels")
              .update({ webhook_registered_at: now })
              .eq("id", row.id);
          }
        } catch { /* non-fatal */ }

        // 4. Redirect: honour return_to, else always the dashboard (no
        //    marketplace-install fallback exists for Keeta).
        const dest = (returnTo.startsWith("/") && !returnTo.startsWith("//")) ? returnTo : "/dashboard/revenue-hub";
        const sep  = dest.includes("?") ? "&" : "?";
        return htmlRedirect(`${dest}${sep}keeta_connected=1`);
}

export const Route = createFileRoute("/api/auth/keeta/callback")({
  server: {
    handlers: {
      GET: async ({ request }) => handleKeetaCallback(request),
    },
  },
});
