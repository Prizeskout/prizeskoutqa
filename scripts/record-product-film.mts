import { mkdir } from "node:fs/promises";
import { chromium, type Page } from "playwright";

const outputDir="output/product-film-raw";
await mkdir(outputDir,{recursive:true});

const browser=await chromium.launch({headless:true});
const context=await browser.newContext({
  viewport:{width:1920,height:1080},
  deviceScaleFactor:1,
  recordVideo:{dir:outputDir,size:{width:1920,height:1080}},
});
await context.addInitScript(()=>{
  localStorage.setItem("ps_merchant_id","00000000-0000-4000-8000-000000005100");
  localStorage.setItem("ps_access_code","PS-FILM-2026");
  localStorage.setItem("ps_connected","1");
  localStorage.setItem("ps_tour_v1_done","1");
});
const page=await context.newPage();

const installFilmOverlay=async()=>{
  await page.addStyleTag({content:`
      #ps-film-cursor{position:fixed;z-index:2147483647;width:22px;height:22px;border:3px solid #ff6412;border-radius:50%;pointer-events:none;transform:translate(-50%,-50%);box-shadow:0 0 0 7px rgba(255,100,18,.16),0 8px 24px rgba(10,27,58,.22);transition:width .12s,height .12s,background .12s;left:50%;top:50%}
      #ps-film-cursor.down{width:34px;height:34px;background:rgba(255,100,18,.18)}
      #ps-film-chapter{position:fixed;z-index:2147483646;right:38px;bottom:34px;max-width:560px;padding:15px 20px;border:1px solid rgba(255,255,255,.18);border-radius:14px;background:rgba(8,28,61,.94);color:white;box-shadow:0 18px 60px rgba(8,28,61,.28);font-family:"Plus Jakarta Sans",sans-serif;opacity:0;transform:translateY(14px);transition:opacity .28s,transform .28s}
      #ps-film-chapter.show{opacity:1;transform:translateY(0)}
      #ps-film-chapter small{display:block;color:#ff8a4c;font-size:11px;font-weight:900;letter-spacing:.12em;text-transform:uppercase;margin-bottom:5px}
      #ps-film-chapter strong{font-size:20px;line-height:1.25}
      #ps-film-flash{position:fixed;inset:0;z-index:2147483645;pointer-events:none;box-shadow:inset 0 0 0 4px rgba(255,100,18,0);transition:box-shadow .2s}
      #ps-film-flash.on{box-shadow:inset 0 0 0 4px rgba(255,100,18,.9)}
  `});
  await page.evaluate(`(() => {
    if(document.getElementById("ps-film-cursor")) return;
    const cursor=document.createElement("div"); cursor.id="ps-film-cursor";
    const chapter=document.createElement("div"); chapter.id="ps-film-chapter";
    const flash=document.createElement("div"); flash.id="ps-film-flash";
    document.body.append(cursor,chapter,flash);
    addEventListener("mousemove",event=>{cursor.style.left=event.clientX+"px";cursor.style.top=event.clientY+"px"});
    addEventListener("mousedown",()=>cursor.classList.add("down"));
    addEventListener("mouseup",()=>cursor.classList.remove("down"));
  })()`);
};

const pause=(ms:number)=>page.waitForTimeout(ms);
async function chapter(kicker:string,title:string,hold=1800){
  await page.evaluate(({kicker,title})=>{
    const node=document.getElementById("ps-film-chapter"); if(!node)return;
    node.innerHTML=`<small>${kicker}</small><strong>${title}</strong>`; node.classList.add("show");
  },{kicker,title});
  await pause(Math.round(hold*1.4));
  await page.evaluate(()=>document.getElementById("ps-film-chapter")?.classList.remove("show"));
  await pause(150);
}
async function clickNav(label:string){
  const button=page.getByRole("button",{name:label,exact:true}).first();
  await button.scrollIntoViewIfNeeded();
  await button.hover(); await pause(180); await button.click(); await pause(900);
}
async function filmClick(target:ReturnType<Page["locator"]>){
  await target.scrollIntoViewIfNeeded(); await target.hover(); await pause(250); await target.click(); await pause(900);
}

await page.goto("http://127.0.0.1:4177/dashboard/revenue-hub",{waitUntil:"commit",timeout:60000});
await page.waitForLoadState("networkidle",{timeout:60000});
await page.getByRole("button",{name:"Overview",exact:true}).first().waitFor({timeout:30000});
await page.getByText("Saffron Table — Doha",{exact:true}).waitFor({timeout:30000});
await installFilmOverlay();

await chapter("PRIZESKOUT", "From order to payout—verified.",2200);
await clickNav("Integrations");
await chapter("01 · CONNECT ONCE", "Snoonu is live for this controlled demonstration account.",1900);
const snoonu=page.getByText("Snoonu",{exact:true}).first(); if(await snoonu.count()) {await snoonu.hover(); await pause(1100);}
await chapter("NORMALIZED IN REAL TIME", "Orders, catalogue, branches, and settlements arrive through one governed channel.",1900);

await clickNav("Payout Recovery");
await chapter("02 · RECONSTRUCT THE PAYOUT", "PrizeSkout rebuilds what should have been paid and isolates two claims-ready discrepancies.",2200);
const firstCase=page.getByText(/Supported payout shortfall for order/).first(); if(await firstCase.count()){await firstCase.hover();await pause(1500);}

await clickNav("Catalog");
await chapter("03 · UNDERSTAND MARGIN", "Merchant-confirmed costs turn six Snoonu products into decision-ready economics.",1900);
await page.mouse.wheel(0,480); await pause(1400);
const product=page.getByText("Charcoal Chicken Platter",{exact:true}).first(); if(await product.count()){await product.hover();await pause(1200);}

await clickNav("Promotion Simulator");
await chapter("04 · TEST BEFORE LAUNCH", "Simulate campaign economics before a discount reaches the customer.",1800);
const discount=page.getByLabel(/Discount/i).first();
if(await discount.count()){await discount.hover();await discount.fill("15");await pause(900);}

await clickNav("Defend Loop");
await chapter("05 · PROTECT", "An 18% contribution floor governs every proposed pricing action.",1800);
const floor=page.getByRole("slider").first(); if(await floor.count()){await floor.hover();await floor.press("ArrowRight");await floor.press("ArrowLeft");await pause(1200);}

await clickNav("AI Store Manager");
await chapter("06 · ACT WITH APPROVAL", "The Store Manager prepares the work. The merchant remains in control.",1900);
const task=page.getByText("Prepare Snoonu products below the margin floor",{exact:true}).first(); if(await task.count()){await task.hover();await pause(1000);}
const approve=page.getByRole("button",{name:"Approve",exact:true}).first(); if(await approve.count()){await approve.hover();await pause(1000);}

await clickNav("CFO Copilot");
await chapter("07 · ASK THE BUSINESS QUESTION", "What did Snoonu owe us, what was missing, and what should we do next?",2100);
const copilotAnswer=page.getByText(/Snoonu|payout|recovery/i).last(); if(await copilotAnswer.count()){await copilotAnswer.hover();await pause(1400);}

await clickNav("Overview");
await chapter("PRIZESKOUT", "Know what every order actually earns.",2600);
await pause(1200);

const video=await page.video()?.path();
await context.close();
await browser.close();
console.log(video);
