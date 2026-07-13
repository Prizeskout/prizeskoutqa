// GET /api/auth/zid/callback
//
// Receives the OAuth authorization code from Zid, exchanges it for tokens,
// persists credentials, registers webhooks, and triggers catalog sync.
//
// Zid OAuth:
//   Token URL:  https://oauth.zid.sa/oauth/token
//   API Base:   https://api.zid.sa
//
// Token response fields:
//   access_token  (or "authorization") → stored as bearer_token
//   store_token                        → stored as manager_token (X-MANAGER-TOKEN)
//   refresh_token                      → stored in metadata.refresh_token
//
// Required env vars:
//   ZID_CLIENT_ID
//   ZID_CLIENT_SECRET

import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { getPublicOrigin } from "@/server/public-origin";
import { syncPlatformCatalog } from "@/server/core/platform-sync";

const ZID_TOKEN_URL    = "https://oauth.zid.sa/oauth/token";
const ZID_PROFILE_URL  = "https://api.zid.sa/v1/profile/";
const ZID_WEBHOOK_URL  = "https://api.zid.sa/v1/managers/webhooks";

type ZidTokenResponse = {
  access_token?:   string;
  authorization?:  string;   // Zid sometimes returns this instead of access_token
  store_token?:    string;
  manager_token?:  string;   // alternate field name
  token?:          string;   // another alternate
  refresh_token?:  string;
  expires_in?:     number;
  token_type?:     string;
  [key: string]:   unknown;  // capture any unexpected fields
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

export const Route = createFileRoute("/api/auth/zid/callback")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const clientId     = process.env.ZID_CLIENT_ID;
        const clientSecret = process.env.ZID_CLIENT_SECRET;

        if (!clientId || !clientSecret) {
          return errorPage("Zid OAuth is not configured. Set ZID_CLIENT_ID and ZID_CLIENT_SECRET.");
        }

        const url      = new URL(request.url);
        const code     = url.searchParams.get("code");
        const state    = url.searchParams.get("state");   // nonce (CSRF protection)
        const errParam = url.searchParams.get("error");

        if (errParam) {
          return errorPage("Zid declined the connection. Please try again.");
        }
        if (!code || !state) {
          return errorPage("Missing authorization code or state. Please try connecting again.");
        }

        // Verify CSRF nonce: cookie __ps_zid_n must be "nonce:merchantId[:returnTo]"
        const rawCookie = request.headers.get("cookie") ?? "";
        const cookieEntry = rawCookie.split(";").map(s => s.trim()).find(s => s.startsWith("__ps_zid_n="));
        const cookieVal = cookieEntry ? cookieEntry.slice("__ps_zid_n=".length) : "";
        const colonIdx = cookieVal.indexOf(":");
        if (colonIdx < 1 || cookieVal.slice(0, colonIdx) !== state) {
          return errorPage("State verification failed. Please try connecting again.");
        }
        const afterNonce  = cookieVal.slice(colonIdx + 1);
        const secondColon = afterNonce.indexOf(":");
        const merchantId  = secondColon >= 0 ? afterNonce.slice(0, secondColon) : afterNonce;
        const returnTo    = secondColon >= 0 ? afterNonce.slice(secondColon + 1) : "";
        if (!merchantId) {
          return errorPage("Session expired. Please try connecting again.");
        }
        const redirectUri = `${getPublicOrigin(request)}/api/auth/zid/callback`;

        // 1. Exchange authorization code for tokens
        let tokens: ZidTokenResponse;
        try {
          const tokenRes = await fetch(ZID_TOKEN_URL, {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
            body: new URLSearchParams({
              grant_type:    "authorization_code",
              client_id:     clientId,
              client_secret: clientSecret,
              redirect_uri:  redirectUri,
              code,
            }),
          });
          if (!tokenRes.ok) {
            return errorPage("Token exchange failed. Please try connecting again.");
          }
          tokens = await tokenRes.json() as ZidTokenResponse;
        } catch {
          return errorPage("Failed to reach Zid. Please try connecting again.");
        }

        // Zid token response fields (per Zid docs):
        //   authorization → Bearer token (Authorization: Bearer header)
        //   access_token  → manager token (X-MANAGER-TOKEN header)
        const bearerToken = tokens.authorization ?? tokens.access_token ?? "";
        const storeToken  = tokens.access_token ?? tokens.store_token ?? tokens.manager_token ?? null;

        if (!bearerToken) {
          return errorPage("Zid did not return an access token. Please try again.");
        }

        // 2. Probe store profile to get the native store ID
        let storeId = "";
        try {
          const probeHeaders: Record<string, string> = {
            Authorization: `Bearer ${bearerToken}`,
            Accept: "application/json",
          };
          if (storeToken) probeHeaders["X-MANAGER-TOKEN"] = storeToken;

          const profileRes = await fetch(ZID_PROFILE_URL, { headers: probeHeaders });
          if (profileRes.ok) {
            const profile = await profileRes.json() as {
              store?: { id?: string | number };
              id?: string | number;
            };
            storeId = String(profile.store?.id ?? profile.id ?? "");
          }
        } catch { /* non-fatal — store_id stored empty, webhook lookup still works */ }

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
              account_id:       merchantId,
              licensee_id:      merchantId,
              merchant_id:      merchantId,
              platform:         "zid",
              bearer_token:     bearerToken,
              manager_token:    storeToken,
              scopes:           [],
              status:           "connected",
              connected_at:     now,
              last_verified_at: now,
              updated_at:       now,
              webhook_secret:   webhookSecret,
              metadata: {
                store_id:      storeId,
                expires_at:    expiresAt,
                oauth:         true,
                refresh_token: tokens.refresh_token ?? null,
              },
            },
            { onConflict: "account_id,merchant_id,platform" },
          )
          .select("id")
          .single();

        if (upsertErr || !row) {
          return errorPage("Failed to save Zid credentials. Please try again.");
        }

        // 4. Register webhook with Zid
        // Zid uses Basic Auth on inbound webhooks: Authorization: Basic base64("prizeskout:<secret>")
        try {
          const webhookUrl = `${url.origin}/api/webhooks/zid`;
          const whHeaders: Record<string, string> = {
            "Content-Type": "application/json",
            Accept: "application/json",
            Authorization: `Bearer ${bearerToken}`,
          };
          if (storeToken) whHeaders["X-MANAGER-TOKEN"] = storeToken;

          await fetch(ZID_WEBHOOK_URL, {
            method: "POST",
            headers: whHeaders,
            body: JSON.stringify({
              event:       "product.update",
              target_url:  webhookUrl,
              original_id: "prizeskout",
              username:    "prizeskout",
              password:    webhookSecret,
            }),
          });

          await supabaseAdmin
            .from("ps_merchant_channels")
            .update({ webhook_registered_at: now })
            .eq("id", row.id);
        } catch { /* non-fatal */ }

        // 5. Kick off initial catalog sync in the background
        syncPlatformCatalog({
          platform:   "zid",
          creds:      { bearer_token: bearerToken, manager_token: storeToken },
          accountId:  merchantId,
          licenseeId: merchantId,
          merchantId,
          region:     "SA",
        }).catch(() => { /* background — don't block redirect */ });

        // 6. Redirect to return_to (onboarding) or dashboard
        const dest = (returnTo.startsWith("/") && !returnTo.startsWith("//")) ? returnTo : "/dashboard/revenue-hub";
        const sep  = dest.includes("?") ? "&" : "?";
        return htmlRedirect(`${dest}${sep}zid_connected=1`);
      },
    },
  },
});
