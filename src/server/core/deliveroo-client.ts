// =============================================================================
// Deliveroo Partner API client — OAuth 2.0 client_credentials token exchange
// + caching, and the site-level price-update call.
//
// Verified live against Deliveroo's real infrastructure (not guessed) before
// writing this — the codebase previously used the merchant's raw stored
// credential directly as a Bearer token, the same defect class found and
// fixed for Talabat earlier this session:
//
//   API host:         https://api.developers.deliveroo.com          (confirmed
//                      live — real AWS API Gateway responses, deliveroo.com
//                      cookie domain)
//   Token endpoint:    POST https://auth.developers.deliveroo.com/oauth2/token
//                      (confirmed live — returns a real {"error":"invalid_client"}
//                      for bad credentials, not a connection failure)
//                      form-urlencoded: grant_type=client_credentials,
//                      client_id, client_secret
//                      → { access_token, token_type: "Bearer", expires_in }
//                      (expires_in is short — ~300s per Deliveroo's docs)
//   Price update:      PUT /brands/{brand_id}/catalogue/{catalogue_id}
//                          /sites/{site_id}/prices
//                      Authorization: Bearer <access_token>
//                      body: { version: "update-prices-v1", items: [...] }
//                      (confirmed from Deliveroo's docs page — but that page
//                      would not render the exact per-item field schema for
//                      me. The item shape below is a best-effort guess based
//                      on the documented "aligns with the price_info format
//                      used in the Master Catalogue" hint, NOT a confirmed
//                      schema. This endpoint is also not reachable by any
//                      merchant today — Deliveroo isn't BYOK-connectable yet
//                      — so this has never been exercised against a real
//                      account. Flagged for real-API testing before launch,
//                      same as Keeta's spuList shape earlier this session.)
// =============================================================================

import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const DELIVEROO_BASE = "https://api.developers.deliveroo.com";
export const DELIVEROO_TOKEN_URL = "https://auth.developers.deliveroo.com/oauth2/token";

const REFRESH_BUFFER_SECONDS = 60; // Deliveroo tokens are short-lived (~300s) — refresh with a tighter buffer than Talabat's

export type DeliverooCallResult<T = unknown> = {
  ok: boolean;
  httpStatus: number;
  data?: T;
  message?: string;
  durationMs: number;
};

type DeliverooTokenResponse = { access_token: string; token_type: string; expires_in: number };

export async function exchangeDeliverooToken(
  clientId: string,
  clientSecret: string,
): Promise<DeliverooCallResult<DeliverooTokenResponse>> {
  const start = Date.now();
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const resp = await fetch(DELIVEROO_TOKEN_URL, {
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
    const json = await resp.json().catch(() => null) as DeliverooTokenResponse | null;
    if (!json?.access_token) {
      return { ok: false, httpStatus: resp.status, message: "Deliveroo did not return an access_token.", durationMs };
    }
    return { ok: true, httpStatus: resp.status, data: json, durationMs };
  } catch (e) {
    const durationMs = Date.now() - start;
    const isTimeout = e instanceof Error && e.name === "AbortError";
    return { ok: false, httpStatus: isTimeout ? 504 : 500, message: isTimeout ? "ERR_DELIVEROO_TIMEOUT" : String(e), durationMs };
  }
}

type DeliverooChannelRow = {
  id: string;
  manager_token: string | null; // client_id
  bearer_token: string | null;  // client_secret
  metadata: Record<string, unknown> | null;
};

export async function getValidDeliverooAccessToken(
  channel: DeliverooChannelRow,
): Promise<{ accessToken: string | null; error?: string }> {
  const metadata = channel.metadata ?? {};
  const cachedToken = typeof metadata.access_token === "string" ? metadata.access_token : null;
  const expiresAt = typeof metadata.token_expires_at === "string" ? Date.parse(metadata.token_expires_at) : NaN;

  const stillValid = !!cachedToken && Number.isFinite(expiresAt) && (expiresAt - Date.now() > REFRESH_BUFFER_SECONDS * 1000);
  if (stillValid) return { accessToken: cachedToken };

  const clientId = channel.manager_token;
  const clientSecret = channel.bearer_token;
  if (!clientId || !clientSecret) {
    return { accessToken: null, error: "Deliveroo client_id/client_secret missing." };
  }

  const result = await exchangeDeliverooToken(clientId, clientSecret);
  if (!result.ok || !result.data?.access_token) {
    return { accessToken: null, error: result.message ?? "Deliveroo token exchange failed." };
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

export async function updateDeliverooPrice(params: {
  brandId: string;
  catalogueId: string;
  siteId: string;
  sku: string;
  newPrice: number;
  accessToken: string;
}): Promise<DeliverooCallResult> {
  const { brandId, catalogueId, siteId, sku, newPrice, accessToken } = params;
  const start = Date.now();
  const url = `${DELIVEROO_BASE}/brands/${encodeURIComponent(brandId)}/catalogue/${encodeURIComponent(catalogueId)}/sites/${encodeURIComponent(siteId)}/prices`;

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
      // Best-effort item shape — NOT confirmed against real docs or a live
      // account. See the file header comment.
      body: JSON.stringify({
        version: "update-prices-v1",
        items: [{ id: sku, price_info: { price: newPrice } }],
      }),
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
    return { ok: false, httpStatus: isTimeout ? 504 : 500, message: isTimeout ? "ERR_DELIVEROO_TIMEOUT" : String(e), durationMs };
  }
}
