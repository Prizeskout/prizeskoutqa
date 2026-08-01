// =============================================================================
// Channel Vault — Credential management for aggregator + ERP connections
//
// Inbound (ERP/POS):  salla, foodics, zid
// Outbound (delivery): talabat, jahez, snoonu, deliveroo
//
// Auth per platform:
//   Salla    — OAuth 2.0 bearer token
//   Foodics  — email/callback token (bearer only)
//   Zid      — dual-token: bearer + X-MANAGER-TOKEN
//   Delivery — bearer token from partner portal
//
// Routes:
//   POST /v1/channels/connect/:platform
//   GET  /v1/channels
//   DELETE /v1/channels/:platform/:merchant_id
// =============================================================================

import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { Json } from "@/integrations/supabase/types";
import { type V1Context, type V1Result } from "@/server/v1-handlers";
import { writeAuditLog, channelConnectSummary } from "./govern";
import { syncPlatformCatalog } from "./platform-sync";
import { getPublicOrigin } from "@/server/public-origin";

// ---------------------------------------------------------------------------
// Webhook helpers
// ---------------------------------------------------------------------------

function generateWebhookSecret(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}

// Events we subscribe to on each platform
// Salla: product.updated is deprecated → use product.price.updated (verified in Salla docs)
// Zid:   uses product.update (singular) per their webhook events list
const PLATFORM_WEBHOOK_EVENTS: Record<string, string[]> = {
  salla:   ["product.price.updated", "product.created"],
  foodics: ["products.updated", "product.updated"],
  zid:     ["product.update"],
};

async function registerPlatformWebhook(
  platform: string,
  bearerToken: string,
  managerToken: string | undefined | null,
  webhookSecret: string,
  webhookBaseUrl: string,
): Promise<{ ok: boolean; message?: string }> {
  const webhookUrl = `${webhookBaseUrl}/api/webhooks/${platform}`;
  const events = PLATFORM_WEBHOOK_EVENTS[platform] ?? [];
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
    Authorization: `Bearer ${bearerToken}`,
  };

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    if (platform === "salla") {
      // Salla: one registration call per event; endpoint is /webhooks/subscribe
      for (const event of events) {
        await fetch("https://api.salla.dev/admin/v2/webhooks/subscribe", {
          method: "POST",
          headers,
          body: JSON.stringify({ event, url: webhookUrl, secret: webhookSecret }),
          signal: controller.signal,
        });
      }
    } else if (platform === "foodics") {
      // Foodics: registers all events in one call
      await fetch("https://api-v2.foodics.com/v2.1/webhooks", {
        method: "POST",
        headers,
        body: JSON.stringify({ url: webhookUrl, events, secret: webhookSecret }),
        signal: controller.signal,
      });
    } else if (platform === "zid") {
      // Zid: uses Basic Auth (not HMAC). Register username+password so Zid sends
      // Authorization: Basic base64(prizeskout:<secret>) on every webhook call.
      // Endpoint is /v1/managers/webhooks; one call per event; field is target_url not url.
      if (managerToken) headers["X-MANAGER-TOKEN"] = managerToken;
      for (const event of events) {
        await fetch("https://api.zid.sa/v1/managers/webhooks", {
          method: "POST",
          headers,
          body: JSON.stringify({
            event,
            target_url: webhookUrl,
            original_id: "prizeskout",
            username: "prizeskout",
            password: webhookSecret,
          }),
          signal: controller.signal,
        });
      }
    }

    clearTimeout(timeout);
    return { ok: true };
  } catch (e) {
    // Non-fatal: channel is still connected; webhook can be re-registered later
    return { ok: false, message: e instanceof Error ? e.message : String(e) };
  }
}

const SOURCE_PLATFORMS = ["salla", "foodics", "zid"] as const;

// Keeta is deliberately absent here. This endpoint's contract is "paste a
// bearer token, we probe it" — incompatible with Keeta's signed-request
// model, where there's no static token a caller could paste (every call,
// including the token exchange itself, needs a live per-request signature).
// Keeta only ever connects via the OAuth flow in src/routes/api/auth/keeta*.
const VALID_PLATFORMS = ["salla", "foodics", "zid", "talabat", "jahez", "snoonu", "deliveroo"] as const;
type Platform = (typeof VALID_PLATFORMS)[number];

function err(code: string, message: string, status: number, extra?: Record<string, unknown>): V1Result {
  return { status, body: { error: { code, message, ...extra } } };
}

function ok(body: unknown, status = 200): V1Result {
  return { status, body };
}

// ---------------------------------------------------------------------------
// POST /v1/channels/connect/:platform
// ---------------------------------------------------------------------------
export async function handleChannelConnect(
  request: Request,
  ctx: V1Context,
  platform: string,
): Promise<V1Result> {
  if (!VALID_PLATFORMS.includes(platform as Platform)) {
    return err(
      "invalid_platform",
      `Platform must be one of: ${VALID_PLATFORMS.join(", ")}.`,
      400,
      { valid_platforms: VALID_PLATFORMS },
    );
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return err("validation_failed", "Request body must be valid JSON.", 422);
  }

  const merchant_id = body.merchant_id;
  const bearer_token = body.bearer_token;
  const manager_token = body.manager_token; // Zid only
  const scopes = Array.isArray(body.scopes) ? body.scopes as string[] : [];

  if (!merchant_id || typeof merchant_id !== "string") {
    return err("validation_failed", "`merchant_id` is required.", 422, { field: "merchant_id" });
  }
  if (!bearer_token || typeof bearer_token !== "string") {
    return err("validation_failed", "`bearer_token` is required.", 422, { field: "bearer_token" });
  }
  if (platform === "zid" && (!manager_token || typeof manager_token !== "string")) {
    return err(
      "validation_failed",
      "Zid requires `manager_token` (X-MANAGER-TOKEN) in addition to `bearer_token`.",
      422,
      { field: "manager_token" },
    );
  }

  // Verify credential with a lightweight probe
  const probeResult = await probeChannelAuth(platform as Platform, bearer_token as string, manager_token as string | undefined);

  const status = probeResult.ok ? "connected" : "error";
  const now = new Date().toISOString();

  // Generate a webhook secret for this channel (used to verify inbound webhook signatures)
  const webhookSecret = generateWebhookSecret();

  const { data: row, error: upsertErr } = await supabaseAdmin
    .from("ps_merchant_channels")
    .upsert(
      {
        account_id: ctx.accountId,
        licensee_id: ctx.licenseeId,
        merchant_id: merchant_id as string,
        platform,
        bearer_token: bearer_token as string,
        manager_token: manager_token as string | null ?? null,
        scopes,
        status,
        error_message: probeResult.ok ? null : probeResult.message,
        connected_at: probeResult.ok ? now : null,
        last_verified_at: now,
        updated_at: now,
        metadata: (probeResult.metadata ?? {}) as Json,
        webhook_secret: webhookSecret,
      },
      { onConflict: "account_id,merchant_id,platform" },
    )
    .select("id, status, connected_at")
    .single();

  if (upsertErr || !row) {
    return err("internal_error", "Failed to save channel credentials.", 500);
  }

  // Govern audit
  const summaries = channelConnectSummary(platform, merchant_id as string, status);
  await writeAuditLog({
    accountId: ctx.accountId,
    licenseeId: ctx.licenseeId,
    merchantId: merchant_id as string,
    sku: "_channel_connect",
    region: "QA",
    eventType: "channel_connect",
    sourcePlatform: platform,
    dataRoute: "QA",
    payload: {
      platform,
      merchant_id,
      status,
      scopes,
      probe_http_status: probeResult.httpStatus,
    },
    summaryEn: summaries.en,
    summaryAr: summaries.ar,
  });

  if (!probeResult.ok) {
    return err(
      "channel_auth_failed",
      `Credentials saved but probe to ${platform} failed (HTTP ${probeResult.httpStatus}): ${probeResult.message}`,
      502,
      { channel_id: row.id, platform, merchant_id, status: "error" },
    );
  }

  // For source platforms (Salla, Foodics, Zid):
  //  a) Register webhook subscriptions with the platform so we receive real-time events
  //  b) Pull their catalog immediately so margins are calculated on first login
  let catalogSync = null;
  let webhookRegistration: { ok: boolean; message?: string } | null = null;

  if ((SOURCE_PLATFORMS as readonly string[]).includes(platform)) {
    const region = (body.region as string | undefined) ?? "QA";

    // Derive the public base URL from the incoming request origin
    const origin = getPublicOrigin(request);
    webhookRegistration = await registerPlatformWebhook(
      platform,
      bearer_token as string,
      manager_token as string | null | undefined,
      webhookSecret,
      origin,
    );

    // Record when we successfully registered so we can detect stale registrations later
    if (webhookRegistration.ok) {
      await supabaseAdmin
        .from("ps_merchant_channels")
        .update({ webhook_registered_at: new Date().toISOString() })
        .eq("id", row.id);
    }

    catalogSync = await syncPlatformCatalog({
      platform,
      creds: {
        bearer_token: bearer_token as string,
        manager_token: manager_token as string | null | undefined,
      },
      accountId: ctx.accountId,
      licenseeId: ctx.licenseeId,
      merchantId: merchant_id as string,
      region,
      apiKeyId: ctx.apiKeyId,
    });
  }

  return ok({
    channel_id: row.id,
    platform,
    merchant_id,
    status: "connected",
    connected_at: row.connected_at,
    scopes,
    webhook_endpoint: `${getPublicOrigin(request)}/api/webhooks/${platform}`,
    ...(webhookRegistration ? { webhook_registered: webhookRegistration.ok } : {}),
    ...(catalogSync ? { catalog_sync: catalogSync } : {}),
  }, 201);
}

// ---------------------------------------------------------------------------
// GET /v1/channels
// ---------------------------------------------------------------------------
export async function handleListChannels(
  _request: Request,
  ctx: V1Context,
): Promise<V1Result> {
  const { data, error } = await supabaseAdmin
    .from("ps_merchant_channels")
    .select(
      "id, merchant_id, platform, scopes, status, connected_at, last_verified_at, error_message, created_at",
    )
    .eq("account_id", ctx.accountId)
    .neq("status", "revoked")
    .order("created_at", { ascending: false });

  if (error) return err("internal_error", "Failed to retrieve channels.", 500);

  return ok({ channels: data ?? [], count: (data ?? []).length });
}

// ---------------------------------------------------------------------------
// DELETE /v1/channels/:platform/:merchant_id
// ---------------------------------------------------------------------------
export async function handleRevokeChannel(
  _request: Request,
  ctx: V1Context,
  platform: string,
  merchantId: string,
): Promise<V1Result> {
  if (!VALID_PLATFORMS.includes(platform as Platform)) {
    return err("invalid_platform", `Unknown platform: ${platform}.`, 400);
  }

  const { error } = await supabaseAdmin
    .from("ps_merchant_channels")
    .update({ status: "revoked", updated_at: new Date().toISOString() })
    .eq("account_id", ctx.accountId)
    .eq("merchant_id", merchantId)
    .eq("platform", platform);

  if (error) return err("internal_error", "Failed to revoke channel.", 500);

  const summaries = channelConnectSummary(platform, merchantId, "revoked");
  await writeAuditLog({
    accountId: ctx.accountId,
    licenseeId: ctx.licenseeId,
    merchantId,
    sku: "_channel_revoke",
    region: "QA",
    eventType: "channel_connect",
    sourcePlatform: platform,
    dataRoute: "QA",
    payload: { platform, merchant_id: merchantId, action: "revoke" },
    summaryEn: summaries.en,
    summaryAr: summaries.ar,
  });

  return ok({ revoked: true, platform, merchant_id: merchantId });
}

// ---------------------------------------------------------------------------
// POST /v1/channels/sync/:platform — manual re-sync of catalog
// ---------------------------------------------------------------------------
export async function handleChannelSync(
  request: Request,
  ctx: V1Context,
  platform: string,
): Promise<V1Result> {
  if (!(SOURCE_PLATFORMS as readonly string[]).includes(platform)) {
    return err(
      "invalid_platform",
      `Manual sync is only available for source platforms: ${SOURCE_PLATFORMS.join(", ")}.`,
      400,
    );
  }

  let body: Record<string, unknown> = {};
  try { body = (await request.json()) as Record<string, unknown>; } catch { /* body is optional */ }

  const merchant_id = body.merchant_id;
  if (!merchant_id || typeof merchant_id !== "string") {
    return err("validation_failed", "`merchant_id` is required.", 422);
  }

  const { data: channel } = await supabaseAdmin
    .from("ps_merchant_channels")
    .select("bearer_token, manager_token, status, metadata")
    .eq("account_id", ctx.accountId)
    .eq("merchant_id", merchant_id)
    .eq("platform", platform)
    .maybeSingle();

  if (!channel) return err("not_found", `No connected ${platform} channel found for merchant ${merchant_id}.`, 404);
  if (channel.status !== "connected") return err("channel_not_connected", `Channel is in status "${channel.status}". Connect it first.`, 409);

  const region = (body.region as string | undefined) ?? "QA";

  const result = await syncPlatformCatalog({
    platform,
    creds: {
      bearer_token: channel.bearer_token ?? "",
      manager_token: channel.manager_token,
      store_id: String((channel.metadata as Record<string, unknown> | null)?.store_id ?? "") || null,
    },
    accountId: ctx.accountId,
    licenseeId: ctx.licenseeId,
    merchantId: merchant_id,
    region,
    apiKeyId: ctx.apiKeyId,
  });

  return ok({ sync: result });
}

// ---------------------------------------------------------------------------
// Probe helpers — lightweight auth verification per platform
// ---------------------------------------------------------------------------
type ProbeResult = {
  ok: boolean;
  httpStatus: number;
  message?: string;
  metadata?: Record<string, unknown>;
};

async function probeChannelAuth(platform: Platform, bearerToken: string, managerToken?: string): Promise<ProbeResult> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    let url = "";
    const headers: Record<string, string> = {
      Accept: "application/json",
      Authorization: `Bearer ${bearerToken}`,
    };

    if (platform === "salla") {
      url = "https://api.salla.dev/admin/v2/store/info";
    } else if (platform === "foodics") {
      url = "https://api-v2.foodics.com/v2.1/business";
    } else if (platform === "zid") {
      url = "https://api.zid.sa/v1/profile/";
      if (managerToken) headers["X-MANAGER-TOKEN"] = managerToken;
    } else if (platform === "talabat") {
      url = "https://api.talabat.com/merchant/v1/profile";
    } else if (platform === "jahez") {
      url = "https://merchant-api.jahez.net/v2/profile";
    } else if (platform === "snoonu") {
      url = "https://partner-api.snoonu.com/v1/partner/profile";
    } else if (platform === "deliveroo") {
      url = "https://api.developers.deliveroo.com/v1/partner/info";
    }

    const resp = await fetch(url, { headers, signal: controller.signal });
    clearTimeout(timeout);

    if (resp.ok) {
      let metadata: Record<string, unknown> = {};
      try {
        const json = await resp.json() as Record<string, unknown>;
        if (platform === "salla") {
          metadata = { store_id: (json as { data?: { id?: string } }).data?.id };
        } else if (platform === "foodics") {
          metadata = { business_id: (json as { data?: { id?: string } }).data?.id };
        } else if (platform === "zid") {
          const profile = json as { store?: { id?: string | number }; id?: string | number };
          metadata = { store_id: String(profile.store?.id ?? profile.id ?? "") };
        }
      } catch { /* noop */ }
      return { ok: true, httpStatus: resp.status, metadata };
    }

    const text = await resp.text().catch(() => "");
    return { ok: false, httpStatus: resp.status, message: text.slice(0, 400) };
  } catch (e) {
    const isTimeout = e instanceof Error && e.name === "AbortError";
    return {
      ok: false,
      httpStatus: isTimeout ? 504 : 500,
      message: isTimeout ? "Connection timed out" : String(e),
    };
  }
}
