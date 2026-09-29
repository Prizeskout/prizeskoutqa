import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { Json } from "@/integrations/supabase/types";
import { syncPlatformCatalog, type SyncCatalogResult } from "./platform-sync";
import { getValidSallaAccessToken } from "./salla-token";

type SallaSyncChannel = {
  id: string;
  account_id: string;
  licensee_id: string;
  merchant_id: string;
  bearer_token: string | null;
  metadata: Json;
};

function metadataObject(value: Json | null | undefined): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

async function mergeSyncMetadata(channelId: string, values: Record<string, unknown>, errorMessage: string | null): Promise<void> {
  const { data: current } = await supabaseAdmin.from("ps_merchant_channels")
    .select("metadata").eq("id", channelId).maybeSingle();
  const { error } = await supabaseAdmin.from("ps_merchant_channels").update({
    metadata: { ...metadataObject(current?.metadata), ...values } as Json,
    error_message: errorMessage,
    updated_at: new Date().toISOString(),
  }).eq("id", channelId);
  if (error) throw new Error("Unable to persist the Salla catalog sync state.");
}

export async function syncSallaCatalog(channel: SallaSyncChannel): Promise<SyncCatalogResult> {
  const startedAt = new Date().toISOString();
  await mergeSyncMetadata(channel.id, {
    initial_catalog_sync_started_at: startedAt,
    initial_catalog_sync_error: null,
  }, null);
  try {
    const accessToken = await getValidSallaAccessToken(channel);
    const result = await syncPlatformCatalog({
      platform: "salla",
      creds: { bearer_token: accessToken },
      accountId: channel.account_id,
      licenseeId: channel.licensee_id,
      merchantId: channel.merchant_id,
      region: "SA",
    });
    await mergeSyncMetadata(channel.id, {
      initial_catalog_sync_at: new Date().toISOString(),
      initial_catalog_sync_items_found: result.items_found,
      initial_catalog_sync_items_stored: result.items_stored,
      initial_catalog_sync_error: null,
      initial_catalog_sync_failed_at: null,
    }, null);
    return result;
  } catch (error) {
    const message = `Salla catalog sync failed: ${error instanceof Error ? error.message : String(error)}`.slice(0, 400);
    await mergeSyncMetadata(channel.id, {
      initial_catalog_sync_error: message,
      initial_catalog_sync_failed_at: new Date().toISOString(),
    }, message);
    throw new Error(message);
  }
}
