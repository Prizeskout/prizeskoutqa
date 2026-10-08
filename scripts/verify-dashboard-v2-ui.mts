import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { chromium } from "playwright";

const port = 4183;
const origin = `http://127.0.0.1:${port}`;
const screenshots = await mkdtemp(join(tmpdir(), "prizeskout-dashboard-v2-"));
const server = spawn(process.execPath, ["node_modules/vite/bin/vite.js", "--host", "127.0.0.1", "--port", String(port), "--strictPort"], {
  cwd: process.cwd(),
  env: { ...process.env },
  stdio: ["ignore", "pipe", "pipe"],
});
let serverOutput = "";
server.stdout.on("data", (chunk) => { serverOutput += String(chunk); });
server.stderr.on("data", (chunk) => { serverOutput += String(chunk); });

async function waitForServer() {
  const deadline = Date.now() + 180_000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${origin}/dashboard`);
      if (response.ok) return;
    } catch {
      // Vite may still be starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`Dashboard V2 dev server did not become ready.\n${serverOutput}`);
}

const truth = (key: string) => ({ key, status: "verified", record_count: 2, strongest_evidence: "strong", observed_through: null, effective_from: null, effective_to: null, currencies: ["QAR"], provenance: ["fixture"], blockers: [] });
const fixture = {
  version: "dashboard-v2-summary-v1",
  generated_at: "2026-10-04T12:00:00.000Z",
  scope: { account_id: "acct", merchant_id: "acct", period_start: "2026-09-05T00:00:00.000Z", period_end: "2026-10-04T12:00:00.000Z", days: 30 },
  currency_integrity: { currencies: ["QAR"], mixed: false },
  metrics: {
    state: "available", currency: "QAR", gross_sales: 1840000, net_revenue: 1700000, orders: 22252, true_contribution: 795420, contribution_margin_pct: 46.8, settlement_variance: -20, recoverable_margin: 20, source: "economic-twin", blockers: [],
    cost_coverage: { orders_total: 22252, orders_complete: 22252, pct: 100, complete: true },
    profit_bridge: [{ key: "gross_sales", label: "Gross sales", amount: 1840000, kind: "total" }, { key: "contribution", label: "True contribution", amount: 795420, kind: "result" }],
    by_channel: [{ channel: "talabat", gross_sales: 450000, revenue: 396000, orders: 4980, fees: 88000, discounts: 62000, product_cost: 110900, contribution: 285100, margin_pct: 72 }],
    by_sku: [{ sku: "NR-ZOBO", gross_sales: 140, revenue: 120, orders: 5, fees: 20, discounts: 20, product_cost: 35, contribution: 65, margin_pct: 54.17 }, { sku: "NR-LOSS", gross_sales: 70, revenue: 55, orders: 2, fees: 10, discounts: 15, product_cost: 50, contribution: -5, margin_pct: -9.09 }],
    branch_performance: { state: "available", ranked: true, identified_orders: 22252, unassigned_orders: 0, blockers: [], rows: [{ branch: "west-bay", gross_sales: 950000, revenue: 860000, orders: 11200, fees: 120000, discounts: 70000, product_cost: 420000, contribution: 440000, margin_pct: 51.2 }, { branch: "lusail", gross_sales: 890000, revenue: 840000, orders: 11052, fees: 115000, discounts: 65000, product_cost: 489580, contribution: 350420, margin_pct: 41.7 }] },
  },
  reconciliation: { state: "unallocated", finding_id: "finding-batch", conclusion: "unallocated_batch_difference", label: "Unallocated batch difference", currency: "QAR", expected_amount: 1000, reported_amount: 980, variance: -20, allocation_scope: "batch", order_external_id: null, settlement_reference: "BATCH-7", evidence_strength: "strong", recoverability: "review_required", claims_ready_amount: null, explanation: "The payout differs at batch level but cannot be assigned to an order.", blockers: [], created_at: "2026-10-04T10:00:00.000Z" },
  comparison: { state: "available", previous_period_start: "2026-08-06T00:00:00.000Z", previous_period_end: "2026-09-04T23:59:59.999Z", movements: [{ key: "gross_sales", label: "Gross sales", current: 1840000, previous: 1700000, change: 140000, change_pct: 8.24, unit: "money" }], summary: "Gross sales increased by 8.2% versus the previous 30-day period.", blockers: [] },
  priority_decisions: { state: "available", blockers: [], items: [{ id: "finding:finding-batch", rank: 1, title: "Allocate batch difference to order evidence", state: "evidence_required", amount: null, currency: "QAR", evidence_strength: "strong", finding_id: "finding-batch", recovery_case_id: null, reference: "Batch BATCH-7", next_safe_action: "Add order-level evidence before preparing any claim.", approval_required: false, blockers: [] }] },
  truths: { orders: truth("orders"), contract: truth("contract"), payout: truth("payout"), receipt: truth("receipt") },
  conclusion: { state: "ready_for_reconciliation", title: "Required evidence is ready.", detail: "Evidence is ready.", next_action: "Review the governed result." },
  latest_finding: null,
};

fixture.metrics.by_channel.push(
  { channel: "direct-pos", gross_sales: 690000, revenue: 690000, orders: 9860, fees: 13110, discounts: 0, product_cost: 426890, contribution: 250000, margin_pct: 36.2 },
  { channel: "snoonu", gross_sales: 284000, revenue: 284000, orders: 3412, fees: 51688, discounts: 21400, product_cost: 92812, contribution: 118100, margin_pct: 41.6 },
  { channel: "keeta", gross_sales: 187000, revenue: 187000, orders: 2310, fees: 30855, discounts: 18900, product_cost: 68445, contribution: 68800, margin_pct: 36.8 },
  { channel: "jahez", gross_sales: 143000, revenue: 143000, orders: 1690, fees: 25454, discounts: 9600, product_cost: 34526, contribution: 73420, margin_pct: 51.3 },
);
fixture.metrics.branch_performance.rows = [
  { branch: "west-bay", gross_sales: 350000, revenue: 350000, orders: 4500, fees: 0, discounts: 0, product_cost: 181800, contribution: 168200, margin_pct: 48.1 },
  { branch: "the-pearl", gross_sales: 310000, revenue: 310000, orders: 4100, fees: 0, discounts: 0, product_cost: 177600, contribution: 132400, margin_pct: 42.7 },
  { branch: "msheireb", gross_sales: 260000, revenue: 260000, orders: 3600, fees: 0, discounts: 0, product_cost: 163700, contribution: 96300, margin_pct: 37.0 },
  { branch: "lusail", gross_sales: 300000, revenue: 300000, orders: 3900, fees: 0, discounts: 0, product_cost: 181100, contribution: 118900, margin_pct: 39.6 },
  { branch: "al-wakra", gross_sales: 220000, revenue: 220000, orders: 2900, fees: 0, discounts: 0, product_cost: 145900, contribution: 74100, margin_pct: 33.7 },
  { branch: "al-sadd", gross_sales: 260000, revenue: 260000, orders: 3252, fees: 0, discounts: 0, product_cost: 54480, contribution: 205520, margin_pct: 79.0 },
];
fixture.metrics.branch_performance.identified_orders = 22252;
fixture.priority_decisions.items.push(
  { id: "finding:fixture-2", rank: 2, title: "Review retained commission evidence", state: "evidence_required", amount: null, currency: "QAR", evidence_strength: "moderate", finding_id: "fixture-2", recovery_case_id: null, reference: "Retained finding fixture-2", next_safe_action: "Review the applicable agreement before attributing the difference.", approval_required: false, blockers: ["Applicable contract term is not yet proven."] },
  { id: "finding:fixture-3", rank: 3, title: "Confirm refund evidence", state: "evidence_required", amount: null, currency: "QAR", evidence_strength: "moderate", finding_id: "fixture-3", recovery_case_id: null, reference: "Retained finding fixture-3", next_safe_action: "Match the refund record to order-level evidence.", approval_required: false, blockers: ["Order allocation is incomplete."] },
  { id: "finding:fixture-4", rank: 4, title: "Resolve channel price evidence", state: "evidence_required", amount: null, currency: "QAR", evidence_strength: "weak", finding_id: "fixture-4", recovery_case_id: null, reference: "Retained finding fixture-4", next_safe_action: "Add approved price evidence before simulating a change.", approval_required: false, blockers: ["Approved price evidence is missing."] },
);

const modulesFixture = {
  order_automation: {
    state: "available", source_status: "active", observed_through: "2026-10-04T12:00:00.000Z", received: 7, live: 5, attention: 4, critical: 2, automation_rate_pct: null,
    blockers: ["Automation rate is not derived because retained orders do not prove whether acceptance was automated or manual."],
    orders: [
      { id: "o1", external_order_id: "S-30100", branch: "West Bay", channel: "Snoonu", status: "synced", risk_level: "normal", currency: "QAR", order_total: 58, placed_at: "2026-10-04T11:47:00.000Z" },
      { id: "o2", external_order_id: "T-88137", branch: "Al Sadd", channel: "Talabat", status: "synced", risk_level: "normal", currency: "QAR", order_total: 99, placed_at: "2026-10-04T11:47:00.000Z" },
      { id: "o3", external_order_id: "K-49174", branch: "Al Wakra", channel: "Keeta", status: "held", risk_level: "critical", currency: "QAR", order_total: 140, placed_at: "2026-10-04T11:46:00.000Z" },
      { id: "o4", external_order_id: "J-11211", branch: "Msheireb", channel: "Jahez", status: "applying_rule", risk_level: "attention", currency: "QAR", order_total: 181, placed_at: "2026-10-04T11:45:00.000Z" },
      { id: "o5", external_order_id: "T-88248", branch: "Lusail", channel: "Talabat", status: "checking_stock", risk_level: "manager", currency: "QAR", order_total: 222, placed_at: "2026-10-04T11:44:00.000Z" },
      { id: "o6", external_order_id: "S-30285", branch: "The Pearl", channel: "Snoonu", status: "validating", risk_level: "critical", currency: "QAR", order_total: 73, placed_at: "2026-10-04T11:43:00.000Z" },
      { id: "o7", external_order_id: "S-30322", branch: "West Bay", channel: "Snoonu", status: "received", risk_level: "normal", currency: "QAR", order_total: 114, placed_at: "2026-10-04T11:42:00.000Z" },
    ],
    branches: [
      { branch: "West Bay", received: 2, live: 1, attention: 0, critical: 0 }, { branch: "The Pearl", received: 1, live: 1, attention: 1, critical: 1 },
      { branch: "Lusail", received: 1, live: 1, attention: 1, critical: 0 }, { branch: "Al Wakra", received: 1, live: 1, attention: 1, critical: 1 },
      { branch: "Msheireb", received: 1, live: 1, attention: 1, critical: 0 }, { branch: "Al Sadd", received: 1, live: 0, attention: 0, critical: 0 },
    ],
  },
  promotions: {
    state: "available", observed_through: "2026-10-04T12:00:00.000Z",
    scenarios: [
      { id: "p1", name: "Weekend 25% Off", platform: "Talabat", status: "pending_approval", inputs: { branch: "4 branches", discount: "25%" }, results: {}, created_at: "2026-09-12T10:00:00.000Z", evidence_ready: false },
      { id: "p2", name: "Free delivery over QAR 80", platform: "Snoonu", status: "running", inputs: { branch: "All 12", discount: "Delivery" }, results: {}, created_at: "2026-08-01T10:00:00.000Z", evidence_ready: false },
      { id: "p3", name: "Lunch Combo 20%", platform: "Keeta", status: "running", inputs: { branch: "6 branches", discount: "20%" }, results: {}, created_at: "2026-09-03T10:00:00.000Z", evidence_ready: false },
      { id: "p4", name: "BOGO Shawarma", platform: "Talabat", status: "draft", inputs: { branch: "Al Sadd, Lusail", discount: "BOGO" }, results: {}, created_at: "2026-09-20T10:00:00.000Z", evidence_ready: false },
      { id: "p5", name: "New customer 30%", platform: "Jahez", status: "pending_approval", inputs: { branch: "All 12", discount: "30%" }, results: {}, created_at: "2026-08-15T10:00:00.000Z", evidence_ready: false },
      { id: "p6", name: "Family Bundle 15%", platform: "Snoonu", status: "completed", inputs: { branch: "5 branches", discount: "15%" }, results: {}, created_at: "2026-09-06T10:00:00.000Z", evidence_ready: false },
      { id: "p7", name: "Late night 20%", platform: "Keeta", status: "ready_to_launch", inputs: { branch: "3 branches", discount: "20%" }, results: {}, created_at: "2026-09-28T10:00:00.000Z", evidence_ready: false },
    ],
    counts: { total: 7, active: 3, pending_approval: 2, completed: 1 }, blockers: ["Campaign financial outcomes require attributable order, funding, and cost evidence."],
  },
};
const contextFixture = { ok: true, context: { state: "available", merchant_label: "Sterling Group", brand_label: "Sterling", location_label: "Qatar · 6 branches", channel_label: "5 connected channels", currency: "QAR", brands: [{ id: "brand-1", name: "Sterling" }], branches: [], channels: ["talabat", "snoonu", "keeta", "jahez", "direct-pos"], blockers: [], functional_role: "finance", role_label: "Finance officer", role_description: "Profit, settlements, reporting, and audit evidence", demo_mode: false, demo_label: null } };
const sidebarDestinations = [
  ["Overview", "/dashboard"],
  ["Priority Centre", "/dashboard/priority-centre"],
  ["AI Copilot", "/dashboard/ai-copilot"],
  ["AI Store Manager", "/dashboard/store-manager"],
  ["Profit intelligence", "/dashboard/profit-intelligence"],
  ["Margin leakage", "/dashboard/margin-leakage"],
  ["Menu intelligence", "/dashboard/menu-intelligence"],
  ["Order Automation", "/dashboard/order-automation"],
  ["Orders", "/dashboard/orders"],
  ["Branches", "/dashboard/branches"],
  ["Promotions & Discounts", "/dashboard/promotions"],
  ["Channels", "/dashboard/channels"],
  ["Settlements", "/dashboard/settlements"],
  ["Reports", "/dashboard/reports"],
  ["Integrations", "/dashboard/integrations"],
  ["API / Developers", "/dashboard/api-developers"],
  ["Settings", "/dashboard/settings"],
  ["Store Access", "/dashboard/store-access"],
  ["Audit Log", "/dashboard/audit-log"],
] as const;

const workspaceDestinations = sidebarDestinations.filter(([, href]) => href.startsWith("/dashboard/") && !["/dashboard/priority-centre", "/dashboard/order-automation", "/dashboard/promotions"].includes(href));

type PriorityFixture = typeof fixture;

try {
  await waitForServer();
  const browser = await chromium.launch({ headless: true });
  try {
    for (const viewport of [{ name: "desktop", width: 1440, height: 1100 }, { name: "phone", width: 390, height: 844 }, { name: "small-phone", width: 375, height: 812 }, { name: "phone-landscape", width: 844, height: 390 }]) {
      const page = await browser.newPage({ viewport });
      const errors: string[] = [];
      page.on("pageerror", (error) => errors.push(error.message));
      await page.route("**/api/dashboard/v2/summary?days=*", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true, summary: fixture }) }));
      await page.route("**/api/dashboard/v2/modules?days=*", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(modulesFixture) }));
      await page.route("**/api/dashboard/v2/context", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(contextFixture) }));
      await page.route("**/api/dashboard/v2/activity", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true, audit: { state: "available", rows: [] }, channels: { state: "available", rows: [] }, costs: { state: "available", rows: [] } }) }));
      const marginPolicyWrites: Array<Record<string, unknown>> = [];
      await page.route("**/api/channels/connect", async (route) => {
        const requestBody=route.request().postDataJSON() as Record<string,unknown>;
        if(requestBody.platform!=="margin_floor")return route.fallback();
        const basePolicy={marginFloorPct:.18,minimumContributionAmount:0,maxPriceIncreasePct:.15,approvalMode:"approval_every_change",version:2,overrides:[]};
        if(requestBody.action==="set"){
          marginPolicyWrites.push(requestBody);
          const overrides=((requestBody.channel_overrides as Array<Record<string,unknown>>)??[]).map(item=>({channel:item.channel,servicePath:item.service_path,marginFloorPct:item.margin_floor_pct,minimumContributionAmount:item.minimum_contribution_amount,maxPriceIncreasePct:item.max_price_increase_pct,approvalMode:item.approval_mode}));
          return route.fulfill({status:200,contentType:"application/json",body:JSON.stringify({ok:true,policy:{...basePolicy,marginFloorPct:Number(requestBody.margin_floor_pct),minimumContributionAmount:Number(requestBody.minimum_contribution_amount),maxPriceIncreasePct:Number(requestBody.max_price_increase_pct),approvalMode:requestBody.approval_mode,version:3,overrides}})});
        }
        return route.fulfill({status:200,contentType:"application/json",body:JSON.stringify({ok:true,policy:basePolicy,versions:[]})});
      });
      await page.addInitScript(() => { localStorage.setItem("ps_connected", "true"); localStorage.setItem("ps_merchant_id", "acct"); localStorage.setItem("ps_access_code", "fixture"); });
      await page.goto(`${origin}/dashboard/revenue-hub`, { waitUntil: "domcontentloaded", timeout: 120_000 });
      await page.getByRole("heading", { name: /Gross sales increased/ }).waitFor({ timeout: 120_000 });
      assert.equal(page.url(), `${origin}/dashboard`, "retired Revenue Hub URL must resolve to the canonical dashboard");
      await page.locator(".ps-v2-scope button").getByText("Sterling Group", { exact: true }).waitFor({ state: "attached" });
      await page.getByText("Finance officer", { exact: true }).first().waitFor({ state: "attached" });
      assert.equal(await page.getByText("Demo data", { exact: true }).count(), 0, `${viewport.name}: demo banner must not be customer-visible`);
      assert.equal(await page.locator(".ps-v2-user strong").count(), 0, `${viewport.name}: sidebar must not expose an email-derived user name`);
      assert.equal(await page.getByText("QAR", { exact: true }).count(), 1);
      assert.equal(await page.locator(".ps-v2-sidebar .ps-v2-nav-item[disabled]").count(), 0, `${viewport.name}: sidebar must not contain dead disabled destinations`);
      for (const [label, href] of sidebarDestinations) {
        const destination = page.locator(`.ps-v2-sidebar a.ps-v2-nav-item[href="${href}"]`).filter({ hasText: label });
        assert.equal(await destination.count(), 1, `${viewport.name}: ${label} must resolve to ${href}`);
      }
      assert.equal(await page.locator("#margin-leakage").count(), 1, `${viewport.name}: margin leakage deep-link target missing`);
      assert.equal(await page.locator("#branch-performance").count(), 1, `${viewport.name}: branch deep-link target missing`);
      if (viewport.width === 1440) {
        await page.getByRole("button", { name: "7D", exact: true }).click();
        assert.equal(await page.getByRole("button", { name: "7D", exact: true }).getAttribute("aria-pressed"), "true");
        await page.getByRole("button", { name: "30D", exact: true }).click();
        assert.equal(await page.getByRole("button", { name: "30D", exact: true }).getAttribute("aria-pressed"), "true");
        await page.getByRole("button", { name: "QTD", exact: true }).click();
        assert.match(page.url(), /[?&]period=qtd(?:&|$)/);
        await page.getByRole("button", { name: "YTD", exact: true }).evaluate((element) => (element as HTMLButtonElement).click());
        assert.match(page.url(), /[?&]period=ytd(?:&|$)/);
      }

      await page.goto(`${origin}/dashboard`, { waitUntil: "domcontentloaded", timeout: 120_000 });
      await page.getByText("All branches →", { exact: true }).waitFor({ timeout: 120_000 });
      const dimensions = await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth, scrollHeight: document.documentElement.scrollHeight }));
      assert.equal(dimensions.scrollWidth, dimensions.clientWidth, `${viewport.name}: page-level horizontal overflow`);
      if (viewport.width === 1440) assert.ok(dimensions.scrollHeight >= 2700 && dimensions.scrollHeight <= 2950, `desktop: full-density overview height ${dimensions.scrollHeight}px drifted from the 2792px reference`);
      assert.equal(await page.getByRole("heading", { name: "Branch performance", exact: true }).count(), 1);
      assert.equal(await page.getByRole("rowheader", { name: /West Bay/ }).count(), 1);
      assert.equal(await page.locator(".ps-v2-reconciliation-card").getByText(/Unallocated batch difference/).count(), 1);
      assert.equal(await page.getByRole("heading", { name: "Margin leakage", exact: true }).count(), 1);
      assert.equal(await page.getByText("Allocate batch difference to order evidence", { exact: true }).count(), 1);
      assert.equal(await page.getByText(/Add order-level evidence before preparing any claim/).count(), 1);
      assert.equal(await page.getByText(/supported shortfall/i).count(), 0, `${viewport.name}: unallocated finding appeared claims-ready`);
      if (viewport.width <= 767) {
        const table = await page.locator(".ps-v2-branch-table-wrap").evaluate((element) => ({ clientWidth: element.clientWidth, scrollWidth: element.scrollWidth }));
        assert.ok(table.scrollWidth > table.clientWidth, "phone: branch table should scroll inside its card");
      }
      const priorityLink = page.getByRole("link", { name: "Priority centre" });
      assert.equal(await priorityLink.getAttribute("href"), "/dashboard/priority-centre");
      if (viewport.width > 1024) {
        await page.getByRole("button", { name: /Confidence/ }).click();
        await page.getByRole("region", { name: "Evidence confidence" }).waitFor();
        assert.equal(await page.getByText("3 of 3 required record types are ready.", { exact: true }).count(), 1);
        await page.keyboard.press("Escape");
        assert.equal(await page.getByRole("region", { name: "Evidence confidence" }).count(), 0);
      }
      await page.getByRole("button", { name: /Priority 4/ }).click();
      await page.getByRole("dialog", { name: "Priority Centre" }).waitFor();
      assert.equal(await page.getByText("4 decisions need your review", { exact: true }).count(), 1);
      await page.keyboard.press("Escape");
      assert.equal(await page.getByRole("dialog", { name: "Priority Centre" }).count(), 0);
      await page.screenshot({ path: join(screenshots, `dashboard-v2-overview-${viewport.name}.png`), fullPage: true });

      await page.goto(`${origin}/dashboard/order-automation`, { waitUntil: "domcontentloaded", timeout: 120_000 });
      await page.getByRole("heading", { name: /Automation performance is not calculated/ }).waitFor({ timeout: 120_000 });
      assert.equal(page.url(), `${origin}/dashboard/order-automation`);
      await page.getByText("#S-30100", { exact: true }).waitFor();
      assert.equal(await page.getByText(/#K-49174/).count(), 2);
      assert.equal(await page.getByRole("button", { name: "New rule", exact: true }).isDisabled(), true);
      await page.locator(".ps-v2-confidence b").getByText("100%", { exact: true }).waitFor({ state: "attached" });
      assert.equal(await page.locator(".ps-v2-priority-link b").getByText("4", { exact: true }).count(), 1);
      const automationDimensions = await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth, scrollHeight: document.documentElement.scrollHeight }));
      assert.equal(automationDimensions.scrollWidth, automationDimensions.clientWidth, `${viewport.name}: Order Automation page-level horizontal overflow`);
      if (viewport.width === 1440) assert.ok(automationDimensions.scrollHeight >= 2450 && automationDimensions.scrollHeight <= 2750, `desktop: full-density Order Automation height ${automationDimensions.scrollHeight}px drifted from the 2663px reference`);
      await page.screenshot({ path: join(screenshots, `dashboard-v2-order-automation-${viewport.name}.png`), fullPage: true });

      await page.goto(`${origin}/dashboard/promotions`, { waitUntil: "domcontentloaded", timeout: 120_000 });
      await page.getByRole("heading", { name: /Campaign contribution is not calculated/ }).waitFor({ timeout: 120_000 });
      assert.equal(page.url(), `${origin}/dashboard/promotions`);
      await page.getByRole("rowheader", { name: /Weekend 25% Off/ }).waitFor();
      assert.equal(await page.getByRole("rowheader", { name: /Late night 20%/ }).count(), 1);
      assert.equal(await page.getByRole("button", { name: "Request approval" }).isDisabled(), true);
      await page.locator(".ps-v2-confidence b").getByText("100%", { exact: true }).waitFor({ state: "attached" });
      assert.equal(await page.locator(".ps-v2-priority-link b").getByText("4", { exact: true }).count(), 1);
      const promotionsDimensions = await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth, scrollHeight: document.documentElement.scrollHeight }));
      assert.equal(promotionsDimensions.scrollWidth, promotionsDimensions.clientWidth, `${viewport.name}: Promotions page-level horizontal overflow`);
      if (viewport.width === 1440) assert.ok(promotionsDimensions.scrollHeight >= 2500 && promotionsDimensions.scrollHeight <= 2800, `desktop: full-density Promotions height ${promotionsDimensions.scrollHeight}px drifted from the 2649px reference`);
      await page.screenshot({ path: join(screenshots, `dashboard-v2-promotions-${viewport.name}.png`), fullPage: true });

      await page.goto(`${origin}/dashboard/priority-centre`, { waitUntil: "domcontentloaded", timeout: 120_000 });
      await page.getByRole("heading", { name: "See what needs your attention next." }).waitFor({ timeout: 120_000 });
      assert.equal(page.url(), `${origin}/dashboard/priority-centre`);
      await page.getByText("finding-batch", { exact: true }).waitFor({ timeout: 120_000 });
      await page.locator(".ps-v2-confidence b").getByText("100%", { exact: true }).waitFor({ state: "attached" });
      assert.equal(await page.locator(".ps-v2-priority-link b").getByText("4", { exact: true }).count(), 1);
      assert.equal(await page.getByText("finding-batch", { exact: true }).count(), 1);
      const firstPriorityItem = page.locator(".ps-v2-priority-centre-list > li").first();
      assert.equal(await firstPriorityItem.getByText("No linked case", { exact: true }).count(), 1);
      assert.equal(await firstPriorityItem.getByText("Not claims-ready", { exact: true }).count(), 1);
      assert.equal(await page.getByText("No protected action is available from this read-only route.", { exact: true }).count(), 4);
      assert.equal(await page.getByRole("button", { name: /approve|send|dispute/i }).count(), 0, `${viewport.name}: protected action control appeared`);
      const priorityDimensions = await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth }));
      assert.equal(priorityDimensions.scrollWidth, priorityDimensions.clientWidth, `${viewport.name}: Priority Centre page-level horizontal overflow`);

      if (viewport.width === 1440) {
        for (const [label, href] of workspaceDestinations) {
          await page.goto(`${origin}${href}`, { waitUntil: "domcontentloaded", timeout: 120_000 });
          await page.locator("h1").waitFor({ timeout: 120_000 });
          assert.equal(page.url(), `${origin}${href}`, `${label}: destination changed unexpectedly`);
          assert.equal(await page.locator(".ps-v2-sidebar").count(), 1, `${label}: Dashboard V2 shell is missing`);
          assert.equal(await page.locator(".ps-db").count(), 0, `${label}: legacy dashboard shell was rendered`);
          assert.equal(await page.locator(`.ps-v2-sidebar a.ps-v2-nav-item[href="${href}"][aria-current="page"]`).count(), 1, `${label}: sidebar destination is not active`);
          if (label === "Menu intelligence") {
            await page.getByRole("heading", { name: "Menu item performance", exact: true }).waitFor();
            assert.equal(await page.getByRole("columnheader", { name: "Contribution", exact: true }).count(), 1);
            await page.getByText("Making money", { exact: true }).waitFor();
            const menuTableText = await page.locator(".ps-v2-menu-table").innerText();
            assert.match(menuTableText, /Making money/, menuTableText);
            assert.match(menuTableText, /Needs attention/, menuTableText);
            assert.equal(await page.getByText("18 of 18 orders costed", { exact: true }).count(), 0);
            assert.equal(await page.getByText("22252 of 22252 orders costed", { exact: true }).count(), 1);
          }
          const workspaceDimensions = await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth }));
          assert.equal(workspaceDimensions.scrollWidth, workspaceDimensions.clientWidth, `${label}: page-level horizontal overflow`);
        }
        await page.goto(`${origin}/dashboard/store-manager`, { waitUntil: "domcontentloaded", timeout: 120_000 });
        await page.getByRole("heading", { name: "Chat with your Store Manager", exact: true }).waitFor({ timeout: 120_000 });
        assert.equal(await page.getByText("AI Store Manager", { exact: true }).count() > 0, true);
        await page.goto(`${origin}/dashboard/revenue-hub?workspace=rules#channel-margin-overrides`, { waitUntil: "domcontentloaded", timeout: 120_000 });
        await page.getByRole("heading", { name: "Manage your account and preferences." }).waitFor({ timeout: 120_000 });
        assert.equal(new URL(page.url()).pathname, "/dashboard/settings", "legacy Margin Rules link must stay in the canonical dashboard");
        assert.equal(await page.locator(".ps-db").count(), 0, "legacy Margin Rules link rendered the retired dashboard");
        await page.getByRole("button", { name: "Change margin rules", exact: true }).click();
        await page.getByLabel("Minimum contribution margin", { exact: true }).fill("22");
        await page.getByRole("button", { name: "Add channel override", exact: true }).click();
        await page.getByLabel("Override 1 channel", { exact: true }).fill("talabat");
        await page.getByRole("button", { name: "Review changes", exact: true }).click();
        await page.getByRole("region", { name: "Margin rule review", exact: true }).waitFor();
        assert.equal(await page.getByText("Future price changes will still require merchant approval.", { exact: true }).count(),1);
        await page.getByRole("button", { name: "Activate these rules", exact: true }).click();
        await page.getByText("Margin rules activated successfully.", { exact: true }).waitFor();
        assert.equal(marginPolicyWrites.length,1,"margin policy must activate only after explicit review confirmation");
        assert.equal(marginPolicyWrites[0]?.margin_floor_pct,.22);
        assert.equal((marginPolicyWrites[0]?.channel_overrides as Array<Record<string,unknown>>)[0]?.channel,"talabat");
        await page.goto(`${origin}/dashboard/store-access`, { waitUntil: "domcontentloaded", timeout: 120_000 });
        const storeAccessLink=page.getByRole("link", { name: "Open Store Access →", exact: true });
        assert.equal(await storeAccessLink.getAttribute("href"), "/dashboard/store-access");
        await page.goto(`${origin}/dashboard/evidence`, { waitUntil: "domcontentloaded", timeout: 120_000 });
        await page.getByRole("heading", { name: "See what changed, when it changed, and where it came from." }).waitFor({ timeout: 120_000 });
        assert.equal(page.url(), `${origin}/dashboard/audit-log`, "retired Evidence URL must resolve inside the canonical dashboard");
        await page.goto(`${origin}/dashboard/v2/promotions`, { waitUntil: "domcontentloaded", timeout: 120_000 });
        await page.getByRole("heading", { name: /Campaign contribution is not calculated/ }).waitFor({ timeout: 120_000 });
        assert.equal(page.url(), `${origin}/dashboard/promotions`, "legacy V2 URL must redirect to the canonical dashboard route");
      }
      assert.deepEqual(errors, [], `${viewport.name}: unexpected browser errors`);
      await page.screenshot({ path: join(screenshots, `dashboard-v2-priority-${viewport.name}.png`), fullPage: true });
      await page.close();
    }

    for (const scenario of [
      { state: "empty", expected: "Nothing requires a decision", blockers: [] },
      { state: "blocked", expected: "Evidence boundary reached", blockers: ["Priority decisions require one proven evidence currency."] },
      { state: "unavailable", expected: "Priority Centre unavailable", blockers: ["Recovery case state could not be loaded."] },
    ] as const) {
      const page = await browser.newPage({ viewport: { width: 1200, height: 800 } });
      const scenarioFixture: PriorityFixture = { ...fixture, priority_decisions: { state: scenario.state, blockers: [...scenario.blockers], items: [] } };
      await page.route("**/api/dashboard/v2/summary?days=*", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true, summary: scenarioFixture }) }));
      await page.route("**/api/dashboard/v2/context", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(contextFixture) }));
      await page.addInitScript(() => { localStorage.setItem("ps_merchant_id", "acct"); localStorage.setItem("ps_access_code", "fixture"); });
      await page.goto(`${origin}/dashboard/priority-centre`, { waitUntil: "domcontentloaded", timeout: 120_000 });
      await page.getByText(scenario.expected, { exact: true }).waitFor({ timeout: 120_000 });
      assert.equal(await page.getByRole("button", { name: /approve|send|dispute/i }).count(), 0);
      await page.close();
    }
  } finally {
    await browser.close();
  }
  console.log(`Dashboard V2 UI verification passed at 1440px, 390px, 375px, and phone landscape. Screenshots: ${screenshots}`);
} finally {
  server.kill();
}
