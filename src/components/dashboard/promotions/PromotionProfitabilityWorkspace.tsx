import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, FlaskConical, Save, ShieldCheck } from "lucide-react";
import { reconcilePromotionFunding, simulatePromotion, type PromotionProduct } from "@/lib/promotion-profitability";
import type { ContractTerm } from "@/components/dashboard/payout/ContractIntelligenceVault";
import type { SavedPromotionScenario } from "@/server/core/promotion-scenarios";

const input={width:"100%",boxSizing:"border-box" as const,border:"1px solid var(--border)",borderRadius:8,padding:"9px 10px",background:"var(--surface)",color:"var(--text)",fontFamily:"inherit"};
const money=(n:number,currency:string)=>`${currency} ${n.toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2})}`;
const n=(value:string,fallback=0)=>Number.isFinite(Number(value))?Number(value):fallback;

export function PromotionProfitabilityWorkspace({products,contract,currency}:{products:PromotionProduct[];contract:ContractTerm|null;currency:string}){
  const [name,setName]=useState("Proposed marketplace campaign");
  const [discount,setDiscount]=useState("20");
  const [platformFunding,setPlatformFunding]=useState("");
  const [lift,setLift]=useState("25");
  const [orders,setOrders]=useState("100");
  const [days,setDays]=useState("7");
  const [floor,setFloor]=useState("15");
  const [selected,setSelected]=useState<string[]>([]);
  const [saved,setSaved]=useState<SavedPromotionScenario[]>([]);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState<string|null>(null);
  const [fundingDrafts,setFundingDrafts]=useState<Record<string,{promised:string;actual:string}>>({});

  useEffect(()=>setSelected(products.map(p=>p.sku)),[products]);
  useEffect(()=>{if(contract?.promotion_funding_platform_pct!=null)setPlatformFunding(String(contract.promotion_funding_platform_pct));},[contract]);

  const call=async(payload:Record<string,unknown>)=>{
    const response=await fetch("/api/channels/connect",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({
      merchant_id:localStorage.getItem("ps_merchant_id")??"",access_code:localStorage.getItem("ps_access_code")??"",
      platform:"promotion_scenarios",...payload,
    })});
    const data=await response.json();
    if(!response.ok||!data.ok)throw new Error(data.error??"Promotion request failed.");
    return data;
  };
  const load=()=>call({action:"list"}).then(data=>setSaved(data.scenarios??[])).catch(err=>setError(err instanceof Error?err.message:"Could not load campaigns."));
  useEffect(()=>{load();},[]);

  const scoped=useMemo(()=>products.filter(p=>selected.includes(p.sku)),[products,selected]);
  const inputs=useMemo(()=>({
    discount_pct:n(discount),platform_funding_pct:n(platformFunding),
    commission_pct:contract?.commission_rate_pct??19,vat_on_fees_pct:contract?.vat_on_fees_pct??0,
    payment_fee_pct:contract?.payment_fee_pct??0,fixed_order_fee:contract?.fixed_order_fee??0,
    commission_base:contract?.commission_base??"unknown",expected_conversion_lift_pct:n(lift),
    baseline_orders:n(orders),duration_days:n(days),minimum_margin_pct:n(floor),
  }),[discount,platformFunding,contract,lift,orders,days,floor]);
  const result=useMemo(()=>simulatePromotion(scoped,inputs),[scoped,inputs]);
  const contractReady=Boolean(contract&&contract.status==="approved"&&contract.commission_base!=="unknown"&&contract.promotion_funding_platform_pct!=null);

  const saveDraft=async()=>{
    setBusy(true);setError(null);
    try{
      await call({action:"create",name,source_platform:contract?.platform??products[0]?.source_platform??"unknown",inputs,results:result});
      await load();
    }catch(err){setError(err instanceof Error?err.message:"Could not save campaign.");}finally{setBusy(false);}
  };
  const update=async(item:SavedPromotionScenario,status?:string)=>{
    setBusy(true);setError(null);
    const draft=fundingDrafts[item.id]??{promised:String(item.promised_platform_funding??""),actual:String(item.actual_platform_funding??"")};
    try{
      await call({action:"update",id:item.id,scenario_status:status??item.status,
        promised_platform_funding:draft.promised===""?null:n(draft.promised),
        actual_platform_funding:draft.actual===""?null:n(draft.actual),approved_by:"Merchant finance approver"});
      await load();
    }catch(err){setError(err instanceof Error?err.message:"Could not update campaign.");}finally{setBusy(false);}
  };

  return <section style={{border:"1px solid var(--border)",borderRadius:14,overflow:"hidden",background:"var(--surface)"}}>
    <div style={{padding:"17px 20px",background:"var(--surface2)",display:"flex",justifyContent:"space-between",gap:12,alignItems:"center",flexWrap:"wrap"}}>
      <div><div style={{fontSize:18,fontWeight:900}}>Promotion Profitability Control</div><div style={{fontSize:12.5,color:"var(--muted)",marginTop:3}}>Simulate campaign economics before approval, then reconcile promised funding against actual funding.</div></div>
      <span style={{display:"inline-flex",gap:6,alignItems:"center",fontSize:11.5,fontWeight:800,color:contractReady?"#087F5B":"#A16207"}}>{contractReady?<ShieldCheck size={15}/>:<AlertTriangle size={15}/>} {contractReady?"Reviewed contract applied":"Commercial assumptions require review"}</span>
    </div>
    <div style={{padding:20,display:"flex",flexDirection:"column",gap:18}}>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))",gap:10}}>
        <label style={{fontSize:11,fontWeight:800}}>Campaign name<input style={input} value={name} onChange={e=>setName(e.target.value)}/></label>
        <label style={{fontSize:11,fontWeight:800}}>Discount %<input type="number" style={input} value={discount} onChange={e=>setDiscount(e.target.value)}/></label>
        <label style={{fontSize:11,fontWeight:800}}>Platform funding %<input type="number" style={input} value={platformFunding} onChange={e=>setPlatformFunding(e.target.value)} placeholder="From contract"/></label>
        <label style={{fontSize:11,fontWeight:800}}>Expected order lift %<input type="number" style={input} value={lift} onChange={e=>setLift(e.target.value)}/></label>
        <label style={{fontSize:11,fontWeight:800}}>Baseline orders<input type="number" style={input} value={orders} onChange={e=>setOrders(e.target.value)}/></label>
        <label style={{fontSize:11,fontWeight:800}}>Duration (days)<input type="number" style={input} value={days} onChange={e=>setDays(e.target.value)}/></label>
        <label style={{fontSize:11,fontWeight:800}}>Minimum margin %<input type="number" style={input} value={floor} onChange={e=>setFloor(e.target.value)}/></label>
      </div>
      <div>
        <div style={{fontSize:11,fontWeight:900,marginBottom:7}}>Products in campaign · {selected.length} of {products.length}</div>
        <div style={{display:"flex",gap:7,flexWrap:"wrap"}}>{products.map(product=><label key={product.sku} style={{border:"1px solid var(--border)",borderRadius:999,padding:"6px 9px",fontSize:11.5,cursor:"pointer",background:selected.includes(product.sku)?"var(--surface2)":"transparent"}}><input type="checkbox" checked={selected.includes(product.sku)} onChange={()=>setSelected(current=>current.includes(product.sku)?current.filter(s=>s!==product.sku):[...current,product.sku])}/> {product.name}</label>)}</div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(170px,1fr))",gap:10}}>
        {[
          ["Products eligible",`${result.eligible_products}`],["Expected orders",`${result.expected_orders}`],
          ["Break-even orders",result.break_even_orders==null?"Not achievable":String(result.break_even_orders)],
          ["Campaign contribution",money(result.campaign_contribution,currency)],
          ["Incremental contribution",money(result.incremental_contribution,currency)],
        ].map(([label,value])=><div key={label} style={{border:"1px solid var(--border)",borderRadius:10,padding:"11px 12px"}}><div style={{fontSize:10,color:"var(--muted)",fontWeight:800,textTransform:"uppercase"}}>{label}</div><div style={{fontSize:17,fontWeight:900,marginTop:4,color:label==="Incremental contribution"?(result.profitable?"#087F5B":"#B42318"):"var(--text)"}}>{value}</div></div>)}
      </div>
      {result.excluded_products>0&&<div style={{fontSize:12,color:"#A16207",display:"flex",gap:7}}><AlertTriangle size={15}/>{result.excluded_products} product(s) excluded because cost or margin evidence is incomplete.</div>}
      <div className="table-scroll"><table style={{width:"100%",borderCollapse:"collapse",minWidth:1050,fontSize:11.5}}>
        <thead><tr>{["Product","Price","Campaign price","Merchant discount","Platform funding","Commission + VAT","Product cost*","Contribution","Net margin","Max affordable discount"].map(label=><th key={label} style={{textAlign:"start",padding:"9px",borderBottom:"1px solid var(--border)",color:"var(--muted)",fontSize:10}}>{label}</th>)}</tr></thead>
        <tbody>{result.products.map(product=><tr key={product.sku}>{[
          `${product.name} · ${product.sku}`,money(product.selling_price,currency),money(product.campaign_price,currency),
          money(product.merchant_discount,currency),money(product.platform_funding,currency),money(product.commission+product.vat_on_fees,currency),
          product.inferred_product_cost==null?"Missing":money(product.inferred_product_cost,currency),
          product.expected_contribution==null?"Excluded":money(product.expected_contribution,currency),
          product.expected_margin_pct==null?"—":`${product.expected_margin_pct}%`,
          product.maximum_affordable_discount_pct==null?"—":`${product.maximum_affordable_discount_pct}%`,
        ].map((value,index)=><td key={index} style={{padding:"10px 9px",borderBottom:"1px solid var(--border)",fontWeight:index===0?800:500,color:product.eligible?"var(--text)":"#A16207"}}>{value}</td>)}</tr>)}</tbody>
      </table></div>
      <div style={{fontSize:10.5,color:"var(--muted)"}}>* Product cost is transparently inferred from current net margin until verified product-cost lineage is connected. No campaign is launched from this workspace.</div>
      <div style={{display:"flex",gap:9,alignItems:"center",flexWrap:"wrap"}}>
        <button disabled={busy||!name.trim()||!selected.length} onClick={saveDraft} style={{border:0,borderRadius:8,padding:"9px 13px",background:"#14213D",color:"#fff",fontFamily:"inherit",fontWeight:800,cursor:"pointer",display:"flex",gap:6}}><Save size={14}/>Save simulation as draft</button>
        <span style={{fontSize:11.5,color:"var(--muted)"}}>Approval records the decision only. It does not enroll the merchant in a platform campaign.</span>
      </div>
      {!!saved.length&&<div style={{borderTop:"1px solid var(--border)",paddingTop:15}}>
        <div style={{fontSize:15,fontWeight:900,marginBottom:10}}>Campaign register and funding reconciliation</div>
        <div style={{display:"flex",flexDirection:"column",gap:9}}>{saved.map(item=>{
          const draft=fundingDrafts[item.id]??{promised:String(item.promised_platform_funding??""),actual:String(item.actual_platform_funding??"")};
          const funding=draft.promised!==""&&draft.actual!==""?reconcilePromotionFunding(n(draft.promised),n(draft.actual)):null;
          return <div key={item.id} style={{border:"1px solid var(--border)",borderRadius:10,padding:"11px 12px",display:"grid",gridTemplateColumns:"minmax(190px,1.4fr) repeat(2,minmax(120px,.7fr)) minmax(150px,.8fr)",gap:9,alignItems:"end"}}>
            <div><strong>{item.name}</strong><div style={{fontSize:10.5,color:"var(--muted)",marginTop:3}}>{item.platform.toUpperCase()} · {item.status.toUpperCase()} · {new Date(item.created_at).toLocaleDateString("en-GB")}</div></div>
            <label style={{fontSize:10.5,fontWeight:800}}>Promised funding<input type="number" style={input} value={draft.promised} onChange={e=>setFundingDrafts({...fundingDrafts,[item.id]:{...draft,promised:e.target.value}})}/></label>
            <label style={{fontSize:10.5,fontWeight:800}}>Actual funding<input type="number" style={input} value={draft.actual} onChange={e=>setFundingDrafts({...fundingDrafts,[item.id]:{...draft,actual:e.target.value}})}/></label>
            <div style={{display:"flex",gap:6,alignItems:"center",flexWrap:"wrap"}}><button disabled={busy} onClick={()=>update(item,item.status==="draft"?"approved":item.status)} style={{border:"1px solid var(--border)",borderRadius:7,padding:"8px",background:"var(--surface)",color:"var(--text)",fontFamily:"inherit",fontWeight:800,cursor:"pointer"}}>{item.status==="draft"?"Approve":"Save funding"}</button>{funding&&<span style={{fontSize:10.5,fontWeight:900,color:funding.status==="matched"?"#087F5B":"#B42318"}}>{funding.status} · {money(funding.variance,currency)}</span>}</div>
          </div>;
        })}</div>
      </div>}
      {error&&<div style={{fontSize:12,color:"#B42318"}}>{error}</div>}
      <div style={{display:"flex",gap:7,fontSize:10.5,color:"var(--muted)",alignItems:"center"}}>{result.profitable?<CheckCircle2 size={14} color="#087F5B"/>:<FlaskConical size={14} color="#A16207"/>}{result.assumptions.join(" ")}</div>
    </div>
  </section>;
}
