import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const SNOONU_CONNECTION_MODES = ["partner_api_pull", "partner_webhook_push", "document_plus_pos"] as const;
export type SnoonuConnectionMode = (typeof SNOONU_CONNECTION_MODES)[number];

export const SNOONU_REQUESTABLE_SCOPES = [
  "merchant:read", "branches:read", "catalogue:read", "orders:read", "settlements:read", "promotions:read",
] as const;
export type SnoonuRequestableScope = (typeof SNOONU_REQUESTABLE_SCOPES)[number];

export function validateSnoonuActivationRequest(input: unknown): { modes: SnoonuConnectionMode[]; scopes: SnoonuRequestableScope[] } {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new Error("Connection request must be an object.");
  const value = input as Record<string, unknown>;
  if (!Array.isArray(value.modes) || value.modes.length === 0) throw new Error("Select at least one Snoonu connection mode.");
  const modes = [...new Set(value.modes)] as unknown[];
  if (modes.some(mode => typeof mode !== "string" || !(SNOONU_CONNECTION_MODES as readonly string[]).includes(mode))) {
    throw new Error("The Snoonu connection request contains an unsupported mode.");
  }
  const requestedScopes = value.scopes === undefined
    ? ["merchant:read", "branches:read", "orders:read", "settlements:read"]
    : value.scopes;
  if (!Array.isArray(requestedScopes)) throw new Error("Snoonu scopes must be an array.");
  const scopes = [...new Set(requestedScopes)] as unknown[];
  if (scopes.some(scope => typeof scope !== "string" || !(SNOONU_REQUESTABLE_SCOPES as readonly string[]).includes(scope))) {
    throw new Error("The Snoonu connection request contains an unsupported scope.");
  }
  return { modes: modes as SnoonuConnectionMode[], scopes: scopes as SnoonuRequestableScope[] };
}

export async function requestSnoonuActivation(params: { merchantId: string; modes: SnoonuConnectionMode[]; scopes: SnoonuRequestableScope[] }) {
  const now = new Date().toISOString();
  const db = supabaseAdmin as any;
  const { data: existing } = await db.from("ps_merchant_channels").select("metadata,status")
    .eq("account_id", params.merchantId).eq("merchant_id", params.merchantId).eq("platform", "snoonu").maybeSingle();
  const metadata = existing?.metadata && typeof existing.metadata === "object" ? existing.metadata : {};
  const status = existing?.status === "connected" ? "connected" : "pending";
  const { data, error } = await db.from("ps_merchant_channels").upsert({
    account_id: params.merchantId, licensee_id: params.merchantId, merchant_id: params.merchantId,
    platform: "snoonu", scopes: params.scopes, status, error_message: null, updated_at: now,
    metadata: { ...metadata, activation: {
      requested_modes: params.modes, requested_scopes: params.scopes, requested_at: now,
      approval_status: status === "connected" ? "approved" : "awaiting_snoonu",
    } },
  }, { onConflict: "account_id,merchant_id,platform" }).select("status,connected_at").single();
  if (error) throw new Error("PrizeSkout could not save the Snoonu activation request.");
  return data as { status: "pending" | "connected"; connected_at: string | null };
}
