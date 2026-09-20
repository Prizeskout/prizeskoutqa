import { chromium } from "playwright";
import { pathToFileURL } from "node:url";
import path from "node:path";
const directory=path.dirname(new URL(import.meta.url).pathname.replace(/^\/(.:)/,"$1"));
const source=path.join(directory,"prizeskout-live-on-zid-v1.html");
const formats=[
  {name:"linkedin",width:1200,height:1200,query:""},
  {name:"facebook",width:1200,height:1200,query:""},
  {name:"instagram",width:1080,height:1080,query:""},
  {name:"tiktok",width:1080,height:1920,query:"?format=tiktok"},
];
const browser=await chromium.launch({headless:true});
for(const f of formats){const page=await browser.newPage({viewport:{width:f.width,height:f.height},deviceScaleFactor:1});await page.goto(pathToFileURL(source).href+f.query,{waitUntil:"networkidle"});const out=path.join(directory,`prizeskout-live-on-zid-${f.name}-v1.png`);await page.screenshot({path:out,fullPage:false});await page.close();console.log(out)}
await browser.close();
