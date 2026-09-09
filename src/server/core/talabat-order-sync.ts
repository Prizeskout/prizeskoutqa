import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { Json } from "@/integrations/supabase/types";
import { getTalabatOrders, getValidTalabatAccessToken, type TalabatOrder } from "./talabat-client";

type Channel = {
  id: string;
  account_id: string;
  licensee_id: string;
  merchant_id: string;
  manager_token: string | null;
  bearer_token: string | null;
  metadata: Record<string, unknown> | null;
};

const object = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
const numberOrNull = (value: unknown) => Number.isFinite(Number(value)) ? Number(value) : null;

async function persistReportedOrder(channel: Channel, order: TalabatOrder) {
  const payload = order as Record<string, unknown>;
  const token = String(payload.token ?? payload.order_id ?? "").trim();
  if (!token) throw new Error("Talabat order report returned an order without a token.");
  const price = object(payload.price);
  const localInfo = object(payload.localInfo);
  const payment = object(payload.payment);
  const products = Array.isArray(payload.products) ? payload.products : Array.isArray(payload.items) ? payload.items : [];
  const metadata = channel.metadata ?? {};
  const occurredAt = String(payload.createdAt ?? object(payload.sys).created_at ?? new Date().toISOString());
  const deliveryFees = Array.isArray(price.deliveryFees)
    ? price.deliveryFees.reduce((sum, fee) => sum + (numberOrNull(object(fee).value) ?? 0), 0)
    : numberOrNull(payment.delivery_fee);
  const discounts = Array.isArray(payload.discounts)
    ? payload.discounts.reduce((sum, discount) => sum + (numberOrNull(object(discount).amount) ?? 0), 0)
    : numberOrNull(payment.discount);
  const { error } = await supabaseAdmin.from("ps_talabat_orders").upsert({
    channel_id: channel.id, account_id: channel.account_id, licensee_id: channel.licensee_id,
    merchant_id: channel.merchant_id, external_order_id: token,
    order_code: String(payload.code ?? payload.order_code ?? payload.shortCode ?? "") || null,
    vendor_id: String(metadata.pos_vendor_id ?? metadata.vendor_id ?? ""),
    chain_id: String(metadata.chain_code ?? metadata.chain_id ?? "") || null,
    country_code: String(localInfo.countryCode ?? "") || null,
    status: String(payload.status ?? "accepted").toUpperCase(),
    currency: String(localInfo.currencySymbol ?? payment.currency ?? metadata.contract_currency ?? "QAR"),
    subtotal: numberOrNull(price.totalNet ?? payment.sub_total), total: numberOrNull(price.grandTotal ?? payment.order_total),
    order_type: String(payload.expeditionType ?? payload.order_type ?? "") || null,
    transport_type: String(payload.expeditionType ?? payload.transport_type ?? "") || null,
    payment_type: String(payment.type ?? payment.status ?? "") || null,
    delivery_fee: deliveryFees, discount_total: discounts,
    cancellation: (payload.reason ? { reason: payload.reason } : payload.cancellation ?? null) as Json,
    items: products as Json, raw_order: payload as Json,
    occurred_at: occurredAt, sys_updated_at: occurredAt, updated_at: new Date().toISOString(),
  }, { onConflict: "channel_id,external_order_id" });
  if (error) throw new Error(error.message);
  return token;
}

export async function syncTalabatChannelOrders(channel: Channel, pastHours = 24) {
  const metadata = channel.metadata ?? {};
  const chainCode = String(metadata.chain_code ?? metadata.chain_id ?? "");
  const posVendorId = String(metadata.pos_vendor_id ?? metadata.vendor_id ?? "");
  if (!chainCode || !posVendorId) throw new Error("Talabat channel is missing chain code or POS vendor ID.");
  const hours = Math.min(24, Math.max(1, Math.floor(pastHours)));
  const token = await getValidTalabatAccessToken(channel);
  if (!token.accessToken) throw new Error(token.error ?? "Talabat authentication failed.");
  const end = new Date();
  const result = await getTalabatOrders({ chainId: chainCode, vendorId: posVendorId,
    accessToken: token.accessToken, startTime: new Date(end.getTime() - hours * 3_600_000).toISOString(),
    endTime: end.toISOString(), environment: metadata.environment === "production" ? "production" : "sandbox" });
  if (!result.ok || !result.data) throw new Error(result.message ?? "Talabat order report failed.");
  const persisted: string[] = [];
  for (const order of result.data) persisted.push(await persistReportedOrder(channel, order));
  return { channel_id: channel.id, merchant_id: channel.merchant_id, environment: metadata.environment === "production" ? "production" : "sandbox", retrieved: result.data.length, persisted: persisted.length };
}

export async function syncConnectedTalabatOrders(pastHours = 24) {
  const { data, error } = await supabaseAdmin.from("ps_merchant_channels")
    .select("id,account_id,licensee_id,merchant_id,manager_token,bearer_token,metadata")
    .eq("platform", "talabat").eq("status", "connected");
  if (error) throw new Error(error.message);
  const results: Array<Record<string, unknown>> = [];
  for (const channel of (data ?? []) as Channel[]) {
    try { results.push({ ok: true, ...await syncTalabatChannelOrders(channel, pastHours) }); }
    catch (syncError) { results.push({ ok: false, channel_id: channel.id, merchant_id: channel.merchant_id, error: syncError instanceof Error ? syncError.message : String(syncError) }); }
  }
  return { channels: results.length, succeeded: results.filter(result => result.ok).length, failed: results.filter(result => !result.ok).length, results };
}
