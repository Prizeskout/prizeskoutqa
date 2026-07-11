// Patches the Zid channel record with the real store ID from the Zid dashboard.
// Run: npx tsx scripts/patch-zid-store-id.mts

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://itfhekcvmcbntjndvhzg.supabase.co";
const SUPABASE_SERVICE_ROLE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml0Zmhla2N2bWNibnRqbmR2aHpnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTU3NzM2NiwiZXhwIjoyMDk1MTUzMzY2fQ.ybhnVHycW7fPkLBouO_U9O2O13U1Tiw0VGr2SbThXnE";

const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const REAL_STORE_ID = "3181397";

async function main() {
  const { data: channel } = await sb
    .from("ps_merchant_channels")
    .select("id, metadata")
    .eq("platform", "zid")
    .order("connected_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!channel) { console.error("No Zid channel found."); process.exit(1); }

  const { error } = await sb
    .from("ps_merchant_channels")
    .update({
      metadata: { ...(channel.metadata as object), store_id: REAL_STORE_ID },
    })
    .eq("id", channel.id);

  if (error) {
    console.error("Update failed:", error.message);
  } else {
    console.log(`store_id patched to ${REAL_STORE_ID} on channel ${channel.id}`);
  }
}

main().catch(console.error);
