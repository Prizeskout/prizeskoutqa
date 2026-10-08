import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";
import { handleRestaurantOrderBatch } from "../src/server/restaurant-commerce-handlers";
import { handleRestaurantReconciliationRun, handleRestaurantSettlementBatch } from "../src/server/restaurant-settlement-handlers";
import { createRecoveryCaseFromFinding } from "../src/server/core/recovery-cases";

const url=process.env.SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;
assert(url&&key,"SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.");
const db=createClient(url,key,{auth:{persistSession:false}});
const accountId=process.env.PRODUCT_FILM_ACCOUNT_ID??"00000000-0000-4000-8000-000000005100",licenseeId=process.env.PRODUCT_FILM_LICENSEE_ID??"00000000-0000-4000-8000-000000005200";
const now=new Date(),day=process.env.PRODUCT_FILM_BUSINESS_DATE??"2026-09-18",suffix=day.replace(/\D/g,"").slice(2);
const platform=process.env.PRODUCT_FILM_PLATFORM??"snoonu",profile=process.env.PRODUCT_FILM_PROFILE??"saffron";
const ctx={apiKeyId:"product-film-demo",userId:accountId,accountId,licenseeId,scopes:["read","write","admin"],plan:"enterprise",isPlatform:false,planMode:"live"} as any;

if(!process.env.PRODUCT_FILM_ACCOUNT_ID)await db.from("ps_access_codes").upsert({code:"PS-FILM-2026",merchant_id:accountId,email:"demo@prizeskout.qa",store_name:"Saffron Table — Doha"},{onConflict:"code"}).throwOnError();
await db.from("ps_merchant_channels").upsert({
  account_id:accountId,licensee_id:licenseeId,merchant_id:`${platform}-film-demo`,platform,
  scopes:["merchant.read","branches.read","catalogue.read","orders.read","settlements.read"],status:"connected",
  connected_at:now.toISOString(),last_verified_at:now.toISOString(),
  metadata:{connection_mode:"controlled_product_film_demo",synthetic:true,label:"Controlled demonstration data - not live financial evidence"},
},{onConflict:"account_id,merchant_id,platform"}).throwOnError();

const {data:priorTerm}=await db.from("ps_marketplace_contract_terms").select("id").eq("account_id",accountId).eq("platform",platform).eq("effective_from","2026-01-01").eq("status","approved").maybeSingle().throwOnError();
let contractTermId=priorTerm?.id as string|undefined;
if(!contractTermId){
  const {data:term}=await db.from("ps_marketplace_contract_terms").insert({
    account_id:accountId,platform,contract_name:`${platform.toUpperCase()} controlled demonstration terms`,
    commission_rate_pct:18,vat_on_fees_pct:5,payment_fee_pct:0,fixed_order_fee:1,delivery_contribution:0,
    effective_from:"2026-01-01",status:"approved",commission_base:"eligible_sales",currency:"QAR",
    source_file_name:"controlled-demonstration-agreement.pdf",notes:"Synthetic terms used only for the PrizeSkout product film.",
    reviewed_by:"PrizeSkout product film",approved_at:now.toISOString(),
  }).select("id").single().throwOnError();
  contractTermId=term!.id;
}

const menu=(profile==="naija"?[
  ["NR-JOLLOF","Smoky Party Jollof Rice",78,28],["NR-SUYA","Beef Suya Platter",92,37],
  ["NR-EGUSI","Egusi Soup & Pounded Yam",88,34],["NR-MOI","Moi Moi & Plantain",54,19],
  ["NR-PEPPER","Pepper Soup Bowl",66,25],["NR-ZOBO","Chilled Zobo",24,7],
]:[
  ["ST-CHICKEN","Charcoal Chicken Platter",100,39],["ST-SHAWARMA","Shawarma Family Box",120,58],
  ["ST-WINGS","Crispy Wings",80,36],["ST-MEZZA","Mezza Sharing Board",150,79],
  ["ST-BREAKFAST","Breakfast Box",90,42],["ST-KIDS","Kids Meal Set",65,31],
] as const);
const base=Date.parse(day+"T09:30:00.000Z");
const orders=menu.map(([sku,name,gross],index)=>({
  external_event_id:"snoonu-film-order-"+suffix+"-"+(index+1),external_order_id:"SN-"+suffix.slice(-6)+"-"+String(index+1).padStart(3,"0"),
  occurred_at:new Date(base+index*180000).toISOString(),business_date:day,currency:"QAR",channel:platform,status:"delivered",final:true,
  legal_entity_external_id:profile==="naija"?"naija-restaurant-qa":"saffron-table-qa",brand_external_id:profile==="naija"?"naija-restaurant":"saffron-table",branch_external_id:profile==="naija"?(index%2?"naija-lusail":"naija-west-bay"):(index%2?"sn_lusail":"sn_west_bay"),
  revenue_center_external_id:index%2?"lusail-kitchen":"west-bay-kitchen",gross_amount:gross,discount_amount:0,tax_amount:0,
  service_charge_amount:0,delivery_charge_amount:0,refund_amount:0,cancellation_amount:0,net_amount:gross,
  lines:[{external_line_id:"line-"+suffix+"-"+(index+1),sku,name,quantity:1,gross_amount:gross,discount_amount:0,tax_amount:0}],
}));
const orderResult=await handleRestaurantOrderBatch(new Request("https://demo.local/v1/commerce/orders",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({
  batch_id:`${platform}-film-orders-${suffix}`,source_provider:platform,schema_version:"2026-09-05",delivery_complete:true,declared_record_count:orders.length,orders,
})}),ctx);
assert([200,202].includes(orderResult.status),JSON.stringify(orderResult.body));
const orderEvidenceId=(orderResult.body as any).data.evidence_item_id as string;

const expectedFor=(gross:number)=>Math.round((gross-gross*.18-gross*.18*.05-1)*100)/100;
const settlements=orders.map((order,index)=>{
  const demoGaps=profile==="naija"?[0,12.4,0,8.75,6.25,0]:[0,6.2,0,4.75,0,0];
  const expected=expectedFor(order.gross_amount),gap=demoGaps[index]??0,settled=Math.round((expected-gap)*100)/100;
  const commission=Math.round(order.gross_amount*.18*100)/100,vat=Math.round(commission*.05*100)/100;
  return {external_event_id:"snoonu-film-settlement-"+suffix+"-"+(index+1),settlement_reference:"SN-SET-"+suffix.slice(-6)+"-"+(index+1),
    order_external_id:order.external_order_id,occurred_at:new Date(Date.parse(order.occurred_at)+7200000).toISOString(),currency:"QAR",
    settled_amount:settled,gross_sales_amount:order.gross_amount,commission_amount:commission,tax_on_fees_amount:vat,
    other_fee_amount:Math.round((order.gross_amount-commission-vat-settled)*100)/100,adjustment_amount:0};
});
const settlementResult=await handleRestaurantSettlementBatch(new Request("https://demo.local/v1/commerce/settlements",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({
  batch_id:`${platform}-film-settlements-${suffix}`,source_provider:platform,channel:platform,schema_version:"2026-09-05",delivery_complete:true,settlements,receipts:[],
})}),ctx);
assert([200,202].includes(settlementResult.status),JSON.stringify(settlementResult.body));
const settlementEvidenceId=(settlementResult.body as any).data.evidence_item_id as string;

for(const evidenceItemId of [orderEvidenceId,settlementEvidenceId]) await db.from("ps_evidence_agreement_matches").insert({
  account_id:accountId,merchant_id:accountId,evidence_item_id:evidenceItemId,contract_term_id:contractTermId,state:"confirmed",platform,
  evidence_date_start:day,evidence_date_end:day,currency:"QAR",match_score:100,reasons:["Controlled demo evidence explicitly matched to the approved demonstration agreement."],
  blockers:[],candidate_contract_ids:[contractTermId],matcher_version:"product-film-"+suffix,confirmed_by:"PrizeSkout product film",confirmed_at:now.toISOString(),
}).throwOnError();

const reconciliationResult=await handleRestaurantReconciliationRun(new Request("https://demo.local/v1/profit/reconciliation-runs",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({evidence_item_id:settlementEvidenceId,contract_term_id:contractTermId})}),ctx);
assert([200,201].includes(reconciliationResult.status),JSON.stringify(reconciliationResult.body));
const runId=(reconciliationResult.body as any).data.run_id as string;
const {data:findings}=await db.from("ps_reconciliation_findings").select("id,recoverability,order_external_id,variance").eq("account_id",accountId).eq("run_id",runId).eq("recoverability","claims_ready").throwOnError();
// This UUID is reserved for the controlled product-film tenant. Reset only
// its mutable recovery workspace so repeated rehearsals remain deterministic.
if(!process.env.PRODUCT_FILM_ACCOUNT_ID)await db.from("ps_recovery_cases").delete().eq("account_id",accountId).eq("platform",platform).throwOnError();
const filmFindingByOrder=new Map<string,{id:string;recoverability:string;order_external_id:string|null;variance:number|null}>();
for(const finding of findings??[]) if(finding.order_external_id?.startsWith("SN-")) filmFindingByOrder.set(finding.order_external_id,finding);
const intendedGapOrders=new Set(profile==="naija"?[orders[1].external_order_id,orders[3].external_order_id,orders[4].external_order_id]:[orders[1].external_order_id,orders[3].external_order_id]);
const filmFindings=[...filmFindingByOrder.values()].filter(finding=>finding.order_external_id!==null&&intendedGapOrders.has(finding.order_external_id));
for(const finding of filmFindings) await createRecoveryCaseFromFinding(accountId,finding.id);

for(const [sku,, ,cost] of menu){
  const {data:existing}=await db.from("ps_product_cost_versions").select("id").eq("account_id",accountId).eq("merchant_id",accountId).eq("sku",sku).is("effective_to",null).maybeSingle().throwOnError();
  if(existing)await db.from("ps_product_cost_versions").update({amount:cost,effective_from:"2026-01-01T00:00:00.000Z",evidence_ref:`controlled-demo-cost-${sku}`}).eq("id",existing.id).throwOnError();
  else await db.from("ps_product_cost_versions").insert({
    account_id:accountId,merchant_id:accountId,sku,amount:cost,currency:"QAR",source:"manual_verified",
    effective_from:"2026-01-01T00:00:00.000Z",evidence_ref:`controlled-demo-cost-${sku}`,
  }).throwOnError();
}
const {data:priorEconomics}=await db.from("ps_economics_versions").select("id").eq("account_id",accountId).eq("merchant_id",accountId).eq("channel",platform).eq("status","approved").is("effective_to",null).maybeSingle().throwOnError();
let economicsVersionId=priorEconomics?.id as string|undefined;
if(!economicsVersionId){
  const {data:economics}=await db.from("ps_economics_versions").insert({
    account_id:accountId,merchant_id:accountId,channel:platform,region:"QA",version:1,effective_from:now.toISOString(),
    commission_rate:.18,vat_rate:.05,payment_fee_rate:0,fixed_order_fee:1,logistics_subsidy:0,promotion_contribution_rate:0,
    margin_floor_pct:.18,source_contract_id:contractTermId,status:"approved",approved_by:"PrizeSkout product film",approved_at:now.toISOString(),
  }).select("id").single().throwOnError();
  economicsVersionId=economics!.id;
}
for(const [sku,name,price,cost] of menu){
  const idempotencyKey="product-film-catalog-"+sku;
  const {data:ingest}=await db.from("ps_ingest_events").upsert({
    account_id:accountId,licensee_id:licenseeId,event_id:"film-"+sku,idempotency_key:idempotencyKey,region:"QA",source_platform:platform,
    merchant_id:accountId,location_id:"saffron-table-doha",item_id:sku,sku,item_name_en:name,item_name_ar:null,inventory_status:"in_stock",
    base_cost:cost,current_retail_price:price,currency:"QAR",vat_rate:.05,raw_payload:{cost_source:"merchant_upload",target_channel:"snoonu",quantity:40,is_infinite:false},status:"decided",
  },{onConflict:"account_id,idempotency_key"}).select("id").single().throwOnError();
  const {data:priorDecision}=await db.from("ps_decide_results").select("id").eq("account_id",accountId).eq("ingest_event_id",ingest!.id).maybeSingle().throwOnError();
  if(!priorDecision){
    const commission=price*.18,vat=commission*.05,net=price-commission-vat-1-cost,margin=net/price,floor=.18;
    const recommended=margin<floor?Math.ceil(((cost+1)/(1-.18-.18*.05-floor))*100)/100:price;
    await db.from("ps_decide_results").insert({
      ingest_event_id:ingest!.id,account_id:accountId,licensee_id:licenseeId,region:"QA",merchant_id:accountId,sku,base_cost:cost,
      current_retail_price:price,commission_rate:.18,vat_rate:.05,logistics_subsidy:0,margin_floor_pct:floor,net_margin:Math.round(net*100)/100,
      net_margin_pct:Math.round(margin*10000)/10000,floor_breached:margin<floor,recommended_price:recommended,
      decision_action:margin<floor?"reprice_up":"hold",economics_version_id:economicsVersionId,
    }).throwOnError();
  }
}
await db.from("ps_store_manager_profiles").upsert({account_id:accountId,manager_name:"PrizeSkout Store Manager",operating_mode:"supervised",daily_brief_enabled:true,daily_brief_hour:8,timezone:"Asia/Qatar",language:"en"},{onConflict:"account_id"}).throwOnError();
if(!process.env.PRODUCT_FILM_ACCOUNT_ID)await db.from("ps_store_manager_tasks").delete().eq("account_id",accountId).eq("title","Prepare Snoonu products below the margin floor").throwOnError();
await db.from("ps_store_manager_tasks").upsert({
  account_id:accountId,idempotency_key:"product-film-margin-review-"+day,source:"assistant",task_type:"pricing_review",
  title:`Prepare ${platform.toUpperCase()} products below the margin floor`,detail:"Review the controlled demonstration catalogue and prepare protected recommendations for merchant approval.",
  status:"waiting_approval",risk_level:"financial",priority:"high",connector:platform,target_type:"catalogue",target_id:"demo-catalogue",
  assigned_to:"PrizeSkout Store Manager",input:{channel:platform,margin_floor_pct:18,demonstration:true},
  proposed_changes:[{sku:menu[2][0],action:"review_price",reason:"Below the approved contribution margin floor."},{sku:menu[5][0],action:"review_price",reason:"Below the approved contribution margin floor."}],
  evidence:[{reconciliation_run_id:runId},{source:"merchant_confirmed_product_costs"}],approval_required:true,
},{onConflict:"account_id,idempotency_key"}).throwOnError();

console.log(JSON.stringify({account_id:accountId,channel:platform,orders_ingested:orders.length,reconciliation_run_id:runId,claims_ready_findings:filmFindings.length,claims_ready_amount:filmFindings.reduce((sum,finding)=>sum+Math.abs(Number(finding.variance??0)),0),product_costs:menu.length,manager_task:"waiting_approval",synthetic:true},null,2));
