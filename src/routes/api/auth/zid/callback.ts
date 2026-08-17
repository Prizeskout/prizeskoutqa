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
import { backgroundTask } from "@/server/cf-ctx";
import { resolveZidTenant } from "@/server/core/zid-install";
import { registerZidWebhooks } from "@/server/core/zid-webhooks";

const ZID_TOKEN_URL    = "https://oauth.zid.sa/oauth/token";
const ZID_AUTH_URL     = "https://oauth.zid.sa/oauth/authorize";
const ZID_STORE_URL    = "https://api.zid.sa/v1/managers/account/store";
const ZID_EMBED_TOKEN_URL = "https://api.zid.sa/v1/managers/embedded-apps-token";

// Zid determines granted scopes from the partner dashboard selection.
const SCOPES = "embedded_apps_tokens_write";

type ZidTokenResponse = {
  access_token?:   string;
  Authorization?:  string;   // Zid's documented response field (capital A)
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

        // Two install paths:
        //   A) User-initiated (from our /api/auth/zid): CSRF cookie __ps_zid_n present, state matches nonce
        //   B) Marketplace-initiated (merchant installs from Zid app store): no cookie, no state
        const rawCookie   = request.headers.get("cookie") ?? "";
        const cookieEntry = rawCookie.split(";").map(s => s.trim()).find(s => s.startsWith("__ps_zid_n="));
        const cookieVal   = cookieEntry ? cookieEntry.slice("__ps_zid_n=".length) : "";

        // Zid's "Activate app" action (App Store listing / partner dashboard review)
        // sometimes lands the merchant directly on this callback URL with no code,
        // no error, and no CSRF cookie — i.e. no OAuth round-trip ever happened.
        // Rather than dead-ending, kick off the real authorize flow so the user
        // lands on Zid's consent screen and completes the install normally.
        if (!code && !cookieVal) {
          const redirectUri = `${getPublicOrigin(request)}/api/auth/zid/callback`;
          const nonce       = crypto.randomUUID().replace(/-/g, "");
          const merchantId  = "marketplace";
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
              "Location":   `${ZID_AUTH_URL}?${params}`,
              "Set-Cookie": `__ps_zid_n=${nonce}:${merchantId}:; HttpOnly; SameSite=Lax; Path=/api/auth/zid; Max-Age=600`,
            },
          });
        }
        if (!code) {
          return errorPage("Missing authorization code. Please try connecting again.");
        }

        let merchantId = "";
        let returnTo   = "";

        if (cookieVal) {
          // Path A: verify CSRF nonce
          const colonIdx = cookieVal.indexOf(":");
          if (colonIdx < 1 || cookieVal.slice(0, colonIdx) !== (state ?? "")) {
            return errorPage("State verification failed. Please try connecting again.");
          }
          const afterNonce  = cookieVal.slice(colonIdx + 1);
          const secondColon = afterNonce.indexOf(":");
          merchantId = secondColon >= 0 ? afterNonce.slice(0, secondColon) : afterNonce;
          returnTo   = secondColon >= 0 ? afterNonce.slice(secondColon + 1) : "";
          if (!merchantId) {
            return errorPage("Session expired. Please try connecting again.");
          }
        } else {
          // Path B: marketplace-initiated install. The store ID discovered
          // after token exchange resolves the stable PrizeSkout tenant.
          merchantId = "marketplace";
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
        // These are distinct credentials. Using access_token as Authorization
        // causes Zid to return 401 "No such user".
        const bearerToken = tokens.Authorization ?? tokens.authorization ?? "";
        const storeToken  = tokens.access_token ?? tokens.store_token ?? tokens.manager_token ?? tokens.token ?? null;

        if (!bearerToken) {
          return errorPage("Zid did not return the Authorization token. Please reconnect the app.");
        }
        if (!storeToken) {
          return errorPage("Zid did not return the store access token. Please reconnect the app.");
        }

        // 2. Probe store profile to get the native store ID
        let storeId = "";
        try {
          const probeHeaders: Record<string, string> = {
            Authorization: `Bearer ${bearerToken}`,
            Accept: "application/json",
          };
          if (storeToken) probeHeaders["X-MANAGER-TOKEN"] = storeToken;

          const profileRes = await fetch(ZID_STORE_URL, { headers: probeHeaders });
          if (profileRes.ok) {
            const profile = await profileRes.json() as {
              store?: { id?: string | number };
              id?: string | number;
            };
            storeId = String(profile.store?.id ?? profile.id ?? "");
          }
        } catch { /* non-fatal — store_id stored empty, webhook lookup still works */ }

        if (!storeId) {
          return errorPage("Zid did not return the store identity. Please reconnect the app.");
        }

        // A Zid store owns one PrizeSkout tenant. Reinstallations reuse the
        // existing tenant instead of generating duplicate merchant accounts.
        const tenant = await resolveZidTenant(storeId, merchantId);
        merchantId = tenant.merchantId;

        // Zid appends this registered UUID to the embedded Application URL.
        const embeddedToken = crypto.randomUUID();
        try {
          const embeddedRes = await fetch(ZID_EMBED_TOKEN_URL, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${bearerToken}`,
              "X-MANAGER-TOKEN": storeToken,
              "Content-Type": "application/json",
              Accept: "application/json",
            },
            body: JSON.stringify({ token: embeddedToken }),
          });
          if (!embeddedRes.ok) {
            const detail = await embeddedRes.text().catch(() => "");
            console.error("[zid-oauth] embedded token registration failed", embeddedRes.status, detail.slice(0, 300));
            return errorPage("Failed to create the embedded Zid session. Please reconnect the app.");
          }
        } catch {
          return errorPage("Failed to reach Zid while creating the embedded session.");
        }

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
              account_id:       tenant.accountId,
              licensee_id:      tenant.licenseeId,
              merchant_id:      merchantId,
              platform:         "zid",
              bearer_token:     bearerToken,
              manager_token:    storeToken,
              scopes:           [],
              status:           "connected",
              connected_at:     now,
              last_verified_at: now,
              updated_at:       now,
              error_message:    null,
              webhook_secret:   webhookSecret,
              metadata: {
                store_id:      storeId,
                expires_at:    expiresAt,
                oauth:         true,
                embedded_token: embeddedToken,
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
          const registration = await registerZidWebhooks({ bearerToken, managerToken: storeToken, webhookUrl, webhookSecret });
          if (registration.ok) {
            await supabaseAdmin
              .from("ps_merchant_channels")
              .update({ webhook_registered_at: now })
              .eq("id", row.id);
          } else {
            console.error("[zid-oauth] webhook registration failed", registration.message);
            await supabaseAdmin.from("ps_merchant_channels").update({ error_message: registration.message.slice(0, 400) }).eq("id", row.id);
          }
        } catch { /* non-fatal */ }

        // 5. Kick off initial catalog sync in the background
        backgroundTask(syncPlatformCatalog({
          platform:   "zid",
          creds:      { bearer_token: bearerToken, manager_token: storeToken, store_id: storeId || null },
          accountId:  tenant.accountId,
          licenseeId: tenant.licenseeId,
          merchantId,
          region:     "SA",
        }).catch(async (error) => {
          const message = error instanceof Error ? error.message : String(error);
          console.error("[zid-oauth] initial catalog sync failed", message);
          await supabaseAdmin
            .from("ps_merchant_channels")
            .update({ error_message: `Initial catalog sync failed: ${message.slice(0, 400)}` })
            .eq("id", row.id);
        }));

        // 6. Redirect: honour return_to, else marketplace installs go to onboarding, user-initiated to dashboard
        const defaultDest = cookieVal
          ? "/dashboard/revenue-hub"
          : `https://dashboard.zid.sa/en-sa/stores/${encodeURIComponent(storeId)}/apps/${encodeURIComponent(clientId)}/embedded`;
        const dest = (returnTo.startsWith("/") && !returnTo.startsWith("//")) ? returnTo : defaultDest;
        if (dest.startsWith("https://dashboard.zid.sa/")) return htmlRedirect(dest);
        const sep  = dest.includes("?") ? "&" : "?";
        return htmlRedirect(
          `${dest}${sep}zid_connected=1&merchant_id=${encodeURIComponent(merchantId)}`,
        );
      },
    },
  },
});
