import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { Json } from "@/integrations/supabase/types";
import { getMerchantMarginPolicy } from "./merchant-pricing-config";
import { syncProfitBriefAttention } from "./merchant-experience";

type Headers = Record<string,string>;
type Obj = Record<string,unknown>;
const num=(value:unknown)=>{if(value&&typeof value==="object")value=(value as Obj).amount??(value as Obj).value;const parsed=Number(value??0);return Number.isFinite(parsed)?parsed:0;};
const arr=(value:unknown):Obj[]=>Array.isArray(value)?value.filter(item=>item&&typeof item==="object") as Obj[]:[];
const text=(...values:unknown[])=>String(values.find(value=>typeof value==="string"||typeof value==="number")??"");
const pct=(value:unknown)=>{const parsed=num(value);return parsed>1?parsed/100:parsed;};
const idsFrom=(value:unknown):string[]=>Array.isArray(value)?value.flatMap(item=>item&&typeof item==="object"?[text((item as Obj).id,(item as Obj).product_id)]:[text(item)]).filter(Boolean):typeof value==="string"?value.split(",").map(item=>item.trim()).filter(Boolean):[];

type VatSummary={available:boolean;active:boolean;included_in_prices:boolean;rate:number|null;amount:number;source:"zid_settings"|"order_evidence"|"unavailable";message:string};
type StockSummary={products:number;available:number;out_of_stock:number;low_stock:number;unknown:number;units_available:number};
type ReturnsSummary={orders:number;amount:number;credit_notes:number;status:"checked"|"permission_required"|"unavailable";message:string};

export type ZidProfitBrief={
  period:{start:string;end:string;days:number};currency:string;order_count:number;analyzable_order_count:number;
  revenue:number;gross_revenue:number;vat_excluded_revenue:number;contribution:number;contribution_pct:number|null;loss_order_count:number;loss_amount:number;
  discount_total:number;verified_cost_coverage_pct:number;excluded_order_count:number;
  vat:VatSummary;stock:StockSummary;returns:ReturnsSummary;
  orders:Array<{id:string;code:string;status:string;gross_revenue:number;vat_amount:number;return_amount:number;revenue:number;verified_cost:number;contribution:number|null;contribution_pct:number|null;discount:number;cost_coverage_pct:number;attention:string|null}>;
  coupons:Array<{id:string;code:string;name:string;discount_label:string;products_below_floor:number;verified_products_tested:number;risk:"review"|"safe"|"unknown"}>;
  priorities:Array<{kind:string;title:string;detail:string;amount:number|null}>;limitations:string[];retrieved_at:string;
};

export async function buildZidProfitBrief(accountId:string,headers:Headers,days=30):Promise<ZidProfitBrief>{
  const end=new Date(),start=new Date(end.getTime()-(Math.max(1,Math.min(days,90))-1)*86400000);
  const startDate=start.toISOString().slice(0,10),endDate=end.toISOString().slice(0,10);
  const [ordersResponse,couponsResponse,vatResponse,catalogResult,policy]=await Promise.all([
    fetch(`https://api.zid.sa/v1/managers/store/orders?payload_type=full&page=1&per_page=100&date_from=${startDate}&date_to=${endDate}`,{headers}),
    fetch("https://api.zid.sa/v1/managers/store/coupons?page=1&per_page=100",{headers}),
    fetch("https://api.zid.sa/v1/managers/store/third-party/vat",{headers}),
    supabaseAdmin.from("ps_ingest_events").select("item_id,sku,item_name_en,base_cost,current_retail_price,currency,inventory_status,raw_payload,created_at").eq("account_id",accountId).eq("source_platform","zid").order("created_at",{ascending:false}).limit(5000),
    getMerchantMarginPolicy(accountId),
  ]);
  if(!ordersResponse.ok)throw new Error(`Zid orders API returned ${ordersResponse.status}. Confirm that orders.read is approved for this app.`);
  const ordersPayload=await ordersResponse.json().catch(()=>({})) as Obj;
  const couponsPayload=couponsResponse.ok?await couponsResponse.json().catch(()=>({})) as Obj:{};
  const vatPayload=vatResponse.ok?await vatResponse.json().catch(()=>({})) as Obj:{};
  const taxSettings=(vatPayload.tax_settings as Obj|undefined)??{};
  const countries=arr(taxSettings.countries);
  const configuredRates=[taxSettings.tax_percentage,taxSettings.vat_percentage,taxSettings.other_countries_tax_percentage,...countries.map(country=>country.tax_percentage)].map(pct).filter(rate=>rate>0&&rate<1);
  const configuredVatRate=configuredRates[0]??null;
  const vatActive=vatResponse.ok&&Boolean(taxSettings.can_use_vat)&&Boolean(taxSettings.vat_activate);
  const vatIncluded=vatActive&&Boolean(taxSettings.is_vat_included_in_product_price);
  const rawOrders=arr(ordersPayload.orders).length?arr(ordersPayload.orders):arr((ordersPayload.data as Obj|undefined)?.orders);
  const rawCatalog=catalogResult.data??[],seen=new Set<string>();
  const catalog=rawCatalog.filter(row=>{const key=row.item_id||row.sku;if(!key||seen.has(key))return false;seen.add(key);return true;}).map(row=>({
    id:row.item_id,sku:row.sku,cost:num(row.base_cost),price:num(row.current_retail_price),currency:row.currency,
    verified:String((row.raw_payload as Obj|null)?.cost_source??"")==="platform_catalog",inventory:String(row.inventory_status??"unknown"),quantity:num((row.raw_payload as Obj|null)?.quantity),infinite:Boolean((row.raw_payload as Obj|null)?.is_infinite),
  }));
  const byId=new Map(catalog.map(item=>[item.id,item])),bySku=new Map(catalog.map(item=>[item.sku,item]));
  let currency=catalog.find(item=>item.currency)?.currency??"SAR",verifiedUnits=0,totalUnits=0;
  const orders=rawOrders.map(order=>{
    const products=[...arr(order.products),...arr(order.items),...arr(order.order_products)];
    const statusRaw=order.status,status=typeof statusRaw==="object"&&statusRaw?text((statusRaw as Obj).code,(statusRaw as Obj).name):text(statusRaw,"unknown");
    const statedRevenue=num(order.total??order.order_total??order.total_value??order.grand_total),excludedStatus=/cancel|void/i.test(status);
    const invoice=[...arr(order.invoice),...arr((order.payment as Obj|undefined)?.invoice)];
    const explicitVat=invoice.filter(line=>/vat|tax/i.test(text(line.code,line.title,line.name))).reduce((sum,line)=>sum+num(line.value??line.amount??line.total),0)||num(order.vat_total??order.tax_total??order.tax_amount);
    const orderVat=excludedStatus?0:explicitVat>0?explicitVat:vatIncluded&&configuredVatRate?statedRevenue*configuredVatRate/(1+configuredVatRate):0;
    const embeddedReturns=[order.refund_total,order.refunded_amount,order.return_total,order.reverse_total,(order.refund as Obj|undefined)?.amount,(order.return_shipment as Obj|undefined)?.refund_total].map(num);
    const returnAmount=excludedStatus?0:Math.max(0,...embeddedReturns);
    const revenue=excludedStatus?0:Math.max(0,statedRevenue-orderVat-returnAmount);
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
    return {id:text(order.id,order.code),code:text(order.code,order.invoice_number,order.id),status,gross_revenue:excludedStatus?0:statedRevenue,vat_amount:orderVat,return_amount:returnAmount,revenue,verified_cost:verifiedCost,contribution,contribution_pct:pct,discount,cost_coverage_pct:coverage*100,attention};
  });
  const analyzable=orders.filter(order=>order.contribution!=null),grossRevenue=orders.reduce((sum,order)=>sum+order.gross_revenue,0),vatAmount=orders.reduce((sum,order)=>sum+order.vat_amount,0),embeddedReturnAmount=orders.reduce((sum,order)=>sum+order.return_amount,0),revenue=orders.reduce((sum,order)=>sum+order.revenue,0),contribution=analyzable.reduce((sum,order)=>sum+(order.contribution??0),0);
  const lossOrders=analyzable.filter(order=>(order.contribution??0)<0),lossAmount=lossOrders.reduce((sum,order)=>sum+Math.abs(order.contribution??0),0);
  const allCoupons=arr(couponsPayload.coupons).length?arr(couponsPayload.coupons):arr((couponsPayload.data as Obj|undefined)?.coupons);
  const rawCoupons=allCoupons.filter(coupon=>coupon.active!==false&&coupon.is_active!==false&&!["inactive","expired","deleted"].includes(text(coupon.status).toLowerCase())&&(!text(coupon.end_at,coupon.expires_at)||Date.parse(text(coupon.end_at,coupon.expires_at))>=Date.now()));
  const availableCatalog=catalog.filter(item=>item.inventory!=="out_of_stock");
  const verifiedCatalog=availableCatalog.filter(item=>item.verified&&item.price>0);
  const coupons=rawCoupons.slice(0,50).map(coupon=>{
    const discountType=text(coupon.discount_type,coupon.type).toLowerCase(),discount=num(coupon.discount??coupon.discount_value),isPercent=["p","percent","percentage"].includes(discountType);
    const applyTo=text(coupon.apply_to,coupon.applies_to).toLowerCase();
    const targetIds=new Set([coupon.apply_to_array,coupon.product_ids,coupon.products,coupon.apply_to_data].flatMap(idsFrom));
    const targeted=/product/.test(applyTo)&&targetIds.size>0;
    const couponCatalog=targeted?verifiedCatalog.filter(item=>Boolean(item.id)&&targetIds.has(item.id!)):verifiedCatalog;
    const affected=isPercent?couponCatalog.filter(item=>{const discountedGross=item.price*(1-discount/100),discounted=vatIncluded&&configuredVatRate?discountedGross/(1+configuredVatRate):discountedGross;return discounted<=0||(discounted-item.cost)/discounted<policy.marginFloorPct;}):[];
    return {id:text(coupon.id,coupon.coupon_id),code:text(coupon.code,"No code"),name:text(coupon.name,coupon.code,"Coupon"),discount_label:isPercent?`${discount}%`:`${currency} ${discount.toFixed(2)}`,products_below_floor:affected.length,verified_products_tested:couponCatalog.length,risk:!isPercent||!couponCatalog.length?"unknown" as const:affected.length?"review" as const:"safe" as const};
  });
  const riskyCoupons=coupons.filter(coupon=>coupon.risk==="review");
  const priorities:ZidProfitBrief["priorities"]=[];
  if(lossOrders.length)priorities.push({kind:"order_loss",title:`Review ${lossOrders.length} loss-making order${lossOrders.length===1?"":"s"}`,detail:`These orders lost ${currency} ${lossAmount.toFixed(2)} after verified product costs.`,amount:lossAmount});
  if(riskyCoupons.length)priorities.push({kind:"coupon_risk",title:`Review ${riskyCoupons.length} coupon${riskyCoupons.length===1?"":"s"}`,detail:"Their discounts push at least one verified-cost product below your active protection floor.",amount:null});
  if(totalUnits>verifiedUnits)priorities.push({kind:"missing_cost",title:"Confirm missing product costs",detail:`Only ${totalUnits?Math.round(verifiedUnits/totalUnits*100):0}% of ordered units have verified costs, so some order profit is intentionally withheld.`,amount:null});
  const outOfStock=catalog.filter(item=>item.inventory==="out_of_stock").length,lowStock=catalog.filter(item=>item.inventory==="in_stock"&&!item.infinite&&item.quantity>0&&item.quantity<=5).length,unknownStock=catalog.filter(item=>!["in_stock","out_of_stock"].includes(item.inventory)).length;
  if(outOfStock||lowStock)priorities.push({kind:"stock_attention",title:`Review ${outOfStock+lowStock} stock issue${outOfStock+lowStock===1?"":"s"}`,detail:`${outOfStock} out of stock and ${lowStock} low in stock. These products are excluded from automatic pricing actions where availability is unsafe.`,amount:null});
  if(!vatResponse.ok)priorities.push({kind:"vat_permission",title:"Enable VAT read access",detail:"PrizeSkout withheld tax adjustments because Zid VAT settings were not available. Add VATs — Read and reconnect the store.",amount:null});
  if(embeddedReturnAmount>0)priorities.push({kind:"returns_impact",title:"Returns reduced what you kept",detail:`Recorded refunds and returns removed ${currency} ${embeddedReturnAmount.toFixed(2)} from recent order revenue.`,amount:embeddedReturnAmount});
  if(!priorities.length)priorities.push({kind:"healthy",title:"No verified loss needs action",detail:"Orders with complete product-cost evidence are meeting the active protection floor.",amount:null});
  const vat:VatSummary={available:vatResponse.ok,active:vatActive,included_in_prices:vatIncluded,rate:configuredVatRate,amount:vatAmount,source:vatAmount>0&&orders.some(order=>order.vat_amount>0)?(vatResponse.ok?"zid_settings":"order_evidence"):vatResponse.ok?"zid_settings":"unavailable",message:!vatResponse.ok?"VAT settings are unavailable. Add VATs — Read and reconnect Zid.":!vatActive?"Zid reports that VAT is not active for this store.":vatIncluded?`VAT is included in selling prices${configuredVatRate?` at ${(configuredVatRate*100).toFixed(1)}%`:""} and is removed before contribution is calculated.`:"Zid reports that VAT is active but not included in product prices."};
  const stock:StockSummary={products:catalog.length,available:availableCatalog.length,out_of_stock:outOfStock,low_stock:lowStock,unknown:unknownStock,units_available:catalog.filter(item=>!item.infinite).reduce((sum,item)=>sum+item.quantity,0)};
  const returns:ReturnsSummary={orders:orders.filter(order=>order.return_amount>0).length,amount:embeddedReturnAmount,credit_notes:0,status:"checked",message:embeddedReturnAmount>0?"Recorded refund and return amounts were removed before contribution was calculated.":"No refund or return amount was reported on the recent Zid orders."};
  const result:ZidProfitBrief={period:{start:startDate,end:endDate,days},currency,order_count:orders.length,analyzable_order_count:analyzable.length,revenue,gross_revenue:grossRevenue,vat_excluded_revenue:grossRevenue-vatAmount,contribution,contribution_pct:analyzable.length&&revenue>0?contribution/revenue:null,loss_order_count:lossOrders.length,loss_amount:lossAmount,discount_total:orders.reduce((sum,order)=>sum+order.discount,0),verified_cost_coverage_pct:totalUnits?verifiedUnits/totalUnits*100:0,excluded_order_count:orders.length-analyzable.length,vat,stock,returns,orders:orders.sort((a,b)=>Number(Boolean(b.attention))-Number(Boolean(a.attention))||((a.contribution??Infinity)-(b.contribution??Infinity))),coupons,priorities,limitations:["Contribution starts with Zid order value, removes confirmed VAT and recorded returns, then subtracts verified product cost. Payment, fulfilment and reverse-logistics costs remain excluded until evidenced.","Orders without complete cost evidence are never described as profitable or loss-making."],retrieved_at:new Date().toISOString()};
  const snapshot={account_id:accountId,period_start:startDate,period_end:endDate,currency,order_count:result.order_count,analyzable_order_count:result.analyzable_order_count,revenue,contribution,loss_order_count:result.loss_order_count,discount_total:result.discount_total,verified_cost_coverage_pct:result.verified_cost_coverage_pct,summary:result as unknown as Json};
  const todayStart=`${endDate}T00:00:00.000Z`;
  const {data:todaySnapshot}=await supabaseAdmin.from("ps_zid_profit_snapshots").select("id").eq("account_id",accountId).gte("created_at",todayStart).order("created_at",{ascending:false}).limit(1).maybeSingle();
  const snapshotResult=todaySnapshot
    ? await supabaseAdmin.from("ps_zid_profit_snapshots").update(snapshot).eq("id",todaySnapshot.id)
    : await supabaseAdmin.from("ps_zid_profit_snapshots").insert(snapshot);
  if(snapshotResult.error)console.error("Zid Profit Brief snapshot could not be saved",snapshotResult.error);
  await syncProfitBriefAttention(accountId,result);
  return result;
}
