import { chromium } from "playwright";

const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto("http://127.0.0.1:4177/new-landing-page", { waitUntil: "networkidle" });
  const cards = page.locator(".nlp-system-card");
  await cards.nth(2).click();
  await page.waitForTimeout(750);
  if (await cards.nth(2).getAttribute("aria-expanded") !== "true") throw new Error("Card did not flip open");
  if (await cards.nth(2).locator(".nlp-card-back").getAttribute("aria-hidden") !== "false") throw new Error("Reverse content is not exposed");
  const active = await page.locator(".nlp-card-story").getAttribute("data-active");
  await page.waitForTimeout(2700);
  if (await page.locator(".nlp-card-story").getAttribute("data-active") !== active) throw new Error("Autoplay advanced while a card was open");
  await page.screenshot({ path: "output/live-dashboard-demo-review/card-flip-desktop.png" });
  await cards.nth(2).click();
  if (await cards.nth(2).getAttribute("aria-expanded") !== "false") throw new Error("Card did not flip closed");

  const reduced = await browser.newPage({ viewport: { width: 390, height: 844 }, reducedMotion: "reduce" });
  await reduced.goto("http://127.0.0.1:4177/new-landing-page", { waitUntil: "networkidle" });
  await reduced.locator(".nlp-system-card").first().click();
  if (await reduced.locator(".nlp-system-card").first().getAttribute("aria-expanded") !== "true") throw new Error("Reduced-motion flip state failed");
  if (await reduced.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)) throw new Error("Mobile card flip causes horizontal overflow");
  console.log("Card flip verification completed.");
} finally {
  await browser.close();
}
