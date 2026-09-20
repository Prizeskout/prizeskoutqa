import { chromium } from "playwright";

const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
  await page.goto("http://127.0.0.1:4177/new-landing-page", { waitUntil: "networkidle" });
  await page.locator(".nlp-market-trigger").click();
  await page.locator(".nlp-market-panel").waitFor({ state: "visible" });
  await page.waitForTimeout(400);
  await page.screenshot({ path: "output/live-dashboard-demo-review/nav-parity-desktop.png", fullPage: false });
  await page.locator('.nlp-market-panel [role="option"]').nth(1).click();
  if ((await page.locator(".nlp-market-trigger").innerText()).includes("Saudi Arabia") === false) throw new Error("Market selection did not update");
  await page.keyboard.press("Escape");
  await page.locator('.nlp-nav-dropdown > button').first().click();
  await page.locator('.nlp-product-menu').waitFor({ state: "visible" });
  await page.keyboard.press("Escape");
  if (await page.locator('.nlp-product-menu').count()) throw new Error("Escape did not close Product menu");
  const mobile = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
  await mobile.goto("http://127.0.0.1:4177/new-landing-page", { waitUntil: "networkidle" });
  const overflow = await mobile.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  if (overflow) throw new Error("Mobile navigation causes horizontal overflow");
  await mobile.locator(".nlp-menu-button").click();
  await mobile.screenshot({ path: "output/live-dashboard-demo-review/nav-parity-mobile.png", fullPage: false });
  console.log("Navigation parity verification completed.");
} finally {
  await browser.close();
}
