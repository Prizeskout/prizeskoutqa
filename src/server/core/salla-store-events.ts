import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { Json } from "@/integrations/supabase/types";

type Channel = { id:string; account_id:string; licensee_id:string; merchant_id:string };
type ObjectMap = Record<string,unknown>;

const ORDER_EVENTS = new Set([
  "order.created","order.updated","order.status.updated","order.payment.updated",
  "order.total.price.updated","order.products.updated","order.cancelled","order.refunded",
  "order.deleted","order.shipping.address.updated","order.coupon.updated",
]);
const SHIPMENT_EVENTS = new Set([
  "shipment.creating","shipment.created","shipment.updated","shipment.cancelled",
  "order.shipment.creating","order.shipment.created","order.shipment.cancelled",
  "order.shipment.return.creating","order.shipment.return.created","order.shipment.return.cancelled",
]);

export function isSallaOperationalEvent(event:string):boolean {
  return ORDER_EVENTS.has(event)||SHIPMENT_EVENTS.has(event)||event==="invoice.created"||
    event.startsWith("category.")||event.startsWith("brand.")||event.startsWith("specialoffer.")||
    event.startsWith("shipping.zone.")||event.startsWith("shipping.company.")||
    event.startsWith("store.branch.")||event==="storetax.created"||event.startsWith("product.")||
    event==="coupon.applied";
}

function object(value:unknown):ObjectMap{return value&&typeof value==="object"&&!Array.isArray(value)?value as ObjectMap:{}}
function array(value:unknown):unknown[]{return Array.isArray(value)?value:[]}
function first(...values:unknown[]):unknown{return values.find(value=>value!==undefined&&value!==null&&value!=="")}
function text(...values:unknown[]):string|null{const value=first(...values);return value===undefined?null:String(value)}
function number(...values:unknown[]):number|null{
  for(const candidate of values){
    const value=object(candidate);
    const raw=Object.keys(value).length?first(value.amount,value.value):candidate;
    if(raw===undefined||raw===null||raw==="")continue;
    const parsed=Number(raw);if(Number.isFinite(parsed))return parsed;
  }
  return null;
}
function date(value:unknown):string|null{if(value===undefined||value===null||value==="")return null;const parsed=new Date(String(value));return Number.isFinite(parsed.getTime())?parsed.toISOString():null}
function money(data:ObjectMap,key:string):number|null{
  const amounts=object(data.amounts);return number(data[key],amounts[key],object(data.total)[key]);
}
function currency(data:ObjectMap):string{return text(object(data.total).currency,object(data.amounts).currency,data.currency)??"SAR"}

async function sha256(value:string):Promise<string>{
  const digest=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest)).map(byte=>byte.toString(16).padStart(2,"0")).join("");
}

export async function sallaEventKey(payload:ObjectMap,rawBody:string):Promise<string>{
  const data=object(payload.data);const entityId=text(data.id,data.order_id,data.reference_id,data.order_reference_id)??"none";
  const occurred=text(payload.created_at,data.updated_at,data.created_at)??"none";
  return `${text(payload.event)??"unknown"}:${entityId}:${occurred}:${(await sha256(rawBody)).slice(0,24)}`;
}

async function beginEvent(channel:Channel,payload:ObjectMap,rawBody:string){
  const eventName=text(payload.event)??"unknown";const eventKey=await sallaEventKey(payload,rawBody);
  const row={channel_id:channel.id,account_id:channel.account_id,licensee_id:channel.licensee_id,merchant_id:channel.merchant_id,event_name:eventName,event_key:eventKey,occurred_at:date(payload.created_at),status:"processing",payload:payload as Json,error_message:null};
  const {data,error}=await supabaseAdmin.from("ps_salla_webhook_events" as never).insert(row as never).select("id").single();
  if(!error&&data)return{id:(data as {id:string}).id,replay:false};
  if(error?.code!=="23505")throw error;
  const {data:existing,error:readError}=await supabaseAdmin.from("ps_salla_webhook_events" as never).select("id,status").eq("channel_id",channel.id).eq("event_key",eventKey).maybeSingle();
  if(readError||!existing)throw readError??new Error("Failed to read Salla event replay");
  if(String((existing as {status:string}).status)==="processed")return{id:(existing as {id:string}).id,replay:true};
  await supabaseAdmin.from("ps_salla_webhook_events" as never).update({status:"processing",error_message:null} as never).eq("id",(existing as {id:string}).id);
  return{id:(existing as {id:string}).id,replay:false};
}

async function finishEvent(id:string,error?:unknown){
  const patch=error
    ? {status:"failed",error_message:String(error).slice(0,500)}
    : {status:"processed",processed_at:new Date().toISOString(),error_message:null};
  await supabaseAdmin.from("ps_salla_webhook_events" as never).update(patch as never).eq("id",id);
}

function orderIdentity(data:ObjectMap):string|null{
  return text(data.id,data.order_id,object(data.order).id,data.reference_id,data.order_reference_id);
}

function extractItems(data:ObjectMap):ObjectMap[]{
  const order=object(data.order);return array(first(data.items,data.products,order.items,order.products)).map(object);
}

async function upsertOrder(channel:Channel,event:string,data:ObjectMap){
  const externalOrderId=orderIdentity(data);if(!externalOrderId)return;
  const currentResult=await supabaseAdmin.from("ps_salla_orders" as never).select("*").eq("channel_id",channel.id).eq("external_order_id",externalOrderId).maybeSingle();
  if(currentResult.error)throw currentResult.error;
  const current=object(currentResult.data);const status=text(object(data.status).slug,object(data.status).name,data.status,current.status);
  const paymentStatus=text(object(data.payment_status).slug,object(data.payment).status,data.payment_status,current.payment_status);
  const cancelled=event==="order.cancelled"||status==="cancelled";
  const refundedEvent=event==="order.refunded";
  const total=money(data,"total")??number(data.total,current.total);
  const paid=money(data,"paid")??number(data.paid_amount,object(data.payment).amount,current.paid_total);
  const refunded=money(data,"refunded")??number(data.refunded_amount,current.refunded_total)??(refundedEvent?total:null);
  const invoiced=number(current.invoiced_total);
  const isPaid=Boolean(paid!==null)||/paid|completed|تم الدفع/i.test(`${paymentStatus??""} ${status??""}`);
  const settlementDelta=isPaid&&total!==null&&paid!==null?paid-total:null;
  const refundDelta=refunded!==null&&paid!==null&&refunded-paid>0.01?refunded-paid:null;
  const invoiceDelta=invoiced!==null&&total!==null?invoiced-total:null;
  const delta=invoiceDelta!==null&&Math.abs(invoiceDelta)>0.01?invoiceDelta:refundDelta??settlementDelta;
  const reconciliationStatus=cancelled?"cancelled":delta!==null&&Math.abs(delta)>0.01?"exception":isPaid?"reconciled":"pending";
  const row={channel_id:channel.id,account_id:channel.account_id,licensee_id:channel.licensee_id,merchant_id:channel.merchant_id,external_order_id:externalOrderId,reference_id:text(data.reference_id,data.reference,current.reference_id),status,payment_status:paymentStatus,currency:currency(data),subtotal:money(data,"subtotal")??number(current.subtotal),discount_total:money(data,"discount")??number(data.discount_total,current.discount_total),shipping_total:money(data,"shipping_cost")??number(data.shipping_total,current.shipping_total),tax_total:money(data,"tax")??number(data.tax_total,current.tax_total),total,paid_total:paid,refunded_total:refunded,invoiced_total:invoiced,reconciliation_status:reconciliationStatus,reconciliation_delta:delta,last_event:event,ordered_at:date(first(data.date,data.created_at,current.ordered_at)),updated_at:new Date().toISOString(),raw_payload:data as Json};
  const {data:saved,error}=await supabaseAdmin.from("ps_salla_orders" as never).upsert(row as never,{onConflict:"channel_id,external_order_id"}).select("id").single();if(error||!saved)throw error??new Error("Order save failed");
  for(const [index,item] of extractItems(data).entries()){
    const itemId=text(item.id,item.item_id,item.product_id,item.sku,index)??String(index);const quantity=number(item.quantity)??1;const unitPrice=number(item.price,item.unit_price)??0;
    const itemRow={order_id:(saved as {id:string}).id,external_item_id:itemId,product_id:text(item.product_id,object(item.product).id),sku:text(item.sku,object(item.product).sku),name:text(item.name,object(item.product).name),quantity,unit_price:unitPrice,total:number(item.total,item.total_price)??unitPrice*quantity,cost_total:number(item.cost_total,item.cost_price),raw_payload:item as Json,updated_at:new Date().toISOString()};
    const itemResult=await supabaseAdmin.from("ps_salla_order_items" as never).upsert(itemRow as never,{onConflict:"order_id,external_item_id"});if(itemResult.error)throw itemResult.error;
  }
  if(reconciliationStatus==="exception")await createReconciliationTask(channel,externalOrderId,total,paid,refunded,invoiced,delta,event,data);
}

async function createReconciliationTask(channel:Channel,orderId:string,total:number|null,paid:number|null,refunded:number|null,invoiced:number|null,delta:number|null,event:string,data:ObjectMap){
  // Store Manager's dashboard identity is the platform merchant identifier;
  // operational ledgers retain the internal UUID account separately.
  const task={account_id:channel.merchant_id,idempotency_key:`salla:order-reconciliation:${orderId}:${[total,paid,refunded,invoiced].join(":")}`,source:"webhook",task_type:"order_reconciliation",title:`Review Salla order ${orderId} reconciliation`,detail:`Salla order totals do not reconcile. Difference: ${delta?.toFixed(2)??"unknown"} SAR.`,status:"waiting_approval",risk_level:"financial",priority:Math.abs(delta??0)>=100?"high":"medium",connector:"salla",target_type:"order",target_id:orderId,input:{event,order_id:orderId,internal_account_id:channel.account_id} as Json,proposed_changes:[] as Json,evidence:[{total,paid,refunded,invoiced,delta,payload:data}] as Json,approval_required:true};
  const {error}=await supabaseAdmin.from("ps_store_manager_tasks" as never).upsert(task as never,{onConflict:"account_id,idempotency_key"});if(error&&error.code!=="42P01")throw error;
}

async function upsertInvoice(channel:Channel,event:string,data:ObjectMap){
  const invoiceId=text(data.id,data.invoice_id);if(!invoiceId)return;const orderId=orderIdentity(data)??text(object(data.order).id);const total=number(data.total,object(data.amounts).total);const row={channel_id:channel.id,account_id:channel.account_id,external_invoice_id:invoiceId,external_order_id:orderId,currency:currency(data),total,tax_total:number(data.tax,object(data.amounts).tax),issued_at:date(first(data.issued_at,data.created_at)),raw_payload:data as Json,updated_at:new Date().toISOString()};
  const result=await supabaseAdmin.from("ps_salla_invoices" as never).upsert(row as never,{onConflict:"channel_id,external_invoice_id"});if(result.error)throw result.error;
  if(orderId){
    const {data:order,error:orderError}=await supabaseAdmin.from("ps_salla_orders" as never).select("total,paid_total,refunded_total").eq("channel_id",channel.id).eq("external_order_id",orderId).maybeSingle();if(orderError)throw orderError;
    const current=object(order);const orderTotal=number(current.total);const delta=total!==null&&orderTotal!==null?total-orderTotal:null;const reconciliationStatus=delta!==null&&Math.abs(delta)>0.01?"exception":orderTotal!==null?"reconciled":"pending";
    await supabaseAdmin.from("ps_salla_orders" as never).update({invoiced_total:total,reconciliation_delta:delta,reconciliation_status:reconciliationStatus,last_event:event,updated_at:new Date().toISOString()} as never).eq("channel_id",channel.id).eq("external_order_id",orderId);
    if(reconciliationStatus==="exception")await createReconciliationTask(channel,orderId,orderTotal,number(current.paid_total),number(current.refunded_total),total,delta,event,data);
  }
}

async function upsertShipment(channel:Channel,event:string,data:ObjectMap){
  const shipment=Object.keys(object(data.shipment)).length?object(data.shipment):data;const shipmentId=text(shipment.id,shipment.shipment_id,data.shipment_id);if(!shipmentId)return;
  const row={channel_id:channel.id,account_id:channel.account_id,external_shipment_id:shipmentId,external_order_id:orderIdentity(data)??text(shipment.order_id,shipment.order_reference_id),status:text(object(shipment.status).slug,object(shipment.status).name,shipment.status,event.split(".").at(-1)),company_name:text(object(shipment.company).name,shipment.company_name,shipment.external_company_name),tracking_number:text(shipment.tracking_number,shipment.tracking_id),shipping_cost:number(shipment.shipping_cost,shipment.cost),last_event:event,raw_payload:data as Json,updated_at:new Date().toISOString()};
  const result=await supabaseAdmin.from("ps_salla_shipments" as never).upsert(row as never,{onConflict:"channel_id,external_shipment_id"});if(result.error)throw result.error;
}

function entityType(event:string):string|null{
  if(event.startsWith("product."))return"product";if(event.startsWith("category."))return"category";if(event.startsWith("brand."))return"brand";if(event.startsWith("specialoffer."))return"special_offer";if(event.startsWith("shipping.zone."))return"shipping_zone";if(event.startsWith("shipping.company."))return"shipping_company";if(event.startsWith("store.branch."))return"branch";if(event==="storetax.created")return"tax";return null;
}
async function upsertEntity(channel:Channel,event:string,data:ObjectMap){
  const type=entityType(event);const externalId=text(data.id,data.product_id,data.category_id,data.brand_id);if(!type||!externalId)return;
  const deleted=event.endsWith(".deleted");const row={channel_id:channel.id,account_id:channel.account_id,entity_type:type,external_id:externalId,name:text(data.name,data.title),status:text(object(data.status).slug,object(data.status).name,data.status,deleted?"deleted":null),deleted_at:deleted?new Date().toISOString():null,last_event:event,data:data as Json,updated_at:new Date().toISOString()};
  const result=await supabaseAdmin.from("ps_salla_store_entities" as never).upsert(row as never,{onConflict:"channel_id,entity_type,external_id"});if(result.error)throw result.error;
  if(event==="product.quantity.low")await createInventoryTask(channel,externalId,data);
}
async function createInventoryTask(channel:Channel,productId:string,data:ObjectMap){
  const task={account_id:channel.merchant_id,idempotency_key:`salla:inventory-low:${productId}:${text(data.quantity,data.updated_at)??"current"}`,source:"webhook",task_type:"inventory_watch",title:`Low stock for ${text(data.name,data.sku)??productId}`,detail:"Salla reported that this product reached its low-stock threshold.",status:"detected",risk_level:"read_only",priority:"high",connector:"salla",target_type:"product",target_id:productId,input:{event:"product.quantity.low",internal_account_id:channel.account_id} as Json,evidence:[data] as Json,approval_required:false};
  const {error}=await supabaseAdmin.from("ps_store_manager_tasks" as never).upsert(task as never,{onConflict:"account_id,idempotency_key"});if(error&&error.code!=="42P01")throw error;
}

export async function processSallaOperationalEvent(channel:Channel,payload:ObjectMap,rawBody:string):Promise<{replay:boolean;event:string}>{
  const event=text(payload.event)??"";const receipt=await beginEvent(channel,payload,rawBody);if(receipt.replay)return{replay:true,event};
  try{
    const data=object(payload.data);
    if(ORDER_EVENTS.has(event))await upsertOrder(channel,event,data);
    if(SHIPMENT_EVENTS.has(event))await upsertShipment(channel,event,data);
    if(event==="invoice.created")await upsertInvoice(channel,event,data);
    if(entityType(event))await upsertEntity(channel,event,data);
    await finishEvent(receipt.id);return{replay:false,event};
  }catch(error){await finishEvent(receipt.id,error);throw error}
}
