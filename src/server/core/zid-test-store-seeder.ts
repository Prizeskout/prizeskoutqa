type Obj=Record<string,unknown>;
type Headers=Record<string,string>;
const arr=(value:unknown):Obj[]=>Array.isArray(value)?value.filter(item=>item&&typeof item==="object") as Obj[]:[];
const text=(...values:unknown[])=>String(values.find(value=>typeof value==="string"||typeof value==="number")??"");

export const TEST_PRODUCTS=[
  {name:"Review Ready — Everyday Coffee",sku:"PS-ZID-001",price:80,cost:40,quantity:20,note:"Healthy margin"},
  {name:"Review Ready — Premium Coffee",sku:"PS-ZID-002",price:120,cost:62,quantity:20,note:"Healthy margin"},
  {name:"Margin Risk — Espresso",sku:"PS-ZID-003",price:100,cost:85,quantity:20,note:"Below the 18% floor"},
  {name:"Margin Risk — Cappuccino",sku:"PS-ZID-004",price:85,cost:74,quantity:20,note:"Below the 18% floor"},
  {name:"Out of Stock — Mocha",sku:"PS-ZID-005",price:75,cost:38,quantity:0,note:"Out of stock"},
  {name:"Cost Needed — Americano",sku:"PS-ZID-006",price:65,cost:null,quantity:20,note:"Missing cost"},
  {name:"Return Test — Cold Brew",sku:"PS-ZID-007",price:95,cost:44,quantity:20,note:"Use for the return order"},
  {name:"Loss Order — Coffee Bundle",sku:"PS-ZID-008",price:55,cost:65,quantity:20,note:"Selling price below verified cost"},
  {name:"Review Draft — Seasonal Box",sku:"PS-ZID-DRAFT-001",price:90,cost:45,quantity:10,note:"Unpublished draft",draft:true},
] as const;

export const TEST_COUPONS=[
  {name:"PrizeSkout Unsafe Margin Test",code:"PSMARGIN20",discount:20,note:"Expected to undermine the near-floor products"},
  {name:"PrizeSkout Safe Coupon Test",code:"PSSAFE5",discount:5,note:"Expected to remain safe for healthy products",productSkus:["PS-ZID-001","PS-ZID-002"]},
] as const;

export type SeedPreview={store:{id:string;title:string;url:string;test_store_confirmed:boolean};source_product:{id:string;name:string;sku:string}|null;products:typeof TEST_PRODUCTS;coupons:typeof TEST_COUPONS;existing:{products:string[];coupons:string[]};required_scopes:string[];manual_order_script:Array<{step:number;instruction:string}>;ready:boolean;blockers:string[];warnings:string[]};

async function zidJson(url:string,headers:Headers,init?:RequestInit){
  const response=await fetch(url,{...init,headers:{...headers,...(init?.headers??{})}});
  const payload=await response.json().catch(()=>({})) as Obj;
  return {response,payload};
}

function productRows(payload:Obj){return arr(payload.results).length?arr(payload.results):arr(payload.products).length?arr(payload.products):arr((payload.data as Obj|undefined)?.products);}
function couponRows(payload:Obj){return arr(payload.coupons).length?arr(payload.coupons):arr((payload.data as Obj|undefined)?.coupons);}

export async function previewZidTestSeed(headers:Headers):Promise<SeedPreview>{
  const [storeCall,productsCall,couponsCall]=await Promise.all([
    zidJson("https://api.zid.sa/v1/managers/account/store",headers),
    zidJson("https://api.zid.sa/v1/products/?page=1&page_size=100",headers),
    zidJson("https://api.zid.sa/v1/managers/store/coupons?page=1&per_page=100",headers),
  ]);
  if(!storeCall.response.ok)throw new Error(`Zid store details returned ${storeCall.response.status}.`);
  if(!productsCall.response.ok)throw new Error(`Zid products returned ${productsCall.response.status}. Products — Read is required.`);
  const store=(storeCall.payload.store??(storeCall.payload.data as Obj|undefined)?.store??storeCall.payload.data??{}) as Obj;
  const title=text(store.title,store.name),url=text(store.url,store.domain),id=text(store.id,store.uuid);
  const testStore=/\b(test|sandbox|demo|review)\b/i.test(title)||/zidtest/i.test(url);
  const products=productRows(productsCall.payload),coupons=couponsCall.response.ok?couponRows(couponsCall.payload):[];
  const source=products.find(product=>!text(product.sku).startsWith("PS-ZID-"))??products[0];
  const blockers:string[]=[];
  const warnings:string[]=[];
  if(!testStore)warnings.push(`Zid does not label store “${title||id}” as a test store. Execution requires explicit confirmation of this exact store ID.`);
  if(!source)blockers.push("No source product exists in Zid yet.");
  if(!couponsCall.response.ok)blockers.push("Coupons — Read is missing. Select Coupons — Read & Write, then reconnect Zid.");
  return {
    store:{id,title,url,test_store_confirmed:testStore},
    source_product:source?{id:text(source.id),name:typeof source.name==="object"?text((source.name as Obj).en,(source.name as Obj).ar):text(source.name),sku:text(source.sku)}:null,
    products:TEST_PRODUCTS,coupons:TEST_COUPONS,
    existing:{products:products.map(product=>text(product.sku)).filter(sku=>sku.startsWith("PS-ZID-")),coupons:coupons.map(coupon=>text(coupon.code)).filter(code=>code.startsWith("PS"))},
    required_scopes:["Store Core Details — Read","Products — Read & Write","Coupons — Read & Write","Orders — Read & Write","VATs — Read","Webhooks — Read & Write","Embedded Apps — Read & Write"],
    manual_order_script:[
      {step:1,instruction:"Place three normal checkout orders using PS-ZID-001, PS-ZID-002 and PS-ZID-007."},
      {step:2,instruction:"Place one checkout order for PS-ZID-008; its verified cost is higher than its selling price."},
      {step:3,instruction:"Place one checkout order for PS-ZID-003, then ask Copilot to cancel that order."},
      {step:4,instruction:"Apply PSMARGIN20 to a near-floor item and PSSAFE5 to a healthy item during checkout."},
      {step:5,instruction:"Return the PS-ZID-007 order through Zid after it is completed so the return is genuine."},
    ],
    ready:blockers.length===0,blockers,warnings,
  };
}

function productBody(item:typeof TEST_PRODUCTS[number],source:SeedPreview["source_product"]){
  return {
    name:{en:item.name,ar:item.name},description:{en:`PrizeSkout review fixture cloned from ${source?.name??"the connected test product"}. ${item.note}.`,ar:`PrizeSkout review fixture. ${item.note}.`},
    sku:item.sku,price:item.price,...(item.cost==null?{}:{cost:item.cost}),quantity:item.quantity,is_infinite:false,is_taxable:true,requires_shipping:false,
    is_draft:Boolean("draft" in item&&item.draft),is_published:!("draft" in item&&item.draft),keywords:["PrizeSkout","Zid review","test fixture"],
  };
}

function couponBody(item:typeof TEST_COUPONS[number],productIds:string[]=[]){
  const form=new FormData(),today=new Date(),end=new Date(today.getTime()+90*86400000);
  const fields:Record<string,string>={name:item.name,code:item.code,discount_type:"p",discount:String(item.discount),status:"1",applying_method:"CODE",apply_to:productIds.length?"products":"all",free_shipping:"0",free_cod:"0",total:"0",uses_total:"100",uses_customer:"10",date_start:today.toISOString().slice(0,10),date_end:end.toISOString().slice(0,10),conditions_criteria:"all",discount_strategy:"standard"};
  for(const [key,value] of Object.entries(fields))form.append(key,value);
  for(const productId of productIds)form.append("apply_to_array",productId);
  return form;
}

export async function executeZidTestSeed(headers:Headers,confirmation:{storeId:string;merchantConfirmedTestStore:boolean}){
  const preview=await previewZidTestSeed(headers);
  if(!preview.ready)throw new Error(preview.blockers.join(" "));
  if(confirmation.storeId!==preview.store.id)throw new Error("The connected Zid store changed after preview. Run the preview again.");
  if(!preview.store.test_store_confirmed&&!confirmation.merchantConfirmedTestStore)throw new Error(`Confirm that Zid store “${preview.store.title}” (ID ${preview.store.id}) is a disposable test store.`);
  const existingProducts=new Set(preview.existing.products),existingCoupons=new Set(preview.existing.coupons);
  const products:Array<{sku:string;status:string;id:string|null;message:string}>=[];
  for(const item of TEST_PRODUCTS){
    if(existingProducts.has(item.sku)){products.push({sku:item.sku,status:"existing",id:null,message:"Already present; no duplicate created."});continue;}
    const call=await zidJson("https://api.zid.sa/v1/products/",headers,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(productBody(item,preview.source_product))});
    if(!call.response.ok){products.push({sku:item.sku,status:"failed",id:null,message:`Zid returned ${call.response.status}: ${JSON.stringify(call.payload).slice(0,220)}`});continue;}
    products.push({sku:item.sku,status:"created",id:text(call.payload.id,(call.payload.data as Obj|undefined)?.id)||null,message:"Created in Zid."});
  }
  const currentProductsCall=await zidJson("https://api.zid.sa/v1/products/?page=1&page_size=100",headers);
  if(!currentProductsCall.response.ok)throw new Error(`Zid product verification returned ${currentProductsCall.response.status}.`);
  const productIdsBySku=new Map(productRows(currentProductsCall.payload).map(product=>[text(product.sku),text(product.id)]));
  const coupons:Array<{code:string;status:string;id:string|null;message:string}>=[];
  for(const item of TEST_COUPONS){
    if(existingCoupons.has(item.code)){coupons.push({code:item.code,status:"existing",id:null,message:"Already present; no duplicate created."});continue;}
    const targetSkus="productSkus" in item?item.productSkus:[];
    const targetIds=targetSkus.map(sku=>productIdsBySku.get(sku)??"").filter(Boolean);
    if(targetIds.length!==targetSkus.length){coupons.push({code:item.code,status:"failed",id:null,message:`Could not resolve every target product for ${item.code}; coupon was not created.`});continue;}
    const response=await fetch("https://api.zid.sa/v1/managers/store/coupons/add",{method:"POST",headers,body:couponBody(item,targetIds)});
    const payload=await response.json().catch(()=>({})) as Obj;
    const coupon=(payload.coupon??payload.data??{}) as Obj;
    coupons.push({code:item.code,status:response.ok?"created":"failed",id:response.ok?text(coupon.id,coupon.coupon_id)||null:null,message:response.ok?"Created in Zid.":`Zid returned ${response.status}: ${JSON.stringify(payload).slice(0,220)}`});
  }
  const verification=await previewZidTestSeed(headers);
  const missingProducts=TEST_PRODUCTS.filter(item=>!verification.existing.products.includes(item.sku)).map(item=>item.sku);
  const missingCoupons=TEST_COUPONS.filter(item=>!verification.existing.coupons.includes(item.code)).map(item=>item.code);
  return {ok:missingProducts.length===0&&missingCoupons.length===0,store:preview.store,products,coupons,verified:{products:TEST_PRODUCTS.length-missingProducts.length,coupons:TEST_COUPONS.length-missingCoupons.length,missing_products:missingProducts,missing_coupons:missingCoupons},manual_order_script:preview.manual_order_script,message:missingProducts.length||missingCoupons.length?"The setup is incomplete. Review failed items and permissions.":"The Zid review catalogue and coupons are ready. Complete the five genuine checkout orders next."};
}

export async function cleanupZidTestSeed(headers:Headers,confirmation:{storeId:string;merchantConfirmedTestStore:boolean}){
  const preview=await previewZidTestSeed(headers);
  if(confirmation.storeId!==preview.store.id)throw new Error("The connected Zid store changed after preview. Run the preview again.");
  if(!preview.store.test_store_confirmed&&!confirmation.merchantConfirmedTestStore)throw new Error("Cleanup requires explicit confirmation of the exact Zid test store.");
  const productsCall=await zidJson("https://api.zid.sa/v1/products/?page=1&page_size=100",headers),couponsCall=await zidJson("https://api.zid.sa/v1/managers/store/coupons?page=1&per_page=100",headers);
  const products=productRows(productsCall.payload).filter(product=>text(product.sku).startsWith("PS-ZID-"));
  const coupons=couponRows(couponsCall.payload).filter(coupon=>["PSMARGIN20","PSSAFE5"].includes(text(coupon.code)));
  const results:Array<{type:string;reference:string;status:string}>=[];
  for(const product of products){const id=text(product.id),response=await fetch(`https://api.zid.sa/v1/products/${encodeURIComponent(id)}/`,{method:"PATCH",headers:{...headers,"Content-Type":"application/json"},body:JSON.stringify({is_published:false,is_draft:true})});results.push({type:"product",reference:text(product.sku),status:response.ok?"unpublished":"failed"});}
  for(const coupon of coupons){const id=text(coupon.id,coupon.coupon_id),response=await fetch(`https://api.zid.sa/v1/managers/store/coupons/${encodeURIComponent(id)}`,{method:"DELETE",headers});results.push({type:"coupon",reference:text(coupon.code),status:response.ok?"deleted":"failed"});}
  return {ok:results.every(result=>result.status!=="failed"),results,message:"PrizeSkout test products were unpublished and test coupons were removed. Genuine test orders were retained as evidence."};
}
