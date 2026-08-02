import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { buildZidProfitBrief } from "@/server/core/zid-profit-brief";

const json=(data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers:{"Content-Type":"application/json"}});

export const Route=createFileRoute("/api/copilot/store")({server:{handlers:{POST:async({request})=>{
  const body=await request.json().catch(()=>null) as {merchant_id?:string;access_code?:string;action?:string;days?:number;order_id?:string;order_status?:string;product_name?:string;product_sku?:string;product_price?:number}|null;
  const merchantId=body?.merchant_id?.trim();
  const accessCode=body?.access_code?.trim().toUpperCase();
  if(!merchantId||!accessCode)return json({error:"merchant_id and access_code are required"},400);
  const {data:code}=await supabaseAdmin.from("ps_access_codes" as never).select("merchant_id").eq("code",accessCode).maybeSingle() as {data:{merchant_id:string}|null};
  if(!code||code.merchant_id!==merchantId)return json({error:"Invalid access code"},403);
  const {data:channel}=await supabaseAdmin.from("ps_merchant_channels").select("bearer_token,manager_token,metadata,status").eq("account_id",merchantId).eq("platform","zid").maybeSingle();
  if(!channel||channel.status!=="connected"||!channel.bearer_token)return json({error:"Zid is not connected."},400);
  const authorization=channel.bearer_token.startsWith("Bearer ")?channel.bearer_token:`Bearer ${channel.bearer_token}`;
  const headers:Record<string,string>={Authorization:authorization,"X-Manager-Token":channel.manager_token??"",Accept:"application/json","Accept-Language":"en"};
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
    const name=body.product_name?.trim(),sku=body.product_sku?.trim(),price=Number(body.product_price);
    if(!name||!sku||!Number.isFinite(price)||price<=0)return json({error:"Product name, SKU, and a positive price are required."},400);
    const response=await fetch("https://api.zid.sa/v1/products/",{method:"POST",headers:{...headers,"Access-Token":channel.manager_token??"","Content-Type":"application/json",Role:"Manager"},body:JSON.stringify({name:{en:name,ar:name},sku,price,is_draft:true,is_published:false})});
    const payload=await response.json().catch(()=>null) as Record<string,unknown>|null;
    if(!response.ok)return json({error:`Zid rejected the draft product (${response.status}): ${JSON.stringify(payload).slice(0,250)}`},502);
    return json({ok:true,confirmed:true,product_id:String(payload?.id??"Not returned"),action_id:`PS-PRODUCT-${Date.now().toString(36).toUpperCase()}`,message:`Draft product ${name} was created in Zid and remains unpublished.`});
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
