// aggregator-push.ts — Push price updates to delivery aggregators using
// merchant-owned BYOK credentials stored in ps_merchant_channels.

import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { JAHEZ_BASE } from "./byok-connect";
import { getValidTalabatAccessToken, updateTalabatPrice } from "./talabat-client";

type PushResult = {
  ok: boolean;
  platform: string;
  jobId?: string;
  message?: string;
};

// ── Helpers ───────────────────────────────────────────────────────────────────

async function getChannel(merchantId: string, platform: string) {
  const { data } = await supabaseAdmin
    .from("ps_merchant_channels")
    .select("id,account_id,licensee_id,merchant_id,bearer_token,manager_token,metadata,status")
    .eq("account_id", merchantId)
    .eq("platform", platform)
    .eq("status", "connected")
    .maybeSingle();
  return data;
}

// ── Talabat ───────────────────────────────────────────────────────────────────
// Price update: PUT /v2/chains/{chain_id}/vendors/{vendor_id}/catalog
// Returns a job_id (async); job_status will be QUEUED then COMPLETED.

async function getTalabatToken(channel: {
  id: string;
  manager_token: string | null;
  bearer_token: string | null;
  metadata: Record<string, unknown> | null;
}): Promise<string | null> {
  return (await getValidTalabatAccessToken(channel)).accessToken;
}

export async function pushTalabatPrice(
  merchantId: string,
  items: Array<{ sku: string; price: number; active?: boolean }>,
): Promise<PushResult> {
  const channel = await getChannel(merchantId, "talabat");
  if (!channel) return { ok: false, platform: "talabat", message: "Talabat not connected" };

  const meta = channel.metadata as Record<string, string> | null;
  const chainId  = meta?.chain_id;
  const vendorId = meta?.vendor_id;
  if (!chainId || !vendorId) return { ok: false, platform: "talabat", message: "Vendor/chain IDs missing" };

  const token = await getTalabatToken({
    ...channel,
    metadata: channel.metadata as Record<string, unknown> | null,
  });
  if (!token) return { ok: false, platform: "talabat", message: "Token exchange failed" };

  let lastJobId:string|undefined;
  for(const item of items){
    const result=await updateTalabatPrice({
      chainId,vendorId,sku:item.sku,newPrice:item.price,accessToken:token,
      environment:meta?.environment==="sandbox"?"sandbox":"production",
      tracking:{channelId:channel.id,accountId:channel.account_id,licenseeId:channel.licensee_id,merchantId:channel.merchant_id},
    });
    if(!result.ok)return {ok:false,platform:"talabat",message:result.message??`HTTP ${result.httpStatus}`};
    lastJobId=(result.data as {job_id?:string}|undefined)?.job_id;
  }
  return {ok:true,platform:"talabat",jobId:lastJobId};
}

// ── Jahez ─────────────────────────────────────────────────────────────────────
// Token from stored access_token; endpoint: /api/v2.0/vendor/products/{id}/price

export async function pushJahezPrice(
  merchantId: string,
  items: Array<{ productId: string; price: number }>,
): Promise<PushResult> {
  const channel = await getChannel(merchantId, "jahez");
  if (!channel) return { ok: false, platform: "jahez", message: "Jahez not connected" };

  const meta = channel.metadata as Record<string, string> | null;
  const token    = meta?.access_token;
  const branchId = meta?.branch_id;
  if (!token || !branchId) return { ok: false, platform: "jahez", message: "Missing token or branch ID" };

  const results = await Promise.all(
    items.map(async ({ productId, price }) => {
      const res = await fetch(
        `${JAHEZ_BASE}/api/v2.0/vendor/products/${productId}/price`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ price, branch_id: branchId }),
        },
      ).catch(() => null);
      return res?.ok ?? false;
    }),
  );

  const allOk = results.every(Boolean);
  return {
    ok: allOk,
    platform: "jahez",
    message: allOk ? undefined : "Some price updates failed",
  };
}

// ── Unified push ──────────────────────────────────────────────────────────────
// Called by the pricing engine after a margin calculation decides a price change.

export async function pushPriceToAllConnected(
  merchantId: string,
  updates: Array<{ sku: string; price: number }>,
): Promise<PushResult[]> {
  const results = await Promise.allSettled([
    pushTalabatPrice(merchantId, updates),
    // Jahez uses product IDs not SKUs — map when we have the catalog
    // pushJahezPrice(merchantId, ...),
  ]);

  return results.map((r) =>
    r.status === "fulfilled" ? r.value : { ok: false, platform: "unknown", message: String(r.reason) },
  );
}
