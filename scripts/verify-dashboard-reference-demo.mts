import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { chromium } from "playwright";

const origin = process.env.DEMO_VERIFY_ORIGIN || "http://127.0.0.1:4185";
const live = Boolean(process.env.DEMO_VERIFY_ORIGIN);
const server = live
  ? null
  : spawn(
      process.execPath,
      ["node_modules/vite/bin/vite.js", "--host", "127.0.0.1", "--port", "4185", "--strictPort"],
      { stdio: "pipe" },
    );
let output = "";
server?.stdout?.on("data", (chunk) => (output += chunk));
server?.stderr?.on("data", (chunk) => (output += chunk));
const screenshots = await mkdtemp(join(tmpdir(), "prizeskout-reference-demo-"));
const browser = await chromium.launch({ headless: true });

try {
  for (let attempt = 0; attempt < 180; attempt++) {
    try {
      if ((await fetch(origin + "/access")).ok) break;
    } catch {}
    if (attempt === 179) throw new Error(output);
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  for (const width of [1440, 390, 375, 844]) {
    const page = await browser.newPage({
      viewport: { width, height: width === 844 ? 390 : 1100 },
      reducedMotion: "reduce",
    });
    const errors: string[] = [];
    const writes: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("request", (request) => {
      if (request.url().includes("/api/") && request.method() !== "GET") writes.push(request.url());
    });

    if (!live) {
      await page.route("**/api/dashboard/v2/context", (route) =>
        route.fulfill({
          json: {
            ok: true,
            context: {
              state: "available",
              merchant_label: "Naija Restaurant",
              brand_label: "All brands",
              location_label: "Qatar · 12 branches",
              channel_label: "All channels",
              currency: "QAR",
              brands: [],
              branches: [],
              channels: [],
              blockers: [],
              functional_role: "management",
              role_label: "General manager",
              role_description: "Executive performance and decisions",
              demo_mode: true,
              demo_label: "Controlled demonstration data — not live financial evidence",
            },
          },
        }),
      );
    }

    await page.addInitScript(
      ({ merchant, code }) => {
        localStorage.setItem("ps_connected", "true");
        localStorage.setItem("ps_merchant_id", merchant);
        localStorage.setItem("ps_access_code", code);
      },
      {
        merchant: live ? process.env.DEMO_MERCHANT_ID! : "fixture",
        code: live ? process.env.DEMO_ACCESS_CODE! : "fixture",
      },
    );

    await page.goto(`${origin}/dashboard`, { waitUntil: "domcontentloaded", timeout: 120_000 });
    await page.getByTestId("dashboard-demo-experience").waitFor({ timeout: 120_000 });
    const demo = page.frameLocator(
      'iframe[title="PrizeSkout interactive restaurant dashboard demo"]',
    );
    await demo
      .getByRole("heading", { name: /See where your restaurant actually makes money/i })
      .waitFor({ timeout: 120_000 });
    await demo.getByText("Naija Restaurant Group", { exact: true }).first().waitFor();

    await demo.getByRole("button", { name: "Explore freely" }).click();
    const screens = [
      ["Overview", "Contribution is up 8.4%"],
      ["Margin Leakage", "QAR 41,280 of margin is at risk"],
      ["Menu Intelligence", "6 SKUs are underpriced on Talabat"],
      ["Order Automation", "92.4% of today's orders were accepted automatically"],
      ["Promotions & Discounts", "Weekend 25% Off is growing revenue"],
      ["Channels", "Talabat generates the most revenue"],
      ["Settlements", "3 settlement discrepancies"],
      ["Integrations", "5 systems connected"],
    ] as const;
    for (const [navigation, heading] of screens) {
      await demo.getByRole("button", { name: new RegExp(`^${navigation}`) }).click();
      await demo.getByText(heading, { exact: false }).first().waitFor({ timeout: 30_000 });
    }

    const outerOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    assert.ok(outerOverflow <= 1, `${width}: page overflow ${outerOverflow}`);
    assert.deepEqual(errors, [], `browser errors at ${width}`);
    assert.deepEqual(writes, [], "Demo controls must never call write APIs");
    await page.screenshot({ path: join(screenshots, `full-demo-${width}.png`), fullPage: false });
    await page.close();
  }

  console.log(
    `Full reference demo checks passed (1440, 390, 375, 844): entry, eight dashboard views, Naija identity, responsive frame, no API writes or page errors. Screenshots: ${screenshots}`,
  );
} finally {
  await browser.close();
  server?.kill();
}
