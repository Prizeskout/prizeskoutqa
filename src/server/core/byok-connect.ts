// BYOK (Bring Your Own Key) — Merchants provide their own aggregator credentials.
//
// Talabat: OAuth 2.0 client credentials (client_id + client_secret) — verified
//          live against Talabat's real token endpoint at submit time (see
//          connectTalabat below), so a bad key is caught immediately rather
//          than silently stored and discovered only when a dispatch fails.
// Jahez:   API Key + Secret Code → token. NOT yet live-verified at submit
//          time — credentials are stored as-is, same caveat as historically
//          documented ("health checks run as background jobs" — no such job
//          exists). Flagged here as a known gap, not fixed in this pass.
// Keeta:   OAuth-connected separately (src/routes/api/auth/keeta*); this file
//          only holds setKeetaShopId(), the post-connect shop-ID capture step.

import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { exchangeTalabatToken } from "./talabat-client";

export const TALABAT_BASE = "https://talabat.partner.deliveryhero.io/v2";
export const JAHEZ_BASE   = "https://integration-api.jahez.net";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = () => (supabaseAdmin as any).from("ps_merchant_channels");

export async function verifyMerchantAccess(merchantId: string, accessCode: string): Promise<boolean> {
  if (!merchantId || !accessCode) return false;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { count } = await (supabaseAdmin as any)
    .from("ps_access_codes")
    .select("*", { count: "exact", head: true })
    .eq("code", accessCode.toUpperCase().trim())
    .eq("merchant_id", merchantId);
  return typeof count === "number" && count > 0;
}

export async function connectTalabat(params: {
  merchantId: string;
  clientId: string;
  clientSecret: string;
  vendorId: string;
  chainId: string;
  commissionRatePct: string;
  vatOnFeesPct?: string;
  paymentFeePct?: string;
  fixedOrderFee?: string;
  deliveryContribution?: string;
}): Promise<{ ok: boolean; message?: string }> {
  const { merchantId, clientId, clientSecret, vendorId, chainId, commissionRatePct } = params;
  const now = new Date().toISOString();

  // Powers the expected-payout check (merchant-facing "here's what you
  // should have received" number) — the rate they tell us they agreed to
  // with Talabat, not something any API exposes anywhere.
  const commissionRate = Number(commissionRatePct);
  if (!Number.isFinite(commissionRate) || commissionRate <= 0 || commissionRate >= 100) {
    return { ok: false, message: "Commission rate must be a number between 0 and 100 (e.g. 19 for 19%)." };
  }
  const optionalRate = (value: string | undefined, label: string) => {
    const parsed = value?.trim() ? Number(value) : 0;
    if (!Number.isFinite(parsed) || parsed < 0 || parsed >= 100) throw new Error(`${label} must be between 0 and 100.`);
    return parsed;
  };
  const optionalAmount = (value: string | undefined, label: string) => {
    const parsed = value?.trim() ? Number(value) : 0;
    if (!Number.isFinite(parsed) || parsed < 0) throw new Error(`${label} cannot be negative.`);
    return parsed;
  };
  let vatOnFeesPct: number, paymentFeePct: number, fixedOrderFee: number, deliveryContribution: number;
  try {
    vatOnFeesPct = optionalRate(params.vatOnFeesPct, "VAT on platform fees");
    paymentFeePct = optionalRate(params.paymentFeePct, "Payment fee");
    fixedOrderFee = optionalAmount(params.fixedOrderFee, "Fixed order fee");
    deliveryContribution = optionalAmount(params.deliveryContribution, "Delivery contribution");
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : "Invalid commercial terms." };
  }

  // Confirmed live against Talabat's real catalog endpoint: chain_id is
  // validated server-side as a strict UUID *before* auth is even checked
  // (a non-UUID value 400s immediately). Catch this at connect time — the
  // merchant's Chain ID field is a plain text input with no format
  // enforcement, so a copy-paste mistake here would otherwise "connect"
  // successfully and only ever fail, silently, on the first real dispatch.
  const UUID_RE = /^[a-fA-F0-9]{8}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{12}$/;
  if (!UUID_RE.test(chainId)) {
    return {
      ok: false,
      message: "Chain ID must be a UUID (e.g. 12345678-1234-1234-1234-123456789012) — check partner.talabat.com for the exact value.",
    };
  }

  // Verify live against Talabat's real OAuth token endpoint before ever
  // reporting "connected" — a wrong client_id/client_secret fails here with
  // a clear message instead of silently sitting in the DB until the first
  // real dispatch attempt fails.
  const tokenResult = await exchangeTalabatToken(clientId, clientSecret);
  if (!tokenResult.ok || !tokenResult.data?.access_token) {
    // Confirmed live against Talabat's real token endpoint: invalid
    // credentials come back as 400 invalid_request/invalid_client, not
    // 401/403 — check the OAuth2 error body, not just the HTTP status.
    const isBadCredentials =
      tokenResult.httpStatus === 401 ||
      tokenResult.httpStatus === 403 ||
      (tokenResult.httpStatus === 400 && /invalid_client|invalid_request|invalid credentials/i.test(tokenResult.message ?? ""));
    return {
      ok: false,
      message: isBadCredentials
        ? "Talabat rejected these credentials. Double-check your Client ID and Client Secret from partner.talabat.com."
        : `Could not reach Talabat to verify credentials: ${tokenResult.message ?? "unknown error"}. Please try again.`,
    };
  }

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
        metadata: {
          vendor_id: vendorId,
          chain_id: chainId,
          access_token: tokenResult.data.access_token,
          token_expires_at: new Date(Date.now() + tokenResult.data.expires_in * 1000).toISOString(),
          commission_rate_pct: commissionRate,
          vat_on_fees_pct: vatOnFeesPct,
          payment_fee_pct: paymentFeePct,
          fixed_order_fee: fixedOrderFee,
          delivery_contribution: deliveryContribution,
          commercial_terms_source: "merchant_contract",
          commercial_terms_updated_at: now,
        },
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

// ── Keeta shop ID (post-OAuth "finish setup" step) ──────────────────────────────
// Keeta's OAuth flow doesn't return a shopId (no discovery endpoint exists in
// their docs), so it's captured separately once the merchant is connected.
// Read-then-merge-then-write so this never clobbers refresh_token/expires_at
// already sitting in metadata.
export async function setKeetaShopId(merchantId: string, shopId: string): Promise<{ ok: boolean; message?: string }> {
  const { data: existing } = await db()
    .select("id, metadata")
    .eq("account_id", merchantId)
    .eq("platform", "keeta")
    .eq("status", "connected")
    .maybeSingle();

  if (!existing) {
    return { ok: false, message: "Keeta is not connected yet. Complete the Keeta connect flow first." };
  }

  const { error } = await db()
    .update({
      metadata: { ...(existing.metadata ?? {}), shop_id: shopId },
      updated_at: new Date().toISOString(),
    })
    .eq("id", existing.id);

  if (error) return { ok: false, message: "Failed to save Shop ID. Please try again." };
  return { ok: true };
}

// ── Disconnect ────────────────────────────────────────────────────────────────
export async function disconnectChannel(merchantId: string, platform: string) {
  await db()
    .update({ status: "revoked", updated_at: new Date().toISOString() })
    .eq("account_id", merchantId)
    .eq("platform", platform);
}
