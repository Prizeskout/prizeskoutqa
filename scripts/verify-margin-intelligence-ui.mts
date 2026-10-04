import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { chromium } from "playwright";

const port = 4179;
const origin = `http://127.0.0.1:${port}`;
const screenshotDirectory = await mkdtemp(join(tmpdir(), "prizeskout-margin-"));
const server = spawn(process.execPath, ["server.mjs"], {
  cwd: process.cwd(),
  env: { ...process.env, PORT: String(port) },
  stdio: ["ignore", "pipe", "pipe"],
});

let serverOutput = "";
server.stdout.on("data", (chunk) => { serverOutput += String(chunk); });
server.stderr.on("data", (chunk) => { serverOutput += String(chunk); });

async function waitForServer() {
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${origin}/dashboard/revenue-hub?workspace=analytics&view=margin`);
      if (response.ok) return;
    } catch {
      // The production server may still be binding its port.
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`PrizeSkout production server did not become ready.\n${serverOutput}`);
}

try {
  await waitForServer();
  const browser = await chromium.launch({ headless: true });
  try {
    for (const viewport of [
      { name: "desktop", width: 1440, height: 1000 },
      { name: "phone", width: 390, height: 844 },
    ]) {
      const page = await browser.newPage({ viewport });
      const pageErrors: string[] = [];
      page.on("pageerror", (error) => pageErrors.push(error.message));
      await page.goto(`${origin}/dashboard/revenue-hub`, { waitUntil: "domcontentloaded", timeout: 60_000 });
      await page.evaluate(() => {
        localStorage.setItem("ps_merchant_id", "00000000-0000-4000-8000-000000005100");
        localStorage.setItem("ps_access_code", "PS-FILM-2026");
        localStorage.setItem("ps_connected", "1");
        localStorage.setItem("ps_tour_v1_done", "1");
      });
      await page.goto(`${origin}/dashboard/revenue-hub?workspace=analytics&view=margin`, {
        waitUntil: "domcontentloaded",
        timeout: 60_000,
      });
      await page.locator(".ps-mi-decision").waitFor({ timeout: 30_000 });

      const dimensions = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
      }));
      assert.equal(await page.locator(".truth-trail-step").count(), 7);
      assert.equal(await page.getByText("Expected payout", { exact: true }).count(), 0);
      assert.equal(await page.getByText("Could not load recovery cases.", { exact: true }).count(), 0);
      assert.equal(dimensions.scrollWidth, dimensions.clientWidth, `${viewport.name}: horizontal overflow`);
      assert.deepEqual(pageErrors, [], `${viewport.name}: unexpected browser page errors`);
      await page.screenshot({ path: join(screenshotDirectory, `margin-${viewport.name}.png`), fullPage: true });

      if (viewport.name === "desktop") {
        const nextAction = page.locator(".ps-mi-decision button");
        if (await nextAction.count()) {
          const actionLabel = (await nextAction.innerText()).trim();
          await nextAction.click();
          const destination = actionLabel.includes("cost") ? "Catalog" : "Integrations";
          await page.getByRole("heading", { name: destination, exact: true }).waitFor({ timeout: 30_000 });
        }
        await page.getByRole("button", { name: "Integrations", exact: true }).click();
        await page.getByRole("heading", { name: "Approve the agreement PrizeSkout should calculate with", exact: true }).waitFor({ timeout: 30_000 });
        assert.equal(await page.locator("#ps-commercial-terms-card").count(), 1);
      }
      await page.close();
    }
  } finally {
    await browser.close();
  }
  console.log(`Margin Intelligence UI verification passed. Screenshots: ${screenshotDirectory}`);
} finally {
  server.kill();
}
