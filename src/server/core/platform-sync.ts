// =============================================================================
// Platform Sync — Salla, Foodics, Zid
//
// Two directions:
//   PULL  — fetch the merchant's full menu/catalog from the platform on connect
//            and on manual re-sync. Each item is stored and run through the
//            decide engine so margins are calculated immediately.
//   PUSH  — after a reprice decision, update the price on the source platform
//            so the merchant's own store/POS reflects the change.
// =============================================================================

import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { decide, REGIONAL_COMMISSION, REGIONAL_VAT } from "./decide-engine";
import { getMerchantMarginFloor } from "./merchant-pricing-config";

type PlatformCreds = {
  bearer_token: string;
  manager_token?: string | null;
  store_id?: string | null;
};

function zidHeaders(creds: PlatformCreds): Record<string, string> {
  const headers: Record<string, string> = {
    Authorization: creds.bearer_token,
    Accept: "application/json",
    "Accept-Language": "en",
    Role: "Manager",
  };
  if (creds.manager_token) {
    headers["Access-Token"] = creds.manager_token;
    headers["X-Manager-Token"] = creds.manager_token;
  }
  if (creds.store_id) headers["Store-Id"] = creds.store_id;
  return headers;
}

class PlatformApiError extends Error {
  constructor(
    readonly platform: string,
    readonly status: number,
    readonly responseBody: string,
  ) {
    super(`${platform} API returned HTTP ${status}${responseBody ? `: ${responseBody.slice(0, 300)}` : ""}`);
  }
}

// ---------------------------------------------------------------------------
// Normalised product shape — what each platform returns, flattened to one type
// ---------------------------------------------------------------------------
type PlatformProduct = {
  external_id: string;
  sku: string;
  name_en: string;
  name_ar: string;
  price: number;         // current selling price
  cost: number | null;   // base cost if the platform exposes it
  currency: string;
  in_stock: boolean;
};

// ---------------------------------------------------------------------------
// PULL — fetch catalog from platform
// ---------------------------------------------------------------------------

async function fetchSallaProducts(creds: PlatformCreds): Promise<PlatformProduct[]> {
  const products: PlatformProduct[] = [];
  let page = 1;

  while (true) {
    const resp = await fetch(
      `https://api.salla.dev/admin/v2/products?page=${page}&per_page=50`,
      { headers: { Authorization: `Bearer ${creds.bearer_token}`, Accept: "application/json" } },
    );
    if (!resp.ok) break;

    const json = await resp.json() as {
      data?: Array<{
        id: string | number;
        sku?: string;
        name?: string;
        arabic_name?: string;
        price?: { amount?: number; currency?: string };
        cost?: number;
        quantity?: number;
      }>;
      cursor?: { next?: string | null };
    };

    const items = json.data ?? [];
    for (const item of items) {
      products.push({
        external_id: String(item.id),
        sku: item.sku ?? String(item.id),
        name_en: item.name ?? "",
        name_ar: item.arabic_name ?? item.name ?? "",
        price: item.price?.amount ?? 0,
        cost: item.cost ?? null,
        currency: item.price?.currency ?? "SAR",
        in_stock: (item.quantity ?? 1) > 0,
      });
    }

    // Salla uses cursor-based pagination
    if (!json.cursor?.next || items.length < 50) break;
    page++;
    if (page > 20) break; // safety cap: 1,000 products max per sync
  }

  return products;
}

async function fetchFoodicsProducts(creds: PlatformCreds): Promise<PlatformProduct[]> {
  const products: PlatformProduct[] = [];
  let page = 1;

  while (true) {
    const resp = await fetch(
      `https://api-v2.foodics.com/v2.1/products?page=${page}&per_page=50`,
      { headers: { Authorization: `Bearer ${creds.bearer_token}`, Accept: "application/json" } },
    );
    if (!resp.ok) break;

    const json = await resp.json() as {
      data?: Array<{
        id: string;
        sku?: string | null;
        name?: string;
        name_locales?: { ar?: string };
        selling_price?: number;
        cost_price?: number;
        track_inventory?: boolean;
        in_stock?: boolean;
      }>;
      meta?: { last_page?: number };
    };

    const items = json.data ?? [];
    for (const item of items) {
      products.push({
        external_id: item.id,
        sku: item.sku ?? item.id,
        name_en: item.name ?? "",
        name_ar: item.name_locales?.ar ?? item.name ?? "",
        price: item.selling_price ?? 0,
        cost: item.cost_price ?? null,
        currency: "SAR", // Foodics is Saudi-first
        in_stock: item.in_stock ?? true,
      });
    }

    const lastPage = json.meta?.last_page ?? 1;
    if (page >= lastPage || items.length < 50) break;
    page++;
    if (page > 20) break;
  }

  return products;
}

async function fetchZidProducts(creds: PlatformCreds): Promise<PlatformProduct[]> {
  const products: PlatformProduct[] = [];
  let page = 1;

  while (true) {
    const resp = await fetch(
      `https://api.zid.sa/v1/products/?page=${page}&page_size=50`,
      {
        headers: zidHeaders(creds),
      },
    );
    if (!resp.ok) {
      const body = await resp.text().catch(() => "");
      throw new PlatformApiError("zid", resp.status, body);
    }

    const json = await resp.json() as {
      results?: Array<{
        id: string | number;
        sku?: string | null;
        name?: string | { en?: string | null; ar?: string | null };
        price?: number;
        sale_price?: number | null;
        cost?: number;
        currency?: string;
        quantity?: number;
        is_infinite?: boolean;
      }>;
      next?: string | null;
    };

    const items = json.results ?? [];
    for (const item of items) {
      const nameEn = typeof item.name === "string" ? item.name : item.name?.en ?? item.name?.ar ?? "";
      const nameAr = typeof item.name === "string" ? item.name : item.name?.ar ?? item.name?.en ?? "";
      products.push({
        external_id: String(item.id),
        sku: item.sku ?? String(item.id),
        name_en: nameEn,
        name_ar: nameAr,
        price: item.sale_price ?? item.price ?? 0,
        cost: item.cost ?? null,
        currency: item.currency ?? "SAR",
        in_stock: item.is_infinite === true || (item.quantity ?? 1) > 0,
      });
    }

    if (!json.next) break;
    page++;
    if (page > 20) break;
  }

  return products;
}

// ---------------------------------------------------------------------------
// PUSH — send updated price back to platform
// ---------------------------------------------------------------------------

export async function pushPriceToSourcePlatform(
  platform: string,
  creds: PlatformCreds,
  externalId: string,
  newPrice: number,
  currency: string,
): Promise<{ success: boolean; httpStatus: number; message?: string }> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    let url = "";
    let method = "PUT";
    let body: Record<string, unknown> = {};
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Bearer ${creds.bearer_token}`,
    };

    if (platform === "salla") {
      // Salla: PUT /admin/v2/products/{id} with price block
      url = `https://api.salla.dev/admin/v2/products/${externalId}`;
      body = { price: { amount: newPrice, currency } };
    } else if (platform === "foodics") {
      // Foodics: PUT /v2.1/products/{id}
      url = `https://api-v2.foodics.com/v2.1/products/${externalId}`;
      body = { selling_price: newPrice };
    } else if (platform === "zid") {
      // Zid: PATCH /v1/products/{id}/
      url = `https://api.zid.sa/v1/products/${externalId}/`;
      method = "PATCH";
      Object.assign(headers, zidHeaders(creds));
      body = { price: newPrice };
    } else {
      return { success: false, httpStatus: 400, message: `Unknown source platform: ${platform}` };
    }

    const resp = await fetch(url, {
      method,
      headers,
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (resp.ok) return { success: true, httpStatus: resp.status };
    const text = await resp.text().catch(() => "");
    return { success: false, httpStatus: resp.status, message: text.slice(0, 400) };
  } catch (e) {
    const isTimeout = e instanceof Error && e.name === "AbortError";
    return {
      success: false,
      httpStatus: isTimeout ? 504 : 500,
      message: isTimeout ? "Request timed out" : String(e),
    };
  }
}

// ---------------------------------------------------------------------------
// Full catalog sync — called on connect and on manual re-sync
// ---------------------------------------------------------------------------

export type SyncCatalogResult = {
  platform: string;
  merchant_id: string;
  items_found: number;
  items_stored: number;
  items_below_floor: number;
  errors: number;
};

export async function syncPlatformCatalog(params: {
  platform: string;
  creds: PlatformCreds;
  accountId: string;
  licenseeId: string;
  merchantId: string;
  region: string;
  apiKeyId?: string;
}): Promise<SyncCatalogResult> {
  const { platform, creds, accountId, licenseeId, merchantId, region, apiKeyId } = params;

  // 1. Fetch products from the platform
  let products: PlatformProduct[] = [];
  if (platform === "salla") products = await fetchSallaProducts(creds);
  else if (platform === "foodics") products = await fetchFoodicsProducts(creds);
  else if (platform === "zid") products = await fetchZidProducts(creds);

  const commissionRate = REGIONAL_COMMISSION[region] ?? 0.22;
  const vatRate = REGIONAL_VAT[region] ?? 0;
  const marginFloorPct = await getMerchantMarginFloor(accountId);

  let stored = 0;
  let belowFloor = 0;
  let errors = 0;

  for (const product of products) {
    if (!product.sku || product.price <= 0) continue;

    // Build an idempotency key so re-syncing the same catalog is safe
    const idempotencyKey = `platform-sync:${platform}:${merchantId}:${product.external_id}`;

    // Skip if we already have this exact external_id from this sync run
    const { data: existing } = await supabaseAdmin
      .from("ps_ingest_events")
      .select("id")
      .eq("account_id", accountId)
      .eq("idempotency_key", idempotencyKey)
      .maybeSingle();

    if (existing) {
      // Update price/status in case it changed since last sync
      await supabaseAdmin
        .from("ps_ingest_events")
        .update({
          current_retail_price: product.price,
          inventory_status: product.in_stock ? "in_stock" : "out_of_stock",
          status: "received",
        })
        .eq("id", existing.id);
      stored++;
      continue;
    }

    const { data: ingestRow, error: insertErr } = await supabaseAdmin
      .from("ps_ingest_events")
      .insert({
        account_id: accountId,
        licensee_id: licenseeId,
        api_key_id: apiKeyId ?? null,
        event_id: `${platform}-${product.external_id}`,
        idempotency_key: idempotencyKey,
        region,
        source_platform: platform,
        merchant_id: merchantId,
        item_id: product.external_id,
        sku: product.sku,
        item_name_en: product.name_en,
        item_name_ar: product.name_ar,
        inventory_status: product.in_stock ? "in_stock" : "out_of_stock",
        base_cost: product.cost ?? product.price * 0.6, // fallback: assume 60% cost if unknown
        current_retail_price: product.price,
        currency: product.currency,
        vat_rate: vatRate,
        raw_payload: { source: "platform_sync", external_id: product.external_id, platform },
        status: "received",
      })
      .select("id")
      .single();

    if (insertErr || !ingestRow) { errors++; continue; }

    // 2. Run decide engine on each item
    const decideOutput = decide({
      region,
      baseCost: product.cost ?? product.price * 0.6,
      currentRetailPrice: product.price,
      vatRate,
      marginFloorPct,
    });

    await supabaseAdmin.from("ps_decide_results").insert({
      ingest_event_id: ingestRow.id,
      account_id: accountId,
      licensee_id: licenseeId,
      region,
      merchant_id: merchantId,
      sku: product.sku,
      base_cost: product.cost ?? product.price * 0.6,
      current_retail_price: product.price,
      commission_rate: commissionRate,
      vat_rate: vatRate,
      logistics_subsidy: 0,
      margin_floor_pct: marginFloorPct,
      net_margin: decideOutput.netMargin,
      net_margin_pct: decideOutput.netMarginPct,
      floor_breached: decideOutput.floorBreached,
      recommended_price: decideOutput.recommendedPrice,
      decision_action: decideOutput.decisionAction,
    });

    await supabaseAdmin
      .from("ps_ingest_events")
      .update({ status: "decided" })
      .eq("id", ingestRow.id);

    if (decideOutput.floorBreached) belowFloor++;
    stored++;
  }

  // Update last_verified_at on the channel record
  await supabaseAdmin
    .from("ps_merchant_channels")
    .update({ last_verified_at: new Date().toISOString() })
    .eq("account_id", accountId)
    .eq("merchant_id", merchantId)
    .eq("platform", platform);

  return {
    platform,
    merchant_id: merchantId,
    items_found: products.length,
    items_stored: stored,
    items_below_floor: belowFloor,
    errors,
  };
}
