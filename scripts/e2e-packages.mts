import assert from "node:assert/strict";
import { chromium } from "playwright";

const baseUrl = process.env.E2E_BASE_URL ?? "http://127.0.0.1:4177";
const browser = await chromium.launch({ headless: true });

try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const pageErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  const response = await page.goto(baseUrl, { waitUntil: "domcontentloaded", timeout: 60_000 });
  assert(!response || response.status() < 500, `Landing page returned ${response?.status()}`);
  await page.getByText("Choose how far PrizeSkout should operate for you.", { exact: true }).waitFor({ timeout: 30_000 });

  for (const packageName of ["Core", "Growth", "Enterprise"]) {
    await page.getByText(packageName, { exact: true }).last().waitFor();
  }
  await page.getByText("QAR 349", { exact: false }).waitFor();
  await page.getByText("QAR 1099", { exact: false }).waitFor();
  await page.getByText("Custom", { exact: true }).last().waitFor();
  await page.getByText("Competitor Radar · 2 competitors per product · daily checks", { exact: true }).waitFor();
  await page.getByText("Full CFO Copilot and AI Store Assistant", { exact: true }).waitFor();
  await page.getByText("Margin policies and protected merchant-approved price actions", { exact: true }).waitFor();
  await page.getByText("Channel Price Architecture and cross-channel propagation tracking", { exact: true }).waitFor();
  await page.getByText("Autonomous audit and recovery workflows with manual fallback", { exact: true }).waitFor();
  assert.deepEqual(pageErrors, [], `Pricing page errors: ${pageErrors.join("; ")}`);
  console.log("Core, Growth and Enterprise pricing cards rendered with unchanged prices and current product capabilities.");
} finally {
  await browser.close();
}
