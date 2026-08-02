import {useEffect,useMemo,useState} from "react";
import {Building2,CheckCircle2,Plus,Save,Users} from "lucide-react";
import type {ContractTerm} from "@/components/dashboard/payout/ContractIntelligenceVault";
import type {GroupControls} from "@/server/core/group-controls";

type Branch={id:string;name:string;city:string;entity:string;brand:string;channels:string[];contract_id:string|null;monthly_sales:number;expected_settlement:number;actual_settlement:number};
type Member={id:string;name:string;role:"finance_reviewer"|"operations_reviewer"|"branch_manager"|"viewer"};
const input={width:"100%",boxSizing:"border-box" as const,border:"1px solid var(--border)",borderRadius:7,padding:"8px 9px",background:"var(--surface)",color:"var(--text)",fontFamily:"inherit"};
const money=(v:number,currency:string)=>`${currency} ${v.toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2})}`;
const id=()=>crypto.randomUUID?.()??`${Date.now()}-${Math.random()}`;

export function GroupControlWorkspace({contract,currency,productCount}:{contract:ContractTerm|null;currency:string;productCount:number}){
  const [groupName,setGroupName]=useState("Restaurant Group");
  const [entities,setEntities]=useState<string[]>(["Operating Company"]);
  const [brands,setBrands]=useState<string[]>(["Primary Brand"]);
  const [branches,setBranches]=useState<Branch[]>([]);
  const [members,setMembers]=useState<Member[]>([]);
  const [saved,setSaved]=useState<GroupControls|null>(null);
  const [financeReviewer,setFinanceReviewer]=useState("");
  const [operationsReviewer,setOperationsReviewer]=useState("");
  const [error,setError]=useState<string|null>(null);
  const [busy,setBusy]=useState(false);
  const [newEntity,setNewEntity]=useState("");const [newBrand,setNewBrand]=useState("");
  const [branchDraft,setBranchDraft]=useState({name:"",city:"Doha",entity:"Operating Company",brand:"Primary Brand",channels:"zid,talabat",monthly_sales:"0",expected:"0",actual:"0"});
  const [memberDraft,setMemberDraft]=useState({name:"",role:"finance_reviewer" as Member["role"]});
  const call=async(payload:Record<string,unknown>)=>{
    const response=await fetch("/api/channels/connect",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({merchant_id:localStorage.getItem("ps_merchant_id")??"",access_code:localStorage.getItem("ps_access_code")??"",platform:"group_controls",...payload})});
    const data=await response.json();if(!response.ok||!data.ok)throw new Error(data.error??"Group-control request failed.");return data;
  };
  const apply=(group:GroupControls|null)=>{setSaved(group);if(!group)return;setGroupName(group.group_name);setEntities(group.legal_entities as string[]);setBrands(group.brands as string[]);setBranches(group.branches as Branch[]);setMembers(group.members as Member[]);};
  const load=()=>call({action:"get"}).then(data=>apply(data.group??null)).catch(err=>setError(err instanceof Error?err.message:"Could not load group controls."));
  useEffect(()=>{load();},[]);
  const save=async()=>{setBusy(true);setError(null);try{const data=await call({action:"save",group_name:groupName,legal_entities:entities,brands,branches,members});apply(data.group);}catch(err){setError(err instanceof Error?err.message:"Could not save group.");}finally{setBusy(false);}};
  const approve=async(role:"finance"|"operations")=>{const reviewer=role==="finance"?financeReviewer:operationsReviewer;if(!reviewer){setError(`Choose a configured ${role} reviewer first.`);return;}setBusy(true);try{const data=await call({action:"approve",approval_role:role,reviewer});apply(data.group);}catch(err){setError(err instanceof Error?err.message:"Could not record approval.");}finally{setBusy(false);}};
  const total=useMemo(()=>branches.reduce((a,b)=>({sales:a.sales+b.monthly_sales,expected:a.expected+b.expected_settlement,actual:a.actual+b.actual_settlement}),{sales:0,expected:0,actual:0}),[branches]);
  const addBranch=()=>{if(!branchDraft.name.trim())return;setBranches(current=>[...current,{id:id(),name:branchDraft.name.trim(),city:branchDraft.city,entity:branchDraft.entity,brand:branchDraft.brand,channels:branchDraft.channels.split(",").map(v=>v.trim().toLowerCase()).filter(Boolean),contract_id:contract?.id??null,monthly_sales:Number(branchDraft.monthly_sales)||0,expected_settlement:Number(branchDraft.expected)||0,actual_settlement:Number(branchDraft.actual)||0}]);setBranchDraft({...branchDraft,name:"",monthly_sales:"0",expected:"0",actual:"0"});};

  return <section style={{border:"1px solid var(--border)",borderRadius:14,overflow:"hidden",background:"var(--surface)"}}>
    <div style={{padding:"17px 20px",background:"var(--surface2)",display:"flex",justifyContent:"space-between",alignItems:"center",gap:12,flexWrap:"wrap"}}>
      <div style={{display:"flex",gap:10,alignItems:"center"}}><Building2 size={21} color="#14213D"/><div><div style={{fontSize:18,fontWeight:900}}>Group Control Centre</div><div style={{fontSize:12.5,color:"var(--muted)"}}>Legal entities, brands, branches, channels, contracts and dual-role approvals.</div></div></div>
      <div style={{display:"flex",gap:7}}><span style={{fontSize:10.5,fontWeight:900,color:saved?.finance_approved_at?"#087F5B":"#A16207"}}>FINANCE {saved?.finance_approved_at?"APPROVED":"PENDING"}</span><span style={{fontSize:10.5,fontWeight:900,color:saved?.operations_approved_at?"#087F5B":"#A16207"}}>OPS {saved?.operations_approved_at?"APPROVED":"PENDING"}</span></div>
    </div>
    <div style={{padding:20,display:"flex",flexDirection:"column",gap:17}}>
      <label style={{fontSize:11,fontWeight:900,maxWidth:420}}>Group name<input style={input} value={groupName} onChange={e=>setGroupName(e.target.value)}/></label>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(250px,1fr))",gap:12}}>
        <div style={{border:"1px solid var(--border)",borderRadius:10,padding:12}}><strong style={{fontSize:12}}>Legal entities</strong><div style={{display:"flex",gap:6,flexWrap:"wrap",margin:"8px 0"}}>{entities.map(v=><span key={v} style={{border:"1px solid var(--border)",borderRadius:999,padding:"4px 7px",fontSize:10.5}}>{v}</span>)}</div><div style={{display:"flex",gap:6}}><input style={input} value={newEntity} onChange={e=>setNewEntity(e.target.value)} placeholder="New legal entity"/><button onClick={()=>{if(newEntity.trim()){setEntities([...entities,newEntity.trim()]);setNewEntity("");}}} style={{border:0,borderRadius:7,background:"#14213D",color:"#fff"}}><Plus size={15}/></button></div></div>
        <div style={{border:"1px solid var(--border)",borderRadius:10,padding:12}}><strong style={{fontSize:12}}>Brands</strong><div style={{display:"flex",gap:6,flexWrap:"wrap",margin:"8px 0"}}>{brands.map(v=><span key={v} style={{border:"1px solid var(--border)",borderRadius:999,padding:"4px 7px",fontSize:10.5}}>{v}</span>)}</div><div style={{display:"flex",gap:6}}><input style={input} value={newBrand} onChange={e=>setNewBrand(e.target.value)} placeholder="New brand"/><button onClick={()=>{if(newBrand.trim()){setBrands([...brands,newBrand.trim()]);setNewBrand("");}}} style={{border:0,borderRadius:7,background:"#14213D",color:"#fff"}}><Plus size={15}/></button></div></div>
      </div>
      <div style={{border:"1px solid var(--border)",borderRadius:10,padding:12}}>
        <strong style={{fontSize:13}}>Add branch and assign channels</strong>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(130px,1fr))",gap:7,marginTop:9}}>
          <input style={input} value={branchDraft.name} onChange={e=>setBranchDraft({...branchDraft,name:e.target.value})} placeholder="Branch name"/>
          <input style={input} value={branchDraft.city} onChange={e=>setBranchDraft({...branchDraft,city:e.target.value})} placeholder="City"/>
          <select style={input} value={branchDraft.entity} onChange={e=>setBranchDraft({...branchDraft,entity:e.target.value})}>{entities.map(v=><option key={v}>{v}</option>)}</select>
          <select style={input} value={branchDraft.brand} onChange={e=>setBranchDraft({...branchDraft,brand:e.target.value})}>{brands.map(v=><option key={v}>{v}</option>)}</select>
          <input style={input} value={branchDraft.channels} onChange={e=>setBranchDraft({...branchDraft,channels:e.target.value})} placeholder="zid,talabat"/>
          <input type="number" style={input} value={branchDraft.monthly_sales} onChange={e=>setBranchDraft({...branchDraft,monthly_sales:e.target.value})} placeholder="Monthly sales"/>
          <input type="number" style={input} value={branchDraft.expected} onChange={e=>setBranchDraft({...branchDraft,expected:e.target.value})} placeholder="Expected settlement"/>
          <input type="number" style={input} value={branchDraft.actual} onChange={e=>setBranchDraft({...branchDraft,actual:e.target.value})} placeholder="Actual settlement"/>
          <button onClick={addBranch} style={{border:0,borderRadius:7,background:"#14213D",color:"#fff",fontFamily:"inherit",fontWeight:800}}>Add branch</button>
        </div>
        <div style={{fontSize:10.5,color:"var(--muted)",marginTop:7}}>New branches inherit the current reviewed contract ({contract?.contract_name??"none selected"}) and the shared {productCount}-product catalogue; branch overrides can be added in later pricing plans.</div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(170px,1fr))",gap:9}}>
        {[["Branches",branches.length],["Monthly sales",money(total.sales,currency)],["Expected settlement",money(total.expected,currency)],["Portfolio leakage",money(Math.max(0,total.expected-total.actual),currency)]].map(([k,v])=><div key={k} style={{border:"1px solid var(--border)",borderRadius:9,padding:"10px 11px"}}><div style={{fontSize:10,color:"var(--muted)",fontWeight:800,textTransform:"uppercase"}}>{k}</div><div style={{fontSize:18,fontWeight:900,marginTop:3,color:k==="Portfolio leakage"&&total.expected>total.actual?"#B42318":"var(--text)"}}>{v}</div></div>)}
      </div>
      <div className="table-scroll"><table style={{width:"100%",borderCollapse:"collapse",minWidth:950,fontSize:11.5}}>
        <thead><tr>{["Entity → Brand → Branch","City","Channels","Contract","Expected","Actual","Leakage","Risk"].map(v=><th key={v} style={{padding:9,textAlign:"start",color:"var(--muted)",borderBottom:"1px solid var(--border)"}}>{v}</th>)}</tr></thead>
        <tbody>{branches.map(branch=>{const leakage=Math.max(0,branch.expected_settlement-branch.actual_settlement);const risk=branch.expected_settlement?leakage/branch.expected_settlement*100:0;return <tr key={branch.id}><td style={{padding:9,borderBottom:"1px solid var(--border)",fontWeight:900}}>{branch.entity} → {branch.brand} → {branch.name}</td><td style={{padding:9,borderBottom:"1px solid var(--border)"}}>{branch.city}</td><td style={{padding:9,borderBottom:"1px solid var(--border)"}}>{branch.channels.join(", ").toUpperCase()}</td><td style={{padding:9,borderBottom:"1px solid var(--border)",color:branch.contract_id?"#087F5B":"#A16207"}}>{branch.contract_id?contract?.contract_name:"Unassigned"}</td><td style={{padding:9,borderBottom:"1px solid var(--border)"}}>{money(branch.expected_settlement,currency)}</td><td style={{padding:9,borderBottom:"1px solid var(--border)"}}>{money(branch.actual_settlement,currency)}</td><td style={{padding:9,borderBottom:"1px solid var(--border)",fontWeight:900,color:leakage?"#B42318":"#087F5B"}}>{money(leakage,currency)}</td><td style={{padding:9,borderBottom:"1px solid var(--border)"}}><span style={{display:"inline-block",width:"auto",background:risk>5?"#B42318":risk>1?"#A16207":"#087F5B",color:"#fff",borderRadius:999,padding:"3px 7px",fontSize:10,fontWeight:900}}>{risk.toFixed(1)}%</span></td></tr>})}</tbody>
      </table></div>
      <div style={{border:"1px solid var(--border)",borderRadius:10,padding:12}}>
        <div style={{display:"flex",gap:8,alignItems:"center"}}><Users size={16}/><strong style={{fontSize:13}}>Approval roles</strong></div>
        <div style={{display:"flex",gap:7,marginTop:8,flexWrap:"wrap"}}><input style={{...input,maxWidth:220}} value={memberDraft.name} onChange={e=>setMemberDraft({...memberDraft,name:e.target.value})} placeholder="Team member"/><select style={{...input,maxWidth:190}} value={memberDraft.role} onChange={e=>setMemberDraft({...memberDraft,role:e.target.value as Member["role"]})}>{["finance_reviewer","operations_reviewer","branch_manager","viewer"].map(v=><option key={v} value={v}>{v.replaceAll("_"," ")}</option>)}</select><button onClick={()=>{if(memberDraft.name.trim()){setMembers([...members,{id:id(),name:memberDraft.name.trim(),role:memberDraft.role}]);setMemberDraft({...memberDraft,name:""});}}} style={{border:0,borderRadius:7,background:"#14213D",color:"#fff",padding:"7px 10px",fontFamily:"inherit",fontWeight:800}}>Add member</button></div>
        <div style={{display:"flex",gap:7,flexWrap:"wrap",marginTop:8}}>{members.map(m=><span key={m.id} style={{border:"1px solid var(--border)",borderRadius:999,padding:"5px 8px",fontSize:10.5}}>{m.name} · {m.role.replaceAll("_"," ")}</span>)}</div>
      </div>
      <div style={{display:"flex",gap:8,alignItems:"end",flexWrap:"wrap"}}>
        <button disabled={busy||!groupName.trim()} onClick={save} style={{border:0,borderRadius:8,padding:"9px 12px",background:"#14213D",color:"#fff",fontFamily:"inherit",fontWeight:800,display:"flex",gap:6}}><Save size={14}/>Save hierarchy</button>
        <label style={{fontSize:10.5,fontWeight:800}}>Finance reviewer<select style={{...input,width:190,display:"block",marginTop:4}} value={financeReviewer} onChange={e=>setFinanceReviewer(e.target.value)}><option value="">Choose reviewer</option>{members.filter(member=>member.role==="finance_reviewer").map(member=><option key={member.id} value={member.id}>{member.name}</option>)}</select></label>
        <button disabled={busy||!saved||!financeReviewer||Boolean(saved?.finance_approved_at)} onClick={()=>approve("finance")} style={{border:"1px solid #087F5B",borderRadius:8,padding:"8px 10px",background:"transparent",color:"#087F5B",fontFamily:"inherit",fontWeight:800}}>Finance approve</button>
        <label style={{fontSize:10.5,fontWeight:800}}>Operations reviewer<select style={{...input,width:190,display:"block",marginTop:4}} value={operationsReviewer} onChange={e=>setOperationsReviewer(e.target.value)}><option value="">Choose reviewer</option>{members.filter(member=>member.role==="operations_reviewer").map(member=><option key={member.id} value={member.id}>{member.name}</option>)}</select></label>
        <button disabled={busy||!saved||!operationsReviewer||Boolean(saved?.operations_approved_at)} onClick={()=>approve("operations")} style={{border:"1px solid #087F5B",borderRadius:8,padding:"8px 10px",background:"transparent",color:"#087F5B",fontFamily:"inherit",fontWeight:800}}>Operations approve</button>
        {saved?.finance_approved_at&&saved.operations_approved_at&&<span style={{fontSize:11,color:"#087F5B",fontWeight:900,display:"flex",gap:5}}><CheckCircle2 size={14}/>Dual approval complete · different configured roles</span>}
      </div>
      <div style={{fontSize:10.5,color:"var(--muted)"}}>Settlement calendar basis: {contract?.settlement_frequency??"not established"}{contract?.settlement_days!=null?` · ${contract.settlement_days}-day contractual lag`:""}. Values entered here are branch management records; documentary payout evidence remains in the audit workspace.</div>
      {error&&<div style={{fontSize:12,color:"#B42318"}}>{error}</div>}
    </div>
  </section>;
}
