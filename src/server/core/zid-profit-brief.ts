import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { Json } from "@/integrations/supabase/types";
import { getMerchantMarginPolicy } from "./merchant-pricing-config";

type Headers = Record<string,string>;
type Obj = Record<string,unknown>;
const num=(value:unknown)=>{if(value&&typeof value==="object")value=(value as Obj).amount??(value as Obj).value;const parsed=Number(value??0);return Number.isFinite(parsed)?parsed:0;};
const arr=(value:unknown):Obj[]=>Array.isArray(value)?value.filter(item=>item&&typeof item==="object") as Obj[]:[];
const text=(...values:unknown[])=>String(values.find(value=>typeof value==="string"||typeof value==="number")??"");

export type ZidProfitBrief={
  period:{start:string;end:string;days:number};currency:string;order_count:number;analyzable_order_count:number;
  revenue:number;contribution:number;contribution_pct:number|null;loss_order_count:number;loss_amount:number;
  discount_total:number;verified_cost_coverage_pct:number;excluded_order_count:number;
  orders:Array<{id:string;code:string;status:string;revenue:number;verified_cost:number;contribution:number|null;contribution_pct:number|null;discount:number;cost_coverage_pct:number;attention:string|null}>;
  coupons:Array<{id:string;code:string;name:string;discount_label:string;products_below_floor:number;verified_products_tested:number;risk:"review"|"safe"|"unknown"}>;
  priorities:Array<{kind:string;title:string;detail:string;amount:number|null}>;limitations:string[];retrieved_at:string;
};

export async function buildZidProfitBrief(accountId:string,headers:Headers,days=30):Promise<ZidProfitBrief>{
  const end=new Date(),start=new Date(end.getTime()-(Math.max(1,Math.min(days,90))-1)*86400000);
  const startDate=start.toISOString().slice(0,10),endDate=end.toISOString().slice(0,10);
  const [ordersResponse,couponsResponse,catalogResult,policy]=await Promise.all([
    fetch(`https://api.zid.sa/v1/managers/store/orders?payload_type=full&page=1&per_page=100&date_from=${startDate}&date_to=${endDate}`,{headers}),
    fetch("https://api.zid.sa/v1/managers/store/coupons?page=1&per_page=100",{headers}),
    supabaseAdmin.from("ps_ingest_events").select("item_id,sku,item_name_en,base_cost,current_retail_price,currency,raw_payload,created_at").eq("account_id",accountId).eq("source_platform","zid").order("created_at",{ascending:false}).limit(5000),
    getMerchantMarginPolicy(accountId),
  ]);
  if(!ordersResponse.ok)throw new Error(`Zid orders API returned ${ordersResponse.status}. Confirm that orders.read is approved for this app.`);
  const ordersPayload=await ordersResponse.json().catch(()=>({})) as Obj;
  const couponsPayload=couponsResponse.ok?await couponsResponse.json().catch(()=>({})) as Obj:{};
  const rawOrders=arr(ordersPayload.orders).length?arr(ordersPayload.orders):arr((ordersPayload.data as Obj|undefined)?.orders);
  const rawCatalog=catalogResult.data??[],seen=new Set<string>();
  const catalog=rawCatalog.filter(row=>{const key=row.item_id||row.sku;if(!key||seen.has(key))return false;seen.add(key);return true;}).map(row=>({
    id:row.item_id,sku:row.sku,cost:num(row.base_cost),price:num(row.current_retail_price),currency:row.currency,
    verified:String((row.raw_payload as Obj|null)?.cost_source??"")==="platform_catalog",
  }));
  const byId=new Map(catalog.map(item=>[item.id,item])),bySku=new Map(catalog.map(item=>[item.sku,item]));
  let currency=catalog.find(item=>item.currency)?.currency??"SAR",verifiedUnits=0,totalUnits=0;
  const orders=rawOrders.map(order=>{
    const products=[...arr(order.products),...arr(order.items),...arr(order.order_products)];
    const statusRaw=order.status,status=typeof statusRaw==="object"&&statusRaw?text((statusRaw as Obj).code,(statusRaw as Obj).name):text(statusRaw,"unknown");
    const statedRevenue=num(order.total??order.order_total??order.total_value??order.grand_total),excludedStatus=/cancel|refund|void/i.test(status);
    const revenue=excludedStatus?0:statedRevenue;
    const discount=num(order.discount_total??order.total_discount??order.discount_amount??order.discounts);
    currency=text(order.currency,currency)||currency;
    let verifiedCost=0,orderUnits=0,orderVerifiedUnits=0;
    for(const product of products){
      const quantity=Math.max(1,num(product.quantity??product.qty??1)),productObj=(product.product as Obj|undefined);
      const match=byId.get(text(product.id,product.product_id,productObj?.id))??bySku.get(text(product.sku,productObj?.sku));
      orderUnits+=quantity;if(match?.verified){verifiedCost+=match.cost*quantity;orderVerifiedUnits+=quantity;}
    }
    totalUnits+=orderUnits;verifiedUnits+=orderVerifiedUnits;
    const coverage=orderUnits?orderVerifiedUnits/orderUnits:0,analyzable=!excludedStatus&&orderUnits>0&&coverage===1;
    const contribution=analyzable?revenue-verifiedCost:null,pct=contribution!=null&&revenue>0?contribution/revenue:null;
    const floor=policy.marginFloorPct;
    const attention=excludedStatus?null:!analyzable?"Product costs need confirmation":contribution!<0?"This order sold at a loss":pct!<floor?`Below the ${Math.round(floor*100)}% protection floor`:null;
    return {id:text(order.id,order.code),code:text(order.code,order.invoice_number,order.id),status,revenue,verified_cost:verifiedCost,contribution,contribution_pct:pct,discount,cost_coverage_pct:coverage*100,attention};
  });
  const analyzable=orders.filter(order=>order.contribution!=null),revenue=orders.reduce((sum,order)=>sum+order.revenue,0),contribution=analyzable.reduce((sum,order)=>sum+(order.contribution??0),0);
  const lossOrders=analyzable.filter(order=>(order.contribution??0)<0),lossAmount=lossOrders.reduce((sum,order)=>sum+Math.abs(order.contribution??0),0);
  const allCoupons=arr(couponsPayload.coupons).length?arr(couponsPayload.coupons):arr((couponsPayload.data as Obj|undefined)?.coupons);
  const rawCoupons=allCoupons.filter(coupon=>coupon.active!==false&&coupon.is_active!==false&&!["inactive","expired","deleted"].includes(text(coupon.status).toLowerCase())&&(!text(coupon.end_at,coupon.expires_at)||Date.parse(text(coupon.end_at,coupon.expires_at))>=Date.now()));
  const verifiedCatalog=catalog.filter(item=>item.verified&&item.price>0);
  const coupons=rawCoupons.slice(0,50).map(coupon=>{
    const discountType=text(coupon.discount_type,coupon.type).toLowerCase(),discount=num(coupon.discount??coupon.discount_value),isPercent=["p","percent","percentage"].includes(discountType);
    const affected=isPercent?verifiedCatalog.filter(item=>{const discounted=item.price*(1-discount/100);return discounted<=0||(discounted-item.cost)/discounted<policy.marginFloorPct;}):[];
    return {id:text(coupon.id,coupon.coupon_id),code:text(coupon.code,"No code"),name:text(coupon.name,coupon.code,"Coupon"),discount_label:isPercent?`${discount}%`:`${currency} ${discount.toFixed(2)}`,products_below_floor:affected.length,verified_products_tested:verifiedCatalog.length,risk:!isPercent||!verifiedCatalog.length?"unknown" as const:affected.length?"review" as const:"safe" as const};
  });
  const riskyCoupons=coupons.filter(coupon=>coupon.risk==="review");
  const priorities:ZidProfitBrief["priorities"]=[];
  if(lossOrders.length)priorities.push({kind:"order_loss",title:`Review ${lossOrders.length} loss-making order${lossOrders.length===1?"":"s"}`,detail:`These orders lost ${currency} ${lossAmount.toFixed(2)} after verified product costs.`,amount:lossAmount});
  if(riskyCoupons.length)priorities.push({kind:"coupon_risk",title:`Review ${riskyCoupons.length} coupon${riskyCoupons.length===1?"":"s"}`,detail:"Their discounts push at least one verified-cost product below your active protection floor.",amount:null});
  if(totalUnits>verifiedUnits)priorities.push({kind:"missing_cost",title:"Confirm missing product costs",detail:`Only ${totalUnits?Math.round(verifiedUnits/totalUnits*100):0}% of ordered units have verified costs, so some order profit is intentionally withheld.`,amount:null});
  if(!priorities.length)priorities.push({kind:"healthy",title:"No verified loss needs action",detail:"Orders with complete product-cost evidence are meeting the active protection floor.",amount:null});
  const result:ZidProfitBrief={period:{start:startDate,end:endDate,days},currency,order_count:orders.length,analyzable_order_count:analyzable.length,revenue,contribution,contribution_pct:analyzable.length&&revenue>0?contribution/revenue:null,loss_order_count:lossOrders.length,loss_amount:lossAmount,discount_total:orders.reduce((sum,order)=>sum+order.discount,0),verified_cost_coverage_pct:totalUnits?verifiedUnits/totalUnits*100:0,excluded_order_count:orders.length-analyzable.length,orders:orders.sort((a,b)=>Number(Boolean(b.attention))-Number(Boolean(a.attention))||((a.contribution??Infinity)-(b.contribution??Infinity))),coupons,priorities,limitations:["Contribution subtracts verified product cost from non-cancelled Zid order totals. Payment, fulfilment, partial-return and reverse-logistics costs are excluded until supplied by the merchant or channel.","Orders without complete cost evidence are never described as profitable or loss-making."],retrieved_at:new Date().toISOString()};
  const snapshot={account_id:accountId,period_start:startDate,period_end:endDate,currency,order_count:result.order_count,analyzable_order_count:result.analyzable_order_count,revenue,contribution,loss_order_count:result.loss_order_count,discount_total:result.discount_total,verified_cost_coverage_pct:result.verified_cost_coverage_pct,summary:result as unknown as Json};
  const todayStart=`${endDate}T00:00:00.000Z`;
  const {data:todaySnapshot}=await supabaseAdmin.from("ps_zid_profit_snapshots").select("id").eq("account_id",accountId).gte("created_at",todayStart).order("created_at",{ascending:false}).limit(1).maybeSingle();
  const snapshotResult=todaySnapshot
    ? await supabaseAdmin.from("ps_zid_profit_snapshots").update(snapshot).eq("id",todaySnapshot.id)
    : await supabaseAdmin.from("ps_zid_profit_snapshots").insert(snapshot);
  if(snapshotResult.error)console.error("Zid Profit Brief snapshot could not be saved",snapshotResult.error);
  return result;
}
