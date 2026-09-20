import { chromium } from "playwright";
import { pathToFileURL } from "node:url";
import path from "node:path";

const directory = path.dirname(new URL(import.meta.url).pathname.replace(/^\/(.:)/, "$1"));
const source = path.join(directory, "prizeskout-linkedin-cover-v1.html");
const destination = path.join(directory, "prizeskout-linkedin-cover-v1.png");
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1128, height: 191 }, deviceScaleFactor: 1 });
await page.goto(pathToFileURL(source).href, { waitUntil: "networkidle" });
await page.screenshot({ path: destination, fullPage: false });
await browser.close();
console.log(destination);
