import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { secureAccessCode } from "@/server/onboarding-capability";
import type { Json } from "@/integrations/supabase/types";

export type ZidEmbeddedChannel = {
  id: string;
  account_id: string;
  licensee_id: string;
  merchant_id: string;
  bearer_token: string | null;
  manager_token: string | null;
  status: string;
  connected_at: string | null;
  webhook_registered_at: string | null;
  error_message: string | null;
  metadata: Json;
};

export const metadataObject = (value: Json): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};

export async function resolveZidEmbeddedChannel(token: string): Promise<ZidEmbeddedChannel | null> {
  const { data } = await supabaseAdmin
    .from("ps_merchant_channels")
    .select("id,account_id,licensee_id,merchant_id,bearer_token,manager_token,status,connected_at,webhook_registered_at,error_message,metadata")
    .eq("platform", "zid")
    .eq("status", "connected")
    .contains("metadata", { embedded_token: token })
    .maybeSingle();
  return data as ZidEmbeddedChannel | null;
}

export async function ensureZidAccessCode(channel: ZidEmbeddedChannel): Promise<string> {
  let { data: access } = await supabaseAdmin
    .from("ps_access_codes")
    .select("code")
    .eq("merchant_id", channel.account_id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!access?.code) {
    const metadata = metadataObject(channel.metadata);
    const result = await supabaseAdmin.from("ps_access_codes").insert({
      code: secureAccessCode("SA"),
      merchant_id: channel.account_id,
      store_name: typeof metadata.store_name === "string" ? metadata.store_name : "Zid Store",
    }).select("code").single();
    if (result.error || !result.data?.code) throw result.error ?? new Error("Unable to create embedded merchant access.");
    access = result.data;
  }
  return access.code;
}
