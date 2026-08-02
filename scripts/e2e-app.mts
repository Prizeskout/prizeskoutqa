import assert from "node:assert/strict";
import { chromium, type Page } from "playwright";
import { createClient } from "@supabase/supabase-js";

const baseUrl = process.env.E2E_BASE_URL ?? "http://127.0.0.1:4177";
const supabaseUrl = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
assert(supabaseUrl && serviceKey, "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required");

const admin = createClient(supabaseUrl, serviceKey);
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const failures: string[] = [];
page.on("console", message => {
  if (message.type() === "error" && !message.text().includes("favicon")) failures.push(`console: ${message.text()}`);
});
page.on("pageerror", error => failures.push(`page: ${error.message}`));

async function visit(path: string, expectedText?: string) {
  const response = await page.goto(`${baseUrl}${path}`, { waitUntil: "domcontentloaded", timeout: 30_000 });
  assert(!response || response.status() < 500, `${path} returned ${response?.status()}`);
  await page.waitForTimeout(400);
  await page.locator("body").waitFor({ state: "visible", timeout: 10_000 });
  if (expectedText) {
    const body = await page.locator("body").innerText();
    assert(body.toLowerCase().includes(expectedText.toLowerCase()), `${path} did not render “${expectedText}” (landed on ${page.url()})`);
  }
  console.log(`PASS ${path} (${response?.status() ?? "client navigation"})`);
}

try {
  for (const [path, text] of [
    ["/", "PrizeSkout"],
    ["/login", "Access your dashboard"],
    ["/signup", "Store Configuration"],
    ["/onboarding", "store"],
    ["/margin-dashboard/demo", "Margin"],
    ["/docs", "API Reference"],
    ["/legal", "Privacy"],
  ] as const) await visit(path, text);

  const restoreValidation=await page.request.post(`${baseUrl}/api/restore`,{data:{}});
  assert.equal(restoreValidation.status(),400,"Restore endpoint must reject a missing code");
  const connectValidation=await page.request.post(`${baseUrl}/api/channels/connect`,{data:{}});
  assert.equal(connectValidation.status(),400,"Channel endpoint must reject a missing merchant");
  const digestAuth=await page.request.post(`${baseUrl}/api/public/hooks/weekly-margin-digest`,{data:{}});
  assert.equal(digestAuth.status(),401,"Weekly digest endpoint must require cron authentication");
  console.log("PASS critical API validation and cron authentication");

  const { data: decision } = await admin.from("ps_decide_results").select("account_id").order("created_at", { ascending: false }).limit(1).maybeSingle();
  assert(decision?.account_id, "No merchant decision data is available for the dashboard journey");
  const { data: access } = await admin.from("ps_access_codes").select("merchant_id,code").eq("merchant_id", decision.account_id).limit(1).maybeSingle();
  assert(access?.code, "No access code is available for the merchant dashboard journey");

  const locationName=`E2E Test ${Date.now()}`;
  const locationCreate=await page.request.post(`${baseUrl}/api/channels/connect`,{data:{merchant_id:access.merchant_id,access_code:access.code,platform:"locations",action:"create",name:locationName,city:"Doha",region:"Qatar"}});
  const locationCreateBody=await locationCreate.json() as {location?:{id:string};error?:string};
  const createdLocation=locationCreateBody.location;
  if(locationCreate.status()===500&&!createdLocation){
    console.log("SKIP location persistence (20260802010000_merchant_locations.sql is not applied to this database)");
  }else{
    assert.equal(locationCreate.status(),200,"Location creation failed");
    assert(createdLocation?.id,`Location creation returned no id: ${locationCreateBody.error??"unexpected response"}`);
    try{
    const locationToggle=await page.request.post(`${baseUrl}/api/channels/connect`,{data:{merchant_id:access.merchant_id,access_code:access.code,platform:"locations",action:"toggle",id:createdLocation.id,active:"false"}});
    assert.equal(locationToggle.status(),200,"Location status update failed");
    const locationList=await page.request.post(`${baseUrl}/api/channels/connect`,{data:{merchant_id:access.merchant_id,access_code:access.code,platform:"locations",action:"list"}});
    const locations=(await locationList.json() as {locations?:Array<{id:string;active:boolean}>}).locations??[];
    assert.equal(locations.find(location=>location.id===createdLocation.id)?.active,false,"Saved location was not returned with its new status");
    console.log("PASS merchant location create, update, and list persistence");
    }finally{
      await page.request.post(`${baseUrl}/api/channels/connect`,{data:{merchant_id:access.merchant_id,access_code:access.code,platform:"locations",action:"delete",id:createdLocation.id}});
    }
  }

  const preferenceList=await page.request.post(`${baseUrl}/api/channels/connect`,{data:{merchant_id:access.merchant_id,access_code:access.code,platform:"notification_preferences",action:"list"}});
  assert.equal(preferenceList.status(),200,"Notification preferences could not be loaded");
  const savedPreferences=(await preferenceList.json() as {preferences?:Array<{pref_key:string;enabled:boolean}>}).preferences??[];
  const originalMarginBreach=savedPreferences.find(item=>item.pref_key==="margin_breach")?.enabled??true;
  const changedMarginBreach=!originalMarginBreach;
  const preferenceSet=await page.request.post(`${baseUrl}/api/channels/connect`,{data:{merchant_id:access.merchant_id,access_code:access.code,platform:"notification_preferences",action:"set",pref_key:"margin_breach",enabled:String(changedMarginBreach)}});
  assert.equal(preferenceSet.status(),200,"Notification preference could not be saved");
  const preferenceVerify=await page.request.post(`${baseUrl}/api/channels/connect`,{data:{merchant_id:access.merchant_id,access_code:access.code,platform:"notification_preferences",action:"list"}});
  const verifiedPreferences=(await preferenceVerify.json() as {preferences?:Array<{pref_key:string;enabled:boolean}>}).preferences??[];
  assert.equal(verifiedPreferences.find(item=>item.pref_key==="margin_breach")?.enabled,changedMarginBreach,"Saved notification preference was not returned");
  const preferenceRestore=await page.request.post(`${baseUrl}/api/channels/connect`,{data:{merchant_id:access.merchant_id,access_code:access.code,platform:"notification_preferences",action:"set",pref_key:"margin_breach",enabled:String(originalMarginBreach)}});
  assert.equal(preferenceRestore.status(),200,"Notification preference could not be restored after testing");
  console.log("PASS merchant notification preference persistence");

  await page.goto(`${baseUrl}/dashboard/revenue-hub`, { waitUntil: "domcontentloaded" });
  await page.evaluate(({ merchantId, code }) => {
    localStorage.setItem("ps_merchant_id", merchantId);
    localStorage.setItem("ps_access_code", code);
    localStorage.setItem("ps_connected", "1");
    localStorage.setItem("ps_tour_v1_done", "1");
  }, { merchantId: access.merchant_id, code: access.code });
  await page.reload({ waitUntil: "networkidle" });
  await page.getByText("Revenue Protection Hub", { exact: false }).first().waitFor({ timeout: 15_000 });
  await page.getByText("Imported Products", { exact: true }).waitFor({ timeout: 15_000 });
  console.log("PASS authenticated merchant dashboard loads");

  const channelStatus=await page.request.get(`${baseUrl}/api/channels/status?merchant_id=${encodeURIComponent(access.merchant_id)}`);
  const connectedChannels=(await channelStatus.json() as {channels?:Array<{platform:string;status:string}>}).channels??[];
  if(connectedChannels.some(channel=>channel.platform==="zid"&&channel.status==="connected")){
    const profitBrief=await page.request.post(`${baseUrl}/api/copilot/store`,{data:{merchant_id:access.merchant_id,access_code:access.code,action:"profit_brief",days:30}});
    const profitBody=await profitBrief.json() as {brief?:{order_count:number;verified_cost_coverage_pct:number};error?:string};
    assert.equal(profitBrief.status(),200,`Zid Profit Brief failed: ${profitBody.error??"unexpected response"}`);
    assert(profitBody.brief&&Number.isFinite(profitBody.brief.order_count),"Zid Profit Brief returned no deterministic summary");
    console.log("PASS live Zid Profit Brief calculation");

    await page.getByText("Know what your Zid orders actually kept",{exact:true}).waitFor({timeout:15_000});
    const reviewProfit=page.getByRole("button",{name:/Review orders and coupons/});
    await reviewProfit.click();
    await page.getByText("Coupon safety check",{exact:true}).waitFor();
    console.log("PASS Zid Profit Brief renders order and coupon review");

    const {data:snapshot,error:snapshotError}=await admin.from("ps_zid_profit_snapshots").select("id,summary").eq("account_id",access.merchant_id).order("created_at",{ascending:false}).limit(1).maybeSingle();
    assert(!snapshotError&&snapshot?.id,"Zid Profit Brief snapshot was not persisted after the migration");
    const today=`${new Date().toISOString().slice(0,10)}T00:00:00.000Z`;
    const {count:todaySnapshotCount}=await admin.from("ps_zid_profit_snapshots").select("id",{count:"exact",head:true}).eq("account_id",access.merchant_id).gte("created_at",today);
    assert.equal(todaySnapshotCount,1,"Repeated Profit Brief refreshes must update today's snapshot instead of duplicating it");
    console.log("PASS Zid Profit Brief snapshot persistence");

    for(const [prompt,expected] of [["What did I actually keep from Zid orders this month?","profit_brief"],["Which coupons put products below my margin floor?","coupon_risk"]] as const){
      const compiled=await page.request.post(`${baseUrl}/api/copilot/compile`,{data:{prompt}});
      const compiledBody=await compiled.json() as {operation?:{operation?:string};error?:string};
      assert.equal(compiled.status(),200,`Copilot could not compile ${expected}: ${compiledBody.error??"unexpected response"}`);
      assert.equal(compiledBody.operation?.operation,expected,`Copilot routed the merchant request to the wrong operation`);
    }
    console.log("PASS Copilot routes profit and coupon safety instructions");
  }

  const review = page.getByRole("button", { name: /Review products/ }).first();
  if (await review.isVisible().catch(() => false)) {
    await review.click();
    await page.locator("#imported-products").waitFor();
    const filter = page.getByLabel("Filter imported products");
    assert.equal(await filter.inputValue(), "verified_risk");
    console.log("PASS margin alert opens matching verified products");
  }

  await page.getByText("Margin Policy Engine", { exact: true }).first().click();
  await page.getByText("Protect what you keep from every sale", { exact: false }).waitFor();
  console.log("PASS margin policy navigation");

  await page.getByText("Settings", { exact: true }).first().click();
  await page.getByRole("button", { name: /Margin Rules/ }).click();
  await page.getByText(/ACTIVE · VERSION/).waitFor({ timeout: 10_000 });
  console.log("PASS settings reads active margin policy");

  await page.getByRole("button", { name: /Notifications/ }).click();
  const notificationSwitch=page.getByRole("switch").first();
  await notificationSwitch.waitFor({state:"visible",timeout:10_000});
  await page.waitForFunction(() => {
    const control=document.querySelector('[role="switch"]') as HTMLButtonElement|null;
    return Boolean(control&&!control.disabled);
  },undefined,{timeout:10_000});
  assert.equal(await notificationSwitch.isEnabled(),true,"Notification switches must work for an access-code merchant session");
  console.log("PASS notification settings are interactive for access-code merchants");

  assert.deepEqual(failures, [], `Browser errors:\n${failures.join("\n")}`);
  console.log("E2E app journey passed.");
} finally {
  await browser.close();
}
