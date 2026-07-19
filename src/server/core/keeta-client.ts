// =============================================================================
// Keeta API client — signing, token exchange/refresh, and the generic
// signed-call wrapper. This is the ONLY place that computes a Keeta `sig` —
// every other Keeta touchpoint (OAuth callback, dispatch, inbound webhook
// verification) imports from here rather than re-implementing it.
//
// Keeta's request-signing scheme (confirmed against their own reference Java
// implementation, not guessed):
//   1. Take all request params except `sig`.
//   2. Sort keys ASCII/lexicographically.
//   3. Join as "key1=value1&key2=value2..." (no leading "&").
//   4. sig = lowercase-hex SHA-256 of: url + "?" + thatString + appSecret
//
// Complex/nested fields (e.g. a product array) are NOT sent as true nested
// JSON — Keeta's own worked example shows a nested object pre-serialized to
// a JSON string and stored as a single string value inside the same flat
// params map that gets signed. `keetaApiCall`'s `complexFields` option
// follows that pattern: each entry is JSON.stringify'd into the flat map
// before signing, and that same flat map (with `sig` appended) is the
// request body.
//
// `accessToken` is a signed BODY field on every authenticated call, not an
// `Authorization: Bearer` header — also per the reference example, which
// includes accessToken as an ordinary key in the signed params map.
//
// Required env vars (set in Cloudflare dashboard → Workers → Settings → Variables):
//   KEETA_APP_ID      — numeric, issued by Keeta after developer approval
//   KEETA_APP_SECRET  — issued alongside KEETA_APP_ID
// =============================================================================

import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const KEETA_API_BASE      = "https://open.mykeeta.com/api/open";
export const KEETA_AUTHORIZE_URL = "https://merchant.mykeeta.com/m/web/openapi/authorize";

const REFRESH_BUFFER_SECONDS = 24 * 3600; // proactively refresh once <24h remain of the 90-day token

type FlatValue = string | number | boolean;

// ---------------------------------------------------------------------------
// Signature
// ---------------------------------------------------------------------------
async function sha256Hex(input: string): Promise<string> {
  const enc = new TextEncoder();
  const digest = await crypto.subtle.digest("SHA-256", enc.encode(input));
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function signRequest(
  url: string,
  params: Record<string, FlatValue>,
  appSecret: string,
): Promise<string> {
  const sortedKeys = Object.keys(params).filter((k) => k !== "sig").sort();
  const sortedParamStr = sortedKeys.map((k) => `${k}=${params[k]}`).join("&");
  return sha256Hex(`${url}?${sortedParamStr}${appSecret}`);
}

// ---------------------------------------------------------------------------
// Generic signed call
// ---------------------------------------------------------------------------
export type KeetaCallResult<T = unknown> = {
  ok: boolean;
  httpStatus: number;
  data?: T;
  message?: string;
  durationMs: number;
};

export async function keetaApiCall<T = unknown>(
  path: string,
  params: Record<string, FlatValue>,
  opts?: {
    complexFields?: Record<string, unknown>;
    accessToken?: string;
    timeoutMs?: number;
  },
): Promise<KeetaCallResult<T>> {
  const start = Date.now();
  const appId = process.env.KEETA_APP_ID;
  const appSecret = process.env.KEETA_APP_SECRET;

  if (!appId || !appSecret) {
    return { ok: false, httpStatus: 503, message: "KEETA_APP_ID/KEETA_APP_SECRET is not configured.", durationMs: 0 };
  }

  const url = `${KEETA_API_BASE}${path}`;
  const allParams: Record<string, FlatValue> = {
    ...params,
    appId: Number(appId),
    timestamp: Math.floor(Date.now() / 1000),
  };
  if (opts?.accessToken) allParams.accessToken = opts.accessToken;
  for (const [key, value] of Object.entries(opts?.complexFields ?? {})) {
    allParams[key] = JSON.stringify(value);
  }

  const sig = await signRequest(url, allParams, appSecret);
  const body = { ...allParams, sig };

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), opts?.timeoutMs ?? 8000);

    const resp = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    const durationMs = Date.now() - start;
    const json = await resp.json().catch(() => null) as { code?: number; message?: string; data?: T } | null;

    // Keeta always returns HTTP 200 with a `code` field (0 = success) per their
    // response-format docs — treat a non-zero code as a failure even on 200.
    const businessOk = resp.ok && (json?.code === undefined || json.code === 0);
    if (businessOk) {
      return { ok: true, httpStatus: resp.status, data: json?.data, durationMs };
    }
    return {
      ok: false,
      httpStatus: resp.status,
      message: (json?.message ?? "").slice(0, 400) || `HTTP ${resp.status}`,
      durationMs,
    };
  } catch (e) {
    const durationMs = Date.now() - start;
    const isTimeout = (e instanceof Error && e.name === "AbortError") || durationMs >= (opts?.timeoutMs ?? 8000) - 100;
    return {
      ok: false,
      httpStatus: isTimeout ? 504 : 500,
      message: isTimeout ? "ERR_KEETA_TIMEOUT" : String(e),
      durationMs,
    };
  }
}

// ---------------------------------------------------------------------------
// OAuth token exchange / refresh
// ---------------------------------------------------------------------------
export type KeetaTokenResponse = {
  accessToken: string;
  tokenType: string;
  expiresIn: number;
  refreshToken: string;
  scope?: string;
  issuedAtTime: number;
};

export async function exchangeKeetaCode(code: string): Promise<KeetaCallResult<KeetaTokenResponse>> {
  return keetaApiCall<KeetaTokenResponse>("/base/oauth/token", {
    grantType: "authorization_code",
    code,
  });
}

export async function refreshKeetaToken(refreshToken: string): Promise<KeetaCallResult<KeetaTokenResponse>> {
  return keetaApiCall<KeetaTokenResponse>("/base/oauth/token", {
    grantType: "refresh_token",
    refreshToken,
  });
}

export async function registerKeetaWebhook(
  eventId: number,
  url: string,
  isTest = false,
): Promise<KeetaCallResult> {
  return keetaApiCall("/base/callback/url/set", { eventId, url, isTest });
}

// ---------------------------------------------------------------------------
// Proactive, single-write-safe token refresh
// ---------------------------------------------------------------------------
type KeetaChannelRow = {
  id: string;
  bearer_token: string | null;
  metadata: Record<string, unknown> | null;
};

export async function getValidKeetaAccessToken(
  channel: KeetaChannelRow,
): Promise<{ accessToken: string | null; refreshed: boolean; error?: string }> {
  const metadata = channel.metadata ?? {};
  const expiresAt = typeof metadata.expires_at === "string" ? Date.parse(metadata.expires_at) : NaN;
  const refreshToken = typeof metadata.refresh_token === "string" ? metadata.refresh_token : null;

  const needsRefresh = Number.isFinite(expiresAt)
    ? expiresAt - Date.now() < REFRESH_BUFFER_SECONDS * 1000
    : true;

  if (!needsRefresh) {
    return { accessToken: channel.bearer_token, refreshed: false };
  }
  if (!refreshToken) {
    // No known expiry and no refresh token to fall back on — use whatever we have.
    return { accessToken: channel.bearer_token, refreshed: false };
  }

  const result = await refreshKeetaToken(refreshToken);
  if (!result.ok || !result.data?.accessToken) {
    return { accessToken: null, refreshed: false, error: result.message ?? "Keeta token refresh failed." };
  }

  const tokens = result.data;
  const newExpiresAt = new Date(Date.now() + tokens.expiresIn * 1000).toISOString();

  // Single atomic write: new access token + new (single-use) refresh token +
  // new expiry all land together, so a partial-write state can never leave a
  // stale refresh_token committed alongside a fresh access_token.
  const { error: updateErr } = await supabaseAdmin
    .from("ps_merchant_channels")
    .update({
      bearer_token: tokens.accessToken,
      metadata: { ...metadata, refresh_token: tokens.refreshToken, expires_at: newExpiresAt },
      last_verified_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", channel.id);

  if (updateErr) {
    return { accessToken: null, refreshed: false, error: "Failed to persist refreshed Keeta token." };
  }
  return { accessToken: tokens.accessToken, refreshed: true };
}
