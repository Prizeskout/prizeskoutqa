import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { Json } from "@/integrations/supabase/types";

const TOKEN_URL = "https://oauth.zid.sa/oauth/token";
const REFRESH_EARLY_MS = 60 * 24 * 60 * 60 * 1000;
const LOCK_TTL_MS = 60 * 1000;

type ZidChannel = { id: string; bearer_token: string | null; manager_token: string | null; metadata: Json };
type ZidTokenResponse = { Authorization?: string; authorization?: string; access_token?: string; refresh_token?: string; expires_in?: number };
const metadataObject = (value: Json): Record<string, unknown> => value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};

export function zidTokenNeedsRefresh(metadata: Record<string, unknown>, now = Date.now()): boolean {
  const expiresAt = Date.parse(String(metadata.expires_at ?? ""));
  return !Number.isFinite(expiresAt) || expiresAt <= now + REFRESH_EARLY_MS;
}

export async function getValidZidCredentials(channel: ZidChannel): Promise<{ bearerToken: string; managerToken: string }> {
  const metadata = metadataObject(channel.metadata);
  const refreshToken = typeof metadata.refresh_token === "string" ? metadata.refresh_token : "";
  // Legacy/manual connections do not have refresh metadata. Preserve their
  // existing dual-token behavior instead of forcing a needless reconnect.
  if (channel.bearer_token && channel.manager_token && !refreshToken) {
    return { bearerToken: channel.bearer_token, managerToken: channel.manager_token };
  }
  if (channel.bearer_token && channel.manager_token && !zidTokenNeedsRefresh(metadata)) {
    return { bearerToken: channel.bearer_token, managerToken: channel.manager_token };
  }
  if (!refreshToken) throw new Error("Zid refresh token is missing; reconnect the app.");
  const clientId = process.env.ZID_CLIENT_ID;
  const clientSecret = process.env.ZID_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error("Zid client credentials are not configured.");

  const lockAt = Date.parse(String(metadata.refresh_lock_at ?? ""));
  if (Number.isFinite(lockAt) && lockAt > Date.now() - LOCK_TTL_MS) throw new Error("Zid token refresh is already in progress; retry shortly.");
  const lease = crypto.randomUUID();
  const lockedMetadata = { ...metadata, refresh_lock: lease, refresh_lock_at: new Date().toISOString() };
  const { data: locked } = await supabaseAdmin.from("ps_merchant_channels")
    .update({ metadata: lockedMetadata as Json, updated_at: new Date().toISOString() })
    .eq("id", channel.id).eq("metadata", metadata as { [key: string]: Json | undefined }).select("id").maybeSingle();
  if (!locked) throw new Error("Zid token refresh is already in progress; retry shortly.");

  try {
    const response = await fetch(TOKEN_URL, {
      method: "POST", headers: { Accept: "application/json", "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ grant_type: "refresh_token", client_id: clientId, client_secret: clientSecret, refresh_token: refreshToken }),
    });
    if (!response.ok) throw new Error(`Zid token refresh failed with HTTP ${response.status}`);
    const tokens = await response.json() as ZidTokenResponse;
    const bearerToken = tokens.Authorization ?? tokens.authorization ?? "";
    const managerToken = tokens.access_token ?? "";
    if (!bearerToken || !managerToken || !tokens.refresh_token) throw new Error("Zid token refresh response was incomplete.");
    const expiresAt = new Date(Date.now() + Number(tokens.expires_in ?? 365 * 24 * 60 * 60) * 1000).toISOString();
    const nextMetadata = { ...metadata, refresh_token: tokens.refresh_token, expires_at: expiresAt, refreshed_at: new Date().toISOString() };
    const { data: saved, error } = await supabaseAdmin.from("ps_merchant_channels").update({
      bearer_token: bearerToken, manager_token: managerToken, metadata: nextMetadata as Json,
      last_verified_at: new Date().toISOString(), updated_at: new Date().toISOString(), error_message: null,
    }).eq("id", channel.id).filter("metadata->>refresh_lock", "eq", lease).select("id").maybeSingle();
    if (error || !saved) throw new Error("Unable to persist refreshed Zid credentials.");
    return { bearerToken, managerToken };
  } catch (error) {
    await supabaseAdmin.from("ps_merchant_channels").update({ metadata: metadata as Json, error_message: String(error).slice(0, 400), updated_at: new Date().toISOString() })
      .eq("id", channel.id).filter("metadata->>refresh_lock", "eq", lease);
    throw error;
  }
}
