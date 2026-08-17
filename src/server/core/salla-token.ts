import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { Json } from "@/integrations/supabase/types";

const TOKEN_URL = "https://accounts.salla.sa/oauth2/token";
const REFRESH_EARLY_MS = 5 * 60 * 1000;
const LOCK_TTL_MS = 60 * 1000;

type RefreshableSallaChannel = { id: string; bearer_token: string | null; metadata: Json };
type TokenResponse = { access_token?: string; refresh_token?: string; expires_in?: number; expires?: number };

function objectMetadata(value: Json): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

export function sallaTokenNeedsRefresh(metadata: Record<string, unknown>, now = Date.now()): boolean {
  const expiresAt = Date.parse(String(metadata.expires_at ?? ""));
  return !Number.isFinite(expiresAt) || expiresAt <= now + REFRESH_EARLY_MS;
}

function tokenExpiry(tokens: TokenResponse): string {
  const absolute = Number(tokens.expires);
  if (Number.isFinite(absolute) && absolute > 0) {
    return new Date(absolute > 10_000_000_000 ? absolute : absolute * 1000).toISOString();
  }
  const seconds = Number(tokens.expires_in ?? 14 * 24 * 60 * 60);
  return new Date(Date.now() + seconds * 1000).toISOString();
}

export async function getValidSallaAccessToken(channel: RefreshableSallaChannel): Promise<string> {
  const metadata = objectMetadata(channel.metadata);
  if (channel.bearer_token && !sallaTokenNeedsRefresh(metadata)) return channel.bearer_token;
  const refreshToken = typeof metadata.refresh_token === "string" ? metadata.refresh_token : "";
  if (!refreshToken) throw new Error("Salla refresh token is missing; reinstall the app to reconnect it.");
  const clientId = process.env.SALLA_CLIENT_ID;
  const clientSecret = process.env.SALLA_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error("Salla client credentials are not configured.");

  const lockAt = Date.parse(String(metadata.refresh_lock_at ?? ""));
  if (Number.isFinite(lockAt) && lockAt > Date.now() - LOCK_TTL_MS) {
    throw new Error("Salla token refresh is already in progress; retry shortly.");
  }

  // This compare-and-set lease prevents two requests from consuming Salla's
  // single-use refresh token at the same time.
  const lease = crypto.randomUUID();
  const lockedMetadata = { ...metadata, refresh_lock: lease, refresh_lock_at: new Date().toISOString() };
  const { data: locked } = await supabaseAdmin.from("ps_merchant_channels")
    .update({ metadata: lockedMetadata as Json, updated_at: new Date().toISOString() })
    .eq("id", channel.id)
    .eq("metadata", metadata as { [key: string]: Json | undefined })
    .select("id").maybeSingle();
  if (!locked) throw new Error("Salla token refresh is already in progress; retry shortly.");

  try {
    const response = await fetch(TOKEN_URL, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
      },
      body: new URLSearchParams({ grant_type: "refresh_token", refresh_token: refreshToken }),
    });
    if (!response.ok) throw new Error(`Salla token refresh failed with HTTP ${response.status}`);
    const tokens = await response.json() as TokenResponse;
    if (!tokens.access_token || !tokens.refresh_token) throw new Error("Salla token refresh response was incomplete.");

    const nextMetadata = {
      ...metadata,
      refresh_token: tokens.refresh_token,
      expires_at: tokenExpiry(tokens),
      refreshed_at: new Date().toISOString(),
    };
    const { data: saved, error } = await supabaseAdmin.from("ps_merchant_channels").update({
      bearer_token: tokens.access_token,
      metadata: nextMetadata as Json,
      last_verified_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      error_message: null,
    }).eq("id", channel.id).filter("metadata->>refresh_lock", "eq", lease).select("id").maybeSingle();
    if (error || !saved) throw new Error("Unable to persist the rotated Salla token.");
    return tokens.access_token;
  } catch (error) {
    await supabaseAdmin.from("ps_merchant_channels").update({
      metadata: metadata as Json,
      error_message: error instanceof Error ? error.message.slice(0, 400) : String(error).slice(0, 400),
      updated_at: new Date().toISOString(),
    }).eq("id", channel.id).filter("metadata->>refresh_lock", "eq", lease);
    throw error;
  }
}
