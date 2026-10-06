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
  env: { ...process.env, VITE_DASHBOARD_V2_ENABLED: "true" },
  stdio: ["ignore", "pipe", "pipe"],
});
let serverOutput = "";
server.stdout.on("data", (chunk) => { serverOutput += String(chunk); });
server.stderr.on("data", (chunk) => { serverOutput += String(chunk); });

async function waitForServer() {
  const deadline = Date.now() + 90_000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${origin}/dashboard/v2`);
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
    branch_performance: { state: "available", ranked: true, identified_orders: 22252, unassigned_orders: 0, blockers: [], rows: [{ branch: "west-bay", gross_sales: 950000, revenue: 860000, orders: 11200, fees: 120000, discounts: 70000, product_cost: 420000, contribution: 440000, margin_pct: 51.2 }, { branch: "lusail", gross_sales: 890000, revenue: 840000, orders: 11052, fees: 115000, discounts: 65000, product_cost: 489580, contribution: 350420, margin_pct: 41.7 }] },
  },
  reconciliation: { state: "unallocated", finding_id: "finding-batch", conclusion: "unallocated_batch_difference", label: "Unallocated batch difference", currency: "QAR", expected_amount: 1000, reported_amount: 980, variance: -20, allocation_scope: "batch", order_external_id: null, settlement_reference: "BATCH-7", evidence_strength: "strong", recoverability: "review_required", claims_ready_amount: null, explanation: "The payout differs at batch level but cannot be assigned to an order.", blockers: [], created_at: "2026-10-04T10:00:00.000Z" },
  comparison: { state: "available", previous_period_start: "2026-08-06T00:00:00.000Z", previous_period_end: "2026-09-04T23:59:59.999Z", movements: [{ key: "gross_sales", label: "Gross sales", current: 1840000, previous: 1700000, change: 140000, change_pct: 8.24, unit: "money" }], summary: "Gross sales increased by 8.2% versus the previous 30-day period.", blockers: [] },
  priority_decisions: { state: "available", blockers: [], items: [{ id: "finding:finding-batch", rank: 1, title: "Allocate batch difference to order evidence", state: "evidence_required", amount: null, currency: "QAR", evidence_strength: "strong", finding_id: "finding-batch", recovery_case_id: null, reference: "Batch BATCH-7", next_safe_action: "Add order-level evidence before preparing any claim.", approval_required: false, blockers: [] }] },
  truths: { orders: truth("orders"), contract: truth("contract"), payout: truth("payout"), receipt: truth("receipt") },
  conclusion: { state: "ready_for_reconciliation", title: "Required evidence is ready.", detail: "Evidence is ready.", next_action: "Review the governed result." },
  latest_finding: null,
};

type PriorityFixture = typeof fixture;

try {
  await waitForServer();
  const browser = await chromium.launch({ headless: true });
  try {
    for (const viewport of [{ name: "desktop", width: 1440, height: 1100 }, { name: "phone", width: 390, height: 844 }, { name: "small-phone", width: 375, height: 812 }, { name: "phone-landscape", width: 844, height: 390 }]) {
      const page = await browser.newPage({ viewport });
      const errors: string[] = [];
      page.on("pageerror", (error) => errors.push(error.message));
      await page.route("**/api/dashboard/v2/summary?days=30", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true, summary: fixture }) }));
      await page.addInitScript(() => { localStorage.setItem("ps_merchant_id", "acct"); localStorage.setItem("ps_access_code", "fixture"); });
      await page.goto(`${origin}/dashboard/v2`, { waitUntil: "domcontentloaded", timeout: 60_000 });
      await page.getByText("Ranking ready", { exact: true }).waitFor({ timeout: 60_000 });
      const dimensions = await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth }));
      assert.equal(dimensions.scrollWidth, dimensions.clientWidth, `${viewport.name}: page-level horizontal overflow`);
      assert.equal(await page.getByRole("heading", { name: "Branch performance", exact: true }).count(), 1);
      assert.equal(await page.getByRole("rowheader", { name: /West Bay/ }).count(), 1);
      assert.equal(await page.getByText("Unallocated batch difference", { exact: true }).count(), 1);
      assert.equal(await page.getByRole("heading", { name: "Priority decisions", exact: true }).count(), 1);
      assert.equal(await page.getByText("Allocate batch difference to order evidence", { exact: true }).count(), 1);
      assert.equal(await page.getByText(/Add order-level evidence before preparing any claim/).count(), 1);
      assert.equal(await page.getByText(/supported shortfall/i).count(), 0, `${viewport.name}: unallocated finding appeared claims-ready`);
      if (viewport.width <= 767) {
        const table = await page.locator(".ps-v2-branch-table-wrap").evaluate((element) => ({ clientWidth: element.clientWidth, scrollWidth: element.scrollWidth }));
        assert.ok(table.scrollWidth > table.clientWidth, "phone: branch table should scroll inside its card");
      }
      const priorityLink = page.getByRole("link", { name: "Priority centre" });
      assert.equal(await priorityLink.getAttribute("href"), "/dashboard/v2/priority-centre");
      await page.goto(`${origin}/dashboard/v2/priority-centre`, { waitUntil: "domcontentloaded", timeout: 60_000 });
      await page.getByRole("heading", { name: "Resolve what the evidence supports next." }).waitFor({ timeout: 60_000 });
      assert.equal(page.url(), `${origin}/dashboard/v2/priority-centre`);
      await page.getByText("finding-batch", { exact: true }).waitFor({ timeout: 60_000 });
      assert.equal(await page.getByText("finding-batch", { exact: true }).count(), 1);
      assert.equal(await page.getByText("No linked case", { exact: true }).count(), 1);
      assert.equal(await page.getByText("Not claims-ready", { exact: true }).count(), 1);
      assert.equal(await page.getByText("No protected action is available from this read-only route.", { exact: true }).count(), 1);
      assert.equal(await page.getByRole("button", { name: /approve|send|dispute/i }).count(), 0, `${viewport.name}: protected action control appeared`);
      const priorityDimensions = await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth }));
      assert.equal(priorityDimensions.scrollWidth, priorityDimensions.clientWidth, `${viewport.name}: Priority Centre page-level horizontal overflow`);
      assert.deepEqual(errors, [], `${viewport.name}: unexpected browser errors`);
      await page.screenshot({ path: join(screenshots, `dashboard-v2-${viewport.name}.png`), fullPage: true });
      await page.close();
    }

    for (const scenario of [
      { state: "empty", expected: "Nothing requires a decision", blockers: [] },
      { state: "blocked", expected: "Evidence boundary reached", blockers: ["Priority decisions require one proven evidence currency."] },
      { state: "unavailable", expected: "Priority Centre unavailable", blockers: ["Recovery case state could not be loaded."] },
    ] as const) {
      const page = await browser.newPage({ viewport: { width: 1200, height: 800 } });
      const scenarioFixture: PriorityFixture = { ...fixture, priority_decisions: { state: scenario.state, blockers: [...scenario.blockers], items: [] } };
      await page.route("**/api/dashboard/v2/summary?days=30", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true, summary: scenarioFixture }) }));
      await page.addInitScript(() => { localStorage.setItem("ps_merchant_id", "acct"); localStorage.setItem("ps_access_code", "fixture"); });
      await page.goto(`${origin}/dashboard/v2/priority-centre`, { waitUntil: "domcontentloaded", timeout: 60_000 });
      await page.getByText(scenario.expected, { exact: true }).waitFor({ timeout: 60_000 });
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
