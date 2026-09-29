import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { Json } from "@/integrations/supabase/types";
import { secureAccessCode } from "@/server/onboarding-capability";
import { appUrl, sendWelcomeEmail } from "@/server/email";

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

async function provisionFirstTimeMerchant(
  channel: SallaLinkableChannel,
  store: { email: string; storeId: string; storeName: string; storeType: string },
): Promise<{ created: boolean; code: string | null }> {
  const { data: existing } = await supabaseAdmin
    .from("ps_access_codes")
    .select("code")
    .eq("merchant_id", channel.account_id)
    .ilike("email", store.email)
    .limit(1)
    .maybeSingle();
  if (existing?.code) return { created: false, code: existing.code };

  const code = secureAccessCode("SA");
  const { error } = await supabaseAdmin.from("ps_access_codes").insert({
    code,
    merchant_id: channel.account_id,
    email: store.email,
    store_name: store.storeName || `Salla Store ${store.storeId}`,
  });
  if (error) return { created: false, code: null };

  return { created: true, code };
}

async function sendSecureSallaWelcome(
  store: { email: string; storeId: string; storeName: string; storeType: string },
): Promise<{ sent: boolean; providerId?: string; error?: string }> {
  // Provision passwordless access. The welcome CTA is a one-time Supabase
  // action link; no reusable password or access code is sent by email.
  await supabaseAdmin.auth.admin.createUser({
    email: store.email,
    email_confirm: true,
  }).catch(() => null);
  const { data: link, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
    type: "magiclink",
    email: store.email,
    options: { redirectTo: appUrl("/auth/callback") },
  });
  if (linkError || !link?.properties?.action_link) {
    return { sent: false, error: "secure_activation_link_failed" };
  }
  const result = await sendWelcomeEmail({
    to: store.email,
    store: store.storeName || undefined,
    dashboardUrl: link.properties.action_link,
    platform: "Salla",
  }).catch(() => ({ ok: false, error: "welcome_send_threw", id: undefined, skipped: false }));
  return result.ok
    ? { sent: true, providerId: result.id }
    : { sent: false, error: result.skipped ? "email_transport_not_configured" : (result.error ?? "welcome_send_failed").slice(0, 180) };
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

  const provisioned = await provisionFirstTimeMerchant(channel, store);
  if (provisioned.created) {
    Object.assign(enrichedMetadata, {
      merchant_access_provisioned_at: new Date().toISOString(),
    });
  }
  if (metadata.welcome_email_delivery_verified !== true && typeof metadata.welcome_email_provider_accepted_at !== "string") {
    const attemptedAt = new Date().toISOString();
    const welcome = await sendSecureSallaWelcome(store);
    Object.assign(enrichedMetadata, {
      welcome_email_attempted_at: attemptedAt,
      // Provider acceptance is not proof that the message reached the inbox.
      // Delivery is marked separately only after provider/webhook or controlled
      // inbox evidence confirms it.
      welcome_email_delivery_verified: false,
      ...(welcome.sent ? {
        welcome_email_sent_at: attemptedAt,
        welcome_email_provider_accepted_at: attemptedAt,
        welcome_email_provider_id: welcome.providerId ?? null,
        welcome_email_error: null,
      } : {
        welcome_email_error: welcome.error ?? "welcome_send_failed",
      }),
    });
  }

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
