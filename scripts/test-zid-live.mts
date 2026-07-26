// Read-only live diagnostic for the latest connected Zid store.
// Run: npx tsx --env-file=.env.local scripts/test-zid-live.mts

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !serviceRoleKey) {
  throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set.");
}

const sb = createClient(supabaseUrl, serviceRoleKey);

async function main() {
  const { data: channel, error } = await sb
    .from("ps_merchant_channels")
    .select("id, account_id, status, bearer_token, manager_token, metadata")
    .eq("platform", "zid")
    .order("connected_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !channel) throw new Error(error?.message ?? "No connected Zid channel found.");

  const metadata = channel.metadata as Record<string, unknown> | null;
  const storeId = String(metadata?.store_id ?? "");
  console.log({
    channel_id: channel.id,
    account_id: channel.account_id,
    status: channel.status,
    store_id: storeId || null,
    bearer_token_present: Boolean(channel.bearer_token),
    manager_token_present: Boolean(channel.manager_token),
  });

  const headers: Record<string, string> = {
    Authorization: channel.bearer_token,
    Accept: "application/json",
    "Accept-Language": "en",
    Role: "Manager",
  };
  if (channel.manager_token) {
    headers["Access-Token"] = channel.manager_token;
    headers["X-Manager-Token"] = channel.manager_token;
  }
  if (storeId) headers["Store-Id"] = storeId;

  const response = await fetch("https://api.zid.sa/v1/products/?page=1&page_size=10", { headers });
  const body = await response.text();
  console.log("Zid products response:", response.status, response.statusText);
  if (!response.ok) {
    console.log(body.slice(0, 500));
    process.exitCode = 1;
    return;
  }

  const json = JSON.parse(body) as { results?: unknown[]; count?: number; next?: string | null };
  console.log({
    products_returned: json.results?.length ?? 0,
    total_count: json.count ?? null,
    has_next_page: Boolean(json.next),
  });

  const { count, error: ingestError } = await sb
    .from("ps_ingest_events")
    .select("*", { count: "exact", head: true })
    .eq("account_id", channel.account_id)
    .eq("source_platform", "zid");
  if (ingestError) throw new Error(ingestError.message);
  console.log({ stored_zid_ingest_events: count ?? 0 });
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
