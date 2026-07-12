// BYOK (Bring Your Own Key) — Merchants provide their own aggregator credentials.
// Talabat: OAuth 2.0 client credentials (client_id + client_secret)
// Jahez:   API Key + Secret Code → token

import { supabaseAdmin } from "@/integrations/supabase/client.server";

// ── Talabat ───────────────────────────────────────────────────────────────────
// Docs: https://developer.talabat.com/api-specifications
// Base: https://talabat.partner.deliveryhero.io/v2

export const TALABAT_BASE = "https://talabat.partner.deliveryhero.io/v2";
export const JAHEZ_BASE   = "https://integration-api.jahez.net";

export async function talabatExchangeToken(
  clientId: string,
  clientSecret: string,
): Promise<{ token: string; expiresIn: number } | null> {
  const res = await fetch(`${TALABAT_BASE}/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: clientId,
      client_secret: clientSecret,
    }).toString(),
  }).catch(() => null);

  if (!res?.ok) return null;

  const data = await res.json().catch(() => null) as {
    access_token?: string;
    expires_in?: number;
  } | null;

  if (!data?.access_token) return null;
  return { token: data.access_token, expiresIn: data.expires_in ?? 7200 };
}

async function talabatProbe(
  accessToken: string,
  chainId: string,
  vendorId: string,
): Promise<{ ok: boolean; message?: string }> {
  const res = await fetch(
    `${TALABAT_BASE}/chains/${chainId}/vendors/${vendorId}/catalog?page_size=1`,
    {
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
    },
  ).catch(() => null);

  if (!res) return { ok: false, message: "Connection failed" };
  if (res.ok) return { ok: true };
  const text = await res.text().catch(() => "");
  return { ok: false, message: `HTTP ${res.status}: ${text.slice(0, 200)}` };
}

export async function connectTalabat(params: {
  merchantId: string;
  clientId: string;
  clientSecret: string;
  vendorId: string;
  chainId: string;
}): Promise<{ ok: boolean; message?: string; channelId?: string }> {
  const { merchantId, clientId, clientSecret, vendorId, chainId } = params;

  const tokenResult = await talabatExchangeToken(clientId, clientSecret);
  if (!tokenResult) {
    return {
      ok: false,
      message: "Invalid credentials. Check your Client ID and Client Secret in the Talabat Partner Portal → Settings → Shop Integrations Plugin.",
    };
  }

  const probe = await talabatProbe(tokenResult.token, chainId, vendorId);
  const expiresAt = new Date(Date.now() + tokenResult.expiresIn * 1000).toISOString();
  const now = new Date().toISOString();

  const { data: row, error } = await supabaseAdmin
    .from("ps_merchant_channels")
    .upsert(
      {
        account_id:        merchantId,
        licensee_id:       merchantId,
        merchant_id:       merchantId,
        platform:          "talabat",
        bearer_token:      clientSecret,
        manager_token:     clientId,
        scopes:            ["catalog:read", "catalog:write", "orders:read"],
        status:            probe.ok ? "connected" : "error",
        error_message:     probe.ok ? null : probe.message,
        connected_at:      probe.ok ? now : null,
        last_verified_at:  now,
        updated_at:        now,
        metadata: {
          vendor_id: vendorId,
          chain_id:  chainId,
          access_token:            tokenResult.token,
          access_token_expires_at: expiresAt,
        },
        webhook_secret: null,
      },
      { onConflict: "account_id,merchant_id,platform" },
    )
    .select("id")
    .single();

  if (error || !row) return { ok: false, message: "Failed to save credentials." };

  if (!probe.ok) {
    return {
      ok: false,
      message: `Credentials valid but store lookup failed: ${probe.message}. Double-check your Vendor ID and Chain ID.`,
    };
  }

  return { ok: true, channelId: row.id };
}

// ── Jahez ─────────────────────────────────────────────────────────────────────
// Credentials obtained by emailing integration@jahez.net
// Endpoint: https://integration-api.jahez.net

async function jahezExchangeToken(
  apiKey: string,
  secretCode: string,
): Promise<{ token: string } | null> {
  const res = await fetch(`${JAHEZ_BASE}/api/v2.0/vendor/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ api_key: apiKey, secret_code: secretCode }),
  }).catch(() => null);

  if (!res?.ok) return null;

  const data = await res.json().catch(() => null) as {
    token?: string;
    data?: { token?: string };
  } | null;

  const token = data?.token ?? data?.data?.token;
  if (!token) return null;
  return { token };
}

export async function connectJahez(params: {
  merchantId: string;
  apiKey: string;
  secretCode: string;
  branchId: string;
}): Promise<{ ok: boolean; message?: string; channelId?: string }> {
  const { merchantId, apiKey, secretCode, branchId } = params;

  const tokenResult = await jahezExchangeToken(apiKey, secretCode);
  if (!tokenResult) {
    return {
      ok: false,
      message: "Invalid credentials. Email integration@jahez.net to get your API Key and Secret Code, then try again.",
    };
  }

  const now = new Date().toISOString();

  const { data: row, error } = await supabaseAdmin
    .from("ps_merchant_channels")
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
        metadata:         { branch_id: branchId, access_token: tokenResult.token },
        webhook_secret:   null,
      },
      { onConflict: "account_id,merchant_id,platform" },
    )
    .select("id")
    .single();

  if (error || !row) return { ok: false, message: "Failed to save credentials." };
  return { ok: true, channelId: row.id };
}

// ── Disconnect ────────────────────────────────────────────────────────────────
export async function disconnectChannel(merchantId: string, platform: string) {
  await supabaseAdmin
    .from("ps_merchant_channels")
    .update({ status: "revoked", updated_at: new Date().toISOString() })
    .eq("account_id", merchantId)
    .eq("platform", platform);
}
