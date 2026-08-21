import { AlertTriangle, Boxes, CheckCircle2, CircleDollarSign, PlugZap, ShieldCheck } from "lucide-react";
import type { CSSProperties } from "react";

type ChannelRow = { name: string; connected: boolean; termsReady: boolean };
type RiskRow = { name: string; channel: string; gap: string };

type Props = {
  currency: string;
  trackedProducts: number;
  verifiedCosts: number;
  missingCosts: number;
  atRiskProducts: number;
  activeRules: number;
  attentionCount: number;
  confirmedActions: number;
  expectedPayout: number | null;
  channels: ChannelRow[];
  risks: RiskRow[];
  onCatalog: () => void;
  onMargin: () => void;
  onRecovery: () => void;
  onAlerts: () => void;
  onIntegrations: () => void;
};

const money = (amount: number | null, currency: string) =>
  amount == null ? "Not calculated" : `${currency} ${amount.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

export function ExecutiveOverview(props: Props) {
  const connected = props.channels.filter((channel) => channel.connected).length;
  const termsReady = props.channels.filter((channel) => channel.termsReady).length;
  const evidencePct = props.trackedProducts ? Math.round((props.verifiedCosts / props.trackedProducts) * 100) : 0;
  const healthPct = props.trackedProducts ? Math.max(0, Math.round(((props.trackedProducts - props.missingCosts) / props.trackedProducts) * 100)) : 0;
  const metrics = [
    { label: "Catalog items", value: props.trackedProducts.toLocaleString(), note: `${props.verifiedCosts} costs confirmed`, icon: Boxes, tone: "#2563EB", action: props.onCatalog },
    { label: "Connected channels", value: String(connected), note: `${props.channels.length} sources available`, icon: PlugZap, tone: "#0EA5E9", action: props.onIntegrations },
    { label: "Cost evidence", value: `${evidencePct}%`, note: `${props.missingCosts} products need evidence`, icon: CheckCircle2, tone: "#10B981", action: props.onCatalog },
    { label: "Margin risks", value: String(props.atRiskProducts), note: "Verified products below target", icon: AlertTriangle, tone: "#EF681A", action: props.onMargin },
    { label: "Expected payout", value: money(props.expectedPayout, props.currency), note: "Latest retained calculation", icon: CircleDollarSign, tone: "#8B5CF6", action: props.onRecovery },
    { label: "Protected actions", value: String(props.confirmedActions), note: `${props.activeRules} active guardrail${props.activeRules === 1 ? "" : "s"}`, icon: ShieldCheck, tone: "#14B8A6", action: props.onAlerts },
  ];

  return (
    <div className="exec-overview">
      <style>{`
        .exec-overview{display:grid;gap:16px;font-family:Inter,ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif}
        .exec-metrics{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:12px}
        .exec-card,.exec-panel{background:var(--surface);border:1px solid var(--border);border-radius:14px;box-shadow:var(--shadow)}
        .exec-metric{padding:16px;text-align:start;color:var(--text);cursor:pointer;transition:transform .16s,border-color .16s,box-shadow .16s}
        .exec-metric:hover{transform:translateY(-2px);border-color:color-mix(in srgb,var(--metric-tone) 40%,var(--border));box-shadow:0 14px 30px -18px rgba(15,23,42,.3)}
        .exec-grid{display:grid;grid-template-columns:1.05fr 1.35fr .9fr;gap:14px;align-items:stretch}
        .exec-panel{padding:18px;min-width:0}
        .exec-panel h2{font:750 15px/1.25 Inter,ui-sans-serif,system-ui;margin:0;color:var(--text)}
        .exec-sub{font-size:11.5px;color:var(--muted);margin-top:4px}
        .exec-health{display:flex;align-items:center;gap:18px;margin-top:20px}
        .exec-donut{width:126px;height:126px;border-radius:50%;display:grid;place-items:center;flex:0 0 auto;background:conic-gradient(#10B981 0 calc(var(--health)*1%),#2563EB calc(var(--health)*1%) calc((var(--health) + 7)*1%),#EF681A calc((var(--health) + 7)*1%) 100%)}
        .exec-donut:after{content:"";width:82px;height:82px;border-radius:50%;background:var(--surface);position:absolute}
        .exec-donut-value{position:relative;z-index:1;text-align:center;font-size:22px;font-weight:800;color:var(--text)}
        .exec-donut-value small{display:block;font-size:9px;color:var(--muted);font-weight:700;text-transform:uppercase}
        .exec-channel{display:grid;grid-template-columns:90px 1fr 42px;gap:9px;align-items:center;margin-top:13px;font-size:11.5px}
        .exec-track{height:8px;border-radius:999px;background:var(--surface2);overflow:hidden}
        .exec-fill{height:100%;border-radius:inherit;background:linear-gradient(90deg,#2563EB,#10B981)}
        .exec-alert{display:grid;grid-template-columns:32px 1fr auto;gap:10px;align-items:center;padding:11px 0;border-bottom:1px solid var(--border)}
        .exec-alert:last-child{border-bottom:0}
        .exec-alert-icon{width:32px;height:32px;border-radius:10px;display:grid;place-items:center;background:#FFF7ED;color:#EA580C}
        .exec-table{overflow:auto}.exec-table table{width:100%;border-collapse:collapse;min-width:680px}.exec-table th{font-size:10px;text-transform:uppercase;letter-spacing:.05em;color:var(--muted);font-weight:750;text-align:start;padding:11px 14px;background:var(--surface2)}.exec-table td{font-size:12px;padding:12px 14px;border-top:1px solid var(--border)}
        @media(max-width:1250px){.exec-metrics{grid-template-columns:repeat(3,1fr)}.exec-grid{grid-template-columns:1fr 1fr}.exec-grid>.exec-panel:last-child{grid-column:1/-1}}
        @media(max-width:700px){.exec-metrics{grid-template-columns:1fr 1fr}.exec-grid{grid-template-columns:1fr}.exec-grid>.exec-panel:last-child{grid-column:auto}.exec-health{align-items:flex-start;flex-direction:column}.exec-donut{align-self:center}.exec-metric{padding:13px}.exec-metric-value{font-size:20px!important}}
      `}</style>

      <div className="exec-metrics">
        {metrics.map(({ label, value, note, icon: Icon, tone, action }) => (
          <button key={label} type="button" className="exec-card exec-metric" style={{ "--metric-tone": tone } as CSSProperties} onClick={action}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center" }}>
              <span style={{ fontSize: 10.5, color: "var(--muted)", fontWeight: 750 }}>{label}</span>
              <span style={{ width: 30, height: 30, display: "grid", placeItems: "center", borderRadius: 10, background: `color-mix(in srgb,${tone} 10%,var(--surface))`, color: tone }}><Icon size={15} /></span>
            </div>
            <div className="exec-metric-value" style={{ fontSize: value.length > 13 ? 18 : 24, fontWeight: 800, marginTop: 11, letterSpacing: "-.02em" }}>{value}</div>
            <div style={{ color: "var(--muted)", fontSize: 10.5, marginTop: 5, lineHeight: 1.35 }}>{note}</div>
          </button>
        ))}
      </div>

      <div className="exec-grid">
        <section className="exec-panel">
          <h2>Catalog health</h2><div className="exec-sub">Evidence readiness across imported products</div>
          <div className="exec-health">
            <div className="exec-donut" style={{ "--health": healthPct, position: "relative", ...(props.trackedProducts === 0 ? { background: "var(--surface2)" } : {}) } as CSSProperties}><div className="exec-donut-value">{healthPct}%<small>ready</small></div></div>
            <div style={{ flex: 1, display: "grid", gap: 10, fontSize: 11.5 }}>
              <Legend color="#10B981" label="Confirmed costs" value={props.verifiedCosts} />
              <Legend color="#EF681A" label="Missing evidence" value={props.missingCosts} />
              <Legend color="#2563EB" label="Below target" value={props.atRiskProducts} />
            </div>
          </div>
        </section>

        <section className="exec-panel">
          <h2>Channel readiness</h2><div className="exec-sub">Connection and approved commercial-term coverage</div>
          {props.channels.map((channel) => {
            const readiness = channel.connected && channel.termsReady ? 100 : channel.connected ? 60 : channel.termsReady ? 35 : 8;
            return <div className="exec-channel" key={channel.name}><strong>{channel.name}</strong><div className="exec-track"><div className="exec-fill" style={{ width: `${readiness}%` }} /></div><span style={{ color: readiness === 100 ? "#059669" : "var(--muted)", textAlign: "end" }}>{readiness}%</span></div>;
          })}
          <button type="button" onClick={props.onIntegrations} style={linkButton}>Review integrations and terms →</button>
        </section>

        <section className="exec-panel">
          <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}><div><h2>Top alerts</h2><div className="exec-sub">Work requiring merchant attention</div></div><strong style={{ color: "#EF681A", fontSize: 12 }}>{props.attentionCount}</strong></div>
          <Alert label="Cost evidence missing" detail={`${props.missingCosts} products`} />
          <Alert label="Margin below target" detail={`${props.atRiskProducts} products`} />
          <Alert label="Commercial terms ready" detail={`${termsReady}/${props.channels.length} channels`} />
          <button type="button" onClick={props.onAlerts} style={linkButton}>Open attention queue →</button>
        </section>
      </div>

      <section className="exec-panel" style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ padding: "17px 18px", display: "flex", justifyContent: "space-between", alignItems: "center" }}><div><h2>Priority margin actions</h2><div className="exec-sub">Verified products ranked by the gap to their protected price</div></div><button type="button" onClick={props.onCatalog} style={linkButton}>View catalog →</button></div>
        <div className="exec-table"><table><thead><tr><th>Product</th><th>Channel</th><th>Issue</th><th>Recommended action</th><th>Status</th></tr></thead><tbody>
          {props.risks.length ? props.risks.map((risk) => <tr key={`${risk.channel}-${risk.name}`}><td><strong>{risk.name}</strong></td><td style={{ textTransform: "capitalize" }}>{risk.channel}</td><td>Below protected margin</td><td>Review price gap {risk.gap}</td><td><span style={{ color: "#C2410C", background: "#FFF7ED", borderRadius: 999, padding: "4px 8px", fontWeight: 750 }}>Review</span></td></tr>) : <tr><td colSpan={5} style={{ color: "var(--muted)", textAlign: "center", padding: 24 }}>No verified products are currently below the active margin floor.</td></tr>}
        </tbody></table></div>
      </section>
    </div>
  );
}

function Legend({ color, label, value }: { color: string; label: string; value: number }) { return <div style={{ display: "flex", alignItems: "center", gap: 8 }}><span style={{ width: 8, height: 8, borderRadius: 99, background: color }} /><span style={{ flex: 1, color: "var(--muted)" }}>{label}</span><strong>{value}</strong></div>; }
function Alert({ label, detail }: { label: string; detail: string }) { return <div className="exec-alert"><span className="exec-alert-icon"><AlertTriangle size={15} /></span><div><strong style={{ display: "block", fontSize: 11.5 }}>{label}</strong><span style={{ color: "var(--muted)", fontSize: 10.5 }}>{detail}</span></div><span style={{ color: "var(--muted)" }}>›</span></div>; }
const linkButton: CSSProperties = { border: 0, background: "transparent", color: "#C2410C", fontFamily: "inherit", fontSize: 11.5, fontWeight: 750, padding: "12px 0 0", cursor: "pointer" };
