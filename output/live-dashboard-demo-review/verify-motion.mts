import { chromium, type Page } from "playwright";
import { mkdir, rename } from "node:fs/promises";
import path from "node:path";

const baseUrl = "http://127.0.0.1:4177/new-landing-page";
const outputDir = path.resolve("output/live-dashboard-demo-review");
await mkdir(outputDir, { recursive: true });

const browser = await chromium.launch({ headless: true });

async function openPage(page: Page) {
  await page.goto(baseUrl, { waitUntil: "domcontentloaded", timeout: 45_000 });
  await page.locator("#product").waitFor({ timeout: 20_000 });
  await page.locator("#product").scrollIntoViewIfNeeded();
  await page.waitForTimeout(350);
}

async function verifyAll(viewport: { width: number; height: number }, label: string) {
  const page = await browser.newPage({ viewport });
  await openPage(page);
  for (let index = 0; index < 6; index += 1) {
    if (index === 0) {
      await page.getByRole("tab").nth(1).click();
      await page.waitForTimeout(100);
    }
    await page.getByRole("tab").nth(index).click();
    await page.locator(`.ldd[data-scene="${index}"][data-step="0"]`).waitFor();
    await page.locator(`.ldd[data-scene="${index}"][data-step="4"]`).waitFor({ timeout: 5200 });
  }
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  if (overflow > 1) throw new Error(`${label}: horizontal overflow ${overflow}px`);
  await page.screenshot({ path: path.join(outputDir, `${label}-completed.png`), fullPage: false });
  await page.close();
}

await verifyAll({ width: 1440, height: 1000 }, "desktop");
await verifyAll({ width: 390, height: 844 }, "mobile");

const autoContext = await browser.newContext({ viewport: { width: 1440, height: 1000 }, recordVideo: { dir: outputDir, size: { width: 1440, height: 1000 } } });
const autoPage = await autoContext.newPage();
await openPage(autoPage);
await autoPage.evaluate(() => {
  const tabs = Array.from(document.querySelectorAll<HTMLButtonElement>('[role="tab"]'));
  tabs[1]?.click();
  tabs[0]?.click();
});
await autoPage.waitForTimeout(36_500);
const autoVideo = await autoPage.video()!.path();
await autoPage.close();
await autoContext.close();
await rename(autoVideo, path.join(outputDir, "autoplay-all-six.webm"));

const directContext = await browser.newContext({ viewport: { width: 390, height: 844 }, recordVideo: { dir: outputDir, size: { width: 390, height: 844 } } });
const directPage = await directContext.newPage();
await openPage(directPage);
await directPage.getByRole("tab", { name: /Promotion Simulator/ }).click();
const slider = directPage.getByRole("slider", { name: "Promotion discount" });
await slider.focus();
await slider.press("Home");
for (let index = 0; index < 17; index += 1) await slider.press("ArrowRight");
await directPage.waitForTimeout(1200);
const selectedBefore = await directPage.getByRole("tab", { selected: true }).textContent();
await directPage.waitForTimeout(6500);
const selectedAfter = await directPage.getByRole("tab", { selected: true }).textContent();
if (selectedBefore !== selectedAfter) throw new Error("Direct interaction did not pause workflow rotation");
const directVideo = await directPage.video()!.path();
await directPage.close();
await directContext.close();
await rename(directVideo, path.join(outputDir, "direct-promotion-mobile.webm"));

const reduced = await browser.newPage({ viewport: { width: 390, height: 844 }, reducedMotion: "reduce" });
await openPage(reduced);
await reduced.locator('.ldd[data-step="4"]').waitFor();
const reducedOverflow = await reduced.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
if (reducedOverflow > 1) throw new Error(`Reduced motion: horizontal overflow ${reducedOverflow}px`);
await reduced.screenshot({ path: path.join(outputDir, "mobile-reduced-motion.png"), fullPage: false });
await reduced.close();

await browser.close();
console.log("Landing demo verification and recordings completed.");
