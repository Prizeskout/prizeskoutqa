import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { chromium } from "playwright";
import { dashboardV2DemoModules, dashboardV2DemoSummary } from "../src/server/core/dashboard-v2-demo-data";
import { dashboardV2PlatformDemo } from "../src/server/core/dashboard-v2-platform-demo";

const origin = process.env.DEMO_VERIFY_ORIGIN || "http://127.0.0.1:4185";
const live = Boolean(process.env.DEMO_VERIFY_ORIGIN);
const server = live ? null : spawn(process.execPath, ["node_modules/vite/bin/vite.js", "--host", "127.0.0.1", "--port", "4185", "--strictPort"], { stdio: "pipe" });
let output = "";
server?.stdout?.on("data", x => output += x);
server?.stderr?.on("data", x => output += x);
const screenshots = await mkdtemp(join(tmpdir(), "prizeskout-reference-demo-"));
const browser = await chromium.launch({ headless: true });
try {
  for (let attempt = 0; attempt < 180; attempt++) {
    try { if ((await fetch(origin + "/access")).ok) break; } catch {}
    if(attempt === 179) throw new Error(output);
    await new Promise(r => setTimeout(r, 500));
  }
  for (const width of [1440, 390, 375, 844]) {
    const page = await browser.newPage({ viewport: { width, height: width === 844 ? 390 : 1100 }, reducedMotion: "reduce" });
    const errors: string[] = [];
    const writes: string[] = [];
    page.on("pageerror", e => errors.push(e.message));
    page.on("request", r => { if(r.url().includes("/api/") && r.method() !== "GET") writes.push(r.url()); });
    if(!live) {
      await page.route("**/api/dashboard/v2/summary?*", r => r.fulfill({ json: { ok: true, summary: dashboardV2DemoSummary } }));
      await page.route("**/api/dashboard/v2/modules?*", r => r.fulfill({ json: { ok: true, ...dashboardV2DemoModules, platform_demo: dashboardV2PlatformDemo } }));
      await page.route("**/api/dashboard/v2/context", r => r.fulfill({ json: { ok: true, context: { state: "available", merchant_label: "Naija Restaurant", brand_label: "All brands", location_label: "Qatar · 12", channel_label: "All channels", currency: "QAR", brands: [], branches: [], channels: [], blockers: [], role_label: "General manager", demo_mode: true } } }));
    }
    await page.addInitScript(({merchant, code}) => {localStorage.setItem("ps_connected", "true");localStorage.setItem("ps_merchant_id", merchant);localStorage.setItem("ps_access_code", code);}, {merchant: live ? process.env.DEMO_MERCHANT_ID! : "fixture", code: live ? process.env.DEMO_ACCESS_CODE! : "fixture"});
    for (const path of ["order-automation", "promotions"]) {
      await page.goto(`${origin}/dashboard/${path}`, { waitUntil: "domcontentloaded" });
      await page.locator(".ps-reference-demo").waitFor({ timeout: 120000 });
      await page.evaluate(() => document.fonts.ready);
      const text = await page.locator(".ps-reference-demo").innerText();
      const expected = path === "order-automation" ? ["92.4", "1,389", "Keeta order #K-49210", "QAR 214", "POS sync retrying", "38,940", "99.2%", "QAR 2,180 lost this week", "Auto-accept standard orders"] : ["28,600", "231.4K", "42,840", "31,260", "Weekend 25% Off", "7,280", "14,180", "−1,260", "26,285", "32.8%", "Minimum contribution margin", "61", "BOGO Shawarma on Talabat lost QAR 1,260"];
      for(const label of expected) assert.ok(text.includes(label), `${width} ${path}: missing ${label}`);
      assert.ok(!/Not available|Not calculated|Not loaded/.test(text), `${path}: leftover placeholder`);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      assert.ok(overflow <= 1, `${width} ${path}: page overflow ${overflow}`);
      await page.screenshot({ path: join(screenshots, `${path}-${width}.png`), fullPage: true });
      if(width === 1440) {
        if(path === "order-automation") {
          await page.getByRole("button", {name: /Inventory guard.*612/}).click();
          await page.getByText("Editing rule 3", {exact:true}).waitFor();
          await page.getByRole("button", {name:"What caused today's 9 SLA breaches?", exact:true}).click();
          await page.getByText("All 9 breaches came from manual-review queues.", {exact:true}).waitFor();
          await page.getByRole("button", {name:"Accept", exact:true}).click();
          await page.getByText("Preview only — no order was changed.", {exact:true}).waitFor();
        } else {
          await page.getByRole("button", {name:"At risk", exact:true}).click();
          assert.equal(await page.getByRole("button", {name:/^Free delivery over/}).count(), 0);
          await page.getByRole("button", {name:"All", exact:true}).click();
          await page.getByRole("button", {name:/^BOGO Shawarma Daily/}).click();
          await page.getByText("Pause campaign", {exact:true}).waitFor();
          const previousProjection = await page.locator("#simulator").innerText();
          await page.getByRole("slider", {name:"Discount", exact:true}).fill("15");
          assert.notEqual(await page.locator("#simulator").innerText(), previousProjection);
          await page.getByRole("button", {name:"Request approval", exact:true}).click();
          await page.getByText("Preview only — no approval request was sent.", {exact:true}).waitFor();
        }
      }
    }
    const platformRoutes: Record<string, string[]> = {
      "priority-centre": ["6 items need a decision today", "QAR 41,280", "Talabat settlement discrepancy"],
      "store-manager": ["Keeps every branch live", "214", "Paused Mixed Grill Platter"],
      "profit-intelligence": ["QAR 795,420 true contribution", "43.2%", "Contribution by brand"],
      "margin-leakage": ["QAR 41,280 of margin at risk", "QAR 27,450", "Weekend 25% Off over-funded"],
      "menu-intelligence": ["6 items are underpriced", "+QAR 7,420", "Chicken Shawarma"],
      orders: ["22,252 orders this month", "3.1%", "#PS-84217"],
      branches: ["Al Sadd needs attention", "West Bay 22.4%", "Branch comparison"],
      channels: ["Revenue is not profit", "Talabat QAR 396K", "Snoonu 21.8%"],
      settlements: ["QAR 8,940 unexplained", "38 / 41", "SN-29401"],
      reports: ["Reports that write themselves", "Weekly margin bridge", "Month-end reconciliation pack"],
      integrations: ["5 systems connected", "QNB bank feed", "Oracle MICROS"],
      "api-developers": ["Build on PrizeSkout", "182,400", "settlement.variance_detected"],
      settings: ["How PrizeSkout calculates your numbers", "Asia/Qatar", "Include packaging in COGS"],
      "store-access": ["Who can see and do what", "Sara Al-Mansoori", "Role permissions"],
      "audit-log": ["Every number, decision and change", "4,812", "EV-91032"],
    };
    for (const [path, expected] of Object.entries(platformRoutes)) {
      await page.goto(`${origin}/dashboard/${path}`, { waitUntil: "domcontentloaded" });
      await page.locator(".ps-platform-demo").waitFor({ timeout: 120000 });
      const text = await page.locator(".ps-platform-demo").innerText();
      for (const label of expected) assert.ok(text.includes(label), `${width} ${path}: missing ${label}`);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      assert.ok(overflow <= 1, `${width} ${path}: page overflow ${overflow}`);
      if (width === 1440 || width === 390) {
        await page.screenshot({ path: join(screenshots, `${path}-${width}.png`), fullPage: true });
      }
      if (width === 1440) {
        const firstRow = page.locator(".ps-platform-data-row").first();
        if (await firstRow.count()) {
          await firstRow.click();
          await page.locator(".ps-platform-drawer").waitFor();
          await page.locator(".ps-platform-drawer").getByRole("button", { name: "Close details" }).click();
        }
      }
    }
    assert.deepEqual(errors, [], `browser errors at ${width}`);
    assert.deepEqual(writes, [], "Demo controls must never call write APIs");
    await page.close();
  }
  console.log(`Reference demo checks passed (1440, 390, 375, 844): exact key values, complete sections, interactions, no API writes or page errors. Screenshots: ${screenshots}`);
} finally { await browser.close(); server?.kill(); }
