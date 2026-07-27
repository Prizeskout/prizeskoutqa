import { useMemo, useState } from "react";
import { AlertTriangle, CalendarClock, ChevronLeft, ChevronRight, Search } from "lucide-react";

type Forecast = {
  as_of:string;
  confidence:"verified_contract"|"incomplete_contract"|"estimated_schedule";
  blockers:string[];
  expected_today:number;
  expected_next_settlement:{date:string;amount:number}|null;
  by_settlement_date:{date:string;amount:number;orders:number}[];
  by_product:{product_name:string;sku:string|null;amount:number;quantity:number}[];
  by_platform:{platform:string;amount:number;orders:number}[];
  transaction_count:number;
};
type SaleLine={
  order_id:string;product_name:string;sku:string|null;quantity:number;gross_sale:number;
  commission:number;vat_on_fees:number;payment_fee:number;fixed_order_fee:number;
  delivery_contribution:number;expected_net:number;order_date:string|null;
  expected_settlement_date:string|null;
};

const money=(value:number,currency:string)=>`${currency} ${value.toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2})}`;

export function SettlementForecastPanel({forecast,lines,currency}:{forecast:Forecast;lines:SaleLine[];currency:string}) {
  const [query,setQuery]=useState("");
  const [page,setPage]=useState(1);
  const filtered=useMemo(()=>{
    const needle=query.trim().toLowerCase();
    return needle?lines.filter(line=>`${line.product_name} ${line.sku??""} ${line.order_id}`.toLowerCase().includes(needle)):lines;
  },[lines,query]);
  const pages=Math.max(1,Math.ceil(filtered.length/10));
  const rows=filtered.slice((Math.min(page,pages)-1)*10,Math.min(page,pages)*10);
  const confidence=forecast.confidence==="verified_contract"
    ? {label:"Contract verified",color:"#087F5B"}
    : forecast.confidence==="estimated_schedule"
    ? {label:"Schedule estimated",color:"#A16207"}
    : {label:"Contract incomplete",color:"#B42318"};

  return <section style={{border:"1px solid var(--border)",borderRadius:13,overflow:"hidden",background:"var(--surface)"}}>
    <div style={{padding:"17px 19px",background:"var(--surface2)",display:"flex",justifyContent:"space-between",gap:12,alignItems:"center",flexWrap:"wrap"}}>
      <div style={{display:"flex",gap:10,alignItems:"center"}}><CalendarClock size={20}/><div><div style={{fontSize:15.5,fontWeight:900}}>Continuous Settlement Forecast</div><div style={{fontSize:11.5,color:"var(--muted)",marginTop:2}}>Order-level expected net before the platform statement arrives.</div></div></div>
      <span style={{fontSize:11.5,fontWeight:900,color:confidence.color,border:`1px solid ${confidence.color}`,borderRadius:999,padding:"5px 9px"}}>{confidence.label}</span>
    </div>
    <div style={{padding:"16px 19px",display:"flex",flexDirection:"column",gap:14}}>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(170px,1fr))",gap:9}}>
        {[
          ["Expected today",money(forecast.expected_today,currency)],
          ["Next settlement",forecast.expected_next_settlement?money(forecast.expected_next_settlement.amount,currency):"Not established"],
          ["Next settlement date",forecast.expected_next_settlement?.date??"Contract timing required"],
          ["Product sale lines",String(forecast.transaction_count)],
        ].map(([label,value])=><div key={label} style={{border:"1px solid var(--border)",borderRadius:10,padding:"12px 13px"}}><div style={{fontSize:10.5,textTransform:"uppercase",color:"var(--muted)",fontWeight:800}}>{label}</div><div style={{fontSize:17,fontWeight:900,marginTop:5}}>{value}</div></div>)}
      </div>
      {!!forecast.blockers.length&&<div style={{border:"1px solid color-mix(in srgb,#A16207 35%,var(--border))",background:"color-mix(in srgb,#A16207 6%,var(--surface))",borderRadius:10,padding:"10px 12px"}}>
        <div style={{display:"flex",gap:7,alignItems:"center",fontSize:11.5,fontWeight:900,color:"#A16207"}}><AlertTriangle size={14}/>Forecast limitations</div>
        {forecast.blockers.map(item=><div key={item} style={{fontSize:11.5,color:"var(--muted)",marginTop:5}}>• {item}</div>)}
      </div>}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(260px,1fr))",gap:10}}>
        <div style={{border:"1px solid var(--border)",borderRadius:10,padding:"12px 13px"}}><div style={{fontSize:12,fontWeight:900,marginBottom:8}}>By settlement date</div>{forecast.by_settlement_date.length?forecast.by_settlement_date.slice(0,6).map(item=><div key={item.date} style={{display:"flex",justifyContent:"space-between",fontSize:11.5,padding:"5px 0",borderBottom:"1px solid var(--border)"}}><span>{item.date} · {item.orders} orders</span><strong>{money(item.amount,currency)}</strong></div>):<span style={{fontSize:11.5,color:"var(--muted)"}}>Approve settlement timing to unlock this forecast.</span>}</div>
        <div style={{border:"1px solid var(--border)",borderRadius:10,padding:"12px 13px"}}><div style={{fontSize:12,fontWeight:900,marginBottom:8}}>Highest expected products</div>{forecast.by_product.slice(0,6).map(item=><div key={item.sku??item.product_name} style={{display:"flex",justifyContent:"space-between",fontSize:11.5,padding:"5px 0",borderBottom:"1px solid var(--border)",gap:8}}><span>{item.product_name} · {item.quantity}</span><strong>{money(item.amount,currency)}</strong></div>)}</div>
      </div>
      <div>
        <div style={{display:"flex",justifyContent:"space-between",gap:10,alignItems:"center",flexWrap:"wrap",marginBottom:8}}><strong style={{fontSize:12.5}}>Transaction forecast lineage</strong><label style={{display:"flex",gap:6,alignItems:"center",border:"1px solid var(--border)",borderRadius:8,padding:"6px 9px"}}><Search size={13}/><input value={query} onChange={e=>{setQuery(e.target.value);setPage(1);}} placeholder="Product, SKU or order" style={{border:0,outline:0,background:"transparent",color:"var(--text)",fontFamily:"inherit",fontSize:11.5}}/></label></div>
        <div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse",minWidth:760}}><thead><tr>{["Product / order","Gross","Deductions","Expected net","Expected settlement"].map((heading,index)=><th key={heading} style={{fontSize:10,textTransform:"uppercase",color:"var(--muted)",textAlign:index?"right":"left",padding:"8px",borderBottom:"1px solid var(--border)"}}>{heading}</th>)}</tr></thead><tbody>{rows.map((line,index)=><tr key={`${line.order_id}-${line.sku}-${index}`}><td style={{padding:8,borderBottom:"1px solid var(--border)",fontSize:11.5}}><strong>{line.product_name}</strong><div style={{color:"var(--muted)",fontSize:10.5}}>{line.order_id}{line.sku?` · ${line.sku}`:""}</div></td><td style={{padding:8,textAlign:"right",fontSize:11.5,borderBottom:"1px solid var(--border)"}}>{money(line.gross_sale,currency)}</td><td style={{padding:8,textAlign:"right",fontSize:11.5,color:"#B42318",borderBottom:"1px solid var(--border)"}}>({money(line.gross_sale-line.expected_net,currency)})</td><td style={{padding:8,textAlign:"right",fontWeight:900,fontSize:11.5,borderBottom:"1px solid var(--border)"}}>{money(line.expected_net,currency)}</td><td style={{padding:8,textAlign:"right",fontSize:11.5,borderBottom:"1px solid var(--border)"}}>{line.expected_settlement_date??"Timing unavailable"}</td></tr>)}</tbody></table></div>
        {pages>1&&<div style={{display:"flex",justifyContent:"flex-end",alignItems:"center",gap:7,marginTop:9,fontSize:11.5}}><button onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={page<=1} style={{border:"1px solid var(--border)",background:"var(--surface)",color:"var(--text)",borderRadius:7,padding:6}}><ChevronLeft size={14}/></button><span>Page {Math.min(page,pages)} of {pages}</span><button onClick={()=>setPage(p=>Math.min(pages,p+1))} disabled={page>=pages} style={{border:"1px solid var(--border)",background:"var(--surface)",color:"var(--text)",borderRadius:7,padding:6}}><ChevronRight size={14}/></button></div>}
      </div>
    </div>
  </section>;
}
