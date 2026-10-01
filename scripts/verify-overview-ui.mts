import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { chromium } from "playwright";

const port = 4177;
const origin = `http://127.0.0.1:${port}`;
const screenshotDirectory = await mkdtemp(join(tmpdir(), "prizeskout-overview-"));
const server = spawn(process.execPath, ["server.mjs"], {
  cwd: process.cwd(),
  env: { ...process.env, PORT: String(port) },
  stdio: ["ignore", "pipe", "pipe"],
});

let serverOutput = "";
server.stdout.on("data", (chunk) => {
  serverOutput += String(chunk);
});
server.stderr.on("data", (chunk) => {
  serverOutput += String(chunk);
});

async function waitForServer() {
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${origin}/dashboard/revenue-hub`);
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

      await page.goto(`${origin}/dashboard/revenue-hub`, {
        waitUntil: "domcontentloaded",
        timeout: 60_000,
      });
      await page.evaluate(() => {
        localStorage.setItem("ps_merchant_id", "00000000-0000-4000-8000-000000005100");
        localStorage.setItem("ps_access_code", "PS-FILM-2026");
        localStorage.setItem("ps_connected", "1");
        localStorage.setItem("ps_tour_v1_done", "1");
      });
      await page.reload({ waitUntil: "domcontentloaded", timeout: 60_000 });
      await page.locator("#overview-decision-title").waitFor({ timeout: 30_000 });

      const trailSteps = await page.locator(".truth-trail-step").count();
      const dimensions = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
      }));
      await page.screenshot({
        path: join(screenshotDirectory, `overview-${viewport.name}.png`),
        fullPage: true,
      });

      assert.equal(trailSteps, 7, `${viewport.name}: expected all seven Truth Trail stages`);
      assert.equal(
        dimensions.scrollWidth,
        dimensions.clientWidth,
        `${viewport.name}: dashboard has horizontal overflow`,
      );
      assert.deepEqual(pageErrors, [], `${viewport.name}: unexpected browser page errors`);
      await page.close();
    }
  } finally {
    await browser.close();
  }

  console.log(
    `Overview responsive verification passed at 1440px and 390px. Screenshots: ${screenshotDirectory}`,
  );
} finally {
  server.kill();
}
