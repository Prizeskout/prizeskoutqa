import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { Json } from "@/integrations/supabase/types";
import { isFreshSnoonuTimestamp, normalizeSnoonuPilotEvent, parseSnoonuPilotEnvelope, verifySnoonuPilotSignature } from "./snoonu-pilot-contract";

const json = (body: unknown, status: number) => new Response(JSON.stringify(body), {
  status, headers: { "Content-Type": "application/json", "X-PrizeSkout-Contract": "snoonu-pilot-2026-09-09" },
});

export async function handleSnoonuPilotWebhook(request: Request): Promise<Response> {
  const timestamp = request.headers.get("x-snoonu-timestamp")?.trim() ?? "";
  const signature = request.headers.get("x-snoonu-signature")?.trim() ?? "";
  if (!timestamp || !signature) return json({ error: "Missing Snoonu timestamp or signature." }, 401);
  if (!isFreshSnoonuTimestamp(timestamp)) return json({ error: "Webhook timestamp is outside the five-minute replay window." }, 401);

  const rawBody = await request.text();
  let envelope;
  try { envelope = parseSnoonuPilotEnvelope(JSON.parse(rawBody)); }
  catch (error) { return json({ error: error instanceof Error ? error.message : "Invalid payload." }, 422); }

  const db = supabaseAdmin as any;
  const { data: candidates, error: lookupError } = await db.from("ps_merchant_channels")
    .select("id,account_id,licensee_id,merchant_id,webhook_secret,metadata,status")
    .eq("platform", "snoonu").eq("status", "connected")
    .filter("metadata->>snoonu_merchant_id", "eq", envelope.merchant.id);
  if (lookupError) return json({ error: "Channel lookup failed." }, 503);
  const channel = (candidates ?? []).find((candidate: any) => {
    const branches = candidate.metadata?.snoonu_branch_ids;
    return !Array.isArray(branches) || branches.includes(envelope.branch.id);
  });
  if (!channel?.webhook_secret) return json({ error: "Merchant or branch is not allowlisted for the Snoonu pilot." }, 404);
  if (!await verifySnoonuPilotSignature(rawBody, timestamp, channel.webhook_secret, signature)) return json({ error: "Invalid webhook signature." }, 401);

  const normalized = normalizeSnoonuPilotEvent(envelope);
  const { data: receipt, error: insertError } = await db.from("ps_snoonu_webhook_events").insert({
    channel_id: channel.id, account_id: channel.account_id, licensee_id: channel.licensee_id,
    merchant_id: channel.merchant_id, external_merchant_id: envelope.merchant.id,
    external_branch_id: envelope.branch.id, event_id: envelope.event_id,
    event_type: envelope.event_type, schema_version: envelope.schema_version,
    occurred_at: envelope.occurred_at, payload: envelope as unknown as Json,
    normalized_payload: normalized as unknown as Json, status: "accepted",
  }).select("id").maybeSingle();
  if (insertError?.code === "23505") return json({ accepted: true, replay: true, event_id: envelope.event_id }, 200);
  if (insertError || !receipt) return json({ error: "Could not persist webhook receipt." }, 503);

  return json({ accepted: true, replay: false, receipt_id: receipt.id, event_id: envelope.event_id }, 202);
}
