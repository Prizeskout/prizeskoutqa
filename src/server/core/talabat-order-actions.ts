import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { Json } from "@/integrations/supabase/types";
import { getValidTalabatAccessToken, updateTalabatOrder } from "./talabat-client";
import type { TalabatOrderUpdateStatus } from "./talabat-contract";

type ActionPayload = {
  acceptanceTime?: string;
  remoteOrderId?: string;
  rejectionReason?: string;
  message?: string;
};

type ActionRow = {
  id: string; channel_id: string; external_order_id: string; action: TalabatOrderUpdateStatus;
  callback_url: string; request_payload: ActionPayload; attempts: number; expires_at: string | null;
};

const db = supabaseAdmin as any; // The generated database type is updated after the migration is applied.

export async function enqueueTalabatOrderAction(input: {
  channelId: string; accountId: string; merchantId: string; orderId: string;
  action: TalabatOrderUpdateStatus; callbackUrl: string; payload: ActionPayload; expiresAt?: string | null;
}) {
  const now = new Date().toISOString();
  const record = {
    channel_id: input.channelId, account_id: input.accountId, merchant_id: input.merchantId,
    external_order_id: input.orderId, action: input.action, callback_url: input.callbackUrl,
    request_payload: input.payload as Json, state: "pending", attempts: 0, next_attempt_at: now,
    expires_at: input.expiresAt ?? null, last_http_status: null, last_error: null,
    upstream_response: null, completed_at: null, updated_at: now,
  };
  const { data, error } = await db.from("ps_talabat_order_actions").insert(record).select("*").single();
  if (!error) return data as ActionRow;
  if (error.code !== "23505") throw new Error(`Could not queue Talabat action: ${error.message}`);
  const { data: existing, error: existingError } = await db.from("ps_talabat_order_actions").select("*")
    .eq("channel_id", input.channelId).eq("external_order_id", input.orderId).eq("action", input.action).single();
  if (existingError) throw new Error(`Could not load queued Talabat action: ${existingError.message}`);
  return existing as ActionRow;
}

function retryDecision(row: ActionRow, httpStatus: number, message = "") {
  const retryableConflict = httpStatus === 409 && /ASSIGNED_TO_TRANSPORT|WAITING_FOR_ACKNOWLEDGEMENT/i.test(message);
  const retryableTransient = httpStatus === 429 || httpStatus >= 500;
  const maxAttempts = retryableConflict ? 30 : 10;
  if ((!retryableConflict && !retryableTransient) || row.attempts + 1 >= maxAttempts) return null;
  const delaySeconds = retryableConflict ? 10 : Math.min(240, 30 * 2 ** Math.min(row.attempts, 3));
  return new Date(Date.now() + delaySeconds * 1000).toISOString();
}

export async function processTalabatOrderAction(row: ActionRow) {
  const now = new Date();
  if (row.expires_at && Date.parse(row.expires_at) <= now.getTime()) {
    await db.from("ps_talabat_order_actions").update({ state: "expired", last_error: "Order action expired before delivery.", updated_at: now.toISOString() }).eq("id", row.id);
    return { id: row.id, ok: false, state: "expired" };
  }
  const { data: channel } = await db.from("ps_merchant_channels")
    .select("id,manager_token,bearer_token,metadata").eq("id", row.channel_id).eq("status", "connected").maybeSingle();
  if (!channel) {
    await db.from("ps_talabat_order_actions").update({ state: "failed", last_error: "Talabat channel is not connected.", updated_at: now.toISOString() }).eq("id", row.id);
    return { id: row.id, ok: false, state: "failed" };
  }
  const token = await getValidTalabatAccessToken(channel);
  if (!token.accessToken) {
    const next = retryDecision(row, 503, token.error);
    await db.from("ps_talabat_order_actions").update({ state: next ? "retrying" : "failed", attempts: row.attempts + 1,
      next_attempt_at: next ?? now.toISOString(), last_http_status: 503, last_error: token.error, updated_at: now.toISOString() }).eq("id", row.id);
    return { id: row.id, ok: false, state: next ? "retrying" : "failed" };
  }
  const metadata = (channel.metadata ?? {}) as Record<string, unknown>;
  const result = await updateTalabatOrder({ status: row.action, callbackUrl: row.callback_url, ...row.request_payload,
    accessToken: token.accessToken, environment: metadata.environment === "production" ? "production" : "sandbox" });
  const responseText = result.message ?? JSON.stringify(result.data ?? {});
  const next = result.ok ? null : retryDecision(row, result.httpStatus, responseText);
  const state = result.ok ? "succeeded" : next ? "retrying" : "failed";
  await db.from("ps_talabat_order_actions").update({ state, attempts: row.attempts + 1,
    next_attempt_at: next ?? now.toISOString(), last_http_status: result.httpStatus,
    last_error: result.ok ? null : responseText.slice(0, 1000), upstream_response: (result.data ?? null) as Json,
    completed_at: result.ok ? now.toISOString() : null, updated_at: now.toISOString() }).eq("id", row.id);
  if (result.ok) await db.from("ps_talabat_orders").update({ status: row.action.toUpperCase(), updated_at: now.toISOString() })
    .eq("channel_id", row.channel_id).eq("external_order_id", row.external_order_id);
  return { id: row.id, ok: result.ok, state, http_status: result.httpStatus };
}

export async function processDueTalabatOrderActions(limit = 50) {
  const { data, error } = await db.from("ps_talabat_order_actions").select("*")
    .in("state", ["pending", "retrying"]).lte("next_attempt_at", new Date().toISOString())
    .order("next_attempt_at", { ascending: true }).limit(Math.min(100, Math.max(1, limit)));
  if (error) throw new Error(error.message);
  const results = [];
  for (const row of (data ?? []) as ActionRow[]) results.push(await processTalabatOrderAction(row));
  return { processed: results.length, succeeded: results.filter(result => result.state === "succeeded").length,
    retrying: results.filter(result => result.state === "retrying").length,
    failed: results.filter(result => ["failed", "expired"].includes(result.state)).length, results };
}
