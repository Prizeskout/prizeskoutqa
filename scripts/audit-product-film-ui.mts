import { mkdir } from "node:fs/promises";
import { chromium } from "playwright";

const out="output/product-film-audit";
await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true});
const context=await browser.newContext({viewport:{width:1600,height:900},deviceScaleFactor:1});
const page=await context.newPage();
const errors:string[]=[];
page.on("console",message=>{if(message.type()==="error"&&!message.text().includes("favicon"))errors.push(message.text())});
page.on("pageerror",error=>errors.push(error.message));
page.on("response",response=>{if(response.status()>=400)errors.push(`${response.status()} ${response.url()}`)});
await page.goto("http://127.0.0.1:4177/dashboard/revenue-hub",{waitUntil:"commit",timeout:60000});
await page.evaluate(()=>{
  localStorage.setItem("ps_merchant_id","00000000-0000-4000-8000-000000005100");
  localStorage.setItem("ps_access_code","PS-FILM-2026");
  localStorage.setItem("ps_connected","1");
  localStorage.setItem("ps_tour_v1_done","1");
});
await page.reload({waitUntil:"networkidle",timeout:60000});
await page.getByRole("button",{name:"Overview",exact:true}).first().waitFor({timeout:20000});
for(const [label,file] of [
  ["Overview","01-overview"],["Integrations","02-integrations"],["Payout Recovery","03-recovery"],
  ["Catalog","04-catalog"],["Promotion Simulator","05-promotions"],["Defend Loop","06-defend"],
  ["AI Store Manager","07-manager"],["CFO Copilot","08-copilot"],["Evidence & History","09-evidence"],
] as const){
  await page.getByRole("button",{name:label,exact:true}).first().click();
  await page.waitForTimeout(1600);
  await page.screenshot({path:out+"/"+file+".png",fullPage:false});
  console.log(label+" -> "+page.url());
}
console.log(JSON.stringify({errors},null,2));
await browser.close();
