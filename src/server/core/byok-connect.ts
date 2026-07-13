// BYOK (Bring Your Own Key) — Merchants provide their own aggregator credentials.
// Credentials are stored immediately. Status is set to "connected" on save.
// Credential health checks run as background jobs, not in the request path.
//
// Talabat: OAuth 2.0 client credentials (client_id + client_secret)
// Jahez:   API Key + Secret Code → token

import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const TALABAT_BASE = "https://talabat.partner.deliveryhero.io/v2";
export const JAHEZ_BASE   = "https://integration-api.jahez.net";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = () => (supabaseAdmin as any).from("ps_merchant_channels");

export async function connectTalabat(params: {
  merchantId: string;
  clientId: string;
  clientSecret: string;
  vendorId: string;
  chainId: string;
}): Promise<{ ok: boolean; message?: string }> {
  const { merchantId, clientId, clientSecret, vendorId, chainId } = params;
  const now = new Date().toISOString();

  const { error } = await db()
    .upsert(
      {
        account_id:       merchantId,
        licensee_id:      merchantId,
        merchant_id:      merchantId,
        platform:         "talabat",
        bearer_token:     clientSecret,
        manager_token:    clientId,
        scopes:           ["catalog:read", "catalog:write", "orders:read"],
        status:           "connected",
        error_message:    null,
        connected_at:     now,
        last_verified_at: now,
        updated_at:       now,
        metadata:         { vendor_id: vendorId, chain_id: chainId },
      },
      { onConflict: "account_id,merchant_id,platform" },
    );

  if (error) return { ok: false, message: "Failed to save credentials. Please try again." };
  return { ok: true };
}

export async function connectJahez(params: {
  merchantId: string;
  apiKey: string;
  secretCode: string;
  branchId: string;
}): Promise<{ ok: boolean; message?: string }> {
  const { merchantId, apiKey, secretCode, branchId } = params;
  const now = new Date().toISOString();

  const { error } = await db()
    .upsert(
      {
        account_id:       merchantId,
        licensee_id:      merchantId,
        merchant_id:      merchantId,
        platform:         "jahez",
        bearer_token:     secretCode,
        manager_token:    apiKey,
        scopes:           ["catalog:read", "catalog:write", "orders:read"],
        status:           "connected",
        error_message:    null,
        connected_at:     now,
        last_verified_at: now,
        updated_at:       now,
        metadata:         { branch_id: branchId },
      },
      { onConflict: "account_id,merchant_id,platform" },
    );

  if (error) return { ok: false, message: "Failed to save credentials. Please try again." };
  return { ok: true };
}

// ── Disconnect ────────────────────────────────────────────────────────────────
export async function disconnectChannel(merchantId: string, platform: string) {
  await db()
    .update({ status: "revoked", updated_at: new Date().toISOString() })
    .eq("account_id", merchantId)
    .eq("platform", platform);
}
