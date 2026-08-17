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
//   Order history:   GET /chains/{chain_id}/vendors/{vendor_id}/orders
//                     Authorization: Bearer <access_token>
//                     query: start_time, end_time (ISO 8601, max 60 days back),
//                            page (default 1), page_size (1-500, default 20)
//                     → { orders: [...], page_number, page_size, total_pages }
//                     Each order's payment object separates sub_total (food
//                     value) from delivery_fee and order_total — confirmed
//                     from Talabat's own docs, not assumed. This is what
//                     powers the expected-payout calculation: commission
//                     applies to sub_total, never to delivery_fee or the
//                     combined total.
//
// access_token is a short-lived JWT — cache and reuse until it expires
// (Talabat's own guidance), not re-exchanged on every dispatch.
// =============================================================================

import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { buildTalabatOrderUpdate, validateTalabatOrderUpdate, type TalabatOrderUpdateStatus, type TalabatTransportType } from "./talabat-contract";

export const TALABAT_BASE = "https://talabat.partner.deliveryhero.io/v2";
export const TALABAT_SANDBOX_BASE = "https://sandbox.partner.deliveryhero.io/v2";
export type TalabatEnvironment = "production" | "sandbox";

export function talabatBaseUrl(environment: TalabatEnvironment = "production"): string {
  return environment === "sandbox" ? TALABAT_SANDBOX_BASE : TALABAT_BASE;
}

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
  environment: TalabatEnvironment = "production",
): Promise<TalabatCallResult<TalabatTokenResponse>> {
  const start = Date.now();
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const resp = await fetch(`${talabatBaseUrl(environment)}/oauth/token`, {
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
  const environment: TalabatEnvironment = metadata.environment === "sandbox" ? "sandbox" : "production";
  const cachedToken = typeof metadata.access_token === "string" ? metadata.access_token : null;
  const expiresAt = typeof metadata.token_expires_at === "string" ? Date.parse(metadata.token_expires_at) : NaN;

  const stillValid = !!cachedToken && Number.isFinite(expiresAt) && (expiresAt - Date.now() > REFRESH_BUFFER_SECONDS * 1000);
  if (stillValid) return { accessToken: cachedToken };

  const clientId = channel.manager_token;
  const clientSecret = channel.bearer_token;
  if (!clientId || !clientSecret) {
    return { accessToken: null, error: "Talabat client_id/client_secret missing." };
  }

  const result = await exchangeTalabatToken(clientId, clientSecret, environment);
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
  environment?: TalabatEnvironment;
  tracking?: {
    channelId: string;
    accountId: string;
    licenseeId: string;
    merchantId: string;
    sourcePlanId?: string;
  };
}): Promise<TalabatCallResult> {
  const { chainId, vendorId, sku, newPrice, accessToken, environment = "production" } = params;
  const start = Date.now();
  const url = `${talabatBaseUrl(environment)}/chains/${encodeURIComponent(chainId)}/vendors/${encodeURIComponent(vendorId)}/catalog`;

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
    const data = await resp.json().catch(() => null) as { job_id?: string; job_status?: string } | null;
    if (!data?.job_id) return { ok: false, httpStatus: resp.status, message: "Talabat accepted the request without returning a job_id.", durationMs };
    if (params.tracking) {
      // New table is intentionally accessed through an untyped boundary until
      // generated Supabase types include the hardening migration.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabaseAdmin as any).from("ps_talabat_catalog_jobs").upsert({
        channel_id: params.tracking.channelId,
        account_id: params.tracking.accountId,
        licensee_id: params.tracking.licenseeId,
        merchant_id: params.tracking.merchantId,
        environment,
        job_id: data.job_id,
        operation: "update_products",
        source_plan_id: params.tracking.sourcePlanId ?? null,
        status: data.job_status ?? "QUEUED",
        requested_products: [{ sku, price: newPrice }],
        updated_at: new Date().toISOString(),
      }, { onConflict: "channel_id,job_id" });
    }
    return { ok: true, httpStatus: resp.status, data, durationMs };
  } catch (e) {
    const durationMs = Date.now() - start;
    const isTimeout = e instanceof Error && e.name === "AbortError";
    return { ok: false, httpStatus: isTimeout ? 504 : 500, message: isTimeout ? "ERR_TALABAT_TIMEOUT" : String(e), durationMs };
  }
}

export async function verifyTalabatVendorAccess(params: {
  chainId: string;
  vendorId: string;
  accessToken: string;
  environment?: TalabatEnvironment;
}): Promise<TalabatCallResult> {
  const { chainId, vendorId, accessToken, environment = "production" } = params;
  const start = Date.now();
  try {
    const url = new URL(`${talabatBaseUrl(environment)}/chains/${encodeURIComponent(chainId)}/vendors/${encodeURIComponent(vendorId)}/catalog`);
    url.searchParams.set("page", "1");
    url.searchParams.set("page_size", "1");
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const response = await fetch(url, { headers: { Accept: "application/json", Authorization: `Bearer ${accessToken}` }, signal: controller.signal });
    clearTimeout(timeout);
    const durationMs = Date.now() - start;
    if (!response.ok) {
      const message = await response.text().catch(() => "");
      return { ok: false, httpStatus: response.status, message: message.slice(0, 400) || `HTTP ${response.status}`, durationMs };
    }
    return { ok: true, httpStatus: response.status, data: await response.json().catch(() => null), durationMs };
  } catch (error) {
    const timeout = error instanceof Error && error.name === "AbortError";
    return { ok: false, httpStatus: timeout ? 504 : 500, message: timeout ? "ERR_TALABAT_TIMEOUT" : String(error), durationMs: Date.now() - start };
  }
}

export async function updateTalabatOrder(params: {
  chainId: string;
  orderId: string;
  status: TalabatOrderUpdateStatus;
  transportType?: TalabatTransportType;
  cancellationReason?: string;
  items: unknown[];
  accessToken: string;
  environment?: TalabatEnvironment;
}): Promise<TalabatCallResult> {
  const { chainId, orderId, status, transportType, cancellationReason, items, accessToken, environment = "production" } = params;
  const start = Date.now();
  const validationError = validateTalabatOrderUpdate({ orderId, status, transportType, cancellationReason, items });
  if (validationError) return { ok: false, httpStatus: 422, message: validationError, durationMs: 0 };

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const resp = await fetch(`${talabatBaseUrl(environment)}/chains/${encodeURIComponent(chainId)}/orders/${encodeURIComponent(orderId)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Accept: "application/json", Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify(buildTalabatOrderUpdate({ orderId, status, cancellationReason, items })),
      signal: controller.signal,
    });
    clearTimeout(timeout);
    const durationMs = Date.now() - start;
    if (!resp.ok) {
      const message = await resp.text().catch(() => "");
      return { ok: false, httpStatus: resp.status, message: message.slice(0, 400) || `HTTP ${resp.status}`, durationMs };
    }
    return { ok: true, httpStatus: resp.status, data: await resp.json().catch(() => null), durationMs };
  } catch (error) {
    const timeout = error instanceof Error && error.name === "AbortError";
    return { ok: false, httpStatus: timeout ? 504 : 500, message: timeout ? "ERR_TALABAT_TIMEOUT" : String(error), durationMs: Date.now() - start };
  }
}

export type TalabatOrder = {
  order_id?: string;
  order_code?: string;
  payment?: {
    sub_total?: number;
    delivery_fee?: number;
    order_total?: number;
    [key: string]: unknown;
  };
  products?: TalabatOrderItem[];
  items?: TalabatOrderItem[];
  [key: string]: unknown;
};

export type TalabatOrderItem = {
  id?: string;
  sku?: string;
  name?: string;
  quantity?: number;
  price?: number;
  unit_price?: number;
  total_price?: number;
  [key: string]: unknown;
};

type TalabatOrdersPage = {
  orders: TalabatOrder[];
  page_number: number;
  page_size: number;
  total_pages: number;
};

const ORDERS_PAGE_SIZE = 500; // Talabat's documented max per page
const ORDERS_MAX_PAGES = 20;  // safety cap — 10,000 orders is far beyond any real period this feature checks

// Pulls a vendor's real order history for reconciliation — this is the data
// source for the expected-payout feature. start/end must not span more than
// 60 days (Talabat's own limit); callers pick the window (e.g. current month).
export async function getTalabatOrders(params: {
  chainId: string;
  vendorId: string;
  accessToken: string;
  startTime: string; // ISO 8601
  endTime: string;   // ISO 8601
  environment?: TalabatEnvironment;
}): Promise<TalabatCallResult<TalabatOrder[]>> {
  const { chainId, vendorId, accessToken, startTime, endTime, environment = "production" } = params;
  const start = Date.now();
  const allOrders: TalabatOrder[] = [];

  try {
    for (let page = 1; page <= ORDERS_MAX_PAGES; page++) {
      const url = new URL(`${talabatBaseUrl(environment)}/chains/${encodeURIComponent(chainId)}/vendors/${encodeURIComponent(vendorId)}/orders`);
      url.searchParams.set("start_time", startTime);
      url.searchParams.set("end_time", endTime);
      url.searchParams.set("page", String(page));
      url.searchParams.set("page_size", String(ORDERS_PAGE_SIZE));

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);

      const resp = await fetch(url, {
        method: "GET",
        headers: { Accept: "application/json", Authorization: `Bearer ${accessToken}` },
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (!resp.ok) {
        const text = await resp.text().catch(() => "");
        return { ok: false, httpStatus: resp.status, message: text.slice(0, 400) || `HTTP ${resp.status}`, durationMs: Date.now() - start };
      }

      const json = await resp.json().catch(() => null) as TalabatOrdersPage | null;
      if (!json?.orders) {
        return { ok: false, httpStatus: resp.status, message: "Talabat did not return an orders array.", durationMs: Date.now() - start };
      }

      allOrders.push(...json.orders);
      if (page >= json.total_pages) break;
    }

    return { ok: true, httpStatus: 200, data: allOrders, durationMs: Date.now() - start };
  } catch (e) {
    const durationMs = Date.now() - start;
    const isTimeout = e instanceof Error && e.name === "AbortError";
    return { ok: false, httpStatus: isTimeout ? 504 : 500, message: isTimeout ? "ERR_TALABAT_TIMEOUT" : String(e), durationMs };
  }
}
