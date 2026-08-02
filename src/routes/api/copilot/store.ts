import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { buildZidProfitBrief } from "@/server/core/zid-profit-brief";
import { cleanupZidTestSeed,executeZidTestSeed,previewZidTestSeed } from "@/server/core/zid-test-store-seeder";
import { executeZidProductChange,previewZidProductChange,type ProductChangeRequest } from "@/server/core/zid-product-operations";

const json=(data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers:{"Content-Type":"application/json"}});

export const Route=createFileRoute("/api/copilot/store")({server:{handlers:{POST:async({request})=>{
  const body=await request.json().catch(()=>null) as {merchant_id?:string;access_code?:string;action?:string;days?:number;order_id?:string;order_status?:string;product_name?:string;product_sku?:string;product_price?:number;product_cost?:number;product_quantity?:number;product_infinite?:boolean;publish_product?:boolean;test_store_id?:string;confirm_test_store?:boolean;product_request?:ProductChangeRequest;approval_token?:string}|null;
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
  if(body?.action==="preview_product_change"){
    if(!body.product_request)return json({error:"product_request is required"},400);
    try{return json({ok:true,preview:await previewZidProductChange(merchantId,headers,body.product_request)});}
    catch(error){return json({error:error instanceof Error?error.message:"Could not preview the Zid product change."},422);}
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
    const name=body.product_name?.trim(),price=Number(body.product_price),publish=body.publish_product===true,cost=body.product_cost==null?null:Number(body.product_cost),quantity=body.product_quantity==null?null:Number(body.product_quantity),infinite=body.product_infinite===true;
    if(!name||!Number.isFinite(price)||price<=0)return json({error:"Product name and a positive selling price are required."},400);
    if(cost!=null&&(!Number.isFinite(cost)||cost<0))return json({error:"Product cost must be zero or more."},400);
    if(quantity!=null&&(!Number.isInteger(quantity)||quantity<0))return json({error:"Stock quantity must be a whole number of zero or more."},400);
    const slug=name.normalize("NFKD").replace(/[^a-zA-Z0-9]+/g,"-").replace(/^-+|-+$/g,"").toUpperCase().slice(0,48)||"PRODUCT";
    const sku=body.product_sku?.trim()||`${slug}-${Date.now().toString(36).toUpperCase()}`.slice(0,80);
    const response=await fetch("https://api.zid.sa/v1/products/",{method:"POST",headers:{...headers,"Access-Token":channel.manager_token??"","Content-Type":"application/json",Role:"Manager"},body:JSON.stringify({name:{en:name,ar:name},sku,price,...(cost!=null?{cost}:{}),...(quantity!=null?{quantity}:{}),is_infinite:infinite,is_draft:!publish,is_published:publish})});
    const payload=await response.json().catch(()=>null) as Record<string,unknown>|null;
    const productId=String(payload?.id??(payload?.data as Record<string,unknown>|undefined)?.id??"");
    if(!response.ok||!productId)return json({error:`Zid rejected the product (${response.status}): ${JSON.stringify(payload).slice(0,250)}`},502);
    const readback=await fetch(`https://api.zid.sa/v1/products/${encodeURIComponent(productId)}/`,{headers});
    const live=readback.ok?await readback.json().catch(()=>null) as Record<string,unknown>|null:null;
    const liveName=typeof live?.name==="object"&&live.name?String((live.name as Record<string,unknown>).en??(live.name as Record<string,unknown>).ar??""):String(live?.name??"");
    const confirmed=Boolean(live&&liveName===name&&String(live.sku??"")===sku&&Number(live.price)===price&&Boolean(live.is_published??!live.is_draft)===publish);
    const after={id:productId,sku:String(live?.sku??sku),name:liveName||name,price:Number(live?.price??price),cost:live?.cost==null?null:Number(live.cost),quantity:live?.quantity==null?null:Number(live.quantity),is_infinite:Boolean(live?.is_infinite),is_published:Boolean(live?.is_published??!live?.is_draft),is_draft:Boolean(live?.is_draft)};
    return json({ok:true,confirmed,product_id:productId,action_id:`PS-PRODUCT-${Date.now().toString(36).toUpperCase()}`,message:confirmed?`${name} was created and ${publish?"published":"saved as a draft"} in Zid.`:"Zid created the product, but its final details could not be fully confirmed.",results:[{id:productId,sku,status:confirmed?"confirmed":"unconfirmed",after}]});
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
