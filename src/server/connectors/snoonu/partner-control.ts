import { randomBytes, timingSafeEqual } from "node:crypto";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { SNOONU_REQUESTABLE_SCOPES, type SnoonuRequestableScope } from "./activation";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type SnoonuProvisioningInput = {
  externalMerchantId: string;
  branchIds: string[];
  scopes: SnoonuRequestableScope[];
};

export function authorizeSnoonuPartner(request: Request): "authorized" | "missing_configuration" | "unauthorized" {
  const configured = process.env.SNOONU_PARTNER_CONTROL_TOKEN?.trim() ?? "";
  if (!configured) return "missing_configuration";
  const supplied = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim() ?? "";
  const expectedBytes = Buffer.from(configured);
  const suppliedBytes = Buffer.from(supplied);
  return supplied && expectedBytes.length === suppliedBytes.length && timingSafeEqual(expectedBytes, suppliedBytes)
    ? "authorized"
    : "unauthorized";
}

export function validatePrizeSkoutMerchantId(value: string): string {
  const normalized = value.trim();
  if (!UUID.test(normalized)) throw new Error("PrizeSkout merchant ID must be a UUID.");
  return normalized;
}

export function validateSnoonuProvisioningInput(value: unknown): SnoonuProvisioningInput {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Provisioning body must be an object.");
  const input = value as Record<string, unknown>;
  const externalMerchantId = typeof input.external_merchant_id === "string" ? input.external_merchant_id.trim() : "";
  if (!externalMerchantId || externalMerchantId.length > 200) throw new Error("A valid external_merchant_id is required.");
  if (!Array.isArray(input.branch_ids) || input.branch_ids.length === 0 || input.branch_ids.length > 500) {
    throw new Error("Provide between 1 and 500 authoritative Snoonu branch IDs.");
  }
  const branchIds = [...new Set(input.branch_ids.map(value => typeof value === "string" ? value.trim() : ""))];
  if (branchIds.some(value => !value || value.length > 200)) throw new Error("Every Snoonu branch ID must be a non-empty string.");
  const requestedScopes = input.scopes === undefined
    ? ["merchant:read", "branches:read", "orders:read", "settlements:read"]
    : input.scopes;
  if (!Array.isArray(requestedScopes)) throw new Error("scopes must be an array.");
  const scopes = [...new Set(requestedScopes)] as unknown[];
  if (scopes.some(scope => typeof scope !== "string" || !(SNOONU_REQUESTABLE_SCOPES as readonly string[]).includes(scope))) {
    throw new Error("The provisioning request contains an unsupported scope.");
  }
  return { externalMerchantId, branchIds, scopes: scopes as SnoonuRequestableScope[] };
}

function publicConnection(row: any) {
  const activation = row.metadata?.activation ?? {};
  return {
    prizeskout_merchant_id: String(row.account_id),
    status: row.status,
    external_merchant_id: row.metadata?.snoonu_merchant_id ?? null,
    branch_ids: Array.isArray(row.metadata?.snoonu_branch_ids) ? row.metadata.snoonu_branch_ids : [],
    requested_modes: Array.isArray(activation.requested_modes) ? activation.requested_modes : [],
    requested_scopes: Array.isArray(activation.requested_scopes) ? activation.requested_scopes : [],
    approval_status: activation.approval_status ?? null,
    requested_at: activation.requested_at ?? null,
    approved_at: activation.approved_at ?? null,
    connected_at: row.connected_at ?? null,
  };
}

export async function listSnoonuActivationRequests() {
  const { data, error } = await (supabaseAdmin as any).from("ps_merchant_channels")
    .select("account_id,status,connected_at,metadata").eq("platform", "snoonu")
    .contains("metadata", { activation: { approval_status: "awaiting_snoonu" } })
    .order("updated_at", { ascending: true }).limit(250);
  if (error) throw new Error("Could not load Snoonu activation requests.");
  return (data ?? []).map(publicConnection);
}

export async function getSnoonuPartnerConnection(merchantId: string) {
  const { data, error } = await (supabaseAdmin as any).from("ps_merchant_channels")
    .select("account_id,status,connected_at,metadata").eq("platform", "snoonu").eq("account_id", merchantId).maybeSingle();
  if (error) throw new Error("Could not load the Snoonu connection.");
  return data ? publicConnection(data) : null;
}

export async function provisionSnoonuMerchant(merchantId: string, input: SnoonuProvisioningInput) {
  const db = supabaseAdmin as any;
  const { data: existing, error: readError } = await db.from("ps_merchant_channels")
    .select("id,account_id,merchant_id,metadata,status").eq("platform", "snoonu")
    .eq("account_id", merchantId).eq("merchant_id", merchantId).maybeSingle();
  if (readError) throw new Error("Could not validate the merchant activation request.");
  if (!existing?.metadata?.activation?.requested_at) throw new Error("This merchant has not requested Snoonu activation.");
  if (existing.status === "connected") throw new Error("This merchant is already provisioned. Rotate its secret instead.");
  const now = new Date().toISOString();
  const webhookSecret = `ps_sn_whsec_${randomBytes(32).toString("base64url")}`;
  const metadata = {
    ...existing.metadata,
    snoonu_merchant_id: input.externalMerchantId,
    snoonu_branch_ids: input.branchIds,
    activation: { ...existing.metadata.activation, approval_status: "approved", approved_at: now, provisioned_by: "snoonu_partner_api" },
  };
  const { data, error } = await db.from("ps_merchant_channels").update({
    scopes: input.scopes, status: "connected", webhook_secret: webhookSecret,
    connected_at: now, last_verified_at: now, error_message: null, metadata, updated_at: now,
  }).eq("id", existing.id).select("account_id,status,connected_at,metadata").single();
  if (error) throw new Error("Could not provision the Snoonu merchant.");
  return { connection: publicConnection(data), webhookSecret };
}

export async function suspendSnoonuMerchant(merchantId: string, reason: string) {
  const now = new Date().toISOString();
  const db = supabaseAdmin as any;
  const { data: existing } = await db.from("ps_merchant_channels").select("id,metadata")
    .eq("platform", "snoonu").eq("account_id", merchantId).maybeSingle();
  if (!existing) return null;
  const { data, error } = await db.from("ps_merchant_channels").update({
    status: "revoked", webhook_secret: null, error_message: reason.slice(0, 400), updated_at: now,
    metadata: { ...existing.metadata, activation: { ...existing.metadata?.activation, approval_status: "suspended", suspended_at: now } },
  }).eq("id", existing.id).select("account_id,status,connected_at,metadata").single();
  if (error) throw new Error("Could not suspend the Snoonu merchant.");
  return publicConnection(data);
}

export async function rotateSnoonuWebhookSecret(merchantId: string) {
  const secret = `ps_sn_whsec_${randomBytes(32).toString("base64url")}`;
  const now = new Date().toISOString();
  const { data, error } = await (supabaseAdmin as any).from("ps_merchant_channels").update({
    webhook_secret: secret, last_verified_at: now, updated_at: now,
  }).eq("platform", "snoonu").eq("account_id", merchantId).eq("status", "connected")
    .select("account_id,status,connected_at,metadata").maybeSingle();
  if (error) throw new Error("Could not rotate the Snoonu webhook secret.");
  return data ? { connection: publicConnection(data), webhookSecret: secret } : null;
}
