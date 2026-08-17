import {supabaseAdmin} from "@/integrations/supabase/client.server";
import {pushPriceToSourcePlatform} from "./platform-sync";
import {getValidSallaAccessToken} from "./salla-token";
import {getValidTalabatAccessToken, updateTalabatPrice} from "./talabat-client";
import type {ChannelPriceRow} from "@/lib/channel-price-planner";
import {createNotification} from "@/server/notifications";

export type SavedChannelPricePlan={id:string;account_id:string;name:string;status:"draft"|"approved"|"partially_published"|"published"|"cancelled";channel_config:unknown[];rows:unknown[];approved_by:string|null;approved_at:string|null;published_at:string|null;created_at:string;updated_at:string};
export type PublishRowResult={sku:string;name:string;channel:string;planned_price:number;status:"published"|"skipped"|"failed";reason:string};
export async function listChannelPricePlans(accountId:string){
  const {data,error}=await supabaseAdmin.from("ps_channel_price_plans").select("*").eq("account_id",accountId).order("created_at",{ascending:false}).limit(50);
  if(error&&error.code!=="42P01")throw error;
  return (data??[]) as SavedChannelPricePlan[];
}
export async function saveChannelPricePlan(accountId:string,name:string,channelConfig:unknown[],rows:unknown[]){
  const {data,error}=await supabaseAdmin.from("ps_channel_price_plans").insert({account_id:accountId,name,status:"draft",channel_config:channelConfig,rows}).select("*").single();
  if(error)throw error;return data as SavedChannelPricePlan;
}
export async function approveChannelPricePlan(accountId:string,id:string,reviewer:string){
  const {data,error}=await supabaseAdmin.from("ps_channel_price_plans").update({status:"approved",approved_by:reviewer,approved_at:new Date().toISOString(),updated_at:new Date().toISOString()}).eq("account_id",accountId).eq("id",id).eq("status","draft").select("*").single();
  if(error)throw error;return data as SavedChannelPricePlan;
}

const pick=(row:ChannelPriceRow):Pick<PublishRowResult,"sku"|"name"|"channel"|"planned_price">=>
  ({sku:row.sku,name:row.name,channel:row.channel,planned_price:row.planned_price});

// Pushes every "ready"/"approval_required" row in an approved plan out to its
// live channel. zid/salla/foodics only work for rows whose product actually
// originated from that platform (we hold a real item_id there); talabat works
// for any row since Talabat's catalog API is SKU-keyed, not item-id-keyed —
// this is what lets aggregator-only merchants use channel pricing at all.
// Every other channel (snoonu, jahez, keeta, in_store) has no live push
// implemented yet and is reported back as "skipped", never silently dropped.
export async function publishChannelPricePlan(accountId:string,id:string):Promise<{plan:SavedChannelPricePlan;results:PublishRowResult[]}>{
  const {data:plan,error:planError}=await supabaseAdmin.from("ps_channel_price_plans").select("*").eq("account_id",accountId).eq("id",id).eq("status","approved").single();
  if(planError||!plan)throw new Error("Plan not found, or it has not been approved yet.");

  const rows=(plan.rows??[]) as ChannelPriceRow[];
  const results:PublishRowResult[]=[];

  const {data:channels}=await supabaseAdmin.from("ps_merchant_channels").select("id,platform,bearer_token,manager_token,metadata,status").eq("account_id",accountId).in("platform",["zid","salla","foodics","talabat"]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const byPlatform=new Map(((channels??[]) as any[]).map(c=>[c.platform as string,c]));

  let talabatToken:string|null=null;
  let talabatTokenError:string|null=null;

  for(const row of rows){
    if(row.status==="excluded"){results.push({...pick(row),status:"skipped",reason:"Excluded from the plan (missing cost or margin data)."});continue;}

    if(row.channel==="talabat"){
      const ch=byPlatform.get("talabat");
      if(!ch||ch.status!=="connected"){results.push({...pick(row),status:"skipped",reason:"Talabat is not connected."});continue;}
      if(talabatToken===null&&talabatTokenError===null){
        const tok=await getValidTalabatAccessToken(ch);
        talabatToken=tok.accessToken;talabatTokenError=tok.error??null;
      }
      if(!talabatToken){results.push({...pick(row),status:"failed",reason:talabatTokenError??"Could not authenticate with Talabat."});continue;}
      const meta=(ch.metadata??{}) as Record<string,unknown>;
      const chainId=String(meta.chain_id??"");
      const vendorId=String(meta.vendor_id??"");
      if(!chainId||!vendorId){results.push({...pick(row),status:"failed",reason:"Talabat chain/vendor id is missing from the connection."});continue;}
      const push=await updateTalabatPrice({chainId,vendorId,sku:row.sku,newPrice:row.planned_price,accessToken:talabatToken,environment:meta.environment==="sandbox"?"sandbox":"production"});
      results.push({...pick(row),status:push.ok?"published":"failed",reason:push.ok?"Queued with Talabat for live update.":(push.message??"Talabat rejected the update.")});
      continue;
    }

    if(row.channel==="zid"||row.channel==="salla"||row.channel==="foodics"){
      if(row.source_platform!==row.channel||!row.ingest_event_id){
        results.push({...pick(row),status:"skipped",reason:`No linked ${label(row.channel)} product for this SKU — it wasn't synced from there.`});
        continue;
      }
      const ch=byPlatform.get(row.channel);
      if(!ch||ch.status!=="connected"||!ch.bearer_token){results.push({...pick(row),status:"skipped",reason:`${label(row.channel)} is not connected.`});continue;}
      const {data:evt}=await supabaseAdmin.from("ps_ingest_events").select("item_id,currency").eq("id",row.ingest_event_id).eq("account_id",accountId).maybeSingle();
      if(!evt?.item_id){results.push({...pick(row),status:"failed",reason:"Source product could not be found."});continue;}
      const meta=(ch.metadata??{}) as Record<string,unknown>;
      const bearerToken=row.channel==="salla"?await getValidSallaAccessToken(ch):ch.bearer_token;
      const push=await pushPriceToSourcePlatform(row.channel,{bearer_token:bearerToken,manager_token:ch.manager_token??null,store_id:String(meta.store_id??"")||null},evt.item_id,row.planned_price,evt.currency??"SAR");
      if(push.success){
        await supabaseAdmin.from("ps_ingest_events").update({current_retail_price:row.planned_price,status:"repriced"}).eq("id",row.ingest_event_id).eq("account_id",accountId);
      }
      results.push({...pick(row),status:push.success?"published":"failed",reason:push.message??(push.success?"Price updated.":"Platform rejected the update.")});
      continue;
    }

    results.push({...pick(row),status:"skipped",reason:row.channel==="in_store"?"In-store prices are reference-only — update your POS directly.":`Live push for ${label(row.channel)} isn't available yet — update this channel manually.`});
  }

  const anyPublished=results.some(r=>r.status==="published");
  const anyUnpublished=results.some(r=>r.status!=="published");
  const newStatus=anyPublished?(anyUnpublished?"partially_published":"published"):plan.status;

  const update:{status:string;updated_at:string;published_at?:string}={status:newStatus,updated_at:new Date().toISOString()};
  if(anyPublished)update.published_at=new Date().toISOString();

  const {data:updated,error:updateError}=await supabaseAdmin.from("ps_channel_price_plans").update(update).eq("account_id",accountId).eq("id",id).select("*").single();
  if(updateError)throw updateError;
  const published=results.filter(result=>result.status==="published");
  const failed=results.filter(result=>result.status==="failed");
  if(published.length){
    void createNotification({userId:accountId,preferenceKey:"reprice_applied",category:"pricing",severity:"success",title:`${published.length} price ${published.length===1?"change":"changes"} sent`,body:failed.length?`${failed.length} other ${failed.length===1?"change needs":"changes need"} attention.`:"PrizeSkout sent every approved change to the connected channel.",linkTo:"/dashboard/revenue-hub",dedupeKey:`reprice:${id}`,dedupeWindowMinutes:1440,metadata:{plan_id:id,published:published.length,failed:failed.length}});
  }
  if(failed.length){
    void createNotification({userId:accountId,preferenceKey:"channel_down",category:"pricing",severity:"error",title:`${failed.length} price ${failed.length===1?"change was":"changes were"} not sent`,body:"Open the price plan to see which channel needs attention.",linkTo:"/dashboard/revenue-hub",dedupeKey:`reprice-failed:${id}`,dedupeWindowMinutes:1440,metadata:{plan_id:id,failed:failed.length}});
  }
  return {plan:updated as SavedChannelPricePlan,results};
}

const label=(v:string)=>v.replaceAll("_"," ").replace(/\b\w/g,c=>c.toUpperCase());
