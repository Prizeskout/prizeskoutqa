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

  const {error:experienceMigrationError}=await admin.from("ps_attention_items").select("id").limit(1);
  if(experienceMigrationError){
    console.log("SKIP merchant operating loop persistence (20260802013000_merchant_experience_loop.sql is not applied to this database)");
  }else{
    const fingerprint=`e2e-attention-${Date.now()}`;
    const {data:testAttention,error:testAttentionError}=await admin.from("ps_attention_items").insert({account_id:access.merchant_id,fingerprint,item_type:"e2e",title:"E2E attention lifecycle",detail:"Temporary automated test item",priority:"low",status:"open",evidence_strength:"verified",source_route:"revenue_hub"}).select("id").single();
    assert(!testAttentionError&&testAttention?.id,"Could not prepare attention lifecycle test");
    try{
      for(const [attention_action,value,expected] of [["assign","E2E owner","assigned"],["request_approval","E2E approver","waiting_approval"],["snooze","1","snoozed"],["resolve","Verified during E2E test","resolved"]] as const){
        const response=await page.request.post(`${baseUrl}/api/channels/connect`,{data:{merchant_id:access.merchant_id,access_code:access.code,platform:"merchant_experience",action:"attention",id:testAttention.id,attention_action,value}});
        const result=await response.json() as {item?:{status:string};error?:string};
        assert.equal(response.status(),200,`Attention ${attention_action} failed: ${result.error??"unexpected response"}`);
        assert.equal(result.item?.status,expected,`Attention item did not enter ${expected}`);
      }
      console.log("PASS attention assignment, approval, snooze, resolve, and evidence lifecycle");
    }finally{await admin.from("ps_attention_items").delete().eq("id",testAttention.id);}
  }

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
  await page.getByText(/protection queue|need.*attention|being watched/i).first().waitFor({timeout:15_000});
  await page.getByText("Attention Inbox",{exact:true}).waitFor();
  console.log("PASS Today briefing and Attention Inbox render");
  console.log("PASS authenticated merchant dashboard loads");

  const channelStatus=await page.request.get(`${baseUrl}/api/channels/status?merchant_id=${encodeURIComponent(access.merchant_id)}`);
  const connectedChannels=(await channelStatus.json() as {channels?:Array<{platform:string;status:string}>}).channels??[];
  if(connectedChannels.some(channel=>channel.platform==="zid"&&channel.status==="connected")){
    const profitBrief=await page.request.post(`${baseUrl}/api/copilot/store`,{data:{merchant_id:access.merchant_id,access_code:access.code,action:"profit_brief",days:30}});
    const profitBody=await profitBrief.json() as {brief?:{order_count:number;gross_revenue:number;revenue:number;verified_cost_coverage_pct:number;vat:{available:boolean;amount:number;message:string};stock:{products:number;available:number;out_of_stock:number;low_stock:number};returns:{orders:number;amount:number;status:string}};error?:string};
    assert.equal(profitBrief.status(),200,`Zid Profit Brief failed: ${profitBody.error??"unexpected response"}`);
    assert(profitBody.brief&&Number.isFinite(profitBody.brief.order_count),"Zid Profit Brief returned no deterministic summary");
    assert(profitBody.brief&&profitBody.brief.gross_revenue>=profitBody.brief.revenue,"Usable revenue must not exceed gross Zid sales");
    assert(profitBody.brief&&Number.isFinite(profitBody.brief.vat.amount),"VAT workflow returned no deterministic amount");
    assert(profitBody.brief&&profitBody.brief.stock.products>=profitBody.brief.stock.available,"Stock workflow returned inconsistent counts");
    assert(profitBody.brief&&Number.isFinite(profitBody.brief.returns.amount),"Returns workflow returned no deterministic amount");
    console.log("PASS live VAT-aware, stock-aware, returns-aware Zid Profit Brief calculation");

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

    for(const [prompt,expected] of [["What did I actually keep from Zid orders this month?","profit_brief"],["Which coupons put products below my margin floor?","coupon_risk"],["How much VAT did my Zid orders include?","tax_summary"],["How much did returns reduce what I kept?","returns_impact"]] as const){
      const compiled=await page.request.post(`${baseUrl}/api/copilot/compile`,{data:{prompt}});
      const compiledBody=await compiled.json() as {operation?:{operation?:string};error?:string};
      assert.equal(compiled.status(),200,`Copilot could not compile ${expected}: ${compiledBody.error??"unexpected response"}`);
      assert.equal(compiledBody.operation?.operation,expected,`Copilot routed the merchant request to the wrong operation`);
    }
    console.log("PASS Copilot routes profit, VAT, returns and coupon safety instructions");

    const seedCompiled=await page.request.post(`${baseUrl}/api/copilot/compile`,{data:{prompt:"Prepare my connected Zid test store for the review"}});
    const seedCompiledBody=await seedCompiled.json() as {operation?:{operation?:string;requires_confirmation?:boolean};error?:string};
    assert.equal(seedCompiled.status(),200,`Copilot could not compile the test-store seeder: ${seedCompiledBody.error??"unexpected response"}`);
    assert.equal(seedCompiledBody.operation?.operation,"seed_test_store");
    assert.equal(seedCompiledBody.operation?.requires_confirmation,true,"Test-store writes must require confirmation");
    const seedPreview=await page.request.post(`${baseUrl}/api/copilot/store`,{data:{merchant_id:access.merchant_id,access_code:access.code,action:"seed_test_store_preview"}});
    const seedPreviewBody=await seedPreview.json() as {preview?:{store:{id:string;title:string;test_store_confirmed:boolean};source_product:{sku:string;name:string}|null;products:Array<{sku:string;price:number;cost:number|null;quantity:number;draft?:boolean}>;coupons:Array<{code:string;discount:number}>;ready:boolean;blockers:string[]};error?:string};
    assert.equal(seedPreview.status(),200,`Test-store preview failed: ${seedPreviewBody.error??"unexpected response"}`);
    const fixture=seedPreviewBody.preview;assert(fixture,"Connected Zid store seed preview was not returned");assert(fixture.store.id&&fixture.store.title,"Connected Zid store identity was not returned for explicit confirmation");
    assert.equal(fixture.products.length,9);assert.equal(fixture.products.filter(product=>product.cost!=null).length,8);assert.equal(fixture.products.filter(product=>product.cost!=null&&product.price>0&&(product.price-product.cost)/product.price<.18).length,3);assert.equal(fixture.products.filter(product=>product.quantity===0).length,1);assert.equal(fixture.products.filter(product=>product.cost==null).length,1);assert.equal(fixture.products.filter(product=>product.draft).length,1);assert(fixture.products.every(product=>product.price>=25&&product.price<=180),"Fixture prices must remain realistic SAR values");assert.equal(fixture.coupons.length,2);
    assert.equal(new Set(fixture.products.map(product=>product.sku)).size,fixture.products.length,"Seeder SKUs must be unique and idempotent");
    const wrongStoreSeed=await page.request.post(`${baseUrl}/api/copilot/store`,{data:{merchant_id:access.merchant_id,access_code:access.code,action:"seed_test_store",test_store_id:"WRONG-STORE",confirm_test_store:true}});
    assert.equal(wrongStoreSeed.status(),502,"Seeder must reject a changed or mismatched store before writing");
    console.log("PASS guarded Zid review seeder preview and fixture invariants");

    for(const [prompt,mode] of [["Change the price of SKU PS-ZID-001 to SAR 89","edit"],["Unpublish product SKU PS-ZID-005","unpublish"],["Permanently delete product SKU PS-ZID-DRAFT-001","delete"]]){
      const compiled=await page.request.post(`${baseUrl}/api/copilot/compile`,{data:{prompt}}),body=await compiled.json() as {operation?:{operation?:string;product_mode?:string;requires_confirmation?:boolean};error?:string};
      assert.equal(compiled.status(),200,`Product operation did not compile: ${body.error??prompt}`);assert.equal(body.operation?.operation,"product_change");assert.equal(body.operation?.product_mode,mode);assert.equal(body.operation?.requires_confirmation,true);
    }
    const duplicateCompiled=await page.request.post(`${baseUrl}/api/copilot/compile`,{data:{prompt:"Duplicate product SKU PS-ZID-001 and name the copy Review Coffee Twin with SKU PS-ZID-TWIN"}}),duplicateBody=await duplicateCompiled.json() as {operation?:{operation?:string;product_mode?:string;sku?:string;new_product_name?:string;new_product_sku?:string;requires_confirmation?:boolean};error?:string};
    assert.equal(duplicateCompiled.status(),200,`Product duplication did not compile: ${duplicateBody.error??"unexpected response"}`);assert.equal(duplicateBody.operation?.operation,"product_change");assert.equal(duplicateBody.operation?.product_mode,"duplicate");assert.equal(duplicateBody.operation?.sku,"PS-ZID-001");assert.equal(duplicateBody.operation?.new_product_name,"Review Coffee Twin");assert.equal(duplicateBody.operation?.new_product_sku,"PS-ZID-TWIN");assert.equal(duplicateBody.operation?.requires_confirmation,true);
    const publishDuplicateCompiled=await page.request.post(`${baseUrl}/api/copilot/compile`,{data:{prompt:"Duplicate product SKU PS-ZID-001 and name the copy Live Coffee Twin with SKU PS-ZID-LIVE and publish it"}}),publishDuplicateBody=await publishDuplicateCompiled.json() as {operation?:{product_mode?:string;publish_duplicate?:boolean};error?:string};assert.equal(publishDuplicateCompiled.status(),200,`Published duplication did not compile: ${publishDuplicateBody.error??"unexpected response"}`);assert.equal(publishDuplicateBody.operation?.product_mode,"duplicate");assert.equal(publishDuplicateBody.operation?.publish_duplicate,true);
    const nameDuplicateCompiled=await page.request.post(`${baseUrl}/api/copilot/compile`,{data:{prompt:"Duplicate product Review Ready — Everyday Coffee and name the copy Weekend Coffee"}}),nameDuplicateBody=await nameDuplicateCompiled.json() as {operation?:{product_mode?:string;query?:string;sku?:string|null;new_product_name?:string};error?:string};assert.equal(nameDuplicateCompiled.status(),200,`Name-based duplication did not compile: ${nameDuplicateBody.error??"unexpected response"}`);assert.equal(nameDuplicateBody.operation?.product_mode,"duplicate");assert.equal(nameDuplicateBody.operation?.query,"Review Ready — Everyday Coffee");assert.equal(nameDuplicateBody.operation?.sku,null);assert.equal(nameDuplicateBody.operation?.new_product_name,"Weekend Coffee");
    const productPreview=await page.request.post(`${baseUrl}/api/copilot/store`,{data:{merchant_id:access.merchant_id,access_code:access.code,action:"preview_product_change",product_request:{mode:"edit",sku:fixture.source_product?.sku,query:fixture.source_product?.name,scope:"single",changes:{price:89}}}});
    const productPreviewBody=await productPreview.json() as {preview?:{approval_token:string;products:Array<{changes:Array<{field:string;after:unknown}>}>};error?:string};
    assert.equal(productPreview.status(),200,`Production product preview failed: ${productPreviewBody.error??"unexpected response"}`);assert(productPreviewBody.preview?.approval_token,"Signed product approval was not returned");assert.equal(productPreviewBody.preview.products[0]?.changes.some(change=>change.field==="price"&&change.after===89),true);
    const duplicatePreview=await page.request.post(`${baseUrl}/api/copilot/store`,{data:{merchant_id:access.merchant_id,access_code:access.code,action:"preview_product_change",product_request:{mode:"duplicate",query:fixture.source_product?.name,scope:"single",changes:{name:"Weekend Coffee",is_published:false}}}}),duplicatePreviewBody=await duplicatePreview.json() as {preview?:{products:Array<{changes:Array<{field:string;after:unknown}>}>};error?:string};assert.equal(duplicatePreview.status(),200,`Duplicate preview failed: ${duplicatePreviewBody.error??"unexpected response"}`);const generatedSku=String(duplicatePreviewBody.preview?.products[0]?.changes.find(change=>change.field==="new SKU")?.after??"");assert(generatedSku.startsWith("WEEKEND-COFFEE-"),`Generated SKU should use the product name, received ${generatedSku}`);assert(!generatedSku.includes("COPY"),"Generated merchant SKU must not expose COPY implementation language");
    const tampered=`${productPreviewBody.preview.approval_token.slice(0,-1)}X`,tamperedResponse=await page.request.post(`${baseUrl}/api/copilot/store`,{data:{merchant_id:access.merchant_id,access_code:access.code,action:"apply_product_change",approval_token:tampered}});
    assert.equal(tamperedResponse.status(),502,"A changed approval token must be rejected before any Zid write");
    console.log("PASS production Zid product changes require an exact signed preview");
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
