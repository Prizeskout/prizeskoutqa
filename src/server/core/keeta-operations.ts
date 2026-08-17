import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { getValidKeetaAccessToken, keetaApiCall } from "./keeta-client";

type ObjectMap = Record<string, unknown>;
type KeetaChannel = {
  id: string;
  account_id: string;
  licensee_id: string;
  merchant_id: string;
  bearer_token?: string | null;
  metadata?: ObjectMap | null;
};

const object = (value: unknown): ObjectMap => value && typeof value === "object" && !Array.isArray(value) ? value as ObjectMap : {};
const text = (...values: unknown[]) => {
  for (const value of values) if (typeof value === "string" || typeof value === "number") {
    const normalized = String(value).trim(); if (normalized) return normalized;
  }
  return null;
};
const number = (...values: unknown[]) => {
  for (const value of values) { const parsed = Number(value); if (value !== null && value !== "" && Number.isFinite(parsed)) return parsed; }
  return null;
};
const array = (value: unknown): unknown[] => Array.isArray(value) ? value : [];

async function sha256(value: unknown): Promise<string> {
  const bytes = new TextEncoder().encode(JSON.stringify(value));
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest)).map(byte => byte.toString(16).padStart(2, "0")).join("");
}

export function normalizeKeetaOrder(message: ObjectMap) {
  const order = object(message.order);
  const money = object(order.amount ?? message.amount);
  const externalOrderId = text(order.orderId, order.id, message.orderId, message.order_id);
  if (!externalOrderId) return null;
  return {
    external_order_id: externalOrderId,
    order_code: text(order.orderCode, order.orderNo, message.orderCode),
    status: text(order.status, order.orderStatus, message.status),
    currency: text(money.currency, order.currency, message.currency),
    subtotal: number(money.subtotal, money.itemTotal, order.subtotal),
    discount_total: number(money.discount, money.discountTotal, order.discountTotal),
    delivery_fee: number(money.deliveryFee, order.deliveryFee),
    tax_total: number(money.tax, money.taxTotal, order.taxTotal),
    total: number(money.total, money.payAmount, order.total, order.totalAmount),
    items: array(order.items ?? order.productList ?? message.items),
    occurred_at: text(order.updatedAt, order.createdAt, message.timestamp),
  };
}

export async function reconcileKeetaOrder(
  channel: KeetaChannel,
  shopId: string,
  message: ObjectMap,
  source: "webhook" | "poll",
  messageId?: string,
) {
  const normalized = normalizeKeetaOrder(message);
  if (!normalized) return { processed: false, reason: "not_an_order_event" };
  const occurredAt = normalized.occurred_at && !Number.isNaN(Date.parse(normalized.occurred_at))
    ? new Date(normalized.occurred_at).toISOString() : null;
  const { error } = await (supabaseAdmin as any).from("ps_keeta_orders").upsert({
    channel_id: channel.id, account_id: channel.account_id, licensee_id: channel.licensee_id,
    merchant_id: channel.merchant_id, shop_id: shopId, ...normalized, occurred_at: occurredAt,
    raw_order: message, source, last_message_id: messageId ?? null, updated_at: new Date().toISOString(),
  }, { onConflict: "channel_id,external_order_id" });
  if (error) throw error;
  return { processed: true, externalOrderId: normalized.external_order_id };
}

export async function importKeetaCatalog(channel: KeetaChannel, shopId: string, spuList: unknown[]) {
  const rows: ObjectMap[] = [];
  for (const rawSpu of spuList) {
    const spu = object(rawSpu);
    const spuCode = text(spu.openItemCode, spu.spuOpenItemCode, spu.id);
    if (!spuCode) continue;
    for (const rawSku of array(spu.skuList ?? spu.skus)) {
      const sku = object(rawSku);
      const skuCode = text(sku.openItemCode, sku.skuOpenItemCode, sku.id);
      if (!skuCode) continue;
      rows.push({
        channel_id: channel.id, account_id: channel.account_id, licensee_id: channel.licensee_id,
        merchant_id: channel.merchant_id, shop_id: shopId, spu_open_item_code: spuCode,
        sku_open_item_code: skuCode, name: text(spu.name, sku.name), currency: text(sku.currency, spu.currency),
        price: number(sku.price), status: text(spu.status, sku.status), native_spu: spu, native_sku: sku,
        source_hash: await sha256({ spu, sku }), synced_at: new Date().toISOString(), updated_at: new Date().toISOString(),
      });
    }
  }
  if (!rows.length) return { imported: 0 };
  const { error } = await (supabaseAdmin as any).from("ps_keeta_catalog_items")
    .upsert(rows, { onConflict: "channel_id,sku_open_item_code" });
  if (error) throw error;
  return { imported: rows.length };
}

export async function publishKeetaPrice(channel: KeetaChannel, skuCode: string, price: number) {
  const shopId = text(channel.metadata?.shop_id);
  if (!shopId) return { ok: false, httpStatus: 422, message: "ERR_KEETA_SHOP_ID_MISSING", durationMs: 0 };
  const { data: cached, error } = await (supabaseAdmin as any).from("ps_keeta_catalog_items")
    .select("id,native_spu,sku_open_item_code").eq("channel_id", channel.id)
    .eq("sku_open_item_code", skuCode).maybeSingle();
  if (error || !cached) return { ok: false, httpStatus: 409, message: "ERR_KEETA_CATALOG_NOT_SYNCED", durationMs: 0 };

  const spu = structuredClone(object(cached.native_spu));
  const skus = array(spu.skuList ?? spu.skus).map(raw => {
    const sku = object(raw);
    return text(sku.openItemCode, sku.skuOpenItemCode, sku.id) === skuCode
      ? { ...sku, price: String(price) }
      : sku;
  });
  if (Array.isArray(spu.skuList)) spu.skuList = skus; else spu.skus = skus;

  const token = await getValidKeetaAccessToken({
    id: channel.id, bearer_token: channel.bearer_token ?? null, metadata: channel.metadata ?? null,
  });
  if (!token.accessToken) return { ok: false, httpStatus: 401, message: token.error ?? "ERR_KEETA_NO_VALID_TOKEN", durationMs: 0 };
  const result = await keetaApiCall("/product/spu/batchupdate", { shopId: Number(shopId) }, {
    accessToken: token.accessToken, complexFields: { spuList: [spu] },
  });
  if (result.ok) {
    await (supabaseAdmin as any).from("ps_keeta_catalog_items").update({
      native_spu: spu, price, source_hash: await sha256(spu), updated_at: new Date().toISOString(),
    }).eq("id", cached.id);
  }
  return result;
}

// Keeta advertises polling as the webhook fallback, but the detailed endpoint
// is application/region specific in the gated portal. The path must therefore
// be supplied from the approved app contract; there is deliberately no guessed
// production default.
export async function pollAndReconcileKeetaOrders(channel: KeetaChannel, since: string) {
  const path = process.env.KEETA_ORDER_POLL_PATH?.trim();
  if (!path || !path.startsWith("/") || path.includes("..")) {
    return { ok: false, polled: 0, processed: 0, message: "KEETA_ORDER_POLL_PATH is not configured from the approved Keeta contract." };
  }
  const shopId = text(channel.metadata?.shop_id);
  if (!shopId) return { ok: false, polled: 0, processed: 0, message: "Keeta shop ID is missing." };
  const token = await getValidKeetaAccessToken({
    id: channel.id, bearer_token: channel.bearer_token ?? null, metadata: channel.metadata ?? null,
  });
  if (!token.accessToken) return { ok: false, polled: 0, processed: 0, message: token.error ?? "Keeta token unavailable." };

  const response = await keetaApiCall<unknown>(path, { shopId: Number(shopId), since }, { accessToken: token.accessToken });
  if (!response.ok) return { ok: false, polled: 0, processed: 0, message: response.message ?? "Keeta polling failed." };
  const data = object(response.data);
  const orders = array(data.orderList ?? data.orders ?? response.data);
  let processed = 0;
  for (const rawOrder of orders) {
    const result = await reconcileKeetaOrder(channel, shopId, object(rawOrder), "poll");
    if (result.processed) processed += 1;
  }
  return { ok: true, polled: orders.length, processed };
}
