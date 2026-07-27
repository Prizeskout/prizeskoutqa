import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, FileKey2, Plus, ScanText, ShieldCheck } from "lucide-react";
import { extractPdfTextWithPages } from "@/lib/pdf-text";

export type ContractTerm = {
  id:string; platform:string; contract_name:string; commission_rate_pct:number;
  vat_on_fees_pct:number; payment_fee_pct:number; fixed_order_fee:number;
  delivery_contribution:number; effective_from:string; effective_to:string|null;
  status:"draft"|"approved"|"superseded"; source_file_name:string|null;
  source_sha256:string|null; notes:string|null; reviewed_by:string|null; approved_at:string|null;
  extraction_json?:ContractExtraction|null; extraction_model?:string|null;
  extraction_confidence?:number|null; extracted_at?:string|null;
};

type ContractClauseEvidence={field:string;value:string;source_quote:string;page:number|null;confidence:number};
type ContractExtraction={
  contract_name:string|null;platform:string|null;commission_rate_pct:number|null;
  vat_on_fees_pct:number|null;payment_fee_pct:number|null;fixed_order_fee:number|null;
  delivery_contribution:number|null;effective_from:string|null;effective_to:string|null;
  currency:string|null;confidence:number;clauses:ContractClauseEvidence[];
  missing_terms:string[];warnings:string[];
};

const inputStyle = { width:"100%", boxSizing:"border-box" as const, border:"1px solid var(--border)", borderRadius:8, padding:"9px 10px", background:"var(--surface)", color:"var(--text)", fontFamily:"inherit" };

export function ContractIntelligenceVault({ onApproved }: { onApproved:(term:ContractTerm)=>void }) {
  const [terms,setTerms]=useState<ContractTerm[]>([]);
  const [open,setOpen]=useState(false);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState<string|null>(null);
  const [reviewer,setReviewer]=useState("");
  const [extracting,setExtracting]=useState(false);
  const [extraction,setExtraction]=useState<ContractExtraction|null>(null);
  const [extractionModel,setExtractionModel]=useState("");
  const [reviewId,setReviewId]=useState<string|null>(null);
  const [form,setForm]=useState({
    contract_name:"", source_platform:"talabat", commission_rate_pct:"19", vat_on_fees_pct:"0",
    payment_fee_pct:"0", fixed_order_fee:"0", delivery_contribution:"0",
    effective_from:new Date().toISOString().slice(0,10), effective_to:"", notes:"",
    source_file_name:"", source_sha256:"",
  });

  const call=async(payload:Record<string,unknown>)=>{
    const merchant_id=localStorage.getItem("ps_merchant_id")??"";
    const access_code=localStorage.getItem("ps_access_code")??"";
    const response=await fetch("/api/channels/connect",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({merchant_id,access_code,platform:"contract_terms",...payload})});
    const data=await response.json();
    if(!response.ok||!data.ok) throw new Error(data.error??"Contract request failed.");
    return data;
  };

  const load=()=>call({action:"list"}).then(data=>{
    const loaded=(data.terms??[]) as ContractTerm[];
    setTerms(loaded);
    const current=loaded.find(term=>term.status==="approved");
    if(current)onApproved(current);
  }).catch(err=>setError(err instanceof Error?err.message:"Could not load contracts."));
  useEffect(()=>{load();},[]);

  const chooseFile=async(file:File|undefined)=>{
    if(!file)return;
    setExtracting(true);setError(null);setExtraction(null);
    try{
      const bytes=await file.arrayBuffer();
      const hash=Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256",bytes))).map(v=>v.toString(16).padStart(2,"0")).join("");
      let documentText="";
      if(file.type==="application/pdf"||file.name.toLowerCase().endsWith(".pdf")){
        documentText=await extractPdfTextWithPages(file);
      }else if(file.type.startsWith("text/")||/\.(txt|md)$/i.test(file.name)){
        documentText=await file.text();
      }else{
        throw new Error("Use a text-based PDF or TXT agreement. Scanned-image OCR is not available yet.");
      }
      setForm(current=>({...current,source_file_name:file.name,source_sha256:hash}));
      const data=await call({action:"extract",document_text:documentText,source_file_name:file.name,source_sha256:hash});
      const extracted=data.extraction as ContractExtraction;
      setExtraction(extracted);setExtractionModel(String(data.model??""));
      setForm(current=>({
        ...current,
        contract_name:extracted.contract_name||current.contract_name||file.name.replace(/\.[^.]+$/,""),
        source_platform:["talabat","snoonu","jahez","keeta","deliveroo","zid","salla"].includes(extracted.platform??"")
          ? extracted.platform! : current.source_platform,
        commission_rate_pct:extracted.commission_rate_pct==null?current.commission_rate_pct:String(extracted.commission_rate_pct),
        vat_on_fees_pct:extracted.vat_on_fees_pct==null?current.vat_on_fees_pct:String(extracted.vat_on_fees_pct),
        payment_fee_pct:extracted.payment_fee_pct==null?current.payment_fee_pct:String(extracted.payment_fee_pct),
        fixed_order_fee:extracted.fixed_order_fee==null?current.fixed_order_fee:String(extracted.fixed_order_fee),
        delivery_contribution:extracted.delivery_contribution==null?current.delivery_contribution:String(extracted.delivery_contribution),
        effective_from:extracted.effective_from||current.effective_from,
        effective_to:extracted.effective_to||current.effective_to,
      }));
    }catch(err){setError(err instanceof Error?err.message:"Could not analyse the agreement.");}
    finally{setExtracting(false);}
  };

  const save=async()=>{
    setBusy(true);setError(null);
    try{
      await call({
        action:"save_draft",...form,extraction,extraction_model:extractionModel,
        extraction_confidence:extraction?.confidence??null,
        extracted_at:extraction?new Date().toISOString():null,
      });
      await load();setOpen(false);
      setForm(current=>({...current,contract_name:"",notes:"",source_file_name:"",source_sha256:""}));
      setExtraction(null);setExtractionModel("");
    }catch(err){setError(err instanceof Error?err.message:"Could not save draft.");}
    finally{setBusy(false);}
  };

  const approve=async(id:string)=>{
    if(!reviewer.trim()){setError("Enter the reviewer’s name before approving commercial terms.");return;}
    setBusy(true);setError(null);
    try{
      const data=await call({action:"approve",id,reviewed_by:reviewer});
      await load();onApproved(data.term as ContractTerm);
    }catch(err){setError(err instanceof Error?err.message:"Could not approve terms.");}
    finally{setBusy(false);}
  };

  const approved=terms.filter(t=>t.status==="approved");
  return <section style={{border:"1px solid var(--border)",borderRadius:14,overflow:"hidden",background:"var(--surface)"}}>
    <div style={{padding:"17px 19px",display:"flex",justifyContent:"space-between",gap:12,alignItems:"center",flexWrap:"wrap",background:"var(--surface2)"}}>
      <div style={{display:"flex",gap:11,alignItems:"center"}}>
        <span style={{width:38,height:38,borderRadius:10,display:"grid",placeItems:"center",background:"color-mix(in srgb,#14213D 8%,var(--surface))"}}><FileKey2 size={20} color="#14213D"/></span>
        <div><div style={{fontSize:16.5,fontWeight:900}}>Contract Intelligence Vault</div><div style={{fontSize:12.5,color:"var(--muted)",marginTop:2}}>Approved, effective-dated commercial terms used by payout assurance.</div></div>
      </div>
      <button onClick={()=>setOpen(v=>!v)} style={{border:0,borderRadius:9,padding:"9px 12px",background:"#14213D",color:"#fff",fontWeight:800,fontFamily:"inherit",cursor:"pointer",display:"flex",gap:7,alignItems:"center"}}><Plus size={15}/>{open?"Close":"Add contract terms"}</button>
    </div>
    <div style={{padding:"16px 19px",display:"flex",flexDirection:"column",gap:12}}>
      {approved.length>0&&<div style={{display:"flex",gap:8,flexWrap:"wrap"}}>{approved.map(term=><span key={term.id} style={{display:"inline-flex",gap:7,alignItems:"center",padding:"7px 10px",border:"1px solid color-mix(in srgb,#087F5B 30%,var(--border))",borderRadius:999,fontSize:12,color:"#087F5B",fontWeight:800}}><ShieldCheck size={14}/>{term.platform.toUpperCase()} · {term.commission_rate_pct}% · from {term.effective_from}</span>)}</div>}
      {!terms.length&&!open&&<div style={{fontSize:13,color:"#A16207",padding:"10px 12px",border:"1px solid color-mix(in srgb,#A16207 30%,var(--border))",borderRadius:9,background:"color-mix(in srgb,#A16207 6%,var(--surface))"}}>No reviewed contract is on file. Audits will correctly classify commercial terms as merchant-entered until a draft is approved.</div>}
      {open&&<div style={{borderTop:"1px solid var(--border)",paddingTop:14}}>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(175px,1fr))",gap:10}}>
          <label style={{fontSize:11.5,fontWeight:800}}>Contract name<input style={inputStyle} value={form.contract_name} onChange={e=>setForm({...form,contract_name:e.target.value})} placeholder="Talabat partner agreement 2026"/></label>
          <label style={{fontSize:11.5,fontWeight:800}}>Platform<select style={inputStyle} value={form.source_platform} onChange={e=>setForm({...form,source_platform:e.target.value})}>{["talabat","snoonu","jahez","keeta","deliveroo","zid","salla"].map(v=><option key={v} value={v}>{v.toUpperCase()}</option>)}</select></label>
          <label style={{fontSize:11.5,fontWeight:800}}>Commission %<input type="number" style={inputStyle} value={form.commission_rate_pct} onChange={e=>setForm({...form,commission_rate_pct:e.target.value})}/></label>
          <label style={{fontSize:11.5,fontWeight:800}}>VAT on fees %<input type="number" style={inputStyle} value={form.vat_on_fees_pct} onChange={e=>setForm({...form,vat_on_fees_pct:e.target.value})}/></label>
          <label style={{fontSize:11.5,fontWeight:800}}>Payment fee %<input type="number" style={inputStyle} value={form.payment_fee_pct} onChange={e=>setForm({...form,payment_fee_pct:e.target.value})}/></label>
          <label style={{fontSize:11.5,fontWeight:800}}>Fixed fee / order<input type="number" style={inputStyle} value={form.fixed_order_fee} onChange={e=>setForm({...form,fixed_order_fee:e.target.value})}/></label>
          <label style={{fontSize:11.5,fontWeight:800}}>Delivery contribution<input type="number" style={inputStyle} value={form.delivery_contribution} onChange={e=>setForm({...form,delivery_contribution:e.target.value})}/></label>
          <label style={{fontSize:11.5,fontWeight:800}}>Effective from<input type="date" style={inputStyle} value={form.effective_from} onChange={e=>setForm({...form,effective_from:e.target.value})}/></label>
          <label style={{fontSize:11.5,fontWeight:800}}>Effective to (optional)<input type="date" style={inputStyle} value={form.effective_to} onChange={e=>setForm({...form,effective_to:e.target.value})}/></label>
        </div>
        <label style={{display:"block",fontSize:11.5,fontWeight:800,marginTop:10}}>Source agreement<input type="file" accept=".pdf,.txt,.md" onChange={e=>chooseFile(e.target.files?.[0])} style={{...inputStyle,padding:8}}/></label>
        {extracting&&<div style={{display:"flex",gap:8,alignItems:"center",fontSize:12.5,color:"#A16207",marginTop:8}}><ScanText size={15}/>Reading agreement and extracting evidence-backed clauses…</div>}
        {form.source_sha256&&<div style={{fontSize:10.5,color:"var(--muted)",fontFamily:"monospace",marginTop:5}}>SHA-256 {form.source_sha256}</div>}
        {extraction&&<div style={{marginTop:10,border:"1px solid var(--border)",borderRadius:10,overflow:"hidden"}}>
          <div style={{padding:"10px 12px",background:"var(--surface2)",display:"flex",justifyContent:"space-between",gap:8,flexWrap:"wrap"}}>
            <strong style={{fontSize:12.5}}>AI-extracted draft · human review required</strong>
            <span style={{fontSize:11.5,fontWeight:800,color:extraction.confidence>=.8?"#087F5B":"#A16207"}}>{Math.round(extraction.confidence*100)}% document confidence</span>
          </div>
          <div style={{padding:"9px 12px",display:"flex",flexDirection:"column",gap:7}}>
            {extraction.clauses.length?extraction.clauses.map((clause,index)=><div key={`${clause.field}-${index}`} style={{display:"grid",gridTemplateColumns:"minmax(130px,.6fr) minmax(160px,.7fr) 2fr",gap:9,fontSize:11.5,alignItems:"start"}}>
              <strong>{clause.field.replaceAll("_"," ")}</strong><span>{clause.value}</span>
              <span style={{color:"var(--muted)"}}>“{clause.source_quote}”{clause.page?` · page ${clause.page}`:""} · {Math.round(clause.confidence*100)}%</span>
            </div>):<div style={{fontSize:12,color:"#A16207"}}>No quotable commercial clauses were found. Enter terms manually and retain the agreement for review.</div>}
            {extraction.warnings.map((warning,index)=><div key={index} style={{display:"flex",gap:7,color:"#A16207",fontSize:11.5}}><AlertTriangle size={14}/>{warning}</div>)}
            {!!extraction.missing_terms.length&&<div style={{fontSize:11.5,color:"var(--muted)"}}>Not found: {extraction.missing_terms.join(", ")}</div>}
          </div>
        </div>}
        <label style={{display:"block",fontSize:11.5,fontWeight:800,marginTop:10}}>Review notes<textarea rows={2} style={inputStyle} value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})}/></label>
        <button disabled={busy||extracting||!form.contract_name.trim()} onClick={save} style={{marginTop:10,border:0,borderRadius:9,padding:"10px 14px",background:"#EF681A",color:"#fff",fontFamily:"inherit",fontWeight:800,cursor:"pointer",opacity:busy||extracting ? .65 : 1}}>Save reviewed values as draft</button>
      </div>}
      {terms.some(t=>t.status==="draft")&&<div style={{borderTop:"1px solid var(--border)",paddingTop:13}}>
        <div style={{fontSize:12,fontWeight:900,marginBottom:8}}>Drafts awaiting review</div>
        <label style={{fontSize:11.5,fontWeight:800}}>Reviewer name<input style={{...inputStyle,maxWidth:360,marginLeft:8}} value={reviewer} onChange={e=>setReviewer(e.target.value)} placeholder="Finance manager"/></label>
        <div style={{display:"flex",flexDirection:"column",gap:8,marginTop:10}}>{terms.filter(t=>t.status==="draft").map(term=><div key={term.id} style={{border:"1px solid var(--border)",borderRadius:9,padding:"10px 12px"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:10,flexWrap:"wrap"}}>
            <div><strong>{term.contract_name}</strong><div style={{fontSize:11.5,color:"var(--muted)",marginTop:2}}>{term.platform.toUpperCase()} · {term.commission_rate_pct}% commission · effective {term.effective_from}{term.source_file_name?` · ${term.source_file_name}`:" · no source attached"}</div></div>
            <div style={{display:"flex",gap:7}}>
              {term.extraction_json&&<button onClick={()=>setReviewId(reviewId===term.id?null:term.id)} style={{border:"1px solid var(--border)",borderRadius:8,padding:"8px 10px",background:"var(--surface)",color:"var(--text)",fontWeight:800,fontFamily:"inherit",cursor:"pointer"}}>{reviewId===term.id?"Hide evidence":"Review evidence"}</button>}
              <button disabled={busy} onClick={()=>approve(term.id)} style={{border:"1px solid #087F5B",borderRadius:8,padding:"8px 10px",color:"#087F5B",background:"transparent",fontWeight:800,fontFamily:"inherit",cursor:"pointer",display:"flex",gap:6,alignItems:"center"}}><CheckCircle2 size={14}/>Approve terms</button>
            </div>
          </div>
          {reviewId===term.id&&term.extraction_json&&<div style={{marginTop:10,paddingTop:10,borderTop:"1px solid var(--border)",display:"flex",flexDirection:"column",gap:7}}>
            <div style={{fontSize:11.5,fontWeight:800}}>Extraction provenance · {Math.round((term.extraction_confidence??0)*100)}% confidence · {term.extraction_model??"model not recorded"}</div>
            {(term.extraction_json.clauses??[]).map((clause,index)=><div key={index} style={{fontSize:11.5,display:"grid",gridTemplateColumns:"minmax(120px,.5fr) 2fr",gap:8}}>
              <strong>{clause.field.replaceAll("_"," ")}</strong>
              <span style={{color:"var(--muted)"}}>{clause.value} · “{clause.source_quote}”{clause.page?` · page ${clause.page}`:""} · {Math.round(clause.confidence*100)}%</span>
            </div>)}
            {term.source_sha256&&<div style={{fontFamily:"monospace",fontSize:10.5,color:"var(--muted)"}}>Document SHA-256 {term.source_sha256}</div>}
          </div>}
        </div>)}</div>
      </div>}
      {error&&<div style={{fontSize:12.5,color:"#B42318"}}>{error}</div>}
    </div>
  </section>;
}
