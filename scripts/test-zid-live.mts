// Quick live test for the Zid integration.
// Checks: channel record, tokens, live API call to Zid, ingest events from sync.
// Run: npx tsx scripts/test-zid-live.mts

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://itfhekcvmcbntjndvhzg.supabase.co";
const SUPABASE_SERVICE_ROLE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml0Zmhla2N2bWNibnRqbmR2aHpnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTU3NzM2NiwiZXhwIjoyMDk1MTUzMzY2fQ.ybhnVHycW7fPkLBouO_U9O2O13U1Tiw0VGr2SbThXnE";

const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function main() {
  console.log("\n=== 1. Zid channel record ===");
  const { data: channel, error: chErr } = await sb
    .from("ps_merchant_channels")
    .select("id, account_id, platform, status, connected_at, bearer_token, manager_token, webhook_secret, metadata")
    .eq("platform", "zid")
    .order("connected_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (chErr || !channel) {
    console.error("No Zid channel found:", chErr?.message);
    process.exit(1);
  }

  console.log("  status       :", channel.status);
  console.log("  connected_at :", channel.connected_at);
  console.log("  account_id   :", channel.account_id);
  console.log("  store_id     :", (channel.metadata as Record<string,unknown>)?.store_id ?? "(empty)");
  console.log("  _token_keys  :", (channel.metadata as Record<string,unknown>)?._token_keys ?? "(not recorded)");
  console.log("  bearer_token :", channel.bearer_token ? "set ✓" : "MISSING");
  console.log("  manager_token:", channel.manager_token ? "set ✓" : "MISSING");
  console.log("  webhook_secret:", channel.webhook_secret ? "set ✓" : "MISSING");

  console.log("\n=== 2. Live Zid API — fetch products ===");
  const headers: Record<string, string> = {
    Authorization: `Bearer ${channel.bearer_token}`,
    Accept: "application/json",
  };
  if (channel.manager_token) headers["X-MANAGER-TOKEN"] = channel.manager_token;

  const prodRes = await fetch("https://api.zid.sa/v1/products/?page=1&per_page=10", { headers });
  console.log("  HTTP status  :", prodRes.status, prodRes.statusText);

  if (prodRes.ok) {
    const json = await prodRes.json() as { products?: unknown[]; pagination?: unknown };
    const prods = json.products ?? [];
    console.log("  Products returned:", prods.length);
    if (prods.length > 0) {
      const first = prods[0] as Record<string, unknown>;
      console.log("  First product:");
      console.log("    id     :", first.id);
      console.log("    name   :", first.name);
      console.log("    price  :", first.price);
      console.log("    sku    :", first.sku ?? "(none)");
    } else {
      console.log("  (dev store has no products yet — add one to test webhook flow)");
    }
    console.log("  Pagination:", JSON.stringify(json.pagination ?? {}));
  } else {
    const txt = await prodRes.text().catch(() => "");
    console.log("  Error body:", txt.slice(0, 400));
  }

  console.log("\n=== 3. Ingest events from catalog sync ===");
  const { data: events, error: evErr } = await sb
    .from("ps_ingest_events")
    .select("id, sku, item_name_en, current_retail_price, status, source_platform, created_at")
    .eq("account_id", channel.account_id)
    .eq("source_platform", "zid")
    .order("created_at", { ascending: false })
    .limit(10);

  if (evErr) {
    console.log("  Error fetching events:", evErr.message);
  } else if (!events || events.length === 0) {
    console.log("  No ingest events yet — sync may still be running or dev store is empty.");
  } else {
    console.log(`  Found ${events.length} ingest event(s):`);
    for (const e of events) {
      console.log(`    [${e.status}] ${e.sku} — ${e.item_name_en} — price: ${e.current_retail_price}`);
    }
  }

  console.log("\n=== 4. Webhook test (POST to our endpoint) ===");
  const testPayload = {
    event: "product.update",
    store_id: String((channel.metadata as Record<string,unknown>)?.store_id ?? "test-store"),
    data: {
      id: "test-001",
      sku: "TEST-SKU-001",
      name: "Test Product",
      name_ar: "منتج تجريبي",
      price: 50,
      cost_price: 25,
      currency: "QAR",
      quantity: 10,
    },
  };

  const webhookSecret = channel.webhook_secret ?? "";
  const basicAuth = Buffer.from(`prizeskout:${webhookSecret}`).toString("base64");

  const whRes = await fetch("https://prizeskout.qa/api/webhooks/zid", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${basicAuth}`,
    },
    body: JSON.stringify(testPayload),
  });

  console.log("  Webhook HTTP status:", whRes.status);
  const whBody = await whRes.text().catch(() => "");
  console.log("  Webhook response  :", whBody.slice(0, 500));

  console.log("\nDone.\n");
}

main().catch(console.error);
