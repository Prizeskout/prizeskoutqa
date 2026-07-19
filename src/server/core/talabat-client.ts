// =============================================================================
// Talabat (Delivery Hero) Partner API client — OAuth 2.0 client_credentials
// token exchange + caching, and the price-update call.
//
// Verified against Talabat's real Partner API docs (developer.talabat.com),
// not guessed — the codebase previously used the merchant's raw client_secret
// directly as a Bearer token against a fabricated host (api.talabat.com),
// which would have failed the moment a real merchant tried it.
//
//   Base URL:        https://talabat.partner.deliveryhero.io/v2
//   Token endpoint:  POST /oauth/token (form-urlencoded: grant_type=
//                     client_credentials, client_id, client_secret)
//                     → { access_token, token_type: "Bearer", expires_in }
//   Price update:    PUT /chains/{chain_id}/vendors/{vendor_id}/catalog
//                     Authorization: Bearer <access_token>
//                     body: { products: [{ sku, price }] }
//                     → 202 Accepted { job_id, job_status: "QUEUED" } (async —
//                       Talabat queues the update; there is no synchronous
//                       confirmation the price is live, and no job-status
//                       polling is implemented here)
//
// access_token is a short-lived JWT — cache and reuse until it expires
// (Talabat's own guidance), not re-exchanged on every dispatch.
// =============================================================================

import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const TALABAT_BASE = "https://talabat.partner.deliveryhero.io/v2";

const REFRESH_BUFFER_SECONDS = 300; // refresh once <5min remain on the short-lived JWT

export type TalabatCallResult<T = unknown> = {
  ok: boolean;
  httpStatus: number;
  data?: T;
  message?: string;
  durationMs: number;
};

type TalabatTokenResponse = { access_token: string; token_type: string; expires_in: number };

export async function exchangeTalabatToken(
  clientId: string,
  clientSecret: string,
): Promise<TalabatCallResult<TalabatTokenResponse>> {
  const start = Date.now();
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const resp = await fetch(`${TALABAT_BASE}/oauth/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
      body: new URLSearchParams({
        grant_type: "client_credentials",
        client_id: clientId,
        client_secret: clientSecret,
      }),
      signal: controller.signal,
    });
    clearTimeout(timeout);
    const durationMs = Date.now() - start;

    if (!resp.ok) {
      const text = await resp.text().catch(() => "");
      return { ok: false, httpStatus: resp.status, message: text.slice(0, 400) || `HTTP ${resp.status}`, durationMs };
    }
    const json = await resp.json().catch(() => null) as TalabatTokenResponse | null;
    if (!json?.access_token) {
      return { ok: false, httpStatus: resp.status, message: "Talabat did not return an access_token.", durationMs };
    }
    return { ok: true, httpStatus: resp.status, data: json, durationMs };
  } catch (e) {
    const durationMs = Date.now() - start;
    const isTimeout = e instanceof Error && e.name === "AbortError";
    return { ok: false, httpStatus: isTimeout ? 504 : 500, message: isTimeout ? "ERR_TALABAT_TIMEOUT" : String(e), durationMs };
  }
}

type TalabatChannelRow = {
  id: string;
  manager_token: string | null; // holds client_id (see byok-connect.ts's connectTalabat)
  bearer_token: string | null;  // holds client_secret
  metadata: Record<string, unknown> | null;
};

// Proactive, cache-first access token resolution. client_id/client_secret
// (the merchant's raw OAuth credentials) stay in manager_token/bearer_token;
// the short-lived exchanged access_token is cached separately in metadata so
// dispatch doesn't hit Talabat's rate-limited token endpoint on every call.
export async function getValidTalabatAccessToken(
  channel: TalabatChannelRow,
): Promise<{ accessToken: string | null; error?: string }> {
  const metadata = channel.metadata ?? {};
  const cachedToken = typeof metadata.access_token === "string" ? metadata.access_token : null;
  const expiresAt = typeof metadata.token_expires_at === "string" ? Date.parse(metadata.token_expires_at) : NaN;

  const stillValid = !!cachedToken && Number.isFinite(expiresAt) && (expiresAt - Date.now() > REFRESH_BUFFER_SECONDS * 1000);
  if (stillValid) return { accessToken: cachedToken };

  const clientId = channel.manager_token;
  const clientSecret = channel.bearer_token;
  if (!clientId || !clientSecret) {
    return { accessToken: null, error: "Talabat client_id/client_secret missing." };
  }

  const result = await exchangeTalabatToken(clientId, clientSecret);
  if (!result.ok || !result.data?.access_token) {
    return { accessToken: null, error: result.message ?? "Talabat token exchange failed." };
  }

  const newExpiresAt = new Date(Date.now() + result.data.expires_in * 1000).toISOString();
  await supabaseAdmin
    .from("ps_merchant_channels")
    .update({
      metadata: { ...metadata, access_token: result.data.access_token, token_expires_at: newExpiresAt },
      last_verified_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", channel.id);

  return { accessToken: result.data.access_token };
}

export async function updateTalabatPrice(params: {
  chainId: string;
  vendorId: string;
  sku: string;
  newPrice: number;
  accessToken: string;
}): Promise<TalabatCallResult> {
  const { chainId, vendorId, sku, newPrice, accessToken } = params;
  const start = Date.now();
  const url = `${TALABAT_BASE}/chains/${encodeURIComponent(chainId)}/vendors/${encodeURIComponent(vendorId)}/catalog`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const resp = await fetch(url, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ products: [{ sku, price: newPrice }] }),
      signal: controller.signal,
    });
    clearTimeout(timeout);
    const durationMs = Date.now() - start;

    if (!resp.ok) {
      const text = await resp.text().catch(() => "");
      return { ok: false, httpStatus: resp.status, message: text.slice(0, 400) || `HTTP ${resp.status}`, durationMs };
    }
    return { ok: true, httpStatus: resp.status, durationMs };
  } catch (e) {
    const durationMs = Date.now() - start;
    const isTimeout = e instanceof Error && e.name === "AbortError";
    return { ok: false, httpStatus: isTimeout ? 504 : 500, message: isTimeout ? "ERR_TALABAT_TIMEOUT" : String(e), durationMs };
  }
}
