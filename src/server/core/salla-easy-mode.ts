import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { Json } from "@/integrations/supabase/types";
import { backgroundTask } from "@/server/cf-ctx";
import { syncPlatformCatalog } from "./platform-sync";
import { registerSallaWebhooks } from "./salla-webhooks";

type SallaWebhookPayload = {
  event?: unknown;
  merchant?: unknown;
  created_at?: unknown;
  data?: unknown;
};

type SallaAuthorizeData = {
  access_token?: unknown;
  refresh_token?: unknown;
  expires?: unknown;
  scope?: unknown;
  token_type?: unknown;
};

type SallaChannel = {
  id: string;
  account_id: string;
  licensee_id: string;
  merchant_id: string;
  metadata: Json;
};

const APP_EVENTS = new Set([
  "app.store.authorize",
  "app.installed",
  "app.updated",
  "app.uninstalled",
  "app.subscription.started",
  "app.subscription.expired",
  "app.subscription.canceled",
  "app.subscription.renewed",
  "app.settings.updated",
]);

export function isSallaAppEvent(event: string): boolean {
  return APP_EVENTS.has(event);
}

function safeObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function normalizedExpiry(value: unknown): string | null {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) return null;
  // Easy Mode sends a Unix timestamp. Be tolerant of milliseconds.
  return new Date(numeric > 10_000_000_000 ? numeric : numeric * 1000).toISOString();
}

function tenantSlug(merchantId: string): string {
  return `salla-${merchantId.toLowerCase().replace(/[^a-z0-9-]/g, "-").slice(0, 48)}`;
}

async function findSallaChannel(merchantId: string): Promise<SallaChannel | null> {
  const { data } = await supabaseAdmin
    .from("ps_merchant_channels")
    .select("id,account_id,licensee_id,merchant_id,metadata")
    .eq("platform", "salla")
    .eq("merchant_id", merchantId)
    .maybeSingle();
  return data as SallaChannel | null;
}

async function provisionSallaTenant(merchantId: string): Promise<SallaChannel> {
  const existing = await findSallaChannel(merchantId);
  if (existing) return existing;

  const slug = tenantSlug(merchantId);
  const { data: licensee, error: licenseeError } = await supabaseAdmin
    .from("licensees")
    .upsert({
      slug,
      name: `Salla Store ${merchantId}`,
      status: "active",
      metadata: { platform: "salla", salla_merchant_id: merchantId },
    }, { onConflict: "slug" })
    .select("id")
    .single();
  if (licenseeError || !licensee) throw new Error("Unable to provision Salla licensee");

  const { data: account, error: accountError } = await supabaseAdmin
    .from("accounts_v2")
    .upsert({
      licensee_id: licensee.id,
      slug: "main",
      name: `Salla Store ${merchantId}`,
      region: "SA",
      currency: "SAR",
      is_default: true,
      metadata: { platform: "salla", salla_merchant_id: merchantId },
    }, { onConflict: "licensee_id,slug" })
    .select("id,licensee_id")
    .single();
  if (accountError || !account) throw new Error("Unable to provision Salla account");

  const now = new Date().toISOString();
  const { data: channel, error: channelError } = await supabaseAdmin
    .from("ps_merchant_channels")
    .upsert({
      account_id: account.id,
      licensee_id: account.licensee_id,
      merchant_id: merchantId,
      platform: "salla",
      status: "pending",
      updated_at: now,
      metadata: { store_id: merchantId, oauth_mode: "easy" },
    }, { onConflict: "account_id,merchant_id,platform" })
    .select("id,account_id,licensee_id,merchant_id,metadata")
    .single();
  if (channelError || !channel) throw new Error("Unable to provision Salla channel");
  return channel as SallaChannel;
}

async function updateLifecycleMetadata(
  channel: SallaChannel,
  event: string,
  data: Record<string, unknown>,
  createdAt: unknown,
): Promise<void> {
  const oldMetadata = safeObject(channel.metadata);
  const previousSubscriptionStatus = typeof oldMetadata.subscription_status === "string"
    ? oldMetadata.subscription_status
    : undefined;
  const subscriptionStatus = event === "app.subscription.started" || event === "app.subscription.renewed"
    ? "active"
    : event === "app.subscription.expired"
      ? "expired"
      : event === "app.subscription.canceled"
        ? "canceled"
        : previousSubscriptionStatus;
  const metadata = {
    ...oldMetadata,
    store_id: channel.merchant_id,
    oauth_mode: "easy",
    last_app_event: event,
    last_app_event_at: typeof createdAt === "string" ? createdAt : new Date().toISOString(),
    ...(subscriptionStatus ? { subscription_status: subscriptionStatus } : {}),
    ...(Object.keys(data).length ? { app_event_data: data } : {}),
  };
  await supabaseAdmin
    .from("ps_merchant_channels")
    .update({ metadata: metadata as Json, updated_at: new Date().toISOString() })
    .eq("id", channel.id);
}

export async function handleSallaAppEvent(payload: SallaWebhookPayload, webhookOrigin?: string): Promise<Record<string, unknown>> {
  const event = String(payload.event ?? "");
  const merchantId = String(payload.merchant ?? "");
  if (!merchantId) throw new Error("Missing merchant identifier");

  const channel = await provisionSallaTenant(merchantId);
  const data = safeObject(payload.data);
  const now = new Date().toISOString();

  if (event === "app.store.authorize") {
    const auth = data as SallaAuthorizeData;
    const accessToken = typeof auth.access_token === "string" ? auth.access_token : "";
    const refreshToken = typeof auth.refresh_token === "string" ? auth.refresh_token : "";
    if (!accessToken || !refreshToken) throw new Error("Salla authorization payload did not include tokens");
    const scopes = typeof auth.scope === "string" ? auth.scope.split(/\s+/).filter(Boolean) : [];
    const metadata = {
      ...safeObject(channel.metadata),
      store_id: merchantId,
      oauth: true,
      oauth_mode: "easy",
      refresh_token: refreshToken,
      expires_at: normalizedExpiry(auth.expires),
      token_type: typeof auth.token_type === "string" ? auth.token_type : "bearer",
      authorized_at: now,
    };
    const { error } = await supabaseAdmin
      .from("ps_merchant_channels")
      .update({
        bearer_token: accessToken,
        scopes,
        status: "connected",
        error_message: null,
        connected_at: now,
        last_verified_at: now,
        updated_at: now,
        metadata: metadata as Json,
      })
      .eq("id", channel.id);
    if (error) throw new Error("Unable to save Salla authorization");

    if (webhookOrigin) {
      backgroundTask((async () => {
        const registration = await registerSallaWebhooks(accessToken, `${webhookOrigin}/api/webhooks/salla`);
        await supabaseAdmin.from("ps_merchant_channels").update({
          webhook_registered_at: registration.ok ? new Date().toISOString() : null,
          error_message: registration.ok ? null : registration.message.slice(0, 400),
          updated_at: new Date().toISOString(),
        }).eq("id", channel.id);
      })());
    }

    backgroundTask(syncPlatformCatalog({
      platform: "salla",
      creds: { bearer_token: accessToken },
      accountId: channel.account_id,
      licenseeId: channel.licensee_id,
      merchantId,
      region: "SA",
    }).catch(async error => {
      await supabaseAdmin.from("ps_merchant_channels").update({
        error_message: `Initial Salla sync failed: ${String(error).slice(0, 350)}`,
        updated_at: new Date().toISOString(),
      }).eq("id", channel.id);
    }));
    return { received: true, processed: true, event, status: "connected" };
  }

  if (event === "app.uninstalled") {
    const metadata = {
      ...safeObject(channel.metadata),
      refresh_token: null,
      uninstalled_at: now,
      last_app_event: event,
    };
    await supabaseAdmin.from("ps_merchant_channels").update({
      bearer_token: null,
      status: "revoked",
      updated_at: now,
      metadata: metadata as Json,
    }).eq("id", channel.id);
    return { received: true, processed: true, event, status: "revoked" };
  }

  await updateLifecycleMetadata(channel, event, data, payload.created_at);
  return { received: true, processed: true, event };
}
