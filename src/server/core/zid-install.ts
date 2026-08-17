import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { Json } from "@/integrations/supabase/types";

export type ZidTenant = { accountId: string; licenseeId: string; merchantId: string };

export async function resolveZidTenant(storeId: string, preferredMerchantId?: string): Promise<ZidTenant> {
  const { data: matches, error: matchError } = await supabaseAdmin
    .from("ps_merchant_channels")
    .select("account_id,licensee_id,merchant_id,updated_at")
    .eq("platform", "zid")
    .contains("metadata", { store_id: storeId })
    .order("updated_at", { ascending: false })
    .limit(1);
  if (matchError) throw matchError;
  const existing = matches?.[0];
  if (existing) return { accountId: existing.account_id, licenseeId: existing.licensee_id, merchantId: existing.merchant_id };

  if (preferredMerchantId && preferredMerchantId !== "marketplace") {
    return { accountId: preferredMerchantId, licenseeId: preferredMerchantId, merchantId: preferredMerchantId };
  }

  const slug = `zid-${storeId.toLowerCase().replace(/[^a-z0-9-]/g, "-").slice(0, 48)}`;
  const { data: licensee, error: licenseeError } = await supabaseAdmin
    .from("licensees")
    .upsert({ name: `Zid Store ${storeId}`, slug, status: "active", metadata: { platform: "zid", zid_store_id: storeId } as Json }, { onConflict: "slug" })
    .select("id").single();
  if (licenseeError || !licensee) throw licenseeError ?? new Error("Unable to provision Zid licensee");

  const { data: account, error: accountError } = await supabaseAdmin
    .from("accounts_v2")
    .upsert({ licensee_id: licensee.id, name: `Zid Store ${storeId}`, slug: "main", region: "SA", currency: "SAR", is_default: true, metadata: { platform: "zid", zid_store_id: storeId } as Json }, { onConflict: "licensee_id,slug" })
    .select("id,licensee_id").single();
  if (accountError || !account) throw accountError ?? new Error("Unable to provision Zid account");
  return { accountId: account.id, licenseeId: account.licensee_id, merchantId: account.id };
}
