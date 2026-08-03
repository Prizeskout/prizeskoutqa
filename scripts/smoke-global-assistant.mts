import { chromium } from "playwright";
import { createClient } from "@supabase/supabase-js";

const baseUrl = process.env.E2E_BASE_URL ?? "http://127.0.0.1:4177";
const supabaseUrl = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !serviceKey) throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required");
const admin = createClient(supabaseUrl, serviceKey);
const { data: decision } = await admin
  .from("ps_decide_results")
  .select("account_id")
  .order("created_at", { ascending: false })
  .limit(1)
  .maybeSingle();
if (!decision?.account_id) throw new Error("No merchant dashboard data is available");
const { data: access } = await admin
  .from("ps_access_codes")
  .select("merchant_id,code")
  .eq("merchant_id", decision.account_id)
  .limit(1)
  .maybeSingle();
if (!access?.code) throw new Error("No dashboard access code is available");
const browser = await chromium.launch({ headless: true });

try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  await page.addInitScript(({ merchantId, accessCode }) => {
    localStorage.setItem("ps_merchant_id", merchantId);
    localStorage.setItem("ps_access_code", accessCode);
  }, { merchantId: access.merchant_id, accessCode: access.code });
  await page.goto(`${baseUrl}/dashboard/revenue-hub`, { waitUntil: "domcontentloaded" });
  const launcher = page.getByRole("button", {
    name: "Open CFO Copilot and Store Assistant",
  });
  await launcher.waitFor({ state: "visible", timeout: 15_000 });
  await page.waitForTimeout(2_000);
  await launcher.click();
  await page
    .getByRole("dialog", { name: "CFO Copilot and Store Assistant" })
    .waitFor({ state: "visible" });
  await page
    .getByRole("heading", { name: "CFO Copilot & Store Assistant" })
    .waitFor({ state: "visible" });
  await page.getByRole("button", { name: "Close assistant" }).click();
  await launcher.waitFor({ state: "visible" });
  console.log("PASS global assistant launcher opens and closes the in-app drawer");
} finally {
  await browser.close();
}
