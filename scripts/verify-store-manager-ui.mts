import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { chromium } from "playwright";
import { createClient } from "@supabase/supabase-js";

const baseUrl = process.env.E2E_BASE_URL ?? "http://127.0.0.1:4177";
const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
assert(url && key, "Supabase server credentials are required.");

const admin = createClient(url, key);
const { data: codes } = await admin.from("ps_access_codes").select("merchant_id,code").limit(1);
const access = codes?.[0];
assert(access?.code, "A merchant access code is required.");

const screenshotDir = resolve("output/dashboard-review");
await mkdir(screenshotDir, { recursive: true });
const browser = await chromium.launch({ headless: true });

try {
  for (const viewport of [{ width: 1440, height: 1000 }, { width: 390, height: 844 }]) {
    const page = await browser.newPage({ viewport });
    await page.goto(`${baseUrl}/dashboard/revenue-hub`, { waitUntil: "domcontentloaded" });
    await page.evaluate(({ merchantId, code }) => {
      localStorage.setItem("ps_merchant_id", merchantId);
      localStorage.setItem("ps_access_code", code);
      localStorage.setItem("ps_connected", "1");
      localStorage.setItem("ps_tour_v1_done", "1");
      localStorage.setItem("ps-db-theme", "light");
    }, { merchantId: access.merchant_id, code: access.code });
    await page.reload({ waitUntil: "networkidle", timeout: 60_000 });

    await page.getByRole("heading", { name: "Overview", exact: true }).waitFor({ timeout: 30_000 });
    assert.equal(await page.getByLabel("CFO Copilot and Shop Manager").count(), 0, "Overview must stay focused on financial KPIs");
    await page.screenshot({
      path: resolve(screenshotDir, viewport.width > 600 ? "overview-desktop.png" : "overview-mobile.png"),
      fullPage: true,
    });

    if (viewport.width > 600) {
      await page.getByRole("button", { name: "Margin Intelligence", exact: true }).click();
      await page.getByRole("heading", { name: "True Margin Intelligence", exact: true }).waitFor();
      assert.equal(await page.getByRole("heading", { name: "Check Your Platform Payout", exact: true }).count(), 0);
      await page.screenshot({ path: resolve(screenshotDir, "margin-desktop.png"), fullPage: true });

      await page.getByRole("button", { name: "Payout Recovery", exact: true }).click();
      await page.getByRole("heading", { name: "Check Your Platform Payout", exact: true }).waitFor();
      await page.screenshot({ path: resolve(screenshotDir, "recovery-desktop.png"), fullPage: true });

      await page.getByRole("button", { name: "AI Store Manager", exact: true }).click();
      await page.getByRole("heading", { name: "Automate store operations with oversight", exact: true }).waitFor({ timeout: 20_000 });
      await page.screenshot({ path: resolve(screenshotDir, "manager-desktop.png"), fullPage: true });

      await page.getByRole("button", { name: "Promotion Simulator", exact: true }).click();
      await page.getByText(/Promotion Profitability Control|Simulate impact before you spend/, { exact: true }).waitFor({ timeout: 15_000 });
      await page.waitForTimeout(500);
      await page.screenshot({ path: resolve(screenshotDir, "promotion-desktop.png"), fullPage: true });

      await page.getByRole("button", { name: "CFO Copilot", exact: true }).click();
      await page.getByRole("heading", { name: "CFO Copilot", exact: true }).last().waitFor({ timeout: 15_000 });
      await page.waitForTimeout(500);
      await page.screenshot({ path: resolve(screenshotDir, "copilot-desktop.png"), fullPage: true });

      await page.getByRole("button", { name: "Evidence & History", exact: true }).click();
      await page.getByRole("heading", { name: "Evidence Inbox", exact: true }).waitFor({ timeout: 20_000 });
      await page.getByRole("heading", { name: "Evidence Library", exact: true }).waitFor({ timeout: 20_000 });

      await page.getByRole("button", { name: "Integrations", exact: true }).click();
      await page.getByText("Zid", { exact: true }).first().waitFor();
      await page.getByText("Salla", { exact: true }).first().waitFor();
    } else {
      await page.getByRole("button", { name: "Open navigation" }).click();
      await page.getByRole("button", { name: "AI Store Manager", exact: true }).last().click();
      await page.getByRole("heading", { name: "Automate store operations with oversight", exact: true }).waitFor({ timeout: 20_000 });
    }

    await page.screenshot({
      path: resolve(screenshotDir, viewport.width > 600 ? "integrations-desktop.png" : "manager-mobile.png"),
      fullPage: true,
    });
    await page.close();
  }

  console.log("PASS unified dashboard navigation, evidence workspace, Zid/Salla visibility, assistant, and responsive shell");
} finally {
  await browser.close();
}
