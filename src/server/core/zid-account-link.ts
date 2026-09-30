import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { Json } from "@/integrations/supabase/types";
import { secureAccessCode } from "@/server/onboarding-capability";
import { appUrl, sendWelcomeEmail } from "@/server/email";

export type VerifiedZidStore = {
  id: string;
  name: string;
  email: string;
  locale?: string;
};

const normalizeEmail = (value: unknown) =>
  typeof value === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())
    ? value.trim().toLowerCase()
    : "";

const objectValue = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};

export function verifiedZidStoreFromProfile(payload: Record<string, unknown>): VerifiedZidStore | null {
  const data = objectValue(payload.data);
  const store = objectValue(payload.store ?? data.store ?? data);
  const manager = objectValue(payload.manager ?? data.manager ?? payload.user ?? data.user);
  const id = String(store.id ?? store.uuid ?? payload.id ?? "").trim();
  if (!id) return null;
  const name = String(store.title ?? store.name ?? payload.name ?? `Zid Store ${id}`).trim();
  const email = normalizeEmail(store.email ?? manager.email ?? payload.email ?? data.email);
  const locale = String(store.locale ?? manager.locale ?? payload.locale ?? "en").trim();
  return { id, name: name || `Zid Store ${id}`, email, locale };
}

export async function provisionZidMerchantAccess(params: {
  channelId: string;
  accountId: string;
  store: VerifiedZidStore;
  metadata: Record<string, unknown>;
}): Promise<{ accessCode: string; emailSent: boolean; emailError?: string }> {
  const { channelId, accountId, store } = params;
  let { data: access } = await supabaseAdmin
    .from("ps_access_codes")
    .select("code")
    .eq("merchant_id", accountId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!access?.code) {
    const code = secureAccessCode("SA");
    const result = await supabaseAdmin.from("ps_access_codes").insert({
      code,
      merchant_id: accountId,
      email: store.email || null,
      store_name: store.name,
    }).select("code").single();
    if (result.error || !result.data?.code) throw result.error ?? new Error("Unable to provision Zid merchant access.");
    access = result.data;
  } else {
    await supabaseAdmin.from("ps_access_codes").update({
      store_name: store.name,
      ...(store.email ? { email: store.email } : {}),
    }).eq("merchant_id", accountId).eq("code", access.code);
  }

  const attemptedAt = new Date().toISOString();
  const metadata = {
    ...params.metadata,
    store_id: store.id,
    store_name: store.name,
    store_email_verified: Boolean(store.email),
    merchant_access_provisioned_at: attemptedAt,
  };

  if (!store.email) {
    await supabaseAdmin.from("ps_merchant_channels").update({
      metadata: { ...metadata, welcome_email_error: "verified_store_email_unavailable" } as Json,
      updated_at: attemptedAt,
    }).eq("id", channelId);
    return { accessCode: access.code, emailSent: false, emailError: "verified_store_email_unavailable" };
  }

  if (typeof params.metadata.welcome_email_provider_accepted_at === "string") {
    await supabaseAdmin.from("ps_merchant_channels").update({ metadata: metadata as Json, updated_at: attemptedAt }).eq("id", channelId);
    return { accessCode: access.code, emailSent: true };
  }

  await supabaseAdmin.auth.admin.createUser({ email: store.email, email_confirm: true }).catch(() => null);
  const { data: link, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
    type: "magiclink",
    email: store.email,
    options: {
      redirectTo: appUrl("/auth/callback"),
      data: { prizeskout_merchant_id: accountId, prizeskout_source: "zid_marketplace" },
    },
  });
  if (linkError || !link?.properties?.action_link) {
    await supabaseAdmin.from("ps_merchant_channels").update({
      metadata: { ...metadata, welcome_email_attempted_at: attemptedAt, welcome_email_error: "secure_activation_link_failed" } as Json,
      updated_at: attemptedAt,
    }).eq("id", channelId);
    return { accessCode: access.code, emailSent: false, emailError: "secure_activation_link_failed" };
  }

  const sent = await sendWelcomeEmail({
    to: store.email,
    locale: store.locale,
    store: store.name,
    dashboardUrl: link.properties.action_link,
    platform: "Zid",
  }).catch(() => ({ ok: false, skipped: false, error: "welcome_send_threw" }));
  const providerId = "id" in sent ? sent.id : undefined;

  await supabaseAdmin.from("ps_merchant_channels").update({
    metadata: {
      ...metadata,
      welcome_email_attempted_at: attemptedAt,
      welcome_email_delivery_verified: false,
      ...(sent.ok ? {
        welcome_email_sent_at: attemptedAt,
        welcome_email_provider_accepted_at: attemptedAt,
        welcome_email_provider_id: providerId ?? null,
        welcome_email_error: null,
      } : {
        welcome_email_error: sent.skipped ? "email_transport_not_configured" : String(sent.error ?? "welcome_send_failed").slice(0, 180),
      }),
    } as Json,
    updated_at: attemptedAt,
  }).eq("id", channelId);

  return {
    accessCode: access.code,
    emailSent: sent.ok,
    emailError: sent.ok ? undefined : sent.skipped ? "email_transport_not_configured" : sent.error,
  };
}
