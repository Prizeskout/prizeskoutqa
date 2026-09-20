import { chromium } from "playwright";
import { pathToFileURL } from "node:url";
import path from "node:path";

const directory = path.dirname(new URL(import.meta.url).pathname.replace(/^\/(.:)/, "$1"));
const source = path.join(directory, "prizeskout-qatar-campaign-v3.html");
const formats = [
  { name: "linkedin", width: 1200, height: 1500, query: "" },
  { name: "instagram", width: 1080, height: 1350, query: "" },
  { name: "tiktok", width: 1080, height: 1920, query: "?format=tiktok" },
];
const browser = await chromium.launch({ headless: true });
for (const format of formats) {
  const page = await browser.newPage({ viewport: { width: format.width, height: format.height }, deviceScaleFactor: 1 });
  await page.goto(pathToFileURL(source).href + format.query, { waitUntil: "networkidle" });
  const destination = path.join(directory, `prizeskout-qatar-announcement-${format.name}-v3.png`);
  await page.screenshot({ path: destination, fullPage: false });
  await page.close();
  console.log(destination);
}
await browser.close();
