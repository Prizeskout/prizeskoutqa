import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, FileKey2, Plus, ScanText, ShieldCheck } from "lucide-react";
import { extractPdfTextWithPages, renderPdfPagesForOcr, type OcrPageImage } from "@/lib/pdf-text";
import { readApiJson } from "@/lib/api-error";

export type ContractTerm = {
  id:string; platform:string; contract_name:string; commission_rate_pct:number;
  vat_on_fees_pct:number; payment_fee_pct:number; fixed_order_fee:number;
  delivery_contribution:number; effective_from:string; effective_to:string|null;
  commission_base:"gross_before_discount"|"net_after_discount"|"eligible_sales"|"unknown";
  promotion_funding_platform_pct:number|null;
  refund_liability:"merchant"|"platform"|"shared"|"conditional"|"unknown";
  cancellation_liability:"merchant"|"platform"|"shared"|"conditional"|"unknown";
  settlement_frequency:string|null;settlement_days:number|null;dispute_deadline_days:number|null;
  settlement_day_basis:"calendar_days"|"business_days"|null;settlement_schedule_type:"daily"|"weekly"|"twice_monthly"|"monthly"|null;
  settlement_weekday:number|null;settlement_month_days:number[];settlement_cutoff_hour:number|null;settlement_timezone:string|null;
  settlement_weekend_days:number[];settlement_holidays:string[];settlement_reserve_days:number;minimum_payout_threshold:number|null;
  advertising_commitment:number|null;minimum_spend:number|null;currency:string|null;
  coverage_legal_entity:string|null;coverage_brands:string[];coverage_branches:string[];
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
  commission_base:"gross_before_discount"|"net_after_discount"|"eligible_sales"|"unknown";
  promotion_funding_platform_pct:number|null;
  refund_liability:"merchant"|"platform"|"shared"|"conditional"|"unknown";
  cancellation_liability:"merchant"|"platform"|"shared"|"conditional"|"unknown";
  settlement_frequency:string|null;settlement_days:number|null;dispute_deadline_days:number|null;
  advertising_commitment:number|null;minimum_spend:number|null;
  coverage_legal_entity:string|null;coverage_brands:string[];coverage_branches:string[];
  currency:string|null;confidence:number;clauses:ContractClauseEvidence[];
  missing_terms:string[];warnings:string[];
};

const inputStyle = { width:"100%", boxSizing:"border-box" as const, border:"1px solid var(--border)", borderRadius:8, padding:"9px 10px", background:"var(--surface)", color:"var(--text)", fontFamily:"inherit" };
const FINANCIAL_PLATFORMS = ["salla","zid","talabat","jahez","keeta","snoonu","deliveroo"] as const;
const STOREFRONT_PLATFORMS = new Set(["salla","zid"]);

function percentageLabel(platform:string) {
  if (platform === "salla") return "Marketplace commission % (enter 0 if none)";
  if (platform === "zid") return "Marketplace commission % (Mazeed, if used)";
  return "Marketplace commission %";
}

export function ContractIntelligenceVault({ onApproved, onTermsChanged, connectedPlatforms = [] }: { onApproved:(term:ContractTerm)=>void; onTermsChanged?:(terms:ContractTerm[])=>void; connectedPlatforms?:string[] }) {
  const [terms,setTerms]=useState<ContractTerm[]>([]);
  const [open,setOpen]=useState(false);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState<string|null>(null);
  const [reviewer,setReviewer]=useState("");
  const [extracting,setExtracting]=useState(false);
  const [extraction,setExtraction]=useState<ContractExtraction|null>(null);
  const [extractionModel,setExtractionModel]=useState("");
  const [reviewId,setReviewId]=useState<string|null>(null);
  const [scanNotice,setScanNotice]=useState<string|null>(null);
  const [form,setForm]=useState({
    contract_name:"", source_platform:"talabat", commission_rate_pct:"0", vat_on_fees_pct:"0",
    payment_fee_pct:"0", fixed_order_fee:"0", delivery_contribution:"0",
    commission_base:"unknown",promotion_funding_platform_pct:"",
    refund_liability:"unknown",cancellation_liability:"unknown",
    settlement_frequency:"",settlement_days:"",dispute_deadline_days:"",
    settlement_day_basis:"",settlement_schedule_type:"",settlement_weekday:"",settlement_month_days:"",
    settlement_cutoff_hour:"",settlement_timezone:"",settlement_weekend_days:"",settlement_holidays:"",
    settlement_reserve_days:"0",minimum_payout_threshold:"",
    advertising_commitment:"",minimum_spend:"",currency:"QAR",
    coverage_legal_entity:"",coverage_brands:"",coverage_branches:"",
    effective_from:new Date().toISOString().slice(0,10), effective_to:"", notes:"",
    source_file_name:"", source_sha256:"",
  });

  const call=async(payload:Record<string,unknown>)=>{
    const merchant_id=localStorage.getItem("ps_merchant_id")??"";
    const access_code=localStorage.getItem("ps_access_code")??"";
    const response=await fetch("/api/channels/connect",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({merchant_id,access_code,platform:"contract_terms",...payload})});
    const data=await readApiJson<Record<string,any>&{ok?:boolean;error?:string;action?:string;support_reference?:string}>(response,"PrizeSkout could not complete the contract request.");
    if(!data.ok) throw new Error("PrizeSkout could not complete the contract request. Please review the agreement and try again.");
    return data;
  };

  const load=()=>call({action:"list"}).then(data=>{
    const loaded=(data.terms??[]) as ContractTerm[];
    setTerms(loaded);
    onTermsChanged?.(loaded);
    const current=loaded.find(term=>term.status==="approved");
    if(current)onApproved(current);
  }).catch(err=>setError(err instanceof Error?err.message:"Could not load contracts."));
  useEffect(()=>{load();},[]);

  const chooseFile=async(file:File|undefined)=>{
    if(!file)return;
    setExtracting(true);setError(null);setExtraction(null);setScanNotice(null);
    try{
      const bytes=await file.arrayBuffer();
      const hash=Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256",bytes))).map(v=>v.toString(16).padStart(2,"0")).join("");
      let documentText="";
      let documentImages:OcrPageImage[]=[];
      if(file.type==="application/pdf"||file.name.toLowerCase().endsWith(".pdf")){
        documentText=await extractPdfTextWithPages(file);
        const substantiveText=documentText.replace(/\[PAGE \d+\]/g,"").replace(/\s/g,"");
        if(substantiveText.length<100){
          const rendered=await renderPdfPagesForOcr(file);
          documentImages=rendered.pages;
          setScanNotice(rendered.truncated
            ? `Scanned PDF detected. OCR analysed the first ${rendered.pages.length} of ${rendered.totalPages} pages; split the agreement to review the remainder.`
            : `Scanned PDF detected. OCR analysed ${rendered.pages.length} page${rendered.pages.length===1?"":"s"}.`);
        }
      }else if(file.type==="image/jpeg"||file.type==="image/png"||/\.(jpe?g|png)$/i.test(file.name)){
        documentImages=[{
          page:1,
          media_type:file.type==="image/png"||file.name.toLowerCase().endsWith(".png")?"image/png":"image/jpeg",
          data:btoa(Array.from(new Uint8Array(bytes),byte=>String.fromCharCode(byte)).join("")),
        }];
        setScanNotice("Agreement image detected. OCR analysed it as page 1.");
      }else if(file.type.startsWith("text/")||/\.(txt|md)$/i.test(file.name)){
        documentText=await file.text();
      }else{
        throw new Error("Use a PDF, TXT, PNG, or JPEG agreement.");
      }
      setForm(current=>({...current,source_file_name:file.name,source_sha256:hash}));
      const data=await call({action:"extract",document_text:documentText,document_images:documentImages,source_file_name:file.name,source_sha256:hash});
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
        commission_base:extracted.commission_base||current.commission_base,
        promotion_funding_platform_pct:extracted.promotion_funding_platform_pct==null?current.promotion_funding_platform_pct:String(extracted.promotion_funding_platform_pct),
        refund_liability:extracted.refund_liability||current.refund_liability,
        cancellation_liability:extracted.cancellation_liability||current.cancellation_liability,
        settlement_frequency:extracted.settlement_frequency||current.settlement_frequency,
        settlement_days:extracted.settlement_days==null?current.settlement_days:String(extracted.settlement_days),
        dispute_deadline_days:extracted.dispute_deadline_days==null?current.dispute_deadline_days:String(extracted.dispute_deadline_days),
        advertising_commitment:extracted.advertising_commitment==null?current.advertising_commitment:String(extracted.advertising_commitment),
        minimum_spend:extracted.minimum_spend==null?current.minimum_spend:String(extracted.minimum_spend),
        currency:extracted.currency||current.currency,
        coverage_legal_entity:extracted.coverage_legal_entity||current.coverage_legal_entity,
        coverage_brands:extracted.coverage_brands.length?extracted.coverage_brands.join(", "):current.coverage_brands,
        coverage_branches:extracted.coverage_branches.length?extracted.coverage_branches.join(", "):current.coverage_branches,
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
  const configurePlatform=(platform:string)=>{
    const current=terms.find(term=>term.platform===platform&&term.status==="approved");
    setForm(form=>({
      ...form,source_platform:platform,
      contract_name:current?.contract_name??"",
      commission_rate_pct:current?String(current.commission_rate_pct):"0",
      vat_on_fees_pct:current?String(current.vat_on_fees_pct):"0",
      payment_fee_pct:current?String(current.payment_fee_pct):"0",
      fixed_order_fee:current?String(current.fixed_order_fee):"0",
      delivery_contribution:current?String(current.delivery_contribution):"0",
      commission_base:current?.commission_base??"unknown",
      promotion_funding_platform_pct:current?.promotion_funding_platform_pct==null?"":String(current.promotion_funding_platform_pct),
      refund_liability:current?.refund_liability??"unknown",
      cancellation_liability:current?.cancellation_liability??"unknown",
      settlement_frequency:current?.settlement_frequency??"",
      settlement_days:current?.settlement_days==null?"":String(current.settlement_days),
      settlement_day_basis:current?.settlement_day_basis??"",
      settlement_schedule_type:current?.settlement_schedule_type??"",
      settlement_weekday:current?.settlement_weekday==null?"":String(current.settlement_weekday),
      settlement_month_days:current?.settlement_month_days?.join(", ")??"",
      settlement_cutoff_hour:current?.settlement_cutoff_hour==null?"":String(current.settlement_cutoff_hour),
      settlement_timezone:current?.settlement_timezone??"",
      settlement_weekend_days:current?.settlement_weekend_days?.join(", ")??"",
      settlement_holidays:current?.settlement_holidays?.join(", ")??"",
      settlement_reserve_days:String(current?.settlement_reserve_days??0),
      minimum_payout_threshold:current?.minimum_payout_threshold==null?"":String(current.minimum_payout_threshold),
      dispute_deadline_days:current?.dispute_deadline_days==null?"":String(current.dispute_deadline_days),
      advertising_commitment:current?.advertising_commitment==null?"":String(current.advertising_commitment),
      minimum_spend:current?.minimum_spend==null?"":String(current.minimum_spend),
      currency:current?.currency??(STOREFRONT_PLATFORMS.has(platform)?"SAR":"QAR"),
      coverage_legal_entity:current?.coverage_legal_entity??"",
      coverage_brands:current?.coverage_brands.join(", ")??"",
      coverage_branches:current?.coverage_branches.join(", ")??"",
      effective_from:current?.effective_from??new Date().toISOString().slice(0,10),
      effective_to:current?.effective_to??"",
      notes:current?.notes??"",
    }));
    setOpen(true);setError(null);
  };
  return <section style={{border:"1px solid var(--border)",borderRadius:14,overflow:"hidden",background:"var(--surface)"}}>
    <div style={{padding:"17px 19px",display:"flex",justifyContent:"space-between",gap:12,alignItems:"center",flexWrap:"wrap",background:"var(--surface2)"}}>
      <div style={{display:"flex",gap:11,alignItems:"center"}}>
        <span style={{width:38,height:38,borderRadius:10,display:"grid",placeItems:"center",background:"color-mix(in srgb,#14213D 8%,var(--surface))"}}><FileKey2 size={20} color="#14213D"/></span>
        <div><div style={{fontSize:16.5,fontWeight:900}}>Contract Intelligence Vault</div><div style={{fontSize:12.5,color:"var(--muted)",marginTop:2}}>Keep the agreement terms PrizeSkout should use when checking your payouts.</div></div>
      </div>
      <button onClick={()=>setOpen(v=>!v)} style={{border:0,borderRadius:9,padding:"9px 12px",background:"#14213D",color:"#fff",fontWeight:800,fontFamily:"inherit",cursor:"pointer",display:"flex",gap:7,alignItems:"center"}}><Plus size={15}/>{open?"Close":"Add contract terms"}</button>
    </div>
    <div style={{padding:"16px 19px",display:"flex",flexDirection:"column",gap:12}}>
      <div style={{padding:"10px 12px",border:"1px solid color-mix(in srgb,#A16207 25%,var(--border))",borderRadius:9,background:"color-mix(in srgb,#A16207 5%,var(--surface))",fontSize:12,color:"var(--muted)",lineHeight:1.5}}>
        A connected store may provide catalogue access only. Financial terms, settlement reports and bank evidence are separate checks; PrizeSkout will not assume they are available from the connection.
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(210px,1fr))",gap:9}}>
        {[...FINANCIAL_PLATFORMS].sort((a,b)=>Number(connectedPlatforms.includes(b))-Number(connectedPlatforms.includes(a))).map(platform=>{
          const contract=approved.find(term=>term.platform===platform);
          const draft=terms.find(term=>term.platform===platform&&term.status==="draft");
          const connected=connectedPlatforms.includes(platform);
          return <div key={platform} style={{border:"1px solid var(--border)",borderRadius:10,padding:"11px 12px",background:"var(--surface2)",display:"flex",flexDirection:"column",gap:7}}>
            <div style={{display:"flex",justifyContent:"space-between",gap:8,alignItems:"center"}}><strong>{platform.toUpperCase()}</strong><span style={{fontSize:10.5,fontWeight:800,color:connected?"#087F5B":"var(--muted)"}}>{connected?"STORE CONNECTED":"NOT CONNECTED"}</span></div>
            <div style={{fontSize:11.5,fontWeight:700,color:contract?"#087F5B":draft?"#A16207":"#B42318"}}>{contract?"Financial terms approved":draft?"Financial terms awaiting review":"Financial terms missing"}</div>
            <div style={{fontSize:11,color:"var(--muted)"}}>{contract?`${contract.commission_rate_pct}% marketplace · ${contract.payment_fee_pct}% payment processing · from ${contract.effective_from}`:STOREFRONT_PLATFORMS.has(platform)?"Record payment processing and any marketplace commission separately.":"Record the marketplace commission and every settlement deduction."}</div>
            <button type="button" onClick={()=>configurePlatform(platform)} style={{alignSelf:"flex-start",border:"1px solid var(--border)",borderRadius:7,padding:"6px 9px",background:"var(--surface)",color:"var(--text)",fontSize:11.5,fontWeight:800,cursor:"pointer",fontFamily:"inherit"}}>{contract?"Review or replace terms":"Configure financial terms"}</button>
          </div>;
        })}
      </div>
      {approved.length>0&&<div style={{display:"flex",gap:8,flexWrap:"wrap"}}>{approved.map(term=><span key={term.id} style={{display:"inline-flex",gap:7,alignItems:"center",padding:"7px 10px",border:"1px solid color-mix(in srgb,#087F5B 30%,var(--border))",borderRadius:999,fontSize:12,color:"#087F5B",fontWeight:800}}><ShieldCheck size={14}/>{term.platform.toUpperCase()} · {term.commission_rate_pct}% · from {term.effective_from}</span>)}</div>}
      {!terms.length&&!open&&<div style={{fontSize:13,color:"#A16207",padding:"10px 12px",border:"1px solid color-mix(in srgb,#A16207 30%,var(--border))",borderRadius:9,background:"color-mix(in srgb,#A16207 6%,var(--surface))"}}>No approved agreement yet. Until you add and approve one, PrizeSkout will treat any terms you enter as unconfirmed.</div>}
      {open&&<div style={{borderTop:"1px solid var(--border)",paddingTop:14}}>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(175px,1fr))",gap:10}}>
          <label style={{fontSize:11.5,fontWeight:800}}>Contract name<input style={inputStyle} value={form.contract_name} onChange={e=>setForm({...form,contract_name:e.target.value})} placeholder="Talabat partner agreement 2026"/></label>
          <label style={{fontSize:11.5,fontWeight:800}}>Platform<select style={inputStyle} value={form.source_platform} onChange={e=>configurePlatform(e.target.value)}>{FINANCIAL_PLATFORMS.map(v=><option key={v} value={v}>{v.toUpperCase()}</option>)}</select></label>
          <label style={{fontSize:11.5,fontWeight:800}}>{percentageLabel(form.source_platform)}<input type="number" style={inputStyle} value={form.commission_rate_pct} onChange={e=>setForm({...form,commission_rate_pct:e.target.value})}/><span style={{display:"block",fontSize:10.5,fontWeight:500,color:"var(--muted)",marginTop:3}}>Charge for marketplace/order generation—not the merchant’s target margin.</span></label>
          <label style={{fontSize:11.5,fontWeight:800}}>VAT on fees %<input type="number" style={inputStyle} value={form.vat_on_fees_pct} onChange={e=>setForm({...form,vat_on_fees_pct:e.target.value})}/></label>
          <label style={{fontSize:11.5,fontWeight:800}}>Payment-processing fee %<input type="number" style={inputStyle} value={form.payment_fee_pct} onChange={e=>setForm({...form,payment_fee_pct:e.target.value})}/><span style={{display:"block",fontSize:10.5,fontWeight:500,color:"var(--muted)",marginTop:3}}>Card or gateway percentage; keep separate from marketplace commission.</span></label>
          <label style={{fontSize:11.5,fontWeight:800}}>Fixed fee / order<input type="number" style={inputStyle} value={form.fixed_order_fee} onChange={e=>setForm({...form,fixed_order_fee:e.target.value})}/></label>
          <label style={{fontSize:11.5,fontWeight:800}}>Delivery contribution<input type="number" style={inputStyle} value={form.delivery_contribution} onChange={e=>setForm({...form,delivery_contribution:e.target.value})}/></label>
          <label style={{fontSize:11.5,fontWeight:800}}>Commission calculation base<select style={inputStyle} value={form.commission_base} onChange={e=>setForm({...form,commission_base:e.target.value})}><option value="unknown">Not established</option><option value="gross_before_discount">Gross before discount</option><option value="net_after_discount">Net after discount</option><option value="eligible_sales">Contract-defined eligible sales</option></select></label>
          <label style={{fontSize:11.5,fontWeight:800}}>Platform-funded promotion %<input type="number" style={inputStyle} value={form.promotion_funding_platform_pct} onChange={e=>setForm({...form,promotion_funding_platform_pct:e.target.value})} placeholder="Not established"/></label>
          <label style={{fontSize:11.5,fontWeight:800}}>Refund liability<select style={inputStyle} value={form.refund_liability} onChange={e=>setForm({...form,refund_liability:e.target.value})}>{["unknown","merchant","platform","shared","conditional"].map(v=><option key={v} value={v}>{v==="unknown"?"Not established":v}</option>)}</select></label>
          <label style={{fontSize:11.5,fontWeight:800}}>Cancellation liability<select style={inputStyle} value={form.cancellation_liability} onChange={e=>setForm({...form,cancellation_liability:e.target.value})}>{["unknown","merchant","platform","shared","conditional"].map(v=><option key={v} value={v}>{v==="unknown"?"Not established":v}</option>)}</select></label>
          <label style={{fontSize:11.5,fontWeight:800}}>Settlement frequency<input style={inputStyle} value={form.settlement_frequency} onChange={e=>setForm({...form,settlement_frequency:e.target.value})} placeholder="Weekly on Thursday"/></label>
          <label style={{fontSize:11.5,fontWeight:800}}>Settlement lag (days)<input type="number" style={inputStyle} value={form.settlement_days} onChange={e=>setForm({...form,settlement_days:e.target.value})} placeholder="Not established"/></label>
          <label style={{fontSize:11.5,fontWeight:800}}>Lag basis<select style={inputStyle} value={form.settlement_day_basis} onChange={e=>setForm({...form,settlement_day_basis:e.target.value})}><option value="">Not established</option><option value="calendar_days">Calendar days</option><option value="business_days">Business days</option></select></label>
          <label style={{fontSize:11.5,fontWeight:800}}>Payout schedule<select style={inputStyle} value={form.settlement_schedule_type} onChange={e=>setForm({...form,settlement_schedule_type:e.target.value})}><option value="">Not established</option><option value="daily">Daily</option><option value="weekly">Weekly</option><option value="twice_monthly">Twice monthly</option><option value="monthly">Monthly</option></select></label>
          <label style={{fontSize:11.5,fontWeight:800}}>Weekly payout day (0 Sun–6 Sat)<input type="number" min="0" max="6" style={inputStyle} value={form.settlement_weekday} onChange={e=>setForm({...form,settlement_weekday:e.target.value})} placeholder="For weekly schedules"/></label>
          <label style={{fontSize:11.5,fontWeight:800}}>Monthly payout dates<input style={inputStyle} value={form.settlement_month_days} onChange={e=>setForm({...form,settlement_month_days:e.target.value})} placeholder="1, 15"/></label>
          <label style={{fontSize:11.5,fontWeight:800}}>Daily cutoff hour (0–23)<input type="number" min="0" max="23" style={inputStyle} value={form.settlement_cutoff_hour} onChange={e=>setForm({...form,settlement_cutoff_hour:e.target.value})} placeholder="17"/></label>
          <label style={{fontSize:11.5,fontWeight:800}}>Settlement timezone<input style={inputStyle} value={form.settlement_timezone} onChange={e=>setForm({...form,settlement_timezone:e.target.value})} placeholder="Asia/Riyadh"/></label>
          <label style={{fontSize:11.5,fontWeight:800}}>Weekend days (0 Sun–6 Sat)<input style={inputStyle} value={form.settlement_weekend_days} onChange={e=>setForm({...form,settlement_weekend_days:e.target.value})} placeholder="5, 6"/></label>
          <label style={{fontSize:11.5,fontWeight:800}}>Settlement holidays<input style={inputStyle} value={form.settlement_holidays} onChange={e=>setForm({...form,settlement_holidays:e.target.value})} placeholder="2026-09-23, 2026-12-18"/></label>
          <label style={{fontSize:11.5,fontWeight:800}}>Reserve delay (days)<input type="number" min="0" style={inputStyle} value={form.settlement_reserve_days} onChange={e=>setForm({...form,settlement_reserve_days:e.target.value})}/></label>
          <label style={{fontSize:11.5,fontWeight:800}}>Minimum payout threshold<input type="number" min="0" style={inputStyle} value={form.minimum_payout_threshold} onChange={e=>setForm({...form,minimum_payout_threshold:e.target.value})} placeholder="Not established"/></label>
          <label style={{fontSize:11.5,fontWeight:800}}>Dispute deadline (days)<input type="number" style={inputStyle} value={form.dispute_deadline_days} onChange={e=>setForm({...form,dispute_deadline_days:e.target.value})} placeholder="Not established"/></label>
          <label style={{fontSize:11.5,fontWeight:800}}>Advertising commitment<input type="number" style={inputStyle} value={form.advertising_commitment} onChange={e=>setForm({...form,advertising_commitment:e.target.value})} placeholder="Not established"/></label>
          <label style={{fontSize:11.5,fontWeight:800}}>Minimum spend<input type="number" style={inputStyle} value={form.minimum_spend} onChange={e=>setForm({...form,minimum_spend:e.target.value})} placeholder="Not established"/></label>
          <label style={{fontSize:11.5,fontWeight:800}}>Currency<input style={inputStyle} value={form.currency} onChange={e=>setForm({...form,currency:e.target.value.toUpperCase()})} maxLength={8}/></label>
          <label style={{fontSize:11.5,fontWeight:800}}>Effective from<input type="date" style={inputStyle} value={form.effective_from} onChange={e=>setForm({...form,effective_from:e.target.value})}/></label>
          <label style={{fontSize:11.5,fontWeight:800}}>Effective to (optional)<input type="date" style={inputStyle} value={form.effective_to} onChange={e=>setForm({...form,effective_to:e.target.value})}/></label>
          <label style={{fontSize:11.5,fontWeight:800}}>Covered legal entity<input style={inputStyle} value={form.coverage_legal_entity} onChange={e=>setForm({...form,coverage_legal_entity:e.target.value})} placeholder="Restaurant operating company"/></label>
          <label style={{fontSize:11.5,fontWeight:800}}>Covered brands<input style={inputStyle} value={form.coverage_brands} onChange={e=>setForm({...form,coverage_brands:e.target.value})} placeholder="Comma-separated"/></label>
          <label style={{fontSize:11.5,fontWeight:800}}>Covered branches<input style={inputStyle} value={form.coverage_branches} onChange={e=>setForm({...form,coverage_branches:e.target.value})} placeholder="Comma-separated"/></label>
        </div>
        <label style={{display:"block",fontSize:11.5,fontWeight:800,marginTop:10}}>Source agreement<input type="file" accept=".pdf,.txt,.md,.png,.jpg,.jpeg" onChange={e=>chooseFile(e.target.files?.[0])} style={{...inputStyle,padding:8}}/></label>
        {extracting&&<div style={{display:"flex",gap:8,alignItems:"center",fontSize:12.5,color:"#A16207",marginTop:8}}><ScanText size={15}/>Reading your agreement and finding the important terms…</div>}
        {scanNotice&&<div style={{display:"flex",gap:8,alignItems:"flex-start",fontSize:11.5,color:"#A16207",marginTop:8}}><AlertTriangle size={14} style={{flex:"0 0 auto"}}/>{scanNotice}</div>}
        {form.source_sha256&&<div style={{fontSize:10.5,color:"var(--muted)",fontFamily:"monospace",marginTop:5}}>SHA-256 {form.source_sha256}</div>}
        {extraction&&<div style={{marginTop:10,border:"1px solid var(--border)",borderRadius:10,overflow:"hidden"}}>
          <div style={{padding:"10px 12px",background:"var(--surface2)",display:"flex",justifyContent:"space-between",gap:8,flexWrap:"wrap"}}>
            <strong style={{fontSize:12.5}}>Terms found — check them before approval</strong>
            <span style={{fontSize:11.5,fontWeight:800,color:extraction.confidence>=.8?"#087F5B":"#A16207"}}>{Math.round(extraction.confidence*100)}% confidence in this reading</span>
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
        <button disabled={busy||extracting||!form.contract_name.trim()} onClick={save} style={{marginTop:10,border:0,borderRadius:9,padding:"10px 14px",background:"#EF681A",color:"#fff",fontFamily:"inherit",fontWeight:800,cursor:"pointer",opacity:busy||extracting ? .65 : 1}}>Save for review</button>
      </div>}
      {terms.some(t=>t.status==="draft")&&<div style={{borderTop:"1px solid var(--border)",paddingTop:13}}>
        <div style={{fontSize:12,fontWeight:900,marginBottom:8}}>Agreements to review</div>
        <label style={{fontSize:11.5,fontWeight:800}}>Reviewer name<input style={{...inputStyle,maxWidth:360,marginLeft:8}} value={reviewer} onChange={e=>setReviewer(e.target.value)} placeholder="Finance manager"/></label>
        <div style={{display:"flex",flexDirection:"column",gap:8,marginTop:10}}>{terms.filter(t=>t.status==="draft").map(term=><div key={term.id} style={{border:"1px solid var(--border)",borderRadius:9,padding:"10px 12px"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:10,flexWrap:"wrap"}}>
            <div><strong>{term.contract_name}</strong><div style={{fontSize:11.5,color:"var(--muted)",marginTop:2}}>{term.platform.toUpperCase()} · {term.commission_rate_pct}% commission · effective {term.effective_from}{term.source_file_name?` · ${term.source_file_name}`:" · no source attached"}</div></div>
            <div style={{display:"flex",gap:7}}>
              {term.extraction_json&&<button onClick={()=>setReviewId(reviewId===term.id?null:term.id)} style={{border:"1px solid var(--border)",borderRadius:8,padding:"8px 10px",background:"var(--surface)",color:"var(--text)",fontWeight:800,fontFamily:"inherit",cursor:"pointer"}}>{reviewId===term.id?"Hide source details":"Check source details"}</button>}
              <button disabled={busy} onClick={()=>approve(term.id)} style={{border:"1px solid #087F5B",borderRadius:8,padding:"8px 10px",color:"#087F5B",background:"transparent",fontWeight:800,fontFamily:"inherit",cursor:"pointer",display:"flex",gap:6,alignItems:"center"}}><CheckCircle2 size={14}/>Approve terms</button>
            </div>
          </div>
          {reviewId===term.id&&term.extraction_json&&<div style={{marginTop:10,paddingTop:10,borderTop:"1px solid var(--border)",display:"flex",flexDirection:"column",gap:7}}>
            <div style={{fontSize:11.5,fontWeight:800}}>How these terms were found · {Math.round((term.extraction_confidence??0)*100)}% confidence · {term.extraction_model??"method not recorded"}</div>
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
