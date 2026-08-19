import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { Json } from "@/integrations/supabase/types";

type SallaLinkableChannel = {
  id: string;
  account_id: string;
  licensee_id: string;
  merchant_id: string;
  bearer_token: string | null;
  metadata: Json;
};

function objectValue(value: Json): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function normalizedEmail(value: unknown): string {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

async function readVerifiedSallaStore(channel: SallaLinkableChannel) {
  if (!channel.bearer_token) return null;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5_000);
  try {
    const response = await fetch("https://api.salla.dev/admin/v2/store/info", {
      headers: {
        Authorization: `Bearer ${channel.bearer_token}`,
        Accept: "application/json",
      },
      signal: controller.signal,
    });
    if (!response.ok) return null;
    const payload = await response.json() as {
      data?: { id?: string | number; name?: string; email?: string; type?: string };
    };
    const email = normalizedEmail(payload.data?.email);
    if (!email) return null;
    return {
      email,
      storeId: String(payload.data?.id ?? channel.merchant_id),
      storeName: String(payload.data?.name ?? ""),
      storeType: String(payload.data?.type ?? ""),
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Salla Easy Mode sends credentials to our webhook without carrying the
 * PrizeSkout account that initiated installation. We close that gap by
 * comparing the email returned by Salla's authenticated Store Info endpoint
 * with PrizeSkout's verified onboarding email. A link is made only when that
 * email resolves to exactly one PrizeSkout account.
 */
export async function linkSallaChannelByVerifiedEmail(
  channel: SallaLinkableChannel,
): Promise<SallaLinkableChannel> {
  const metadata = objectValue(channel.metadata);
  if (metadata.oauth_mode !== "easy") return channel;

  const store = await readVerifiedSallaStore(channel);
  if (!store) return channel;

  const enrichedMetadata = {
    ...metadata,
    store_id: store.storeId,
    store_name: store.storeName,
    store_type: store.storeType,
    store_email_verified: true,
  };

  const { data: codes } = await supabaseAdmin
    .from("ps_access_codes")
    .select("merchant_id")
    .ilike("email", store.email);
  const accountIds = [...new Set((codes ?? []).map(row => row.merchant_id).filter(Boolean))];

  if (accountIds.length !== 1) {
    await supabaseAdmin.from("ps_merchant_channels").update({
      metadata: enrichedMetadata as Json,
      updated_at: new Date().toISOString(),
    }).eq("id", channel.id);
    return { ...channel, metadata: enrichedMetadata as Json };
  }

  const targetAccountId = accountIds[0];
  const { data: account } = await supabaseAdmin
    .from("accounts_v2")
    .select("id,licensee_id")
    .eq("id", targetAccountId)
    .maybeSingle();

  // PrizeSkout accounts created before accounts_v2 was introduced use the
  // merchant UUID directly for both account and licensee. Preserve support
  // for those merchants instead of refusing an otherwise verified link.
  let targetLicenseeId = account?.licensee_id ?? "";
  if (!targetLicenseeId) {
    const { data: existingChannel } = await supabaseAdmin
      .from("ps_merchant_channels")
      .select("licensee_id")
      .eq("account_id", targetAccountId)
      .limit(1)
      .maybeSingle();
    targetLicenseeId = existingChannel?.licensee_id ?? targetAccountId;
  }

  const { data: occupied } = await supabaseAdmin
    .from("ps_merchant_channels")
    .select("id")
    .eq("account_id", targetAccountId)
    .eq("platform", "salla")
    .neq("id", channel.id)
    .limit(1);
  if (occupied?.length) return channel;

  const linkedAt = new Date().toISOString();
  const linkedMetadata = {
    ...enrichedMetadata,
    linked_to_prizeskout_at: linkedAt,
    link_method: "verified_email",
  };
  const { data: linked, error } = await supabaseAdmin
    .from("ps_merchant_channels")
    .update({
      account_id: targetAccountId,
      licensee_id: targetLicenseeId,
      metadata: linkedMetadata as Json,
      updated_at: linkedAt,
    })
    .eq("id", channel.id)
    .select("id,account_id,licensee_id,merchant_id,bearer_token,metadata")
    .single();

  return !error && linked ? linked as SallaLinkableChannel : channel;
}

export async function reconcileSallaEasyModeForAccount(accountId: string): Promise<void> {
  const { data: existing } = await supabaseAdmin
    .from("ps_merchant_channels")
    .select("id")
    .eq("account_id", accountId)
    .eq("platform", "salla")
    .neq("status", "revoked")
    .limit(1);
  if (existing?.length) return;

  const { data: candidates } = await supabaseAdmin
    .from("ps_merchant_channels")
    .select("id,account_id,licensee_id,merchant_id,bearer_token,metadata")
    .eq("platform", "salla")
    .eq("status", "connected")
    .limit(25);

  for (const candidate of candidates ?? []) {
    const linked = await linkSallaChannelByVerifiedEmail(candidate as SallaLinkableChannel);
    if (linked.account_id === accountId) return;
  }
}
