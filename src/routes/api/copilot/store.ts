import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { buildZidProfitBrief } from "@/server/core/zid-profit-brief";
import { cleanupZidTestSeed,executeZidTestSeed,previewZidTestSeed } from "@/server/core/zid-test-store-seeder";
import { executeZidProductChange,previewZidProductChange,type ProductChangeRequest } from "@/server/core/zid-product-operations";
import { displayProductName, productMatches as matchesZidProduct } from "@/server/core/zid-product-match";
import { safePublicFetch } from "@/server/safe-outbound-url";

const json=(data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers:{"Content-Type":"application/json"}});

export const Route=createFileRoute("/api/copilot/store")({server:{handlers:{POST:async({request})=>{
  const body=await request.json().catch(()=>null) as {merchant_id?:string;access_code?:string;action?:string;days?:number;order_id?:string;order_status?:string;product_name?:string;product_sku?:string;product_price?:number;product_cost?:number;product_quantity?:number;product_infinite?:boolean;publish_product?:boolean;coupon_mode?:string;coupon_code?:string;coupon_name?:string;coupon_discount_pct?:number;coupon_start_date?:string;query?:string;category?:string;customer_query?:string;loyalty_points?:number;loyalty_direction?:string;loyalty_reason?:string;refund_reverse_id?:string;refund_amount?:number;refund_method?:string;image_url?:string;image_alt?:string;variant_option?:string;variant_values?:string[];variant_price?:number;variant_quantity?:number;scheduled_action?:string;scheduled_value?:number;execute_at?:string;test_store_id?:string;confirm_test_store?:boolean;product_request?:ProductChangeRequest;approval_token?:string}|null;
  const merchantId=body?.merchant_id?.trim();
  const accessCode=body?.access_code?.trim().toUpperCase();
  if(!merchantId||!accessCode)return json({error:"merchant_id and access_code are required"},400);
  const {data:code}=await supabaseAdmin.from("ps_access_codes" as never).select("merchant_id").eq("code",accessCode).maybeSingle() as {data:{merchant_id:string}|null};
  if(!code||code.merchant_id!==merchantId)return json({error:"Invalid access code"},403);
  const {data:channel}=await supabaseAdmin.from("ps_merchant_channels").select("bearer_token,manager_token,metadata,status,licensee_id,merchant_id").eq("account_id",merchantId).eq("platform","zid").maybeSingle();
  if(!channel||channel.status!=="connected"||!channel.bearer_token)return json({error:"Zid is not connected."},400);
  const authorization=channel.bearer_token.startsWith("Bearer ")?channel.bearer_token:`Bearer ${channel.bearer_token}`;
  const metadata=(channel.metadata??{}) as Record<string,unknown>;
  const headers:Record<string,string>={Authorization:authorization,"X-Manager-Token":channel.manager_token??"","Access-Token":channel.manager_token??"",...(metadata.store_id?{"Store-Id":String(metadata.store_id)}:{}),Role:"Manager",Accept:"application/json","Accept-Language":"en"};
  const nameOf=(value:unknown)=>displayProductName(value);
  class ProductMatchError extends Error{candidates:Array<{id:string;name:string;sku:string;is_published:boolean}>;constructor(message:string,candidates:Array<{id:string;name:string;sku:string;is_published:boolean}>){super(message);this.candidates=candidates;}}
  const matchErrorPayload=(error:unknown)=>({error:error instanceof Error?error.message:String(error),...(error instanceof ProductMatchError?{candidates:error.candidates}:{})});
  const listAllProducts=async()=>{const products:Array<Record<string,unknown>>=[];for(let page=1;page<=50;page++){const response=await fetch(`https://api.zid.sa/v1/products/?page=${page}&page_size=100`,{headers}),payload=await response.json().catch(()=>({})) as Record<string,unknown>;if(!response.ok)throw new Error(`Zid products returned ${response.status}.`);const rows=(Array.isArray(payload.results)?payload.results:Array.isArray(payload.products)?payload.products:[]) as Array<Record<string,unknown>>;products.push(...rows);if(rows.length<100)break;}return products;};
  const findExactProduct=async(queryValue:string)=>{const rows=await listAllProducts(),exact=rows.filter(product=>matchesZidProduct(product,queryValue,true)),matches=exact.length?exact:rows.filter(product=>matchesZidProduct(product,queryValue,false));if(matches.length!==1){const candidates=matches.slice(0,10).map(p=>({id:String(p.id??""),name:nameOf(p),sku:String(p.sku??""),is_published:Boolean(p.is_published)}));throw new ProductMatchError(matches.length?`I found ${matches.length} products matching “${queryValue.trim()}”. Choose the intended SKU below before I change anything.`:"No Zid product matched that name or SKU. I refreshed the full catalogue before checking.",candidates);}return matches[0];};
  if(body?.action==="product_image_upload"){
    try{const product=await findExactProduct(body.query??""),source=await safePublicFetch(body.image_url??"");const type=source.headers.get("content-type")??"",declaredSize=Number(source.headers.get("content-length")??0);if(declaredSize>10*1024*1024)return json({error:"The image is larger than 10 MB."},422);if(!source.ok||!type.startsWith("image/"))return json({error:`That URL did not return an image (${source.status}). Replace the placeholder with a direct public HTTPS link to a JPG, PNG, or WebP image.`},422);const bytes=await source.arrayBuffer();if(bytes.byteLength>10*1024*1024)return json({error:"The image is larger than 10 MB."},422);const form=new FormData();form.set("image",new Blob([bytes],{type}),`product.${type.split("/")[1]?.split(";")[0]||"jpg"}`);form.set("alt_text",body.image_alt?.trim()||nameOf(product.name));const id=String(product.id??""),upload=await fetch(`https://api.zid.sa/v1/products/${encodeURIComponent(id)}/images/`,{method:"POST",headers,body:form}),result=await upload.json().catch(()=>({})) as Record<string,unknown>;if(!upload.ok)return json({error:`Zid rejected the image (${upload.status}): ${JSON.stringify(result).slice(0,220)}`},502);const verify=await fetch(`https://api.zid.sa/v1/products/${encodeURIComponent(id)}/images/`,{headers}),list=await verify.json().catch(()=>({})) as Record<string,unknown>,rows=(Array.isArray(list.results)?list.results:Array.isArray(list.images)?list.images:[]) as Array<Record<string,unknown>>,createdId=String(result.id??""),confirmed=Boolean(createdId&&rows.some(row=>String(row.id??"")===createdId));return json({ok:true,confirmed,action_id:`PS-IMAGE-${Date.now().toString(36).toUpperCase()}`,message:confirmed?`The new image is now attached to ${nameOf(product.name)} and confirmed in Zid.`:"Zid accepted the image, but it was not yet visible in readback.",product:{id,name:nameOf(product.name),sku:product.sku},image:result});}catch(error){return json(matchErrorPayload(error),422);}
  }
  if(body?.action==="variant_create"){
    try{const product=await findExactProduct(body.query??""),values=(body.variant_values??[]).map(v=>v.trim()).filter(Boolean),option=(body.variant_option??"Option").trim(),price=Number(body.variant_price),quantity=body.variant_quantity==null?null:Number(body.variant_quantity);if(!values.length||!(price>0))return json({error:"At least one variant value and a positive price are required."},400);
      const slugBase=option.toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"")||"option",attributeList=await fetch("https://api.zid.sa/v1/attributes/",{headers}),attributePayload=await attributeList.json().catch(()=>({})) as Record<string,unknown>,attributeRows=(Array.isArray(attributePayload.results)?attributePayload.results:[]) as Array<Record<string,unknown>>;let attribute=attributeRows.find(row=>String(row.name??"").toLowerCase()===option.toLowerCase());
      if(!attribute){const created=await fetch("https://api.zid.sa/v1/attributes/",{method:"POST",headers:{...headers,"Content-Type":"application/json"},body:JSON.stringify({name:option,slug:slugBase,is_extra:false,is_enabled:true,display_order:null})}),payload=await created.json().catch(()=>({})) as Record<string,unknown>;if(!created.ok)throw new Error(`Zid could not create the ${option} attribute (${created.status}): ${JSON.stringify(payload).slice(0,180)}`);attribute=payload;}
      const attributeId=String(attribute.id??""),attributeSlug=String(attribute.slug??slugBase);const presetsCall=await fetch(`https://api.zid.sa/v1/attributes/${encodeURIComponent(attributeId)}/presets/`,{headers}),presetsPayload=await presetsCall.json().catch(()=>({})) as Record<string,unknown>,presets=(Array.isArray(presetsPayload.results)?presetsPayload.results:Array.isArray(presetsPayload.presets)?presetsPayload.presets:[]) as Array<Record<string,unknown>>;
      for(const value of values)if(!presets.some(row=>String(row.value??"").toLowerCase()===value.toLowerCase())){const created=await fetch(`https://api.zid.sa/v1/attributes/${encodeURIComponent(attributeId)}/presets/`,{method:"POST",headers:{...headers,"Content-Type":"application/json"},body:JSON.stringify({value:{en:value,ar:value}})});if(!created.ok)throw new Error(`Zid could not create variant choice ${value} (${created.status}): ${(await created.text()).slice(0,180)}`);}
      const base=String(product.sku??nameOf(product.name)).replace(/[^A-Z0-9]+/gi,"-").replace(/^-|-$/g,"").toUpperCase().slice(0,45);let locationId=String(metadata.default_location_id??metadata.location_id??"");if(quantity!=null&&!locationId){const locationsCall=await fetch("https://api.zid.sa/v1/locations/",{headers}),locationsPayload=await locationsCall.json().catch(()=>({})) as Record<string,unknown>,locations=(Array.isArray(locationsPayload.results)?locationsPayload.results:Array.isArray(locationsPayload.locations)?locationsPayload.locations:[]) as Array<Record<string,unknown>>,location=locations.find(row=>row.is_default===true&&row.is_enabled!==false)??locations.find(row=>row.is_enabled!==false);locationId=String(location?.id??"");if(!locationId)throw new Error("Zid did not return an enabled inventory location, so variant stock cannot be set safely.");}const variants=values.map(value=>({id:crypto.randomUUID(),is_deleted:false,sku:`${base}-${value.replace(/[^A-Z0-9]+/gi,"-").toUpperCase().slice(0,24)}`.slice(0,80),barcode:null,price,sale_price:null,cost:product.cost??null,attributes:[{slug:attributeSlug,value:{en:value,ar:value}}],...(quantity!=null?{stocks:[{available_quantity:quantity,is_infinite:false,location:locationId}]}:{}),weight:{unit:"kg",value:null}}));const id=String(product.id??""),response=await fetch(`https://api.zid.sa/v1/products/${encodeURIComponent(id)}/variants/`,{method:"POST",headers:{...headers,"Content-Type":"application/json"},body:JSON.stringify({variants})}),result=await response.json().catch(()=>({})) as Record<string,unknown>;if(!response.ok)return json({error:`Zid rejected the variants (${response.status}): ${JSON.stringify(result).slice(0,260)}`},502);const verify=await fetch(`https://api.zid.sa/v1/products/${encodeURIComponent(id)}/`,{headers}),readback=await verify.json().catch(()=>({})) as Record<string,unknown>,live=(Array.isArray(readback.variants)?readback.variants:[]) as Array<Record<string,unknown>>,confirmed=variants.every(v=>live.some(row=>String(row.sku??"")===v.sku));return json({ok:true,confirmed,action_id:`PS-VARIANT-${Date.now().toString(36).toUpperCase()}`,message:confirmed?`${variants.length} variants were created for ${nameOf(product.name)} and confirmed in Zid.`:"Zid accepted the variants, but readback did not confirm every SKU.",product:{id,name:nameOf(product.name)},variants:live});}catch(error){return json(matchErrorPayload(error),422);}
  }
  if(body?.action==="schedule_product_action"){
    try{const product=await findExactProduct(body.query??""),kind=String(body.scheduled_action??""),allowed=["publish_product","unpublish_product","set_product_price","set_product_stock"];if(!allowed.includes(kind))return json({error:"Choose publish, unpublish, price, or stock for the scheduled action."},400);let raw=(body.execute_at??"").trim();if(!/(Z|[+-]\d{2}:?\d{2})$/i.test(raw))raw+=raw.includes("T")?"+03:00":"T00:00:00+03:00";const executeAt=new Date(raw);if(!Number.isFinite(executeAt.getTime())||executeAt.getTime()<Date.now()+30_000)return json({error:"Use a valid future ISO date/time. Include a timezone, for example 2026-08-03T09:00:00+03:00."},400);const value=body.scheduled_value,payload=kind==="set_product_price"?{price:Number(value)}:kind==="set_product_stock"?{quantity:Number(value)}:{};if((kind==="set_product_price"&&!(Number(value)>0))||(kind==="set_product_stock"&&(!Number.isInteger(Number(value))||Number(value)<0)))return json({error:"The scheduled price or stock value is invalid."},400);const row={account_id:merchantId,licensee_id:channel.licensee_id,merchant_id:channel.merchant_id,platform:"zid",action_type:kind,target_id:String(product.id??""),target_name:nameOf(product.name),payload,execute_at:executeAt.toISOString()};const {data,error}=await (supabaseAdmin as any).from("ps_copilot_scheduled_actions").insert(row).select("id,execute_at,state").single();if(error)throw new Error(`Could not save the schedule: ${error.message}. Run migration 20260802020000_copilot_storefront_orchestration.sql.`);return json({ok:true,confirmed:true,action_id:String(data.id),message:`${nameOf(product.name)} is scheduled for ${kind.replaceAll("_"," ")} at ${new Date(data.execute_at).toLocaleString("en-SA",{timeZone:"Asia/Riyadh"})} Arabia time.`,schedule:data,product:{id:product.id,name:nameOf(product.name),sku:product.sku}});}catch(error){return json(matchErrorPayload(error),422);}
  }
  if(body?.action==="customer_search"||body?.action==="loyalty_adjust"){
    const query=(body.customer_query??"").trim().toLowerCase();
    if(!query)return json({error:"A customer name, email, mobile number, or ID is required."},400);
    const call=await fetch("https://api.zid.sa/v1/managers/store/customers?after=0&per_page=100",{headers});
    const payload=await call.json().catch(()=>({})) as Record<string,unknown>;
    if(!call.ok)return json({error:`Zid customer search returned ${call.status}. Reconnect Zid so Customers permission is added to this store token.`},502);
    const rows=(Array.isArray(payload.customers)?payload.customers:[]) as Array<Record<string,unknown>>;
    const digits=query.replace(/\D/g,"");
    const matches=rows.filter(customer=>{const haystack=`${customer.id??""} ${customer.name??""} ${customer.email??""} ${customer.mobile??""}`.toLowerCase();return haystack.includes(query)||(digits.length>=4&&String(customer.mobile??"").replace(/\D/g,"").includes(digits));});
    if(matches.length!==1)return json({error:matches.length?`That search matched ${matches.length} customers. Use the exact mobile number, email, or customer ID.`:"No Zid customer matched that information."},422);
    const customer=matches[0],id=String(customer.id??"");
    const maskedMobile=String(customer.mobile??"").replace(/.(?=.{4})/g,"•"),email=String(customer.email??""),maskedEmail=email?email.replace(/^(.).+(@.*)$/,"$1•••$2"):"";
    if(body.action==="customer_search")return json({ok:true,confirmed:true,message:`Found ${String(customer.name??"Customer")}.`,customer:{id,name:String(customer.name??""),mobile:maskedMobile,email:maskedEmail,points:Number(customer.points??0),orders:Number(customer.order_counts??0),last_order_date:String(customer.last_order_date??"")}});
    const points=Number(body.loyalty_points),direction=body.loyalty_direction==="-"?"-":"+";
    if(!Number.isInteger(points)||points<=0)return json({error:"Loyalty points must be a positive whole number."},400);
    const form=new FormData();form.set("customerId",id);form.set("direction",direction);form.set("points",String(points));form.set("reason",body.loyalty_reason?.trim()||"Merchant-approved PrizeSkout adjustment");
    const adjust=await fetch("https://api.zid.sa/v1/managers/loyalty-program/customers/adjust-customer-points",{method:"POST",headers,body:form});
    const adjusted=await adjust.json().catch(()=>({})) as Record<string,unknown>;
    if(!adjust.ok)return json({error:`Zid rejected the loyalty adjustment (${adjust.status}): ${JSON.stringify(adjusted).slice(0,220)}`},502);
    return json({ok:true,confirmed:true,action_id:`PS-LOYALTY-${Date.now().toString(36).toUpperCase()}`,message:`${direction==="+"?"Added":"Removed"} ${points} points ${direction==="+"?"to":"from"} ${String(customer.name??"the customer")}.`,customer:{id,name:String(customer.name??""),mobile:maskedMobile,email:maskedEmail},result:adjusted});
  }
  if(body?.action==="coupon_change"){
    const codeValue=(body.coupon_code??"").trim().toUpperCase(),mode=body.coupon_mode;
    if(!codeValue||!["create","enable","disable","delete"].includes(String(mode)))return json({error:"A coupon code and supported coupon action are required."},400);
    const list=await fetch("https://api.zid.sa/v1/managers/store/coupons?page=1&per_page=100",{headers}),listPayload=await list.json().catch(()=>({})) as Record<string,unknown>;
    if(!list.ok)return json({error:`Zid coupons returned ${list.status}. Reconnect Zid so Coupons Read & Write is added to this store token.`},502);
    const coupons=(Array.isArray(listPayload.coupons)?listPayload.coupons:[]) as Array<Record<string,unknown>>,found=coupons.find(c=>String(c.code??"").toUpperCase()===codeValue);
    let response:Response;
    if(mode==="create"){
      if(found)return json({error:`Coupon ${codeValue} already exists.`},409);
      const discount=Number(body.coupon_discount_pct);if(!(discount>0&&discount<=100))return json({error:"Percentage discount must be between 0 and 100."},400);
      const today=new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Riyadh",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date()),start=(body.coupon_start_date??today).trim();if(!/^\d{4}-\d{2}-\d{2}$/.test(start))return json({error:"Coupon start date must use YYYY-MM-DD."},400);const [year,month,day]=start.split("-").map(Number),end=`${year+1}-${String(month).padStart(2,"0")}-${String(day).padStart(2,"0")}`,couponName=(body.coupon_name??body.coupon_code??codeValue).trim();const form=new FormData();for(const [key,value] of Object.entries({name:couponName,code:codeValue,discount_type:"p",discount:String(discount),status:"1",applying_method:"CODE",apply_to:"all",free_shipping:"0",free_cod:"0",total:"0",uses_total:"1000",uses_customer:"100",date_start:start,date_end:end,conditions_criteria:"all",discount_strategy:"standard"}))form.set(key,value);
      response=await fetch("https://api.zid.sa/v1/managers/store/coupons/add",{method:"POST",headers,body:form});
    }else{
      if(!found)return json({error:`Coupon ${codeValue} was not found.`},404);const id=String(found.id??found.coupon_id??"");
      if(mode==="delete")response=await fetch(`https://api.zid.sa/v1/managers/store/coupons/${encodeURIComponent(id)}`,{method:"DELETE",headers});
      else{const form=new FormData();form.set("status",mode==="enable"?"1":"0");response=await fetch(`https://api.zid.sa/v1/managers/store/coupon/${encodeURIComponent(id)}/status`,{method:"PUT",headers,body:form});}
    }
    const result=await response.json().catch(()=>({})) as Record<string,unknown>;if(!response.ok)return json({error:`Zid rejected the coupon action (${response.status}): ${JSON.stringify(result).slice(0,220)}`},502);
    const verify=await fetch("https://api.zid.sa/v1/managers/store/coupons?page=1&per_page=100",{headers}),verifyPayload=await verify.json().catch(()=>({})) as Record<string,unknown>,verifiedRows=(Array.isArray(verifyPayload.coupons)?verifyPayload.coupons:[]) as Array<Record<string,unknown>>,verified=verifiedRows.find(c=>String(c.code??"").toUpperCase()===codeValue),active=Boolean(verified?.enabled??verified?.is_active??verified?.coupon_status),confirmed=mode==="delete"?!verified:mode==="create"?Boolean(verified):mode==="enable"?Boolean(verified&&active):Boolean(verified&&!active);
    return json({ok:true,confirmed,action_id:`PS-COUPON-${Date.now().toString(36).toUpperCase()}`,message:confirmed?`Coupon ${codeValue} was ${mode==="create"?"created":mode==="enable"?"enabled":mode==="disable"?"disabled":"deleted"} and confirmed in Zid.`:"Zid accepted the coupon action, but its final state could not be confirmed.",result});
  }
  if(body?.action==="category_assign"){
    const query=(body.query??"").trim().toLowerCase(),categoryName=(body.category??"").trim().toLowerCase();if(!query||!categoryName)return json({error:"An exact product and category name are required."},400);
    const [products,categoriesCall]=await Promise.all([listAllProducts(),fetch("https://api.zid.sa/v1/managers/store/categories?page=1&per_page=100",{headers})]);
    const categoriesPayload=await categoriesCall.json().catch(()=>({})) as Record<string,unknown>;
    const categories=(Array.isArray(categoriesPayload.categories)?categoriesPayload.categories:[]) as Array<Record<string,unknown>>;
    const localizedName=(value:unknown)=>displayProductName(value);
    const matchedProducts=products.filter(product=>matchesZidProduct(product,query,true)),categoryMatches=categories.filter(c=>localizedName(c.name).toLowerCase()===categoryName),productMatches=matchedProducts,nameOf=localizedName;
    if(productMatches.length!==1||categoryMatches.length!==1){const candidates=productMatches.length>1?productMatches.slice(0,10).map(p=>({id:String(p.id??""),name:nameOf(p.name),sku:String(p.sku??""),is_published:Boolean(p.is_published)})):[];return json({error:productMatches.length>1?`I found ${productMatches.length} products named “${body.query?.trim()}”. Choose the intended SKU below before assigning the category.`:`Use exact names. Product matches: ${productMatches.length}; category matches: ${categoryMatches.length}.`,...(candidates.length?{candidates}:{})},422);}
    const productId=String(matchedProducts[0].id??""),categoryId=String(categoryMatches[0].id??"");const assign=await fetch(`https://api.zid.sa/v1/products/${encodeURIComponent(productId)}/categories/`,{method:"POST",headers:{...headers,"Content-Type":"application/json"},body:JSON.stringify({id:Number(categoryId)||categoryId})});
    const result=await assign.json().catch(()=>({})) as Record<string,unknown>;if(!assign.ok)return json({error:`Zid rejected category assignment (${assign.status}): ${JSON.stringify(result).slice(0,220)}`},502);
    return json({ok:true,confirmed:true,action_id:`PS-CATEGORY-${Date.now().toString(36).toUpperCase()}`,message:`${localizedName(matchedProducts[0])} was assigned to ${localizedName(categoryMatches[0].name)} in Zid.`,result});
  }
  if(body?.action==="reverse_refund"){
    const reverseId=(body.refund_reverse_id??"").trim(),amount=Number(body.refund_amount),method=(body.refund_method??"").trim();if(!reverseId||!(amount>0)||!method)return json({error:"Reverse order ID, positive amount, and refund method are required."},400);
    const detail=await fetch(`https://api.zid.sa/v1/managers/store/reverse-orders/${encodeURIComponent(reverseId)}`,{headers}),detailPayload=await detail.json().catch(()=>({})) as Record<string,unknown>;
    if(!detail.ok)return json({error:`Could not verify reverse order ${reverseId} (${detail.status}).`},422);const reverse=(detailPayload.order_reverse??detailPayload.data??detailPayload) as Record<string,unknown>,maximum=Number(reverse.refund_total??0),methods=(Array.isArray(reverse.available_refund_payment_methods)?reverse.available_refund_payment_methods:[]) as Array<Record<string,unknown>>;
    if(amount>maximum)return json({error:`The requested refund is SAR ${amount.toFixed(2)}, but Zid reports only SAR ${maximum.toFixed(2)} refundable.`},422);if(methods.length&&!methods.some(m=>String(m.code??"")===method))return json({error:`Refund method ${method} is unavailable. Zid allows: ${methods.map(m=>m.code).join(", ")}.`},422);
    const form=new FormData();form.set("order_reverse_id",reverseId);form.set("amount",String(amount));form.set("payment_method",method);form.set("notes","Merchant-approved through PrizeSkout");const refund=await fetch("https://api.zid.sa/v1/managers/store/reverse-orders/refund",{method:"POST",headers,body:form}),result=await refund.json().catch(()=>({})) as Record<string,unknown>;
    if(!refund.ok)return json({error:`Zid rejected the refund (${refund.status}): ${JSON.stringify(result).slice(0,220)}`},502);const verify=await fetch(`https://api.zid.sa/v1/managers/store/reverse-orders/${encodeURIComponent(reverseId)}`,{headers}),verifyPayload=await verify.json().catch(()=>({})) as Record<string,unknown>,verifiedReverse=(verifyPayload.order_reverse??verifyPayload.data??verifyPayload) as Record<string,unknown>,verifiedRefund=verifiedReverse.refund as Record<string,unknown>|undefined,confirmed=Boolean(verify.ok&&verifiedRefund&&Math.abs(Number(verifiedRefund.amount??0)-amount)<0.01);return json({ok:true,confirmed,action_id:`PS-REFUND-${Date.now().toString(36).toUpperCase()}`,message:confirmed?`The SAR ${amount.toFixed(2)} refund was confirmed in Zid for reverse order ${reverseId}.`:"Zid accepted the refund, but the final refund record could not yet be confirmed.",result});
  }
  if(body?.action==="preview_product_change"){
    if(!body.product_request)return json({error:"product_request is required"},400);
    try{
      const productRequest={...body.product_request};
      if(productRequest.scope!=="matching"&&!productRequest.sku&&productRequest.query){
        const product=await findExactProduct(productRequest.query);
        productRequest.sku=String(product.sku??"");
      }
      return json({ok:true,preview:await previewZidProductChange(merchantId,headers,productRequest)});
    }
    catch(error){return json(matchErrorPayload(error),422);}
  }
  if(body?.action==="apply_product_change"){
    if(!body.approval_token)return json({error:"An unexpired approval token is required."},400);
    try{const result=await executeZidProductChange(merchantId,headers,{licensee_id:channel.licensee_id,merchant_id:channel.merchant_id},body.approval_token);return json(result,result.ok?200:502);}
    catch(error){return json({error:error instanceof Error?error.message:"Could not apply the Zid product change."},502);}
  }
  if(body?.action==="seed_test_store_preview"){
    try{return json({ok:true,preview:await previewZidTestSeed(headers)});}
    catch(error){return json({error:error instanceof Error?error.message:"Could not inspect the Zid test store."},502);}
  }
  if(body?.action==="seed_test_store"){
    try{const result=await executeZidTestSeed(headers,{storeId:body.test_store_id??"",merchantConfirmedTestStore:body.confirm_test_store===true});return json(result,result.ok?200:502);}
    catch(error){return json({error:error instanceof Error?error.message:"Could not prepare the Zid test store."},502);}
  }
  if(body?.action==="cleanup_test_store"){
    try{const result=await cleanupZidTestSeed(headers,{storeId:body.test_store_id??"",merchantConfirmedTestStore:body.confirm_test_store===true});return json(result,result.ok?200:502);}
    catch(error){return json({error:error instanceof Error?error.message:"Could not clean the Zid test fixtures."},502);}
  }
  if(body?.action==="profit_brief"){
    try{return json({ok:true,brief:await buildZidProfitBrief(merchantId,headers,Number(body.days)||30)});}
    catch(error){return json({error:error instanceof Error?error.message:"Could not build the Zid profit brief."},502);}
  }
  if(body?.action==="change_order_status"){
    const orderId=body.order_id?.trim(),status=body.order_status?.toLowerCase();
    const allowed=["new","preparing","ready","indelivery","delivered","cancelled"];
    if(!orderId||!status||!allowed.includes(status))return json({error:"A valid order reference and Zid order status are required."},400);
    const response=await fetch(`https://api.zid.sa/v1/managers/store/orders/${encodeURIComponent(orderId)}/change-order-status`,{method:"POST",headers:{...headers,"Content-Type":"application/json"},body:JSON.stringify({order_status:status})});
    if(!response.ok)return json({error:`Zid rejected the order update (${response.status}): ${(await response.text().catch(()=>"")).slice(0,250)}`},502);
    const verify=await fetch("https://api.zid.sa/v1/managers/store/orders?payload_type=simple&page=1&per_page=50",{headers});
    const verifyPayload=verify.ok?await verify.json().catch(()=>null) as Record<string,unknown>|null:null;
    const verifyOrders=Array.isArray(verifyPayload?.orders)?verifyPayload.orders:[];
    const matched=verifyOrders.map(value=>value as Record<string,unknown>).find(order=>String(order.id??order.code??"")===orderId||String(order.code??"")===orderId);
    const matchedStatus=matched&&typeof matched.status==="object"?String((matched.status as Record<string,unknown>).code??(matched.status as Record<string,unknown>).name??"").toLowerCase():String(matched?.status??"").toLowerCase();
    const confirmed=Boolean(matched&&matchedStatus.replace(/[^a-z]/g,"")===status.replace(/[^a-z]/g,""));
    return json({ok:confirmed,confirmed,action_id:`PS-ORDER-${Date.now().toString(36).toUpperCase()}`,message:confirmed?`Order ${orderId} was moved to ${status} and confirmed in Zid.`:`Zid accepted the update, but the new status could not be confirmed by readback. Current readback: ${matchedStatus||"order not returned"}.`},confirmed?200:502);
  }
  if(body?.action==="create_product_draft"){
    const name=body.product_name?.trim(),price=Number(body.product_price),publish=body.publish_product===true,cost=body.product_cost==null?null:Number(body.product_cost),quantity=body.product_quantity==null?null:Number(body.product_quantity),infinite=body.product_infinite===true||body.product_quantity==null;
    if(!name||!Number.isFinite(price)||price<=0)return json({error:"Product name and a positive selling price are required."},400);
    if(cost!=null&&(!Number.isFinite(cost)||cost<0))return json({error:"Product cost must be zero or more."},400);
    if(quantity!=null&&(!Number.isInteger(quantity)||quantity<0))return json({error:"Stock quantity must be a whole number of zero or more."},400);
    const slug=name.normalize("NFKD").replace(/[^a-zA-Z0-9]+/g,"-").replace(/^-+|-+$/g,"").toUpperCase().slice(0,48)||"PRODUCT";
    const sku=body.product_sku?.trim()||`${slug}-${Date.now().toString(36).toUpperCase()}`.slice(0,80);
    const response=await fetch("https://api.zid.sa/v1/products/",{method:"POST",headers:{...headers,"Access-Token":channel.manager_token??"","Content-Type":"application/json",Role:"Manager"},body:JSON.stringify({name:{en:name,ar:name},sku,price,...(cost!=null?{cost}:{}),...(quantity!=null?{quantity}:{}),is_infinite:infinite,is_draft:!publish,is_published:publish})});
    const payload=await response.json().catch(()=>null) as Record<string,unknown>|null;
    const productId=String(payload?.id??(payload?.data as Record<string,unknown>|undefined)?.id??"");
    if(!response.ok||!productId)return json({error:`Zid rejected the product (${response.status}): ${JSON.stringify(payload).slice(0,250)}`},502);
    if(publish){const publication=await fetch(`https://api.zid.sa/v1/products/${encodeURIComponent(productId)}/`,{method:"PATCH",headers:{...headers,"Content-Type":"application/json"},body:JSON.stringify({is_published:true,is_draft:false})});if(!publication.ok)return json({error:`The product was created as a draft, but Zid rejected publication (${publication.status}): ${(await publication.text().catch(()=>"")).slice(0,220)}`},502);}
    const readback=await fetch(`https://api.zid.sa/v1/products/${encodeURIComponent(productId)}/`,{headers});
    const live=readback.ok?await readback.json().catch(()=>null) as Record<string,unknown>|null:null;
    const liveName=typeof live?.name==="object"&&live.name?String((live.name as Record<string,unknown>).en??(live.name as Record<string,unknown>).ar??""):String(live?.name??"");
    let storefront:Record<string,unknown>|null=null;
    if(publish){const customerHeaders:Record<string,string>={Role:"Customer",Accept:"application/json","Accept-Language":"en",...(metadata.store_id?{"Store-Id":String(metadata.store_id)}:{})};for(let attempt=0;attempt<5;attempt+=1){const customer=await fetch(`https://api.zid.sa/v1/products/${encodeURIComponent(productId)}/`,{headers:customerHeaders});if(customer.ok){storefront=await customer.json().catch(()=>null) as Record<string,unknown>|null;if(storefront)break;}if(attempt<4)await new Promise(resolve=>setTimeout(resolve,750));}}
    const managerConfirmed=Boolean(live&&liveName===name&&String(live.sku??"")===sku&&Number(live.price)===price&&Boolean(live.is_published)===publish);
    const storefrontVisible=Boolean(storefront&&nameOf(storefront.name)===name);
    const confirmed=managerConfirmed&&(!publish||storefrontVisible);
    const after={id:productId,sku:String(live?.sku??sku),name:liveName||name,price:Number(live?.price??price),cost:live?.cost==null?null:Number(live.cost),quantity:live?.quantity==null?null:Number(live.quantity),is_infinite:Boolean(live?.is_infinite),is_published:Boolean(live?.is_published),is_draft:Boolean(live?.is_draft),storefront_visible:storefrontVisible};
    return json({ok:confirmed,confirmed,product_id:productId,action_id:`PS-PRODUCT-${Date.now().toString(36).toUpperCase()}`,message:confirmed?`${name} was created and ${publish?"confirmed in Zid's customer catalogue":"saved as a draft"}.`:managerConfirmed&&publish?`${name} is marked published in Zid management, but Zid has not exposed it through the customer catalogue yet.`:"Zid created the product, but its final details could not be fully confirmed.",results:[{id:productId,sku,status:confirmed?"confirmed":"unconfirmed",storefront_visible:storefrontVisible,after}]},confirmed?200:502);
  }
  if(body?.action!=="list_orders")return json({error:"Unsupported store operation."},400);
  const today=new Date().toISOString().slice(0,10);
  const response=await fetch(`https://api.zid.sa/v1/managers/store/orders?payload_type=simple&page=1&per_page=50&date_from=${today}&date_to=${today}`,{headers});
  if(!response.ok)return json({error:`Zid orders API returned ${response.status}: ${(await response.text().catch(()=>"")).slice(0,250)}`},502);
  const payload=await response.json() as Record<string,unknown>;
  const raw=Array.isArray(payload.orders)?payload.orders:Array.isArray((payload.data as Record<string,unknown>|undefined)?.orders)?(payload.data as Record<string,unknown>).orders as unknown[]:[];
  const orders=raw.map(value=>{
    const order=value as Record<string,unknown>;
    const totalRaw=order.total??order.order_total??order.total_value;
    const total=typeof totalRaw==="object"&&totalRaw?Number((totalRaw as Record<string,unknown>).amount):Number(totalRaw??0);
    const statusRaw=order.status;
    const status=typeof statusRaw==="object"&&statusRaw?String((statusRaw as Record<string,unknown>).name??(statusRaw as Record<string,unknown>).code??"unknown"):String(statusRaw??"unknown");
    return {id:String(order.id??order.code??""),code:String(order.code??order.invoice_number??order.id??""),status,total:Number.isFinite(total)?total:0,currency:String(order.currency??"SAR"),created_at:String(order.created_at??order.createdAt??"")};
  });
  const by_status=orders.reduce<Record<string,number>>((acc,order)=>{acc[order.status]=(acc[order.status]??0)+1;return acc;},{});
  return json({ok:true,orders,summary:{count:orders.length,total:orders.reduce((sum,order)=>sum+order.total,0),by_status},read_only:true,retrieved_at:new Date().toISOString()});
}}}});
