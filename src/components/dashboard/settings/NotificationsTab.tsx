import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

const OG = "#EF681A";
const ALERTS = [
  { key: "margin_breach", i18nKey: "marginBreach" },
  { key: "reprice_applied", i18nKey: "repriceApplied" },
  { key: "channel_down", i18nKey: "channelDown" },
  { key: "competitor_drop", i18nKey: "competitorDrop" },
  { key: "promo_overlap", i18nKey: "promoOverlap" },
  { key: "weekly_digest", i18nKey: "weeklyDigest" },
];

function Toggle({ on, onToggle, disabled }: { on:boolean; onToggle:()=>void; disabled:boolean }) {
  return <button type="button" role="switch" aria-checked={on} aria-label={on ? "Turn off" : "Turn on"} disabled={disabled} onClick={onToggle} style={{
    width:52,height:32,borderRadius:999,border:"none",cursor:disabled?"default":"pointer",background:on?OG:"var(--border)",position:"relative",flexShrink:0,transition:"background .2s",minWidth:52,opacity:disabled?.55:1,
  }}><span style={{position:"absolute",top:4,left:on?24:4,width:24,height:24,borderRadius:"50%",background:"#fff",transition:"left .2s",boxShadow:"0 1px 3px rgba(0,0,0,.15)"}} /></button>;
}

export function NotificationsTab() {
  const { t } = useTranslation();
  const [state,setState]=useState<Record<string,boolean>>(Object.fromEntries(ALERTS.map(a=>[a.key,a.key!=="weekly_digest"])));
  const [loading,setLoading]=useState(true),[savingKey,setSavingKey]=useState<string|null>(null),[message,setMessage]=useState("");

  async function call(body:Record<string,string>) {
    const response=await fetch("/api/channels/connect",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({
      merchant_id:localStorage.getItem("ps_merchant_id")??"",access_code:localStorage.getItem("ps_access_code")??"",platform:"notification_preferences",...body,
    })});
    const data=await response.json() as {ok?:boolean;preferences?:Array<{pref_key:string;enabled:boolean}>;error?:string};
    if(!response.ok||!data.ok)throw new Error(data.error??"Notification request failed.");
    return data;
  }

  useEffect(()=>{let cancelled=false;void call({action:"list"}).then(data=>{
    if(!cancelled&&data.preferences?.length)setState(current=>({...current,...Object.fromEntries(data.preferences!.map(row=>[row.pref_key,row.enabled]))}));
  }).catch(()=>{if(!cancelled)setMessage("We couldn't load your notification choices. Please refresh and try again.");}).finally(()=>{if(!cancelled)setLoading(false);});return()=>{cancelled=true;};},[]);

  async function toggle(key:string){if(savingKey)return;const next=!state[key];setState(current=>({...current,[key]:next}));setSavingKey(key);setMessage("");try{await call({action:"set",pref_key:key,enabled:String(next)});setMessage(next?"Notification turned on.":"Notification turned off.");}catch{setState(current=>({...current,[key]:!next}));setMessage("That choice wasn't saved. Please try again.");}finally{setSavingKey(null);}}

  return <div style={{maxWidth:560}}>
    <h3 style={{fontSize:15,fontWeight:600,color:"var(--text)",margin:"0 0 6px"}}>{t("settingsTabs.notifications.heading")}</h3>
    <p style={{fontSize:13,color:"var(--muted)",margin:"0 0 28px",lineHeight:1.7}}>{t("settingsTabs.notifications.description")}</p>
    <div style={{display:"flex",flexDirection:"column",borderRadius:12,overflow:"hidden",border:"1px solid var(--border)"}}>{ALERTS.map((a,i)=><div key={a.key} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"16px 20px",background:i%2===0?"var(--surface2)":"var(--surface)",gap:20}}>
      <div><div style={{fontSize:14,fontWeight:600,color:"var(--text)"}}>{t(`settingsTabs.notifications.alerts.${a.i18nKey}.name`)}</div><div style={{fontSize:13,color:"var(--muted)",marginTop:2}}>{t(`settingsTabs.notifications.alerts.${a.i18nKey}.desc`)}</div></div>
      <Toggle on={state[a.key]} disabled={loading||savingKey!==null} onToggle={()=>void toggle(a.key)} />
    </div>)}</div>
    <div aria-live="polite" style={{minHeight:20,marginTop:10,fontSize:12.5,color:message.includes("wasn't")||message.includes("couldn't")?"#B42318":"var(--muted)"}}>{loading?"Loading your choices…":message}</div>
  </div>;
}
