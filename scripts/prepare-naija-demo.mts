import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";

const url=process.env.SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;
assert(url&&key,"SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.");
const db=createClient(url,key,{auth:{persistSession:false}});

const {data:access,error:accessError}=await db.from("ps_access_codes").select("merchant_id,store_name,created_at").ilike("store_name","%naija%").order("created_at",{ascending:false});
if(accessError)throw accessError;
const merchantIds=[...new Set((access??[]).map(row=>row.merchant_id))];
const {data:workspaces,error:workspaceError}=merchantIds.length
  ? await db.from("ps_restaurant_workspaces").select("account_id,licensee_id,name,country_code,currency").in("account_id",merchantIds)
  : {data:[],error:null};
if(workspaceError)throw workspaceError;
const summaries=[];
for(const merchantId of merchantIds){
  const [channels,settings,events]=await Promise.all([
    db.from("ps_merchant_channels").select("platform,status,licensee_id,updated_at,last_verified_at").eq("account_id",merchantId),
    db.from("user_account_settings").select("company_name,country,currency,updated_at").eq("user_id",merchantId).maybeSingle(),
    db.from("ps_normalized_commerce_events").select("id",{count:"exact",head:true}).eq("account_id",merchantId),
  ]);
  const account=await db.from("accounts_v2").select("id,licensee_id,name,region").eq("id",merchantId).maybeSingle();
  summaries.push({merchantId,account:account.data,channels:channels.data,settings:settings.data,eventCount:events.count});
}
const requested=process.env.NAIJA_DEMO_ACCOUNT_ID;
const ranked=summaries.map(item=>({...item,channelCount:item.channels?.length??0})).sort((a,b)=>b.channelCount-a.channelCount);
const target=requested?ranked.find(item=>item.merchantId===requested):ranked[0];
assert(target,"Naija Restaurant account was not found.");
assert(target.channelCount>0,"Refusing to guess between empty duplicate Naija Restaurant accounts.");
const licenseeId=String(target.channels?.find(row=>row.licensee_id)?.licensee_id??target.merchantId);

await db.from("licensees").upsert({id:licenseeId,slug:`naija-demo-${licenseeId.slice(0,8)}`,name:"Naija Restaurant",status:"trial",metadata:{demo_mode:true}},{onConflict:"id"}).throwOnError();
await db.from("licensee_members").upsert({licensee_id:licenseeId,user_id:target.merchantId,role:"owner",accepted_at:new Date().toISOString(),functional_role:"management"},{onConflict:"licensee_id,user_id"}).throwOnError();
await db.from("accounts_v2").upsert({id:target.merchantId,licensee_id:licenseeId,slug:"naija-restaurant",name:"Naija Restaurant",region:"QA",currency:"QAR",metadata:{demo_mode:true},is_default:true},{onConflict:"id"}).throwOnError();
await db.from("ps_restaurant_workspaces").upsert({
  account_id:target.merchantId,licensee_id:licenseeId,name:"Naija Restaurant",country_code:"QA",currency:"QAR",
  industry:"restaurant",timezone:"Asia/Qatar",active:true,metadata:{demo_mode:true,demo_label:"Controlled demonstration data — not live financial evidence"},
},{onConflict:"account_id"}).throwOnError();
await db.from("ps_enterprise_entities").upsert([
  {account_id:target.merchantId,entity_type:"brand",external_id:"naija-restaurant",name:"Naija Restaurant",country_code:"QA",currency:"QAR",timezone:"Asia/Qatar",active:true,metadata:{synthetic:true}},
  {account_id:target.merchantId,entity_type:"branch",external_id:"naija-west-bay",name:"West Bay",country_code:"QA",currency:"QAR",timezone:"Asia/Qatar",active:true,metadata:{synthetic:true}},
  {account_id:target.merchantId,entity_type:"branch",external_id:"naija-lusail",name:"Lusail",country_code:"QA",currency:"QAR",timezone:"Asia/Qatar",active:true,metadata:{synthetic:true}},
],{onConflict:"account_id,entity_type,external_id"}).throwOnError();

process.env.PRODUCT_FILM_ACCOUNT_ID=target.merchantId;
process.env.PRODUCT_FILM_LICENSEE_ID=licenseeId;
process.env.PRODUCT_FILM_STORE_NAME="Naija Restaurant";
process.env.PRODUCT_FILM_PLATFORM="foodics";
process.env.PRODUCT_FILM_PROFILE="naija";
process.env.PRODUCT_FILM_BUSINESS_DATE=process.env.NAIJA_DEMO_BUSINESS_DATE??new Date().toISOString().slice(0,10);
await import("./prepare-product-film-demo.mts");
