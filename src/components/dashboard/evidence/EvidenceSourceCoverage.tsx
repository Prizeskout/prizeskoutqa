import {useCallback,useEffect,useState,type CSSProperties} from "react";
import {AlertTriangle,CheckCircle2,Clock3,Database,Loader2,PauseCircle,ShieldCheck} from "lucide-react";

type Source={id:string;provider:string;connection_kind:string;status:string;authorized:boolean;health:{state:string;label:string;attention:boolean};coverage:{basis:string;completeness:string;period_start:string|null;period_end:string|null;records_seen:number;final_records:number;non_final_records:number;channels:string[];currencies:string[];branches:string[];successful_deliveries:number}};
const credentials=()=>({merchant_id:localStorage.getItem("ps_merchant_id")??"",access_code:localStorage.getItem("ps_access_code")??""});
const title=(value:string)=>value.split(/[\s_-]+/).filter(Boolean).map(part=>part[0]?.toUpperCase()+part.slice(1)).join(" ");
const date=(value:string|null)=>value?new Date(value).toLocaleString():"No evidence received";

export function EvidenceSourceCoverage(){
  const [sources,setSources]=useState<Source[]>([]),[loading,setLoading]=useState(true),[error,setError]=useState("");
  const load=useCallback(async()=>{const auth=credentials(),response=await fetch("/api/evidence/sources",{headers:{"x-merchant-id":auth.merchant_id,"x-access-code":auth.access_code}}),body=await response.json();if(!response.ok)throw new Error(body.error??"Evidence sources could not be loaded.");setSources(body.sources??[]);},[]);
  useEffect(()=>{load().catch(reason=>setError(reason instanceof Error?reason.message:"Evidence sources could not be loaded.")).finally(()=>setLoading(false));},[load]);
  return <section style={card}><div style={heading}><div><h2 style={h2}><Database size={18}/> Automatic evidence sources</h2><p style={muted}>Coverage shows only records PrizeSkout received. It does not guarantee the provider supplied every record.</p></div><span style={badge}>{sources.length} source{sources.length===1?"":"s"}</span></div>
    {loading?<div style={empty}><Loader2 size={18} className="animate-spin"/> Loading source coverage…</div>:error?<div style={warning}><AlertTriangle size={17}/>{error}</div>:sources.length===0?<div style={empty}>No automatic evidence sources are registered. Manual evidence remains available.</div>:<div style={{display:"grid",gap:10}}>{sources.map(source=>{
      const healthy=!source.health.attention,Icon=source.status==="paused"||source.status==="disconnected"?PauseCircle:healthy?CheckCircle2:AlertTriangle,c=source.coverage;
      return <article key={source.id} style={sourceCard}><div style={heading}><div><strong>{title(source.provider)}</strong><div style={muted}>{title(source.connection_kind)} · {source.authorized?"Merchant authorized":"Authorization required"}</div></div><span style={{...healthBadge,background:healthy?"#ECFDF3":"#FFF7ED",color:healthy?"#166534":"#9A3412"}}><Icon size={13}/>{source.health.label}</span></div>
        <div style={metrics}><div><span style={metricLabel}>Observed through</span><strong>{date(c.period_end)}</strong></div><div><span style={metricLabel}>Records observed</span><strong>{c.records_seen}</strong></div><div><span style={metricLabel}>Final</span><strong>{c.final_records}</strong></div><div><span style={metricLabel}>Still partial</span><strong>{c.non_final_records}</strong></div></div>
        <div style={foot}><span><Clock3 size={13}/> {c.period_start?`${date(c.period_start)} to ${date(c.period_end)}`:"Waiting for the first successful delivery"}</span><span><ShieldCheck size={13}/> Completeness not guaranteed</span></div>
        {(c.channels.length>0||c.branches.length>0)&&<div style={tags}>{c.channels.map(value=><span key={`channel-${value}`}>{title(value)}</span>)}{c.branches.map(value=><span key={`branch-${value}`}>Branch {value}</span>)}</div>}
      </article>;
    })}</div>}
  </section>;
}

const card:CSSProperties={background:"#fff",border:"1px solid #E7E5E4",borderRadius:12,padding:16,boxShadow:"0 1px 2px rgba(15,23,42,.04)"};
const sourceCard:CSSProperties={border:"1px solid #E7E5E4",borderRadius:10,padding:14,display:"grid",gap:12};
const heading:CSSProperties={display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:12};
const h2:CSSProperties={display:"flex",alignItems:"center",gap:8,fontSize:15,margin:"0 0 4px",color:"#1C1917"};
const muted:CSSProperties={fontSize:12,color:"#78716C",margin:0};
const badge:CSSProperties={fontSize:11,fontWeight:700,color:"#57534E",background:"#F5F5F4",padding:"5px 8px",borderRadius:99};
const healthBadge:CSSProperties={display:"flex",alignItems:"center",gap:5,fontSize:11,fontWeight:700,padding:"5px 8px",borderRadius:99,whiteSpace:"nowrap"};
const metrics:CSSProperties={display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(130px,1fr))",gap:8};
const metricLabel:CSSProperties={display:"block",fontSize:10,textTransform:"uppercase",letterSpacing:'.04em',color:"#A8A29E",marginBottom:3};
const foot:CSSProperties={display:"flex",flexWrap:"wrap",justifyContent:"space-between",gap:8,fontSize:11,color:"#78716C"};
const tags:CSSProperties={display:"flex",flexWrap:"wrap",gap:6,fontSize:10,color:"#57534E"};
const empty:CSSProperties={display:"flex",alignItems:"center",gap:8,padding:"18px 4px",fontSize:13,color:"#78716C"};
const warning:CSSProperties={...empty,color:"#9A3412",background:"#FFF7ED",padding:12,borderRadius:8};
