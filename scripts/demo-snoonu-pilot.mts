import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { signSnoonuPilotPayload } from "../src/server/core/snoonu-pilot-contract";

const baseUrl = process.argv[2] ?? process.env.SNOONU_PILOT_BASE_URL ?? "http://localhost:3000";
const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !serviceRoleKey) throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.");
const db = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });

const accountId = "00000000-0000-4000-8000-000000005100";
const licenseeId = "00000000-0000-4000-8000-000000005200";
const merchantId = "snoonu-pilot-demo";
const snoonuMerchantId = "sn_demo_merchant_42";
const snoonuBranchId = "sn_demo_doha_1";

let secret = process.env.SNOONU_PILOT_DEMO_SECRET;
if (!secret) {
  const { data: existing, error: lookupError } = await db.from("ps_merchant_channels").select("webhook_secret")
    .eq("account_id", accountId).eq("merchant_id", merchantId).eq("platform", "snoonu").maybeSingle();
  if (lookupError) throw lookupError;
  secret = existing?.webhook_secret || randomBytes(32).toString("hex");
  const { error: channelError } = await db.from("ps_merchant_channels").upsert({
    account_id: accountId, licensee_id: licenseeId, merchant_id: merchantId, platform: "snoonu",
    scopes: ["orders.read", "settlements.read"], status: "connected", connected_at: new Date().toISOString(),
    last_verified_at: new Date().toISOString(), webhook_secret: secret,
    metadata: { snoonu_merchant_id: snoonuMerchantId, snoonu_branch_ids: [snoonuBranchId],
      connection_mode: "snoonu_partner_push", contract_version: "2026-09-09", synthetic: true },
  }, { onConflict: "account_id,merchant_id,platform" });
  if (channelError) throw channelError;
}

const eventId = `evt_demo_${Date.now()}`;
const fixture = { schema_version: "2026-09-09", event_id: eventId, event_type: "order.created",
  occurred_at: new Date().toISOString(), merchant: { id: snoonuMerchantId }, branch: { id: snoonuBranchId },
  data: { order_id: `SN-DEMO-${Date.now()}`, currency: "QAR", gross_amount: 100,
    commission_amount: 20, discount_amount: 5, refund_amount: 0, net_amount: 75,
    status: "delivered", line_items: [{ sku: "DEMO-MEAL-1", quantity: 2 }] } };
const raw = JSON.stringify(fixture);

async function send(body: string, timestamp: string, signature: string) {
  return fetch(`${baseUrl.replace(/\/$/, "")}/api/webhooks/snoonu`, { method: "POST",
    headers: { "content-type": "application/json", "x-snoonu-timestamp": timestamp, "x-snoonu-signature": `sha256=${signature}` }, body });
}

const timestamp = String(Math.floor(Date.now() / 1000));
const signature = await signSnoonuPilotPayload(raw, timestamp, secret);
const accepted = await send(raw, timestamp, signature);
assert.equal(accepted.status, 202, await accepted.text());
const acceptedBody = await accepted.json() as { receipt_id: string };

const duplicate = await send(raw, timestamp, signature);
assert.equal(duplicate.status, 200, await duplicate.text());
assert.equal((await duplicate.json() as { replay: boolean }).replay, true);

const tampered = await send(raw.replace('"gross_amount":100', '"gross_amount":999'), timestamp, signature);
assert.equal(tampered.status, 401, await tampered.text());

const staleTimestamp = String(Math.floor(Date.now() / 1000) - 601);
const staleSignature = await signSnoonuPilotPayload(raw, staleTimestamp, secret);
const stale = await send(raw, staleTimestamp, staleSignature);
assert.equal(stale.status, 401, await stale.text());

let receipt: unknown = { id: acceptedBody.receipt_id, verification: "Use direct SQL while Supabase REST schema cache is unavailable." };
if (!process.env.SNOONU_PILOT_DEMO_SECRET) {
  const result = await db.from("ps_snoonu_webhook_events")
    .select("event_id,event_type,external_merchant_id,external_branch_id,status,normalized_payload,received_at")
    .eq("id", acceptedBody.receipt_id).single();
  if (result.error) throw result.error;
  receipt = result.data;
}
console.log(JSON.stringify({ endpoint: `${baseUrl}/api/webhooks/snoonu`, checks: {
  valid_event: "202 Accepted", duplicate: "200 replay=true", tampered_body: "401 Rejected", stale_timestamp: "401 Rejected",
}, persisted_receipt: receipt }, null, 2));
