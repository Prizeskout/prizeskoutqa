import { chromium } from "playwright";
import { mkdir, rename } from "node:fs/promises";
import path from "node:path";

const outputDir = path.resolve("output/live-dashboard-demo-review/hero-card-motion");
await mkdir(outputDir, { recursive: true });
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, recordVideo: { dir: outputDir, size: { width: 1440, height: 900 } } });
const page = await context.newPage();
await page.goto("http://127.0.0.1:4177/new-landing-page", { waitUntil: "domcontentloaded" });
await page.locator(".nlp.is-ready").waitFor();
const story = page.locator(".nlp-card-story");
await story.scrollIntoViewIfNeeded();
const seen = new Set<string>(await story.evaluate((element) => new Promise<string[]>((resolve) => {
  const values = new Set<string>([element.getAttribute("data-active") ?? ""]);
  const observer = new MutationObserver(() => {
    values.add(element.getAttribute("data-active") ?? "");
    if (values.size >= 5) {
      observer.disconnect();
      resolve([...values]);
    }
  });
  observer.observe(element, { attributes: true, attributeFilter: ["data-active"] });
  window.setTimeout(() => { observer.disconnect(); resolve([...values]); }, 14_000);
})));
for (const state of ["0", "1", "2", "3", "4"]) if (!seen.has(state)) throw new Error(`Autoplay did not show state ${state}`);
const fourth = story.locator(".nlp-system-card").nth(3);
await fourth.focus();
await page.waitForTimeout(300);
if (await story.getAttribute("data-active") !== "3") throw new Error("Keyboard focus did not select card 4");
await page.waitForTimeout(2800);
if (await story.getAttribute("data-active") !== "3") throw new Error("Keyboard focus did not pause autoplay");
await page.screenshot({ path: path.join(outputDir, "keyboard-selected.png") });
const video = await page.video()!.path();
await page.close();
await context.close();
await rename(video, path.join(outputDir, "causal-card-sequence.webm"));

const reduced = await browser.newPage({ viewport: { width: 390, height: 844 }, reducedMotion: "reduce" });
await reduced.goto("http://127.0.0.1:4177/new-landing-page", { waitUntil: "domcontentloaded" });
await reduced.locator(".nlp-card-story").scrollIntoViewIfNeeded();
await reduced.waitForTimeout(400);
const overflow = await reduced.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
if (overflow > 1) throw new Error(`Reduced-motion mobile overflow: ${overflow}px`);
await reduced.screenshot({ path: path.join(outputDir, "mobile-reduced-motion.png") });
await reduced.close();
await browser.close();
console.log("Hero card motion verification completed.");
