import { AlertTriangle, CheckCircle2, CircleDollarSign, PackageCheck, ShieldCheck, WalletCards } from "lucide-react";

type Channel = { name: string; connected: boolean; termsReady: boolean };
type Risk = { name: string; channel: string; gap: string };

const money = (value: number | null, currency: string) =>
  value == null ? "Not calculated" : `${currency} ${value.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;

function Kpi({ icon: Icon, label, value, note, tone = "blue" }: { icon: typeof ShieldCheck; label: string; value: string; note: string; tone?: "blue" | "green" | "orange" }) {
  return <div className="ps-focus-kpi">
    <div className={`ps-focus-icon ${tone}`}><Icon size={17} /></div>
    <span>{label}</span><strong>{value}</strong><small>{note}</small>
  </div>;
}

export function MarginIntelligenceSummary({ currency, products, verified, risks, opportunity, channels, riskRows }: {
  currency: string; products: number; verified: number; risks: number; opportunity: number; channels: Channel[]; riskRows: Risk[];
}) {
  const coverage = products ? Math.round((verified / products) * 100) : 0;
  return <section className="ps-focus">
    <div className="ps-focus-heading"><div><span>TRUE MARGIN INTELLIGENCE</span><h2>See what every catalog sale could actually keep</h2><p>Verified costs, margin guardrails, and channel readiness in one decision view.</p></div></div>
    <div className="ps-focus-kpis">
      <Kpi icon={PackageCheck} label="Products monitored" value={products.toLocaleString()} note="Across connected catalogs" />
      <Kpi icon={ShieldCheck} label="Cost evidence" value={`${coverage}%`} note={`${verified} verified products`} tone="green" />
      <Kpi icon={AlertTriangle} label="Margin risks" value={risks.toLocaleString()} note="Need merchant attention" tone="orange" />
      <Kpi icon={CircleDollarSign} label="Potential correction" value={`${currency} ${opportunity.toLocaleString("en-US", { maximumFractionDigits: 0 })}`} note="Per catalog sale, not a forecast" tone="green" />
    </div>
    <div className="ps-focus-grid">
      <div className="ps-focus-panel"><h3>Channel readiness</h3><p>Connections and approved financial terms are tracked separately.</p>
        <div className="ps-channel-list">{channels.map(c => <div key={c.name}><b>{c.name}</b><span className={c.connected ? "ok" : "muted"}>{c.connected ? "Connected" : "Not connected"}</span><span className={c.termsReady ? "ok" : "warn"}>{c.termsReady ? "Terms approved" : "Terms needed"}</span></div>)}</div>
      </div>
      <div className="ps-focus-panel"><h3>Products to review first</h3><p>Ranked by the verified price correction currently required.</p>
        {riskRows.length ? <div className="ps-risk-list">{riskRows.map(r => <div key={`${r.channel}-${r.name}`}><span><b>{r.name}</b><small>{r.channel}</small></span><strong>{r.gap}</strong></div>)}</div> : <div className="ps-focus-empty"><CheckCircle2 size={20}/> No verified-cost products are below the active margin floor.</div>}
      </div>
    </div>
    <style>{focusCss}</style>
  </section>;
}

export function RecoveryDashboardSummary({ currency, expectedPayout, checks, investigations, recovered, submitted, openCases, channels }: {
  currency: string; expectedPayout: number | null; checks: number; investigations: number; recovered: number; submitted: number; openCases: number; channels: Channel[];
}) {
  return <section className="ps-focus">
    <div className="ps-focus-heading"><div><span>PAYOUT RECOVERY</span><h2>Recover revenue you can prove you are owed</h2><p>Compare evidence, approved terms, settlement results, and recovery cases without guessing.</p></div></div>
    <div className="ps-focus-kpis recovery">
      <Kpi icon={WalletCards} label="Expected payout" value={money(expectedPayout, currency)} note="Latest completed check" />
      <Kpi icon={AlertTriangle} label="Checks & investigations" value={(checks + investigations).toLocaleString()} note="Evidence retained" tone="orange" />
      <Kpi icon={CircleDollarSign} label="Recovered to date" value={money(recovered, currency)} note={`${submitted} submitted cases`} tone="green" />
      <Kpi icon={ShieldCheck} label="Open recovery cases" value={openCases.toLocaleString()} note="Merchant-controlled workflow" />
    </div>
    <div className="ps-focus-grid">
      <div className="ps-focus-panel"><h3>Recovery readiness</h3><p>A claim becomes ready only when the source and agreement evidence are available.</p>
        <div className="ps-channel-list">{channels.map(c => <div key={c.name}><b>{c.name}</b><span className={c.connected ? "ok" : "muted"}>{c.connected ? "Source connected" : "Manual evidence"}</span><span className={c.termsReady ? "ok" : "warn"}>{c.termsReady ? "Agreement ready" : "Agreement needed"}</span></div>)}</div>
      </div>
      <div className="ps-focus-panel ps-recovery-steps"><h3>Evidence-to-recovery workflow</h3><p>PrizeSkout keeps every conclusion reviewable before submission.</p>
        {["Collect source evidence", "Reconcile against approved terms", "Review and approve evidence pack", "Submit and record the outcome"].map((s,i)=><div key={s}><i>{i+1}</i><span>{s}</span></div>)}
      </div>
    </div>
    <style>{focusCss}</style>
  </section>;
}

const focusCss = `
.ps-focus{display:flex;flex-direction:column;gap:16px}.ps-focus-heading{display:flex;justify-content:space-between;align-items:end}.ps-focus-heading span{font-size:11px;font-weight:800;letter-spacing:.1em;color:#ef681a}.ps-focus-heading h2{font-size:25px;line-height:1.15;margin:5px 0 5px;letter-spacing:-.035em}.ps-focus-heading p,.ps-focus-panel>p{margin:0;color:var(--muted);font-size:12.5px}.ps-focus-kpis{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}.ps-focus-kpi{position:relative;background:var(--surface);border:1px solid var(--border);border-radius:13px;padding:15px 15px 14px;display:flex;flex-direction:column;gap:5px;box-shadow:0 8px 24px rgba(15,35,70,.045)}.ps-focus-kpi>span{font-size:11px;font-weight:750;color:var(--muted);text-transform:uppercase;letter-spacing:.035em}.ps-focus-kpi strong{font-size:21px;line-height:1.15;letter-spacing:-.025em}.ps-focus-kpi small{font-size:11px;color:var(--muted)}.ps-focus-icon{position:absolute;right:13px;top:13px;width:30px;height:30px;border-radius:9px;display:grid;place-items:center;color:#2563eb;background:#eff6ff}.ps-focus-icon.green{color:#079669;background:#ecfdf5}.ps-focus-icon.orange{color:#ea580c;background:#fff7ed}.ps-focus-grid{display:grid;grid-template-columns:1.2fr 1fr;gap:14px}.ps-focus-panel{background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:18px;box-shadow:0 8px 24px rgba(15,35,70,.045)}.ps-focus-panel h3{font-size:14px;margin:0 0 4px}.ps-channel-list,.ps-risk-list{margin-top:14px;display:flex;flex-direction:column}.ps-channel-list>div{display:grid;grid-template-columns:1fr 110px 110px;align-items:center;gap:8px;border-top:1px solid var(--border);padding:9px 0;font-size:11.5px}.ps-channel-list b{text-transform:capitalize}.ps-channel-list span{text-align:right}.ok{color:#059669}.warn{color:#ea580c}.muted{color:var(--muted)}.ps-risk-list>div{display:flex;align-items:center;justify-content:space-between;gap:14px;border-top:1px solid var(--border);padding:9px 0}.ps-risk-list span{display:flex;flex-direction:column;min-width:0}.ps-risk-list b{font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.ps-risk-list small{font-size:10.5px;color:var(--muted);text-transform:capitalize}.ps-risk-list strong{font-size:11.5px;color:#dc2626;white-space:nowrap}.ps-focus-empty{margin-top:14px;padding:22px;border-radius:10px;background:var(--surface2);color:#059669;font-size:12px;display:flex;align-items:center;gap:8px}.ps-recovery-steps>div{display:flex;align-items:center;gap:10px;border-top:1px solid var(--border);padding:10px 0;font-size:12px}.ps-recovery-steps>div:first-of-type{margin-top:12px}.ps-recovery-steps i{font-style:normal;width:23px;height:23px;border-radius:50%;background:#eff6ff;color:#2563eb;display:grid;place-items:center;font-weight:800;font-size:10px}@media(max-width:900px){.ps-focus-kpis{grid-template-columns:repeat(2,minmax(0,1fr))}.ps-focus-grid{grid-template-columns:1fr}}@media(max-width:560px){.ps-focus-kpis{grid-template-columns:1fr}.ps-focus-heading h2{font-size:22px}.ps-channel-list>div{grid-template-columns:1fr;gap:3px}.ps-channel-list span{text-align:left}}
`;
