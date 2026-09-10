import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import { pathToFileURL } from "node:url";

const videoPath = process.argv[2];
const outputDir = process.argv[3] ?? "output/walkthrough-review";
if (!videoPath) throw new Error("video path required");
await mkdir(outputDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
await page.setContent(`<style>html,body{margin:0;background:#000}video{width:100vw;height:100vh}</style><video controls></video>`);
await page.locator("video").evaluate((video, src) => {
  video.src = src;
}, pathToFileURL(videoPath).href);
await page.locator("video").evaluate((video) => new Promise<void>((resolve, reject) => {
  if (video.readyState >= 1) return resolve();
  video.addEventListener("loadedmetadata", () => resolve(), { once: true });
  video.addEventListener("error", () => reject(video.error), { once: true });
}));
const metadata = await page.locator("video").evaluate((video) => ({
  duration: video.duration, width: video.videoWidth, height: video.videoHeight,
}));
console.log(JSON.stringify(metadata));
const interval = metadata.duration <= 180 ? 5 : 10;
for (let time = 0; time < metadata.duration; time += interval) {
  await page.locator("video").evaluate((video, t) => new Promise<void>((resolve) => {
    video.addEventListener("seeked", () => resolve(), { once: true });
    video.currentTime = Math.min(t, video.duration - 0.1);
  }), time);
  await page.locator("video").screenshot({ path: `${outputDir}/frame-${String(Math.round(time)).padStart(4, "0")}.png` });
}
await browser.close();
