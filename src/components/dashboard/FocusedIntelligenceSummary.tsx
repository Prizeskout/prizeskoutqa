import { AlertTriangle, CheckCircle2, CircleDollarSign, PackageCheck, ShieldCheck, WalletCards } from "lucide-react";

type Channel = { name: string; connected: boolean; termsReady: boolean };
type Risk = { name: string; channel: string; gap: string };
type RecoveryCase = { id: string; platform: string; title: string; status: string; exception_amount: number | null; claims_ready_amount: number; recovered_amount: number };

const money = (value: number | null, currency: string) =>
  value == null ? "Not calculated" : `${currency} ${value.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;

function Kpi({ icon: Icon, label, value, note, tone = "blue" }: { icon: typeof ShieldCheck; label: string; value: string; note: string; tone?: "blue" | "green" | "orange" }) {
  return <div className="ps-focus-kpi">
    <div className={`ps-focus-icon ${tone}`}><Icon size={17} /></div>
    <span>{label}</span><strong>{value}</strong><small>{note}</small>
  </div>;
}

export function MarginIntelligenceSummary({ currency, products, verified, risks, opportunity, orders, expectedPayout, channels, riskRows }: {
  currency: string; products: number; verified: number; risks: number; opportunity: number; orders: number; expectedPayout: number | null; channels: Channel[]; riskRows: Risk[];
}) {
  const coverage = products ? Math.round((verified / products) * 100) : 0;
  const missing = Math.max(0, products - verified);
  const readiness = (channel: Channel) => channel.connected && channel.termsReady ? 100 : channel.connected ? 60 : channel.termsReady ? 35 : 8;
  return <section className="ps-focus">
    <div className="ps-focus-kpis ps-margin-kpis">
      <Kpi icon={ShieldCheck} label="True Margin %" value={coverage ? `${coverage}% evidenced` : "Pending"} note={`${verified}/${products} product costs verified`} tone="green" />
      <Kpi icon={CircleDollarSign} label="Order Profit" value={opportunity ? `${currency} ${opportunity.toLocaleString("en-US",{maximumFractionDigits:0})}` : "Not calculated"} note="Verified correction per catalog sale" tone="green" />
      <Kpi icon={PackageCheck} label="Revenue" value="Not calculated" note="Requires retained order evidence" />
      <Kpi icon={PackageCheck} label="Orders" value={orders.toLocaleString()} note="In the latest payout calculation" />
      <Kpi icon={WalletCards} label="Payouts" value={money(expectedPayout,currency)} note="Latest retained calculation" />
    </div>
    <div className="ps-margin-grid">
      <div className="ps-focus-panel"><h3>Margin by Channel</h3><p>Evidence readiness for a defensible true-margin calculation.</p>
        <div className="ps-margin-bars">{channels.slice(0,6).map((c,i)=><div key={c.name}><b>{c.name}</b><span><i style={{width:`${readiness(c)}%`,background:["#10b981","#4f8df7","#f47320","#ef4444","#8b5cf6","#14b8a6"][i%6]}}/></span><strong>{readiness(c)}%</strong></div>)}</div>
      </div>
      <div className="ps-focus-panel"><h3>Fee Breakdown</h3><p>What is ready versus still blocking reliable margin.</p><div className="ps-margin-donut-wrap"><div className="ps-margin-donut" style={{background:products?`conic-gradient(#3159c9 0 ${coverage}%,#f47320 0 100%)`:"var(--surface2)"}}><span><b>{products}</b><small>Total products</small></span></div><div><LegendDot color="#3159c9" label="Cost evidenced" value={verified}/><LegendDot color="#f47320" label="Missing evidence" value={missing}/><LegendDot color="#8b5cf6" label="Margin risks" value={risks}/></div></div></div>
      <div className="ps-focus-panel"><h3>At-Risk Orders</h3><p>Verified products requiring merchant review.</p>{riskRows.length?<div className="ps-risk-list">{riskRows.slice(0,4).map(r=><div key={`${r.channel}-${r.name}`}><span><b>{r.name}</b><small>{r.channel}</small></span><strong>{r.gap}</strong></div>)}</div>:<div className="ps-focus-empty"><CheckCircle2 size={18}/> No verified-cost products are below target.</div>}</div>
    </div>
    <div className="ps-focus-panel ps-margin-summary"><h3>Channel Profit Summary</h3><p>Source access and commercial terms remain explicit until financial evidence is complete.</p><div className="ps-margin-table"><div className="head"><span>Channel</span><span>Source</span><span>Terms</span><span>Margin readiness</span><span>Risk products</span></div>{channels.slice(0,6).map(c=><div key={c.name}><b>{c.name}</b><span className={c.connected?"ok":"muted"}>{c.connected?"Connected":"Manual evidence"}</span><span className={c.termsReady?"ok":"warn"}>{c.termsReady?"Approved":"Needed"}</span><span>{readiness(c)}%</span><strong>{riskRows.filter(r=>r.channel.toLowerCase()===c.name.toLowerCase()).length}</strong></div>)}</div>
      </div>
    <style>{focusCss}</style>
  </section>;
}

function LegendDot({color,label,value}:{color:string;label:string;value:number}){return <div className="ps-margin-legend"><i style={{background:color}}/><span>{label}</span><b>{value}</b></div>}

export function RecoveryDashboardSummary({ currency, checks, investigations, recovered, submitted, openCases, channels, cases, onOpenTools }: {
  currency: string; expectedPayout: number | null; checks: number; investigations: number; recovered: number; submitted: number; openCases: number; channels: Channel[]; cases: RecoveryCase[]; onOpenTools: () => void;
}) {
  const claimsReady = cases.reduce((sum, item) => sum + Number(item.claims_ready_amount || 0), 0);
  const unresolved = cases.filter(item => !["recovered", "closed", "rejected"].includes(item.status));
  const byPlatform = Array.from(cases.reduce((map, item) => {
    const platform = item.platform || "unassigned";
    const row = map.get(platform) ?? { platform, cases: 0, identified: 0, ready: 0, recovered: 0 };
    row.cases += 1;
    row.identified += Number(item.exception_amount || 0);
    row.ready += Number(item.claims_ready_amount || 0);
    row.recovered += Number(item.recovered_amount || 0);
    map.set(platform, row);
    return map;
  }, new Map<string, { platform: string; cases: number; identified: number; ready: number; recovered: number }>()).values())
    .sort((a,b) => (b.ready + b.recovered) - (a.ready + a.recovered));
  const statusGroups = cases.reduce((map, item) => {
    const label = item.status.replaceAll("_", " ");
    map.set(label, (map.get(label) ?? 0) + 1);
    return map;
  }, new Map<string, number>());
  const statusRows = Array.from(statusGroups.entries()).sort((a,b) => b[1] - a[1]);
  const palette = ["#2563eb", "#ef681a", "#10b981", "#8b5cf6", "#ef4444", "#64748b"];
  let cursor = 0;
  const donut = cases.length ? `conic-gradient(${statusRows.map(([_, count], i) => {
    const start = cursor; cursor += (count / cases.length) * 100;
    return `${palette[i % palette.length]} ${start}% ${cursor}%`;
  }).join(",")})` : "var(--surface2)";
  return <section className="ps-focus ps-recovery-dashboard">
    <div className="ps-focus-heading"><div><span>PAYOUT RECOVERY</span><h2>Recover revenue you can prove you are owed</h2><p>Verify expected payouts, surface discrepancies, and track recovery across every evidenced platform.</p></div></div>
    <div className="ps-focus-kpis recovery">
      <Kpi icon={WalletCards} label="Claims ready" value={money(claimsReady, currency)} note="Supported by approved evidence" />
      <Kpi icon={AlertTriangle} label="Discrepancies found" value={cases.length.toLocaleString()} note={`${checks + investigations} checks and investigations`} tone="orange" />
      <Kpi icon={CircleDollarSign} label="Recovered to date" value={money(recovered, currency)} note={`${submitted} submitted cases`} tone="green" />
      <Kpi icon={ShieldCheck} label="Open recovery cases" value={openCases.toLocaleString()} note="Merchant-controlled workflow" />
    </div>
    <div className="ps-recovery-grid ps-recovery-primary">
      <div className="ps-focus-panel ps-recovery-platforms"><h3>Payout Reconciliation</h3><p>Only retained findings and approved evidence are counted.</p>
        {byPlatform.length ? <div className="ps-recovery-table"><div className="head"><span>Platform</span><span>Cases</span><span>Identified</span><span>Claims ready</span><span>Recovered</span></div>{byPlatform.map(row => <div key={row.platform}><b>{row.platform}</b><span>{row.cases}</span><span>{money(row.identified, currency)}</span><span>{money(row.ready, currency)}</span><strong>{money(row.recovered, currency)}</strong></div>)}</div> : <div className="ps-focus-empty"><CheckCircle2 size={20}/> No recovery findings have been recorded yet.</div>}
      </div>
      <div className="ps-focus-panel"><h3>Discrepancy Breakdown</h3><p>Current case states from the immutable recovery timeline.</p>
        <div className="ps-recovery-donut-wrap"><div className="ps-recovery-donut" style={{background:donut}}><span><strong>{cases.length}</strong><small>Total cases</small></span></div><div className="ps-recovery-legend">{statusRows.slice(0,6).map(([label,count],i)=><div key={label}><i style={{background:palette[i%palette.length]}}/><span>{label}</span><b>{count}</b></div>)}</div></div>
      </div>
    </div>
    <div className="ps-recovery-grid secondary ps-recovery-secondary">
      <div className="ps-focus-panel"><h3>Recovery Trend</h3><p>Progress from identified discrepancy to claims-ready and recovered value.</p><div className="ps-recovery-progress"><Progress label="Identified" value={cases.reduce((sum,item)=>sum+Number(item.exception_amount||0),0)} max={Math.max(1,cases.reduce((sum,item)=>sum+Number(item.exception_amount||0),0))} currency={currency} color="#f47320"/><Progress label="Claims ready" value={claimsReady} max={Math.max(1,cases.reduce((sum,item)=>sum+Number(item.exception_amount||0),0))} currency={currency} color="#4f8df7"/><Progress label="Recovered" value={recovered} max={Math.max(1,cases.reduce((sum,item)=>sum+Number(item.exception_amount||0),0))} currency={currency} color="#10b981"/></div><div className="ps-recovery-source-note">{channels.filter(c=>c.connected).length}/{channels.length} sources connected · {channels.filter(c=>c.termsReady).length}/{channels.length} agreements ready</div></div>
      <div className="ps-focus-panel"><h3>Case tracker</h3><p>Most important unresolved cases, ordered by claims-ready value.</p>{unresolved.length ? <div className="ps-case-list">{unresolved.sort((a,b)=>Number(b.claims_ready_amount||b.exception_amount||0)-Number(a.claims_ready_amount||a.exception_amount||0)).slice(0,5).map(item=><div key={item.id}><span><b>{item.title}</b><small>{item.platform} · {item.status.replaceAll("_"," ")}</small></span><strong>{money(Number(item.claims_ready_amount||item.exception_amount||0),currency)}</strong></div>)}</div> : <div className="ps-focus-empty"><CheckCircle2 size={20}/> No open recovery cases need attention.</div>}</div>
    </div>
    <div className="ps-recovery-actions"><button type="button" onClick={onOpenTools}>Open payout check</button></div>
    <style>{focusCss}</style>
  </section>;
}

function Progress({label,value,max,currency,color}:{label:string;value:number;max:number;currency:string;color:string}){return <div><span><b>{label}</b><strong>{money(value,currency)}</strong></span><i><em style={{width:`${Math.min(100,value/max*100)}%`,background:color}}/></i></div>}

const focusCss = `
.ps-focus{display:flex;flex-direction:column;gap:16px}.ps-focus-heading{display:flex;justify-content:space-between;align-items:end}.ps-focus-heading span{font-size:11px;font-weight:800;letter-spacing:.1em;color:#ef681a}.ps-focus-heading h2{font-size:25px;line-height:1.15;margin:5px 0 5px;letter-spacing:-.035em}.ps-focus-heading p,.ps-focus-panel>p{margin:0;color:var(--muted);font-size:12.5px}.ps-focus-kpis{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}.ps-focus-kpi{position:relative;background:var(--surface);border:1px solid var(--border);border-radius:13px;padding:15px 15px 14px;display:flex;flex-direction:column;gap:5px;box-shadow:0 8px 24px rgba(15,35,70,.045)}.ps-focus-kpi>span{font-size:11px;font-weight:750;color:var(--muted);text-transform:uppercase;letter-spacing:.035em}.ps-focus-kpi strong{font-size:21px;line-height:1.15;letter-spacing:-.025em}.ps-focus-kpi small{font-size:11px;color:var(--muted)}.ps-focus-icon{position:absolute;right:13px;top:13px;width:30px;height:30px;border-radius:9px;display:grid;place-items:center;color:#2563eb;background:#eff6ff}.ps-focus-icon.green{color:#079669;background:#ecfdf5}.ps-focus-icon.orange{color:#ea580c;background:#fff7ed}.ps-focus-grid,.ps-recovery-grid{display:grid;grid-template-columns:1.2fr 1fr;gap:14px}.ps-recovery-grid.secondary{grid-template-columns:1fr 1.2fr}.ps-focus-panel{background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:18px;box-shadow:0 8px 24px rgba(15,35,70,.045)}.ps-focus-panel h3{font-size:14px;margin:0 0 4px}.ps-channel-list,.ps-risk-list,.ps-case-list{margin-top:14px;display:flex;flex-direction:column}.ps-channel-list>div{display:grid;grid-template-columns:1fr 110px 110px;align-items:center;gap:8px;border-top:1px solid var(--border);padding:9px 0;font-size:11.5px}.ps-channel-list b,.ps-recovery-table b{text-transform:capitalize}.ps-channel-list span{text-align:right}.ok{color:#059669}.warn{color:#ea580c}.muted{color:var(--muted)}.ps-risk-list>div,.ps-case-list>div{display:flex;align-items:center;justify-content:space-between;gap:14px;border-top:1px solid var(--border);padding:9px 0}.ps-risk-list span,.ps-case-list span{display:flex;flex-direction:column;min-width:0}.ps-risk-list b,.ps-case-list b{font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.ps-risk-list small,.ps-case-list small{font-size:10.5px;color:var(--muted);text-transform:capitalize}.ps-risk-list strong{font-size:11.5px;color:#dc2626;white-space:nowrap}.ps-case-list strong{font-size:11.5px;white-space:nowrap}.ps-focus-empty{margin-top:14px;padding:22px;border-radius:10px;background:var(--surface2);color:#059669;font-size:12px;display:flex;align-items:center;gap:8px}.ps-recovery-table{margin-top:13px;overflow-x:auto}.ps-recovery-table>div{display:grid;grid-template-columns:minmax(95px,1fr) 55px 110px 110px;gap:8px;align-items:center;padding:9px 2px;border-top:1px solid var(--border);font-size:11.5px}.ps-recovery-table .head{color:var(--muted);font-size:10px;text-transform:uppercase;font-weight:800}.ps-recovery-table span:not(:first-child),.ps-recovery-table strong{text-align:right}.ps-recovery-table strong{color:#059669}.ps-recovery-donut-wrap{display:flex;align-items:center;gap:22px;margin-top:16px}.ps-recovery-donut{width:124px;height:124px;border-radius:50%;position:relative;display:grid;place-items:center;flex:0 0 auto}.ps-recovery-donut:after{content:"";position:absolute;inset:22px;border-radius:50%;background:var(--surface)}.ps-recovery-donut span{z-index:1;display:flex;flex-direction:column;text-align:center}.ps-recovery-donut strong{font-size:19px}.ps-recovery-donut small{font-size:9px;color:var(--muted)}.ps-recovery-legend{flex:1}.ps-recovery-legend>div{display:grid;grid-template-columns:8px 1fr auto;align-items:center;gap:7px;padding:4px 0;font-size:10.5px;text-transform:capitalize}.ps-recovery-legend i{width:7px;height:7px;border-radius:50%}@media(max-width:900px){.ps-focus-kpis{grid-template-columns:repeat(2,minmax(0,1fr))}.ps-focus-grid,.ps-recovery-grid,.ps-recovery-grid.secondary{grid-template-columns:1fr}}@media(max-width:560px){.ps-focus-kpis{grid-template-columns:1fr}.ps-focus-heading h2{font-size:22px}.ps-channel-list>div{grid-template-columns:1fr;gap:3px}.ps-channel-list span{text-align:left}.ps-recovery-table>div{grid-template-columns:1fr 42px 90px}.ps-recovery-table>div>*:nth-child(4){display:none}.ps-recovery-donut-wrap{align-items:flex-start;flex-direction:column}}
.ps-focus-heading{display:none!important}
.ps-margin-kpis{grid-template-columns:repeat(5,minmax(0,1fr))}.ps-margin-grid{display:grid;grid-template-columns:1.2fr 1fr .82fr;gap:12px}.ps-margin-grid>.ps-focus-panel{height:246px;box-sizing:border-box;overflow:hidden}.ps-margin-bars{display:grid;gap:10px;margin-top:16px}.ps-margin-bars>div{display:grid;grid-template-columns:75px 1fr 34px;gap:8px;align-items:center;font-size:10.5px;text-transform:capitalize}.ps-margin-bars>div>span{height:8px;background:var(--surface2);border-radius:999px;overflow:hidden}.ps-margin-bars i{display:block;height:100%;border-radius:999px}.ps-margin-bars strong{text-align:right}.ps-margin-donut-wrap{display:flex;align-items:center;gap:17px;margin-top:21px}.ps-margin-donut{width:112px;height:112px;border-radius:50%;display:grid;place-items:center;position:relative;flex:0 0 auto}.ps-margin-donut:after{content:"";position:absolute;inset:22px;border-radius:50%;background:var(--surface)}.ps-margin-donut>span{z-index:1;text-align:center}.ps-margin-donut b{display:block;font-size:18px}.ps-margin-donut small{font-size:8px;color:var(--muted);text-transform:uppercase}.ps-margin-legend{display:grid;grid-template-columns:7px 1fr auto;gap:7px;align-items:center;padding:5px 0;font-size:9.5px}.ps-margin-legend i{width:7px;height:7px;border-radius:50%}.ps-margin-legend span{color:var(--muted)}.ps-margin-summary{padding:0;overflow:hidden}.ps-margin-summary>h3,.ps-margin-summary>p{margin-left:18px;margin-right:18px}.ps-margin-summary>h3{margin-top:16px}.ps-margin-table{margin-top:13px;overflow-x:auto}.ps-margin-table>div{display:grid;grid-template-columns:1fr 1.1fr 1fr 1fr .7fr;gap:10px;align-items:center;padding:9px 18px;border-top:1px solid var(--border);font-size:10.5px}.ps-margin-table .head{background:var(--surface2);color:var(--muted);font-size:9px;font-weight:800;text-transform:uppercase}.ps-margin-table b{text-transform:capitalize}.ps-margin-table strong{text-align:right}@media(max-width:1100px){.ps-margin-kpis{grid-template-columns:repeat(3,minmax(0,1fr))}.ps-margin-grid{grid-template-columns:1fr 1fr}.ps-margin-grid>.ps-focus-panel{height:auto;min-height:240px}.ps-margin-grid>.ps-focus-panel:last-child{grid-column:1/-1}}@media(max-width:700px){.ps-margin-kpis,.ps-margin-grid{grid-template-columns:1fr}.ps-margin-grid>.ps-focus-panel:last-child{grid-column:auto}}
.ps-recovery-primary{grid-template-columns:1.35fr 1fr}.ps-recovery-secondary{grid-template-columns:1fr 1.2fr}.ps-recovery-dashboard .ps-focus-panel{min-height:225px}.ps-recovery-dashboard .ps-recovery-table>div{grid-template-columns:minmax(90px,1fr) 42px 95px 95px 95px;font-size:10px}.ps-recovery-progress{display:grid;gap:16px;margin-top:20px}.ps-recovery-progress>div>span{display:flex;justify-content:space-between;gap:10px;font-size:10.5px}.ps-recovery-progress>div>i{display:block;height:9px;border-radius:999px;background:var(--surface2);overflow:hidden;margin-top:6px}.ps-recovery-progress em{display:block;height:100%;border-radius:999px}.ps-recovery-source-note{margin-top:19px;font-size:10px;color:var(--muted)}
.ps-recovery-actions{display:flex;justify-content:flex-end}.ps-recovery-actions button{border:1px solid var(--border);border-radius:9px;background:var(--surface);color:var(--text);padding:9px 13px;font:750 10.5px inherit;cursor:pointer}.ps-recovery-actions button:hover{border-color:#f47320;color:#c2410c}
`;
