import { useEffect, useState } from "react";
import { BriefcaseBusiness, CheckCircle2, Clock3, Download } from "lucide-react";
import type { Finding } from "@/lib/commission-audit";
import type { ContractTerm } from "./ContractIntelligenceVault";

type RecoveryCase={
  id:string;exception_key:string;title:string;status:string;severity:string;
  exception_amount:number|null;claims_ready_amount:number;confidence:string;
  explanation_en:string;explanation_ar:string;submission_deadline:string|null;
  owner:string|null;platform_response:string|null;recovered_amount:number;created_at:string;
};
const input={border:"1px solid var(--border)",borderRadius:7,padding:"7px 8px",background:"var(--surface)",color:"var(--text)",fontFamily:"inherit",fontSize:11.5};
const money=(n:number,currency:string)=>`${currency} ${n.toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2})}`;

export function RecoveryWorkspace({findings,contract,currency,orderCount}:{findings:Finding[];contract:ContractTerm|null;currency:string;orderCount:number}) {
  const [cases,setCases]=useState<RecoveryCase[]>([]);
  const [busy,setBusy]=useState<string|null>(null);
  const [error,setError]=useState<string|null>(null);
  const call=async(payload:Record<string,unknown>)=>{
    const response=await fetch("/api/channels/connect",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({
      merchant_id:localStorage.getItem("ps_merchant_id")??"",access_code:localStorage.getItem("ps_access_code")??"",platform:"recovery_cases",...payload,
    })});
    const data=await response.json();if(!response.ok||!data.ok)throw new Error(data.error??"Recovery request failed.");return data;
  };
  const load=()=>call({action:"list"}).then(data=>setCases(data.cases??[])).catch(err=>setError(err instanceof Error?err.message:"Could not load recovery cases."));
  useEffect(()=>{load();},[]);
  const create=async(finding:Finding)=>{
    setBusy(finding.id);setError(null);
    try{
      const ready=finding.recoverability==="claims_ready"&&Boolean(contract);
      await call({
        action:"create",exception_key:finding.id,title:finding.title,severity:finding.severity,
        source_platform:"talabat",case_status:ready?"ready":"evidence_required",
        exception_amount:finding.amount??null,claims_ready_amount:ready?(finding.amount??0):0,
        confidence:finding.evidence_level==="corroborated"?"high":finding.evidence_level==="single_source"?"medium":"low",
        affected_orders:orderCount,contract_term_id:contract?.id??null,
        contract_clause:contract?`${contract.contract_name}: ${contract.commission_rate_pct}% commission; ${contract.commission_base.replaceAll("_"," ")} basis`:null,
        evidence_sources:[finding.evidence_level??"ungraded",finding.assertion??"reconciliation"],
        calculation:{amount:finding.amount??null,trace:finding.trace??null},
        explanation_en:`PrizeSkout identified ${finding.title.toLowerCase()}. ${finding.detail} This is a ${ready?"claims-ready draft subject to reviewer approval":"case requiring additional evidence before submission"}.`,
        explanation_ar:`حددت برايزسكاوت حالة تتعلق بـ ${finding.title}. ${ready?"تم إعداد مسودة مطالبة، وتظل خاضعة لمراجعة واعتماد المسؤول المالي قبل تقديمها.":"تتطلب الحالة أدلة إضافية قبل أن تصبح جاهزة للمطالبة."}`,
      });
      await load();
    }catch(err){setError(err instanceof Error?err.message:"Could not create recovery case.");}
    finally{setBusy(null);}
  };
  const update=async(item:RecoveryCase,patch:Record<string,unknown>)=>{
    setBusy(item.id);setError(null);
    try{await call({action:"update",id:item.id,case_status:item.status,owner:item.owner??"",submission_deadline:item.submission_deadline??"",platform_response:item.platform_response??"",recovered_amount:item.recovered_amount,...patch});await load();}
    catch(err){setError(err instanceof Error?err.message:"Could not update recovery case.");}finally{setBusy(null);}
  };
  const downloadEvidence=async(item:RecoveryCase)=>{
    const digest=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(`${item.id}:${item.exception_key}:${item.explanation_en}:${item.claims_ready_amount}`));
    const hash=Array.from(new Uint8Array(digest)).map(value=>value.toString(16).padStart(2,"0")).join("");
    const {exportDisputeProofPdf}=await import("./exportDisputeProofPdf");
    await exportDisputeProofPdf({merchantName:"Merchant",claims:[{
      partner:"Talabat",title:item.title,order:item.exception_key,place:item.owner??"Merchant account",
      contract:contract?`${contract.contract_name} · ${contract.commission_rate_pct}% commission`:"Contract evidence not attached",
      charged:item.exception_amount==null?"Not quantified":money(item.exception_amount,currency),
      leak:money(item.claims_ready_amount,currency),hash,en:item.explanation_en,
    }],executions:[]});
  };
  const existing=new Set(cases.map(item=>item.exception_key));
  return <section style={{display:"flex",flexDirection:"column",gap:14}}>
    <div style={{display:"flex",justifyContent:"space-between",gap:10,alignItems:"center",flexWrap:"wrap"}}><div><div style={{fontSize:17,fontWeight:900}}>Claims and Recovery Workspace</div><div style={{fontSize:11.5,color:"var(--muted)",marginTop:3}}>Prepare payout disputes, see what proof is ready, and track money recovered. You record when a dispute is sent.</div></div><span style={{fontSize:11.5,fontWeight:800}}>{cases.length} cases · {money(cases.reduce((sum,item)=>sum+item.recovered_amount,0),currency)} recovered</span></div>
    {!!findings.length&&<div style={{border:"1px solid var(--border)",borderRadius:10,padding:12}}><div style={{fontSize:12,fontWeight:900,marginBottom:8}}>Exceptions available for case creation</div>{findings.map(finding=><div key={finding.id} style={{display:"flex",justifyContent:"space-between",gap:10,alignItems:"center",padding:"8px 0",borderBottom:"1px solid var(--border)"}}><div><strong style={{fontSize:11.5}}>{finding.title}</strong><div style={{fontSize:10.5,color:"var(--muted)"}}>{finding.recoverability?.replaceAll("_"," ")??"ungraded"} · {finding.amount==null?"unquantified":money(finding.amount,currency)}</div></div><button disabled={existing.has(finding.id)||busy===finding.id} onClick={()=>create(finding)} style={{border:"1px solid var(--border)",borderRadius:7,padding:"7px 9px",background:"var(--surface)",fontWeight:800,fontFamily:"inherit",fontSize:10.5,cursor:"pointer"}}>{existing.has(finding.id)?"Case created":busy===finding.id?"Creating…":"Create recovery case"}</button></div>)}</div>}
    <div style={{display:"flex",flexDirection:"column",gap:10}}>{cases.map(item=><article key={item.id} style={{border:"1px solid var(--border)",borderRadius:10,padding:13}}>
      <div style={{display:"flex",justifyContent:"space-between",gap:10,flexWrap:"wrap"}}><div style={{display:"flex",gap:8}}><BriefcaseBusiness size={17}/><div><strong style={{fontSize:12.5}}>{item.title}</strong><div style={{fontSize:10.5,color:"var(--muted)",marginTop:2}}>{item.confidence} confidence · created {new Date(item.created_at).toLocaleDateString()}</div></div></div><div style={{textAlign:"end"}}><strong>{money(item.claims_ready_amount,currency)}</strong><div style={{fontSize:10.5,color:"var(--muted)"}}>supported by enough proof to dispute</div></div></div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))",gap:8,marginTop:10}}>
        <label style={{fontSize:10.5,fontWeight:800}}>Status<select value={item.status} onChange={e=>update(item,{case_status:e.target.value})} style={{...input,width:"100%",display:"block",marginTop:4}}>{["evidence_required","draft","ready","submitted_manually","platform_review","accepted","rejected","recovered","closed"].map(v=><option key={v} value={v}>{v.replaceAll("_"," ")}</option>)}</select></label>
        <label style={{fontSize:10.5,fontWeight:800}}>Owner<input defaultValue={item.owner??""} onBlur={e=>update(item,{owner:e.target.value})} style={{...input,width:"100%",boxSizing:"border-box",display:"block",marginTop:4}}/></label>
        <label style={{fontSize:10.5,fontWeight:800}}>Submission deadline<input type="date" value={item.submission_deadline??""} onChange={e=>update(item,{submission_deadline:e.target.value})} style={{...input,width:"100%",boxSizing:"border-box",display:"block",marginTop:4}}/></label>
        <label style={{fontSize:10.5,fontWeight:800}}>Recovered amount<input type="number" defaultValue={item.recovered_amount} onBlur={e=>update(item,{recovered_amount:Number(e.target.value)})} style={{...input,width:"100%",boxSizing:"border-box",display:"block",marginTop:4}}/></label>
      </div>
      <details style={{marginTop:10}}><summary style={{fontSize:11.5,fontWeight:900,cursor:"pointer"}}>Bilingual claim narrative and platform response</summary><div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(260px,1fr))",gap:8,marginTop:8}}><div style={{fontSize:11.5,lineHeight:1.55,padding:9,border:"1px solid var(--border)",borderRadius:7}}>{item.explanation_en}</div><div dir="rtl" style={{fontSize:11.5,lineHeight:1.7,padding:9,border:"1px solid var(--border)",borderRadius:7}}>{item.explanation_ar}</div></div><textarea defaultValue={item.platform_response??""} onBlur={e=>update(item,{platform_response:e.target.value})} placeholder="Record the platform’s response; this does not submit anything." rows={2} style={{...input,width:"100%",boxSizing:"border-box",marginTop:8}}/></details>
      <div style={{display:"flex",justifyContent:"space-between",gap:8,alignItems:"center",marginTop:9,flexWrap:"wrap"}}><div style={{display:"flex",gap:6,alignItems:"center",fontSize:10.5,color:item.status==="recovered"?"#087F5B":"var(--muted)"}}>{item.status==="recovered"?<CheckCircle2 size={13}/>:<Clock3 size={13}/>} {busy===item.id?"Saving…":item.status.replaceAll("_"," ")}</div><button type="button" onClick={()=>void downloadEvidence(item)} style={{display:"flex",gap:5,alignItems:"center",border:"1px solid var(--border)",borderRadius:7,padding:"6px 8px",background:"var(--surface)",color:"var(--text)",fontFamily:"inherit",fontSize:10.5,fontWeight:800,cursor:"pointer"}}><Download size={13}/>Download evidence PDF</button></div>
    </article>)}</div>
    {error&&<div style={{fontSize:11.5,color:"#B42318"}}>{error}</div>}
  </section>;
}
