import {useEffect,useMemo,useState} from "react";
import {AlertTriangle,CheckCircle2,Layers3,Save,ShieldCheck,Rocket} from "lucide-react";
import {planChannelPrices,type ChannelEconomics,type ChannelPriceProduct,type PriceChannel} from "@/lib/channel-price-planner";
import type {ContractTerm} from "@/components/dashboard/payout/ContractIntelligenceVault";
import type {SavedChannelPricePlan,PublishRowResult} from "@/server/core/channel-price-plans";

const CHANNELS:PriceChannel[]=["in_store","zid","salla","foodics","talabat","snoonu","jahez","keeta"];
const label=(v:string)=>v.replaceAll("_"," ").replace(/\b\w/g,c=>c.toUpperCase());
const field={width:"100%",boxSizing:"border-box" as const,border:"1px solid var(--border)",borderRadius:7,padding:"7px 8px",background:"var(--surface)",color:"var(--text)",fontFamily:"inherit"};
const money=(v:number,currency:string)=>`${currency} ${v.toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2})}`;

export function ChannelPriceArchitecture({products,contract,currency}:{products:ChannelPriceProduct[];contract:ContractTerm|null;currency:string}){
  const defaults=(channel:PriceChannel):ChannelEconomics=>({
    channel,commission_pct:channel==="in_store"?0:channel===contract?.platform?contract.commission_rate_pct:19,
    vat_on_fees_pct:channel===contract?.platform?contract.vat_on_fees_pct:0,
    payment_fee_pct:channel===contract?.platform?contract.payment_fee_pct:0,
    fixed_fee:channel===contract?.platform?contract.fixed_order_fee:0,minimum_margin_pct:18,
  });
  const [configs,setConfigs]=useState<ChannelEconomics[]>(()=>CHANNELS.map(defaults));
  const [enabled,setEnabled]=useState<PriceChannel[]>(["in_store","zid","talabat"]);
  const [approval,setApproval]=useState("8");
  const [cap,setCap]=useState("15");
  const [search,setSearch]=useState("");
  const [planName,setPlanName]=useState("Channel price architecture");
  const [plans,setPlans]=useState<SavedChannelPricePlan[]>([]);
  const [reviewer,setReviewer]=useState("");
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState<string|null>(null);
  const [publishingId,setPublishingId]=useState<string|null>(null);
  const [publishResults,setPublishResults]=useState<Record<string,PublishRowResult[]>>({});

  useEffect(()=>{
    if(!contract)return;
    setConfigs(current=>current.map(item=>item.channel===contract.platform?{...item,commission_pct:contract.commission_rate_pct,vat_on_fees_pct:contract.vat_on_fees_pct,payment_fee_pct:contract.payment_fee_pct,fixed_fee:contract.fixed_order_fee}:item));
  },[contract]);
  const call=async(payload:Record<string,unknown>)=>{
    const response=await fetch("/api/channels/connect",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({
      merchant_id:localStorage.getItem("ps_merchant_id")??"",access_code:localStorage.getItem("ps_access_code")??"",platform:"channel_price_plans",...payload,
    })});
    const data=await response.json();if(!response.ok||!data.ok)throw new Error(data.error??"Channel plan request failed.");return data;
  };
  const load=()=>call({action:"list"}).then(data=>setPlans(data.plans??[])).catch(err=>setError(err instanceof Error?err.message:"Could not load price plans."));
  useEffect(()=>{load();},[]);
  const activeConfigs=configs.filter(c=>enabled.includes(c.channel));
  const rows=useMemo(()=>planChannelPrices(products,activeConfigs,Number(approval)||0,Number(cap)||0),[products,configs,enabled,approval,cap]);
  const shown=rows.filter(row=>`${row.name} ${row.sku} ${row.channel}`.toLowerCase().includes(search.toLowerCase()));
  const approvals=rows.filter(row=>row.status==="approval_required").length;
  const excluded=rows.filter(row=>row.status==="excluded").length;
  const updateConfig=(channel:PriceChannel,key:keyof Omit<ChannelEconomics,"channel">,value:string)=>setConfigs(current=>current.map(item=>item.channel===channel?{...item,[key]:Number(value)||0}:item));
  const save=async()=>{setBusy(true);setError(null);try{await call({action:"create",name:planName,channel_config:activeConfigs,rows});await load();}catch(err){setError(err instanceof Error?err.message:"Could not save plan.");}finally{setBusy(false);}};
  const approve=async(id:string)=>{if(!reviewer.trim()){setError("Enter the finance approver’s name.");return;}setBusy(true);try{await call({action:"approve",id,approved_by:reviewer});await load();}catch(err){setError(err instanceof Error?err.message:"Could not approve plan.");}finally{setBusy(false);}};
  const publish=async(id:string)=>{setPublishingId(id);setError(null);try{const data=await call({action:"publish",id});setPublishResults(current=>({...current,[id]:data.results??[]}));await load();}catch(err){setError(err instanceof Error?err.message:"Could not publish plan.");}finally{setPublishingId(null);}};

  return <section style={{border:"1px solid var(--border)",borderRadius:14,overflow:"hidden",background:"var(--surface)"}}>
    <div style={{padding:"17px 20px",background:"var(--surface2)",display:"flex",justifyContent:"space-between",gap:12,alignItems:"center",flexWrap:"wrap"}}>
      <div style={{display:"flex",gap:10,alignItems:"center"}}><Layers3 size={21} color="#14213D"/><div><div style={{fontSize:18,fontWeight:900}}>Channel Price Architecture</div><div style={{fontSize:12.5,color:"var(--muted)"}}>Plan channel-aware prices across every synced product without silently publishing changes.</div></div></div>
      <span style={{fontSize:11.5,fontWeight:800,color:"#087F5B",display:"flex",gap:6}}><ShieldCheck size={15}/>Approval controlled</span>
    </div>
    <div style={{padding:20,display:"flex",flexDirection:"column",gap:17}}>
      <div>
        <div style={{fontSize:11,fontWeight:900,marginBottom:7}}>Channels to compare</div>
        <div style={{display:"flex",gap:7,flexWrap:"wrap"}}>{CHANNELS.map(channel=><label key={channel} style={{border:"1px solid var(--border)",borderRadius:999,padding:"6px 9px",fontSize:11.5,cursor:"pointer"}}><input type="checkbox" checked={enabled.includes(channel)} onChange={()=>setEnabled(current=>current.includes(channel)?current.filter(v=>v!==channel):[...current,channel])}/> {label(channel)}</label>)}</div>
      </div>
      <div className="table-scroll"><table style={{width:"100%",borderCollapse:"collapse",minWidth:850,fontSize:11}}>
        <thead><tr>{["Channel","Commission %","VAT on fees %","Payment fee %","Fixed fee","Target net margin %","Term source"].map(v=><th key={v} style={{padding:"8px",textAlign:"start",color:"var(--muted)",borderBottom:"1px solid var(--border)"}}>{v}</th>)}</tr></thead>
        <tbody>{activeConfigs.map(config=><tr key={config.channel}>
          <td style={{padding:8,fontWeight:900}}>{label(config.channel)}</td>
          {(["commission_pct","vat_on_fees_pct","payment_fee_pct","fixed_fee","minimum_margin_pct"] as const).map(key=><td key={key} style={{padding:6}}><input type="number" style={{...field,minWidth:85}} value={config[key]} onChange={e=>updateConfig(config.channel,key,e.target.value)}/></td>)}
          <td style={{padding:8,color:config.channel===contract?.platform?"#087F5B":"#A16207",fontWeight:700}}>{config.channel===contract?.platform?"Reviewed contract":"Planning assumption"}</td>
        </tr>)}</tbody>
      </table></div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(170px,1fr))",gap:10}}>
        <label style={{fontSize:11,fontWeight:800}}>Plan name<input style={field} value={planName} onChange={e=>setPlanName(e.target.value)}/></label>
        <label style={{fontSize:11,fontWeight:800}}>Manual approval above %<input type="number" style={field} value={approval} onChange={e=>setApproval(e.target.value)}/></label>
        <label style={{fontSize:11,fontWeight:800}}>Maximum movement per plan %<input type="number" style={field} value={cap} onChange={e=>setCap(e.target.value)}/></label>
        <label style={{fontSize:11,fontWeight:800}}>Search product or channel<input style={field} value={search} onChange={e=>setSearch(e.target.value)} placeholder="Sony, SKU, Talabat…"/></label>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))",gap:9}}>
        {[["Products",products.length],["Price rows",rows.length],["Approval required",approvals],["Excluded",excluded]].map(([k,v])=><div key={k} style={{border:"1px solid var(--border)",borderRadius:9,padding:"10px 11px"}}><div style={{fontSize:10,color:"var(--muted)",fontWeight:800,textTransform:"uppercase"}}>{k}</div><div style={{fontSize:20,fontWeight:900,marginTop:3}}>{v}</div></div>)}
      </div>
      <div className="table-scroll" style={{maxHeight:480,overflow:"auto"}}><table style={{width:"100%",borderCollapse:"collapse",minWidth:1060,fontSize:11.5}}>
        <thead style={{position:"sticky",top:0,background:"var(--surface2)"}}><tr>{["Product","Channel","Current","Planned","Difference","Contribution","Net margin","Control","Explanation"].map(v=><th key={v} style={{padding:"9px",textAlign:"start",color:"var(--muted)",borderBottom:"1px solid var(--border)"}}>{v}</th>)}</tr></thead>
        <tbody>{shown.map(row=><tr key={`${row.sku}-${row.channel}`}>
          <td style={{padding:9,borderBottom:"1px solid var(--border)",fontWeight:900}}>{row.name}<div style={{fontSize:9.5,color:"var(--muted)"}}>{row.sku}</div></td>
          <td style={{padding:9,borderBottom:"1px solid var(--border)"}}>{label(row.channel)}</td>
          <td style={{padding:9,borderBottom:"1px solid var(--border)"}}>{money(row.current_price,currency)}</td>
          <td style={{padding:9,borderBottom:"1px solid var(--border)",fontWeight:900}}>{money(row.planned_price,currency)}</td>
          <td style={{padding:9,borderBottom:"1px solid var(--border)"}}>{row.change_pct==null?"—":`${row.change_pct>0?"+":""}${row.change_pct}%`}</td>
          <td style={{padding:9,borderBottom:"1px solid var(--border)"}}>{row.contribution==null?"—":money(row.contribution,currency)}</td>
          <td style={{padding:9,borderBottom:"1px solid var(--border)"}}>{row.margin_pct==null?"—":`${row.margin_pct}%`}</td>
          <td style={{padding:9,borderBottom:"1px solid var(--border)",color:row.status==="ready"?"#087F5B":row.status==="excluded"?"#B42318":"#A16207",fontWeight:900}}>{label(row.status)}</td>
          <td style={{padding:9,borderBottom:"1px solid var(--border)",color:"var(--muted)"}}>{row.reason}</td>
        </tr>)}</tbody>
      </table></div>
      <div style={{display:"flex",gap:9,alignItems:"center",flexWrap:"wrap"}}><button disabled={busy||!rows.length||!planName.trim()} onClick={save} style={{border:0,borderRadius:8,padding:"9px 13px",background:"#14213D",color:"#fff",fontFamily:"inherit",fontWeight:800,cursor:"pointer",display:"flex",gap:6}}><Save size={14}/>Save draft plan</button><span style={{fontSize:11,color:"var(--muted)"}}>Saving never publishes prices. An approved plan can be published live to Talabat and to your own connected storefront — every other channel stays manual for now.</span></div>
      {!!plans.length&&<div style={{borderTop:"1px solid var(--border)",paddingTop:14}}>
        <div style={{display:"flex",justifyContent:"space-between",gap:10,alignItems:"end",flexWrap:"wrap"}}><strong>Price-plan register</strong><label style={{fontSize:10.5,fontWeight:800}}>Finance approver<input style={{...field,width:220,marginLeft:7}} value={reviewer} onChange={e=>setReviewer(e.target.value)}/></label></div>
        <div style={{display:"flex",flexDirection:"column",gap:7,marginTop:9}}>{plans.map(plan=>{
          const results=publishResults[plan.id];
          const published=results?.filter(r=>r.status==="published").length??0;
          const skipped=results?.filter(r=>r.status==="skipped").length??0;
          const failed=results?.filter(r=>r.status==="failed").length??0;
          return <div key={plan.id} style={{border:"1px solid var(--border)",borderRadius:9,padding:"9px 11px",display:"flex",flexDirection:"column",gap:8}}>
            <div style={{display:"flex",justifyContent:"space-between",gap:10,alignItems:"center",flexWrap:"wrap"}}>
              <div><strong>{plan.name}</strong><div style={{fontSize:10.5,color:"var(--muted)"}}>{plan.rows.length} rows · {plan.status.replaceAll("_"," ").toUpperCase()} · {new Date(plan.created_at).toLocaleDateString("en-GB")}</div></div>
              <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
                {plan.status==="draft"&&<button disabled={busy} onClick={()=>approve(plan.id)} style={{border:"1px solid #087F5B",borderRadius:7,padding:"7px 9px",background:"transparent",color:"#087F5B",fontFamily:"inherit",fontWeight:800,cursor:"pointer"}}>Approve plan</button>}
                {plan.status!=="draft"&&<span style={{fontSize:11,color:"#087F5B",fontWeight:900,display:"flex",gap:5}}><CheckCircle2 size={14}/>Approved by {plan.approved_by}</span>}
                {(plan.status==="approved"||plan.status==="partially_published")&&<button disabled={publishingId===plan.id} onClick={()=>publish(plan.id)} style={{border:0,borderRadius:7,padding:"7px 9px",background:"#B45309",color:"#fff",fontFamily:"inherit",fontWeight:800,cursor:"pointer",display:"flex",gap:5,alignItems:"center"}}><Rocket size={13}/>{publishingId===plan.id?"Publishing…":plan.status==="partially_published"?"Retry remaining":"Publish live"}</button>}
                {plan.status==="published"&&<span style={{fontSize:11,color:"#B45309",fontWeight:900}}>Published {plan.published_at?new Date(plan.published_at).toLocaleString("en-GB"):""}</span>}
              </div>
            </div>
            {!!results?.length&&<div style={{borderTop:"1px dashed var(--border)",paddingTop:7,fontSize:11}}>
              <div style={{display:"flex",gap:12,fontWeight:800,marginBottom:5}}><span style={{color:"#087F5B"}}>{published} published</span><span style={{color:"#A16207"}}>{skipped} skipped</span><span style={{color:"#B42318"}}>{failed} failed</span></div>
              <div style={{display:"flex",flexDirection:"column",gap:3,maxHeight:150,overflow:"auto"}}>{results.map((r,i)=><div key={i} style={{display:"flex",gap:8,color:r.status==="published"?"#087F5B":r.status==="failed"?"#B42318":"var(--muted)"}}><span style={{fontWeight:800,minWidth:70}}>{label(r.channel)}</span><span style={{minWidth:110}}>{r.name}</span><span>{r.reason}</span></div>)}</div>
            </div>}
          </div>;
        })}</div>
      </div>}
      {excluded>0&&<div style={{fontSize:11.5,color:"#A16207",display:"flex",gap:7}}><AlertTriangle size={14}/>{excluded} rows were excluded rather than priced from incomplete cost evidence.</div>}
      {error&&<div style={{fontSize:12,color:"#B42318"}}>{error}</div>}
    </div>
  </section>;
}
