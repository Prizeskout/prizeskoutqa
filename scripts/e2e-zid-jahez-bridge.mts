import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";
import { chromium } from "playwright";

const baseUrl = process.env.E2E_BASE_URL ?? "http://127.0.0.1:4177";
const supabaseUrl = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
assert(supabaseUrl && serviceKey, "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required");

const admin = createClient(supabaseUrl, serviceKey);
const { data: access, error: accessError } = await admin
  .from("ps_access_codes")
  .select("merchant_id,code")
  .limit(1)
  .maybeSingle();
assert(!accessError && access?.merchant_id && access.code, "A merchant access code is required for the bridge E2E test");

const accountId = access.merchant_id;
const { data: original, error: originalError } = await admin
  .from("ps_zid_jahez_bridge_settings")
  .select("*")
  .eq("account_id", accountId)
  .maybeSingle();
assert(!originalError, `Bridge migration is unavailable: ${originalError?.message}`);

let eventId: string | null = null;
const post = async (body: Record<string, unknown>) => {
  const response = await fetch(`${baseUrl}/api/channels/connect`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ merchant_id: accountId, access_code: access.code, platform: "zid_jahez_bridge", ...body }),
  });
  return { response, body: await response.json() as Record<string, any> };
};

try {
  const invalid = await post({
    action: "save",
    mazeed_active: false,
    jahez_active: true,
    mazeed_commission_pct: 15,
    vat_mode: "store_includes_vat",
    eligible_skus: ["E2E-BRIDGE-SKU"],
    confirmed_by: "E2E verifier",
  });
  assert.equal(invalid.response.status, 400, "Jahez must not activate without Mazeed");

  const saved = await post({
    action: "save",
    mazeed_active: true,
    jahez_active: true,
    mazeed_commission_pct: 15,
    vat_mode: "store_includes_vat",
    eligible_skus: [" e2e-bridge-sku ", "E2E-BRIDGE-SKU"],
    confirmed_by: "E2E verifier",
  });
  assert.equal(saved.response.status, 200, saved.body.error ?? "Bridge settings save failed");
  assert.deepEqual(saved.body.settings.eligible_skus, ["E2E-BRIDGE-SKU"], "SKUs were not normalized and deduplicated");

  const { data: event, error: eventError } = await admin
    .from("ps_channel_propagation_events")
    .insert({
      account_id: accountId,
      ingest_event_id: null,
      sku: "E2E-BRIDGE-SKU",
      source_channel: "zid",
      target_channel: "jahez_via_mazeed",
      expected_price: 83.25,
      status: "pending",
      evidence: { test: true, zid_live_price: 83.25 },
    })
    .select("id")
    .single();
  assert(!eventError && event?.id, `Could not create propagation record: ${eventError?.message}`);
  eventId = event.id;

  const before = await post({ action: "get" });
  assert.equal(before.response.status, 200, before.body.error ?? "Bridge settings read failed");
  assert(before.body.events.some((item: { id: string; status: string }) => item.id === eventId && item.status === "pending"), "Pending propagation was not listed");

  const confirmed = await post({ action: "confirm_propagation", id: eventId, observed_price: "83.25", verified_by: "E2E verifier" });
  assert.equal(confirmed.response.status, 200, confirmed.body.error ?? "Propagation confirmation failed");
  assert.equal(confirmed.body.event.status, "confirmed", "Matching Jahez price was not confirmed");
  assert.equal(confirmed.body.event.evidence.verification_method, "manual_fallback");

  console.log("Zid–Mazeed–Jahez database and authenticated API lifecycle passed.");
} finally {
  if (eventId) await admin.from("ps_channel_propagation_events").delete().eq("id", eventId);
  if (original) {
    await admin.from("ps_zid_jahez_bridge_settings").upsert(original, { onConflict: "account_id" });
  } else {
    await admin.from("ps_zid_jahez_bridge_settings").delete().eq("account_id", accountId);
  }
}

const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const pageErrors: string[] = [];
  page.on("pageerror", error => pageErrors.push(error.message));
  await page.addInitScript(({ merchantId, code }) => {
    localStorage.setItem("ps_merchant_id", merchantId);
    localStorage.setItem("ps_access_code", code);
    localStorage.setItem("ps_connected", "1");
    localStorage.setItem("ps_tour_v1_done", "1");
  }, { merchantId: accountId, code: access.code });
  const response = await page.goto(`${baseUrl}/dashboard/revenue-hub`, { waitUntil: "domcontentloaded", timeout: 60_000 });
  assert(!response || response.status() < 500, `Dashboard returned ${response?.status()}`);
  const pricingTab = page.getByRole("button", { name: "Channel Pricing", exact: true });
  await pricingTab.waitFor({ timeout: 30_000 });
  await page.waitForTimeout(2_000);
  await pricingTab.click();
  try {
    await page.getByText("Mazeed is active in Zid", { exact: true }).waitFor({ timeout: 30_000 });
  } catch (error) {
    console.error((await page.locator("body").innerText()).slice(-4_000));
    throw error;
  }
  assert.deepEqual(pageErrors, [], `Dashboard page errors: ${pageErrors.join("; ")}`);
  console.log("Authenticated channel-pricing UI rendered without page errors.");
} finally {
  await browser.close();
}
