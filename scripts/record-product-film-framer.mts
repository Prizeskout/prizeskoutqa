import { mkdir } from "node:fs/promises";
import { chromium, type Page } from "playwright";

const outputDir = "output/product-film-framer-raw";
await mkdir(outputDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 1920, height: 1080 },
  deviceScaleFactor: 1,
  recordVideo: { dir: outputDir, size: { width: 1920, height: 1080 } },
});

await context.addInitScript(() => {
  localStorage.setItem("ps_merchant_id", "00000000-0000-4000-8000-000000005100");
  localStorage.setItem("ps_access_code", "PS-FILM-2026");
  localStorage.setItem("ps_connected", "1");
  localStorage.setItem("ps_tour_v1_done", "1");
});

const page = await context.newPage();
const pause = (ms: number) => page.waitForTimeout(ms);

async function installCursor() {
  await page.addStyleTag({ content: `
    #ps-natural-cursor{position:fixed;z-index:2147483647;width:12px;height:12px;border:2px solid #ff6412;border-radius:50%;pointer-events:none;transform:translate(-50%,-50%);box-shadow:0 3px 10px rgba(8,28,61,.22);left:50%;top:50%;transition:transform .09s,background .09s}
    #ps-natural-cursor.down{transform:translate(-50%,-50%) scale(.72);background:#ff6412}
  ` });
  await page.evaluate(`(() => {
    const cursor=document.createElement("div");cursor.id="ps-natural-cursor";document.body.append(cursor);
    addEventListener("mousemove",e=>{cursor.style.left=e.clientX+"px";cursor.style.top=e.clientY+"px"});
    addEventListener("mousedown",()=>cursor.classList.add("down"));
    addEventListener("mouseup",()=>cursor.classList.remove("down"));
  })()`);
}

async function nav(label: string, settle = 650) {
  const target = page.getByRole("button", { name: label, exact: true }).first();
  await target.scrollIntoViewIfNeeded();
  await target.hover();
  await pause(90);
  await target.click();
  await pause(settle);
}

async function hoverText(pattern: string | RegExp, hold = 650) {
  const target = page.getByText(pattern, { exact: typeof pattern === "string" }).first();
  if (await target.count()) {
    await target.scrollIntoViewIfNeeded();
    await target.hover();
    await pause(hold);
  }
}

await page.goto("http://127.0.0.1:4177/dashboard/revenue-hub", { waitUntil: "commit", timeout: 60_000 });
await page.waitForLoadState("networkidle", { timeout: 60_000 });
await page.getByRole("button", { name: "Overview", exact: true }).first().waitFor({ timeout: 30_000 });
await installCursor();

// One causal journey: connected sources -> payout evidence -> product economics ->
// simulation -> governed action -> answer -> recorded outcome.
await pause(900);
await nav("Integrations", 550);
await hoverText("Snoonu", 650);
await page.mouse.wheel(0, 360);
await pause(500);

await nav("Payout Recovery", 600);
await hoverText(/Supported payout shortfall for order/, 650);
await page.mouse.wheel(0, 280);
await pause(450);

await nav("Catalog", 600);
await page.mouse.wheel(0, 430);
await hoverText("Charcoal Chicken Platter", 600);

await nav("Promotion Simulator", 550);
const discount = page.getByLabel(/Discount/i).first();
if (await discount.count()) {
  await discount.hover();
  await discount.click();
  await discount.fill("15");
  await pause(650);
}

await nav("Defend Loop", 550);
const floor = page.getByRole("slider").first();
if (await floor.count()) {
  await floor.hover();
  await floor.press("ArrowRight");
  await pause(220);
  await floor.press("ArrowLeft");
  await pause(500);
}

await nav("AI Store Manager", 600);
await hoverText("Prepare Snoonu products below the margin floor", 550);
const approve = page.getByRole("button", { name: "Approve", exact: true }).first();
if (await approve.count()) {
  await approve.hover();
  await pause(420);
}

await nav("CFO Copilot", 600);
const input = page.getByPlaceholder(/Ask about your business/i).first();
if (await input.count() && await input.isVisible()) {
  await input.click();
  await input.fill("What did Snoonu owe us?");
  await pause(500);
}
await page.mouse.wheel(0, 320);
await pause(650);

await nav("Overview", 700);
await page.mouse.move(1460, 255, { steps: 8 });
await pause(950);

const video = await page.video()?.path();
await context.close();
await browser.close();
console.log(video);
