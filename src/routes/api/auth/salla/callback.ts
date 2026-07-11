// GET /api/auth/salla/callback
//
// Receives the OAuth authorization code from Salla, exchanges it for tokens,
// persists the channel credentials, registers webhooks, and kicks off catalog sync.
//
// Required env vars:
//   SALLA_CLIENT_ID
//   SALLA_CLIENT_SECRET

import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { syncPlatformCatalog } from "@/server/core/platform-sync";

const SALLA_TOKEN_URL = "https://accounts.salla.sa/oauth2/token";

type SallaTokenResponse = {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  token_type?: string;
  scope?: string;
  merchant_id?: number;
};

type SallaStoreInfo = {
  data?: {
    id?: string | number;
    name?: string;
    domain?: string;
    currency?: string;
  };
};

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

function generateWebhookSecret(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export const Route = createFileRoute("/api/auth/salla/callback")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const clientId     = process.env.SALLA_CLIENT_ID;
        const clientSecret = process.env.SALLA_CLIENT_SECRET;

        if (!clientId || !clientSecret) {
          return errorPage("Salla OAuth is not configured. Set SALLA_CLIENT_ID and SALLA_CLIENT_SECRET.");
        }

        const url    = new URL(request.url);
        const code   = url.searchParams.get("code");
        const state  = url.searchParams.get("state");   // merchant_id
        const errParam = url.searchParams.get("error");

        if (errParam) {
          const desc = url.searchParams.get("error_description") ?? errParam;
          return errorPage(`Salla declined the connection: ${desc}`);
        }
        if (!code || !state) {
          return errorPage("Missing authorization code or state. Please try connecting again.");
        }

        const merchantId  = state;
        const redirectUri = `${url.origin}/api/auth/salla/callback`;

        // 1. Exchange authorization code for access + refresh tokens
        let tokens: SallaTokenResponse;
        try {
          const tokenRes = await fetch(SALLA_TOKEN_URL, {
            method: "POST",
            headers: {
              "Content-Type": "application/x-www-form-urlencoded",
              Accept: "application/json",
              // Ory Hydra (Salla's OAuth server) requires Basic Auth, not body credentials
              Authorization: `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
            },
            body: new URLSearchParams({
              grant_type:   "authorization_code",
              redirect_uri: redirectUri,
              code,
            }),
          });
          if (!tokenRes.ok) {
            const text = await tokenRes.text().catch(() => "");
            return errorPage(`Token exchange failed (HTTP ${tokenRes.status}): ${text.slice(0, 300)}`);
          }
          tokens = await tokenRes.json() as SallaTokenResponse;
        } catch (e) {
          return errorPage(`Failed to reach Salla token endpoint: ${String(e)}`);
        }

        if (!tokens.access_token) {
          return errorPage("Salla did not return an access token. Please try again.");
        }

        // 2. Fetch store info to get the platform-native store ID
        let storeId = String(tokens.merchant_id ?? "");
        let storeName = "";
        try {
          const infoRes = await fetch("https://api.salla.dev/admin/v2/store/info", {
            headers: { Authorization: `Bearer ${tokens.access_token}`, Accept: "application/json" },
          });
          if (infoRes.ok) {
            const info = await infoRes.json() as SallaStoreInfo;
            storeId   = String(info.data?.id   ?? storeId);
            storeName = String(info.data?.name ?? "");
          }
        } catch { /* non-fatal — we'll use the merchant_id from the token response */ }

        // 3. Persist channel in ps_merchant_channels
        const webhookSecret = generateWebhookSecret();
        const now           = new Date().toISOString();
        const expiresAt     = tokens.expires_in
          ? new Date(Date.now() + tokens.expires_in * 1000).toISOString()
          : null;

        const { data: row, error: upsertErr } = await supabaseAdmin
          .from("ps_merchant_channels")
          .upsert(
            {
              account_id:     merchantId,
              licensee_id:    merchantId,
              merchant_id:    merchantId,
              platform:       "salla",
              bearer_token:   tokens.access_token,
              scopes:         tokens.scope ? tokens.scope.split(" ") : [],
              status:         "connected",
              connected_at:   now,
              last_verified_at: now,
              updated_at:     now,
              webhook_secret: webhookSecret,
              metadata: {
                store_id:      storeId,
                store_name:    storeName,
                expires_at:    expiresAt,
                oauth:         true,
                // refresh_token stored here until a dedicated column is added
                refresh_token: tokens.refresh_token ?? null,
              },
            },
            { onConflict: "account_id,merchant_id,platform" },
          )
          .select("id")
          .single();

        if (upsertErr || !row) {
          return errorPage("Failed to save Salla credentials. Please try again.");
        }

        // 4. Register Salla webhooks so real-time product events flow into the pipeline
        try {
          const webhookUrl    = `${url.origin}/api/webhooks/salla`;
          const sallaHeaders  = {
            "Content-Type": "application/json",
            Accept: "application/json",
            Authorization: `Bearer ${tokens.access_token}`,
          };
          for (const event of ["product.price.updated", "product.created"]) {
            await fetch("https://api.salla.dev/admin/v2/webhooks/subscribe", {
              method: "POST",
              headers: sallaHeaders,
              body: JSON.stringify({ event, url: webhookUrl, secret: webhookSecret }),
            });
          }
          await supabaseAdmin
            .from("ps_merchant_channels")
            .update({ webhook_registered_at: now })
            .eq("id", row.id);
        } catch { /* non-fatal */ }

        // 5. Kick off initial catalog sync in the background
        syncPlatformCatalog({
          platform:   "salla",
          creds:      { bearer_token: tokens.access_token },
          accountId:  merchantId,
          licenseeId: merchantId,
          merchantId,
          region:     "SA",
        }).catch(() => { /* background — don't block redirect */ });

        // 6. Redirect to dashboard with a success flag
        return htmlRedirect(`/dashboard/revenue-hub?salla_connected=1`);
      },
    },
  },
});
