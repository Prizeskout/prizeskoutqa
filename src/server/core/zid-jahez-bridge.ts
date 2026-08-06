import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { bridgeCanTrack } from "@/lib/channel-bridge";

export type ZidJahezBridgeSettings = {
  account_id: string;
  mazeed_active: boolean;
  jahez_active: boolean;
  mazeed_commission_pct: number | null;
  vat_mode: "store_includes_vat" | "mazeed_adds_vat";
  eligible_skus: string[];
  confirmed_by: string | null;
  confirmed_at: string | null;
  updated_at: string;
};

const settingsTable = () => (supabaseAdmin as any).from("ps_zid_jahez_bridge_settings");
const eventsTable = () => (supabaseAdmin as any).from("ps_channel_propagation_events");
const unavailable = (error: any, table: string) => error?.code === "42P01" || String(error?.message ?? "").includes(table);
const normalizeSku = (value: string) => value.trim().toLocaleUpperCase();

export async function getZidJahezBridgeSettings(accountId: string): Promise<ZidJahezBridgeSettings | null> {
  const { data, error } = await settingsTable().select("*").eq("account_id", accountId).maybeSingle();
  if (unavailable(error, "ps_zid_jahez_bridge_settings")) return null;
  if (error) throw new Error(error.message);
  return data as ZidJahezBridgeSettings | null;
}

export async function saveZidJahezBridgeSettings(accountId: string, input: {
  mazeed_active: boolean;
  jahez_active: boolean;
  mazeed_commission_pct: number | null;
  vat_mode: ZidJahezBridgeSettings["vat_mode"];
  eligible_skus: string[];
  confirmed_by: string;
}) {
  if (input.jahez_active && !input.mazeed_active) throw new Error("Mazeed must be active before the Jahez channel can be active.");
  if ((input.mazeed_active || input.jahez_active) && !input.confirmed_by.trim()) throw new Error("Enter who confirmed the merchant's Zid channel setup.");
  if (input.jahez_active && (input.mazeed_commission_pct == null || input.mazeed_commission_pct < 0 || input.mazeed_commission_pct > 100)) throw new Error("Enter the Mazeed commission from the merchant agreement.");
  if (input.jahez_active && input.eligible_skus.length === 0) throw new Error("Add the SKUs that Zid has enrolled in the Jahez channel.");
  const now = new Date().toISOString();
  const eligible_skus = [...new Set(input.eligible_skus.map(normalizeSku).filter(Boolean))].slice(0, 1000);
  const { data, error } = await settingsTable().upsert({ account_id: accountId, ...input, eligible_skus, confirmed_at: now, updated_at: now }, { onConflict: "account_id" }).select("*").single();
  if (error) throw new Error(error.message);
  return data as ZidJahezBridgeSettings;
}

export async function recordPendingJahezPropagation(input: { accountId: string; ingestEventId: string; sku: string; price: number; zidLivePrice: number }) {
  const settings = await getZidJahezBridgeSettings(input.accountId);
  if (!bridgeCanTrack(settings, input.sku)) return null;
  const { data, error } = await eventsTable().insert({
    account_id: input.accountId,
    ingest_event_id: input.ingestEventId,
    sku: normalizeSku(input.sku),
    source_channel: "zid",
    target_channel: "jahez_via_mazeed",
    expected_price: input.price,
    status: "pending",
    evidence: { zid_live_price: input.zidLivePrice, zid_confirmed_at: new Date().toISOString(), note: "Zid confirmed. Jahez customer-facing price has not yet been independently verified." },
  }).select("*").single();
  if (unavailable(error, "ps_channel_propagation_events")) return null;
  if (error) throw new Error(error.message);
  return data as { id: string; status: "pending" };
}

export async function listZidJahezPropagationEvents(accountId:string){
  const {data,error}=await eventsTable().select("id,sku,expected_price,confirmed_price,status,evidence,created_at,updated_at").eq("account_id",accountId).eq("target_channel","jahez_via_mazeed").order("created_at",{ascending:false}).limit(25);
  if(unavailable(error,"ps_channel_propagation_events"))return [];
  if(error)throw new Error(error.message);
  return data??[];
}

export async function confirmZidJahezPropagation(accountId:string,id:string,observedPrice:number,verifiedBy:string){
  if(!(observedPrice>0)||!verifiedBy.trim())throw new Error("Observed Jahez price and verifier are required.");
  const {data:current,error:readError}=await eventsTable().select("*").eq("account_id",accountId).eq("id",id).eq("target_channel","jahez_via_mazeed").single();
  if(readError||!current)throw new Error("Propagation record not found.");
  const matched=Math.abs(Number(current.expected_price)-observedPrice)<0.005;
  const now=new Date().toISOString();
  const evidence={...((current.evidence??{}) as Record<string,unknown>),jahez_observed_price:observedPrice,verified_by:verifiedBy.trim(),verified_at:now,verification_method:"manual_fallback"};
  const {data,error}=await eventsTable().update({confirmed_price:observedPrice,status:matched?"confirmed":"failed",evidence,updated_at:now}).eq("account_id",accountId).eq("id",id).select("*").single();
  if(error)throw new Error(error.message);
  return data;
}
