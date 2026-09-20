import { chromium } from "playwright";
import { mkdir, rename } from "node:fs/promises";
import path from "node:path";

const outputDir = path.resolve("output/live-dashboard-demo-review/onboarding");
await mkdir(outputDir, { recursive: true });
const browser = await chromium.launch({ headless: true });

async function open(viewport: { width: number; height: number }, reducedMotion: "reduce" | "no-preference" = "no-preference") {
  const page = await browser.newPage({ viewport, reducedMotion });
  await page.goto("http://127.0.0.1:4177/new-landing-page", { waitUntil: "domcontentloaded" });
  await page.locator(".nlp-first-hours").scrollIntoViewIfNeeded();
  await page.locator(".nlp-setup-demo").waitFor();
  return page;
}

for (const [label, viewport] of [["desktop", { width: 1440, height: 1000 }], ["mobile", { width: 390, height: 844 }]] as const) {
  const page = await open(viewport);
  for (let step = 0; step < 3; step += 1) {
    await page.locator(`.nlp-setup-shell nav button`).nth(step).click();
    await page.locator(`.nlp-setup-demo[data-onboarding-step="${step}"]`).waitFor();
    await page.waitForTimeout(1500);
    await page.screenshot({ path: path.join(outputDir, `${label}-step-${step}.png`) });
  }
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  if (overflow > 1) throw new Error(`${label} horizontal overflow: ${overflow}px`);
  const before = await page.locator(".nlp-setup-demo").getAttribute("data-onboarding-step");
  await page.waitForTimeout(3200);
  const after = await page.locator(".nlp-setup-demo").getAttribute("data-onboarding-step");
  if (before !== after) throw new Error(`${label}: interaction did not pause onboarding autoplay`);
  await page.close();
}

const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, recordVideo: { dir: outputDir, size: { width: 1440, height: 1000 } } });
const auto = await context.newPage();
await auto.goto("http://127.0.0.1:4177/new-landing-page", { waitUntil: "domcontentloaded" });
await auto.locator(".nlp-first-hours").scrollIntoViewIfNeeded();
await auto.waitForTimeout(8500);
const video = await auto.video()!.path();
await auto.close();
await context.close();
await rename(video, path.join(outputDir, "account-channels-ready-autoplay.webm"));

const reduced = await open({ width: 390, height: 844 }, "reduce");
await reduced.locator(".nlp-setup-shell nav button").nth(2).click();
await reduced.screenshot({ path: path.join(outputDir, "mobile-ready-reduced-motion.png") });
await reduced.close();
await browser.close();
console.log("Onboarding interaction verification completed.");
