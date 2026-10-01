import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  CircleDollarSign,
  ShieldCheck,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { TruthTrail, type TruthTrailStep } from "@/components/dashboard/TruthTrail";

type ChannelRow = { name: string; connected: boolean; termsReady: boolean };
type RiskRow = { name: string; channel: string; gap: string };
type TwinDimension = {
  key: string;
  gross_sales: number;
  net_revenue: number;
  fees: number;
  discounts: number;
  product_cost: number;
  contribution: number;
  orders: number;
  margin_pct: number | null;
};
type FilterOption = { value: string; label: string };
type FilterMetadata = { available?: { channels?: string[]; branches?: string[] } };
export type EconomicTwinSummary = {
  currency: string | null;
  gross_sales: number;
  net_revenue: number;
  fees: number;
  discounts: number;
  refunds: number;
  product_cost: number;
  contribution: number;
  contribution_margin_pct: number | null;
  expected_payout: number;
  actual_payout: number;
  variance: number;
  orders: number;
  recoverable_amount: number;
  by_channel: TwinDimension[];
  by_branch: TwinDimension[];
  by_sku: TwinDimension[];
};
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
  economicTwin?: EconomicTwinSummary | null;
  channels: ChannelRow[];
  risks: RiskRow[];
  onCatalog: () => void;
  onMargin: () => void;
  onRecovery: () => void;
  onAlerts: () => void;
  onIntegrations: () => void;
};
const money = (amount: number | null, currency: string) =>
  amount == null
    ? "Not calculated"
    : `${currency} ${amount.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
const channelColors = ["#10B981", "#4F8DF7", "#F47320", "#EF4444", "#8B5CF6", "#14B8A6"];

export function ExecutiveOverview(props: Props) {
  const [days, setDays] = useState(33),
    [platformFilter, setPlatformFilter] = useState(""),
    [branchFilter, setBranchFilter] = useState(""),
    [filteredTwin, setFilteredTwin] = useState<EconomicTwinSummary | null>(null),
    [filterMetadata, setFilterMetadata] = useState<FilterMetadata>({});
  useEffect(() => {
    const merchant_id = localStorage.getItem("ps_merchant_id") ?? "",
      access_code = localStorage.getItem("ps_access_code") ?? "";
    if (!merchant_id || !access_code) return;
    const controller = new AbortController();
    void fetch("/api/channels/connect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({
        merchant_id,
        access_code,
        platform: "profitability_trends",
        granularity: "month",
        dimension: "all",
        key: "",
      }),
    })
      .then((response) => (response.ok ? response.json() : null))
      .then((trends) => {
        if (trends?.available) setFilterMetadata({ available: trends.available });
      })
      .catch(() => {});
    return () => controller.abort();
  }, []);
  useEffect(() => {
    if (days === 33 && !platformFilter && !branchFilter) {
      setFilteredTwin(null);
      return;
    }
    const merchant_id = localStorage.getItem("ps_merchant_id") ?? "",
      access_code = localStorage.getItem("ps_access_code") ?? "";
    if (!merchant_id || !access_code) return;
    const controller = new AbortController();
    void fetch("/api/channels/connect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({
        merchant_id,
        access_code,
        platform: "dashboard_stats",
        days: String(days),
        platform_filter: platformFilter,
        branch_filter: branchFilter,
      }),
    })
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (data?.ok) setFilteredTwin(data.economic_twin as EconomicTwinSummary);
      })
      .catch(() => {});
    return () => controller.abort();
  }, [days, platformFilter, branchFilter]);
  const twin = filteredTwin ?? props.economicTwin,
    twinReady = Boolean(twin?.orders);
  const platformOptions = useMemo<FilterOption[]>(() => {
    const values = new Set<string>();
    for (const row of props.economicTwin?.by_channel ?? [])
      if (row.key && row.key !== "unassigned") values.add(row.key);
    for (const value of filterMetadata.available?.channels ?? [])
      if (value && value !== "unassigned") values.add(value);
    for (const channel of props.channels)
      if (channel.connected) values.add(channel.name.toLowerCase());
    return [...values]
      .sort((a, b) => a.localeCompare(b))
      .map((value) => ({
        value,
        label: value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase()),
      }));
  }, [filterMetadata.available?.channels, props.channels, props.economicTwin?.by_channel]);
  const branchOptions = useMemo<FilterOption[]>(() => {
    const values = new Set<string>();
    for (const row of props.economicTwin?.by_branch ?? [])
      if (row.key && row.key !== "unassigned") values.add(row.key);
    for (const value of filterMetadata.available?.branches ?? [])
      if (value && value !== "unassigned") values.add(value);
    return [...values]
      .sort((a, b) => a.localeCompare(b))
      .map((value) => ({
        value,
        label: value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase()),
      }));
  }, [filterMetadata.available?.branches, props.economicTwin?.by_branch]);
  const termsReady = props.channels.filter((c) => c.termsReady).length;
  const evidencePct = props.trackedProducts
    ? Math.round((props.verifiedCosts / props.trackedProducts) * 100)
    : 0;
  const missingPct = props.trackedProducts
    ? Math.round((props.missingCosts / props.trackedProducts) * 100)
    : 0;
  const currency = twin?.currency ?? props.currency;
  const contractReady = termsReady > 0;
  const supportedRecovery = twinReady && twin!.recoverable_amount > 0;
  const payoutNeedsReview = twinReady && twin!.variance < 0;
  const decision = supportedRecovery
    ? {
        eyebrow: "Supported recovery",
        title: "A supported recovery needs your review",
        value: money(twin!.recoverable_amount, currency),
        detail:
          "The amount is bounded by order, commercial-term, and payout evidence. No external action occurs without approval.",
        action: "Review recovery",
        onSelect: props.onRecovery,
        tone: "review",
      }
    : payoutNeedsReview
      ? {
          eyebrow: "Payout difference",
          title: "A payout difference needs more evidence",
          value: money(Math.abs(twin!.variance), currency),
          detail:
            "This difference is not presented as recoverable until order-level support is complete.",
          action: "Investigate payout",
          onSelect: props.onRecovery,
          tone: "review",
        }
      : twinReady
        ? {
            eyebrow: "Evidence-backed position",
            title: "No supported shortfall in this scope",
            value: money(twin!.actual_payout, currency),
            detail: "Review the retained evidence before making a payout or pricing decision.",
            action: "Review evidence",
            onSelect: props.onRecovery,
            tone: "verified",
          }
        : {
            eyebrow: "Evidence incomplete",
            title: "Complete the evidence chain to calculate what you kept",
            value: "Not calculated",
            detail:
              "Orders, approved terms, and payout evidence stay separate until each source is available.",
            action: props.trackedProducts ? "Add payout evidence" : "Connect catalog evidence",
            onSelect: props.trackedProducts ? props.onRecovery : props.onCatalog,
            tone: "missing",
          };
  const supportingMetrics = twinReady
    ? [
        {
          label: "Expected payout",
          value: money(twin!.expected_payout, currency),
          note: "Orders + approved terms",
          icon: CircleDollarSign,
          onSelect: props.onRecovery,
        },
        {
          label: "Contribution",
          value: money(twin!.contribution, currency),
          note: "After evidenced costs",
          icon: ShieldCheck,
          onSelect: props.onMargin,
        },
        {
          label: "Products below target",
          value: String(props.atRiskProducts),
          note: "Protected review only",
          icon: AlertTriangle,
          onSelect: props.onMargin,
        },
      ]
    : [
        {
          label: "Expected payout",
          value: money(props.expectedPayout, props.currency),
          note: "Not a confirmed discrepancy",
          icon: CircleDollarSign,
          onSelect: props.onRecovery,
        },
        {
          label: "Cost coverage",
          value: `${evidencePct}%`,
          note: `${props.missingCosts} products need evidence`,
          icon: CheckCircle2,
          onSelect: props.onCatalog,
        },
        {
          label: "Protected actions",
          value: String(props.confirmedActions),
          note: `${props.activeRules} active guardrail${props.activeRules === 1 ? "" : "s"}`,
          icon: ShieldCheck,
          onSelect: props.onAlerts,
        },
      ];
  const trailSteps: TruthTrailStep[] = [
    {
      id: "orders",
      label: "Orders",
      detail: twinReady
        ? `${twin!.orders.toLocaleString()} in scope`
        : "No order evidence in scope",
      status: twinReady ? "verified" : "missing",
      onSelect: props.onRecovery,
    },
    {
      id: "terms",
      label: "Terms",
      detail: contractReady
        ? `${termsReady} channel${termsReady === 1 ? "" : "s"} ready`
        : "Commercial terms needed",
      status: contractReady ? "verified" : "missing",
      onSelect: props.onIntegrations,
    },
    {
      id: "expected",
      label: "Expected",
      detail:
        twinReady && contractReady
          ? money(twin!.expected_payout, currency)
          : "Waiting for orders and terms",
      status: twinReady && contractReady ? "verified" : "missing",
      onSelect: props.onRecovery,
    },
    {
      id: "payout",
      label: "Payout",
      detail: twinReady ? money(twin!.actual_payout, currency) : "Settlement evidence needed",
      status: twinReady ? "verified" : "missing",
      onSelect: props.onRecovery,
    },
    {
      id: "finding",
      label: "Finding",
      detail: supportedRecovery
        ? money(twin!.recoverable_amount, currency)
        : twinReady
          ? "No supported shortfall"
          : "Not calculated",
      status:
        supportedRecovery || payoutNeedsReview ? "review" : twinReady ? "verified" : "missing",
      onSelect: props.onRecovery,
    },
    {
      id: "approval",
      label: "Approval",
      detail: supportedRecovery ? "Merchant review required" : "No protected action queued",
      status: supportedRecovery ? "review" : "optional",
      onSelect: supportedRecovery ? props.onRecovery : undefined,
    },
    {
      id: "receipt",
      label: "Receipt",
      detail: "Not recorded in this summary",
      status: "missing",
      onSelect: props.onAlerts,
    },
  ];
  return (
    <div className="exec-overview">
      <style>{`
      .exec-overview{display:grid;gap:16px;font-family:inherit}.exec-decision{display:grid;grid-template-columns:minmax(0,1.55fr) minmax(300px,.8fr);gap:24px;padding:24px;background:linear-gradient(135deg,var(--surface) 0%,color-mix(in srgb,var(--surface) 93%,#F36A21) 100%);border:1px solid var(--border);border-radius:14px;box-shadow:0 18px 45px -34px rgba(15,31,61,.7);position:relative;overflow:hidden}.exec-decision:before{content:"";position:absolute;inset-inline-start:0;top:0;bottom:0;width:4px;background:var(--accent)}.exec-decision-copy{align-self:center;max-width:720px}.exec-eyebrow{font-size:10px;line-height:1.2;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:#B84D15}.exec-decision h1{font-size:clamp(24px,3vw,36px);line-height:1.12;letter-spacing:-.045em;margin:8px 0 0;color:var(--text);max-width:760px}.exec-decision-detail{max-width:650px;font-size:12px;line-height:1.55;color:var(--muted);margin:10px 0 0}.exec-decision-side{display:grid;align-content:center;justify-items:start;padding:18px;border:1px solid var(--border);border-radius:12px;background:color-mix(in srgb,var(--surface) 88%,transparent)}.exec-decision-state{font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.05em;color:var(--muted)}.exec-decision-value{font-size:27px;line-height:1.1;font-weight:800;letter-spacing:-.04em;font-variant-numeric:tabular-nums;color:var(--text);margin-top:7px}.exec-primary{display:inline-flex;align-items:center;justify-content:center;gap:8px;margin-top:16px;min-height:40px;border:0;border-radius:8px;background:var(--accent);color:white;padding:10px 14px;font:750 11px inherit;cursor:pointer;box-shadow:0 8px 18px -12px rgba(202,74,14,.8)}.exec-primary:hover{filter:brightness(.96)}.exec-supporting{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}.exec-support-card{display:grid;grid-template-columns:34px minmax(0,1fr);gap:10px;align-items:center;padding:14px;text-align:start;color:var(--text);cursor:pointer}.exec-support-icon{width:34px;height:34px;border-radius:9px;display:grid;place-items:center;background:var(--surface2);color:var(--muted)}.exec-support-label{font-size:9.5px;color:var(--muted);font-weight:800;text-transform:uppercase;letter-spacing:.04em}.exec-support-value{font-size:17px;font-weight:800;letter-spacing:-.025em;font-variant-numeric:tabular-nums;margin-top:2px}.exec-support-note{font-size:9.5px;color:var(--muted);margin-top:2px}
      .exec-card,.exec-panel{background:var(--surface);border:1px solid var(--border);border-radius:12px;box-shadow:var(--shadow)}
      .exec-grid{display:grid;grid-template-columns:1.05fr 1.45fr 1.05fr .9fr;gap:14px;align-items:stretch}.exec-lower{display:grid;grid-template-columns:1.55fr 1fr;gap:14px}.exec-panel{padding:18px;min-width:0;overflow:hidden}.exec-grid>.exec-panel{min-height:274px;box-sizing:border-box}.exec-panel h2{font-size:14px;font-weight:750;letter-spacing:-.018em;line-height:1.3;margin:0;color:var(--text)}.exec-sub{font-size:10.5px;color:var(--muted);margin-top:4px;line-height:1.5}.exec-panel-head{display:flex;align-items:center;justify-content:space-between;gap:12px}
      .exec-health{display:flex;align-items:center;gap:13px;margin-top:17px}.exec-donut{width:118px;height:118px;border-radius:50%;display:grid;place-items:center;flex:0 0 auto;position:relative}.exec-donut:after{content:"";width:76px;height:76px;border-radius:50%;background:var(--surface);position:absolute}.exec-donut-value{position:relative;z-index:1;text-align:center;font-size:20px;font-weight:800;color:var(--text)}.exec-donut-value small{display:block;font-size:8px;color:var(--muted);font-weight:700;text-transform:uppercase;margin-top:2px}
      .exec-legend{display:flex;align-items:center;gap:8px;font-size:10.5px;line-height:1.35}.exec-legend i{width:7px;height:7px;border-radius:50%;flex:0 0 auto}.exec-legend span{flex:1;color:var(--muted)}
      .exec-channel-bars{height:181px;display:flex;align-items:end;gap:9px;padding:17px 4px 0;border-bottom:1px solid var(--border);background:repeating-linear-gradient(to top,transparent 0,transparent 44px,var(--border) 45px)}.exec-channel-column{height:100%;display:flex;flex:1;min-width:0;flex-direction:column;justify-content:end;align-items:center;gap:5px}.exec-channel-column strong{font-size:10px;font-variant-numeric:tabular-nums}.exec-channel-bar{width:min(34px,72%);min-height:3px;border-radius:5px 5px 0 0}.exec-channel-column span{font-size:9px;text-transform:capitalize;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
      .exec-leakage{display:flex;align-items:center;gap:12px;margin-top:14px}.exec-leakage .exec-donut{width:108px;height:108px}.exec-leakage .exec-donut:after{width:68px;height:68px}.exec-alert{display:grid;grid-template-columns:30px 1fr auto;gap:9px;align-items:center;padding:10px 0;border-bottom:1px solid var(--border)}.exec-alert-icon{width:30px;height:30px;border-radius:9px;display:grid;place-items:center;background:#FFF7ED;color:#EA580C}.exec-alert strong{display:block;font-size:10.5px;line-height:1.35}.exec-alert small{color:var(--muted);font-size:9.5px;line-height:1.35}
      .exec-table{overflow:auto}.exec-table table{width:100%;border-collapse:collapse;min-width:650px}.exec-table th{font-size:9.5px;text-transform:uppercase;letter-spacing:.04em;color:var(--muted);font-weight:750;text-align:start;padding:10px 12px;background:var(--surface2)}.exec-table td{font-size:11px;padding:11px 12px;border-top:1px solid var(--border)}.exec-integrations>div{display:grid;grid-template-columns:1fr auto auto;gap:8px;align-items:center;border-top:1px solid var(--border);padding:8px 0;font-size:10.5px}.exec-integrations b{text-transform:capitalize}.exec-integrations .connected{color:#059669}.exec-integrations .manual{color:var(--muted)}.exec-link{border:0;background:transparent;color:#2563EB;font-family:inherit;font-size:10.5px;font-weight:750;padding:9px 0 0;cursor:pointer}
      .exec-dimensions{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}.exec-dimension-row{display:grid;grid-template-columns:minmax(0,1fr) auto auto;gap:10px;padding:9px 0;border-top:1px solid var(--border);font-size:10.5px;align-items:center}.exec-dimension-row b{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;text-transform:capitalize}.exec-dimension-row span{font-variant-numeric:tabular-nums}.exec-dimension-row .negative{color:#B42318}.exec-dimension-row .positive{color:#087F5B}
      .exec-filters{display:flex;gap:8px;flex-wrap:wrap;align-items:center}.exec-filters select{min-height:36px;border:1px solid var(--border);border-radius:8px;background:var(--surface2);color:var(--text);padding:8px 28px 8px 10px;font:650 10.5px inherit}
      @media(max-width:1250px){.exec-grid{grid-template-columns:1fr 1fr}.exec-grid>.exec-panel{min-height:250px}.exec-lower{grid-template-columns:1fr}}@media(max-width:900px){.exec-decision{grid-template-columns:1fr}.exec-dimensions{grid-template-columns:1fr}}@media(max-width:700px){.exec-supporting{grid-template-columns:1fr}.exec-grid{grid-template-columns:1fr}.exec-health{align-items:flex-start;flex-direction:column}.exec-donut{align-self:center}.exec-link{min-height:44px;display:inline-flex;align-items:center}.exec-alert{min-height:48px}.exec-decision{padding:20px}.exec-primary{width:100%;min-height:44px}}@media(max-width:420px){.exec-panel{padding:14px}.exec-channel-bars{gap:6px}}
      .exec-overview button:focus-visible{outline:2px solid var(--accent);outline-offset:2px}
      @media(prefers-reduced-motion:reduce){.exec-overview *{animation-duration:.01ms!important;animation-iteration-count:1!important;transition-duration:.01ms!important}}
    `}</style>
      <section className="exec-decision" aria-labelledby="overview-decision-title">
        <div className="exec-decision-copy">
          <div className="exec-eyebrow">{decision.eyebrow}</div>
          <h1 id="overview-decision-title">{decision.title}</h1>
          <p className="exec-decision-detail">{decision.detail}</p>
        </div>
        <div className="exec-decision-side">
          <span className="exec-decision-state">
            {decision.tone === "verified"
              ? "Evidence-backed"
              : decision.tone === "review"
                ? "Review required"
                : "Insufficient evidence"}
          </span>
          <strong className="exec-decision-value">{decision.value}</strong>
          <button type="button" className="exec-primary" onClick={decision.onSelect}>
            {decision.action}
            <ArrowRight size={14} aria-hidden="true" />
          </button>
        </div>
      </section>
      <div className="exec-supporting" aria-label="Supporting financial indicators">
        {supportingMetrics.map(({ label, value, note, icon: Icon, onSelect }) => (
          <button
            key={label}
            type="button"
            className="exec-card exec-support-card"
            onClick={onSelect}
            aria-label={`${label}: ${value}. ${note}`}
          >
            <span className="exec-support-icon">
              <Icon size={15} aria-hidden="true" />
            </span>
            <span>
              <span className="exec-support-label">{label}</span>
              <span className="exec-support-value" style={{ display: "block" }}>
                {value}
              </span>
              <span className="exec-support-note" style={{ display: "block" }}>
                {note}
              </span>
            </span>
          </button>
        ))}
      </div>
      <section className="exec-panel">
        <div className="exec-panel-head">
          <div>
            <h2>Financial scope</h2>
            <div className="exec-sub">
              Recalculate every executive metric and profitability table from the selected Economic
              Twin evidence.
            </div>
          </div>
          <div className="exec-filters">
            <select
              aria-label="Date range"
              value={days}
              onChange={(event) => setDays(Number(event.target.value))}
            >
              <option value={7}>Last 7 days</option>
              <option value={33}>Last 33 days</option>
              <option value={90}>Last 90 days</option>
              <option value={365}>Last 365 days</option>
            </select>
            <select
              aria-label="Platform filter"
              value={platformFilter}
              onChange={(event) => setPlatformFilter(event.target.value)}
            >
              <option value="">All platforms</option>
              {platformOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <select
              aria-label="Branch filter"
              value={branchFilter}
              onChange={(event) => setBranchFilter(event.target.value)}
            >
              <option value="">All branches</option>
              {branchOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>
      <TruthTrail steps={trailSteps} />
      <div className="exec-grid">
        <section className="exec-panel">
          <div className="exec-panel-head">
            <div>
              <h2>Catalog Health</h2>
              <div className="exec-sub">Cost evidence across imported products</div>
            </div>
            <button className="exec-link" onClick={props.onCatalog}>
              View details →
            </button>
          </div>
          <div className="exec-health">
            <div
              className="exec-donut"
              style={{
                background: props.trackedProducts
                  ? `conic-gradient(#10B981 0 ${evidencePct}%,#4F8DF7 ${evidencePct}% ${Math.min(100, evidencePct + Math.max(2, Math.round((props.atRiskProducts / Math.max(1, props.trackedProducts)) * 100)))}%,#F47320 0 100%)`
                  : "var(--surface2)",
              }}
            >
              <div className="exec-donut-value">
                {props.trackedProducts.toLocaleString()}
                <small>Total items</small>
              </div>
            </div>
            <div style={{ flex: 1, display: "grid", gap: 9 }}>
              <Legend color="#10B981" label="Confirmed costs" value={props.verifiedCosts} />
              <Legend color="#4F8DF7" label="Below target" value={props.atRiskProducts} />
              <Legend color="#F47320" label="Missing evidence" value={props.missingCosts} />
            </div>
          </div>
        </section>
        <section className="exec-panel">
          <div className="exec-panel-head">
            <div>
              <h2>Margin by Channel</h2>
              <div className="exec-sub">
                {twinReady
                  ? "Normalized contribution margin"
                  : "Evidence readiness for protected-margin decisions"}
              </div>
            </div>
            <button className="exec-link" onClick={props.onMargin}>
              True margin %
            </button>
          </div>
          <div className="exec-channel-bars">
            {(twinReady
              ? twin!.by_channel
                  .slice(0, 6)
                  .map((row) => ({ name: row.key, value: row.margin_pct ?? 0 }))
              : props.channels.slice(0, 6).map((channel) => ({
                  name: channel.name,
                  value:
                    channel.connected && channel.termsReady
                      ? 100
                      : channel.connected
                        ? 60
                        : channel.termsReady
                          ? 35
                          : 8,
                }))
            ).map((channel, index) => (
              <div className="exec-channel-column" key={channel.name}>
                <strong>{channel.value.toFixed(1)}%</strong>
                <div
                  className="exec-channel-bar"
                  style={{
                    height: `${Math.max(3, Math.min(100, Math.abs(channel.value)))}%`,
                    background: channelColors[index % channelColors.length],
                  }}
                />
                <span>{channel.name}</span>
              </div>
            ))}
          </div>
        </section>
        <section className="exec-panel">
          <div className="exec-panel-head">
            <div>
              <h2>Margin & pricing readiness</h2>
              <div className="exec-sub">Product-cost coverage for reliable margin decisions</div>
            </div>
          </div>
          <div className="exec-leakage">
            <div
              className="exec-donut"
              style={{
                background:
                  props.missingCosts + props.atRiskProducts
                    ? `conic-gradient(#3159C9 0 ${100 - missingPct}%,#F47320 0 100%)`
                    : "var(--surface2)",
              }}
            >
              <div className="exec-donut-value">
                {props.missingCosts + props.atRiskProducts}
                <small>Need review</small>
              </div>
            </div>
            <div style={{ flex: 1, display: "grid", gap: 9 }}>
              <Legend color="#3159C9" label="Costs verified" value={props.verifiedCosts} />
              <Legend color="#F47320" label="Costs missing" value={props.missingCosts} />
              <Legend color="#8B5CF6" label="Below margin target" value={props.atRiskProducts} />
            </div>
          </div>
        </section>
        <section className="exec-panel">
          <div className="exec-panel-head">
            <div>
              <h2>Top Alerts</h2>
              <div className="exec-sub">Merchant attention queue</div>
            </div>
            <button className="exec-link" onClick={props.onAlerts}>
              View all →
            </button>
          </div>
          <Alert label="Cost evidence missing" detail={`${props.missingCosts} products`} />
          <Alert label="Low-margin products" detail={`${props.atRiskProducts} products`} />
          <Alert
            label="Commercial terms needed"
            detail={`${props.channels.length - termsReady} channels`}
          />
        </section>
      </div>
      <div className="exec-lower">
        <section className="exec-panel" style={{ padding: 0, minHeight: 210 }}>
          <div
            style={{
              padding: "13px 14px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div>
              <h2>Catalog Action Queue</h2>
              <div className="exec-sub">Verified products ranked by protected-margin gap</div>
            </div>
            <button className="exec-link" onClick={props.onCatalog}>
              View all →
            </button>
          </div>
          <div className="exec-table">
            <table>
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Channel</th>
                  <th>Issue</th>
                  <th>Recommendation</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {props.risks.length ? (
                  props.risks.slice(0, 5).map((risk) => (
                    <tr key={`${risk.channel}-${risk.name}`}>
                      <td>
                        <strong>{risk.name}</strong>
                      </td>
                      <td style={{ textTransform: "capitalize" }}>{risk.channel}</td>
                      <td>Below protected margin</td>
                      <td>Review price gap {risk.gap}</td>
                      <td>
                        <span
                          style={{
                            color: "#C2410C",
                            background: "#FFF7ED",
                            borderRadius: 999,
                            padding: "3px 7px",
                            fontWeight: 750,
                          }}
                        >
                          Review
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={5}
                      style={{ color: "var(--muted)", textAlign: "center", padding: 22 }}
                    >
                      No verified products are currently below the active margin floor.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
        <section className="exec-panel" style={{ minHeight: 210 }}>
          <div className="exec-panel-head">
            <div>
              <h2>Integrations Status</h2>
              <div className="exec-sub">Source access and agreement readiness</div>
            </div>
            <CheckCircle2 size={15} color="#059669" />
          </div>
          <div className="exec-integrations" style={{ marginTop: 10 }}>
            {props.channels.slice(0, 6).map((channel) => (
              <div key={channel.name}>
                <b>{channel.name}</b>
                <span className={channel.connected ? "connected" : "manual"}>
                  {channel.connected ? "Connected" : "Manual evidence"}
                </span>
                <span style={{ color: channel.termsReady ? "#059669" : "#EA580C" }}>
                  {channel.termsReady ? "Terms ready" : "Terms needed"}
                </span>
              </div>
            ))}
          </div>
          <button type="button" onClick={props.onIntegrations} className="exec-link">
            View integration health →
          </button>
        </section>
      </div>
      {twinReady && (
        <div className="exec-dimensions">
          <Dimension
            title="Platform profitability"
            rows={twin!.by_channel}
            currency={twin!.currency ?? props.currency}
          />
          <Dimension
            title="Branch profitability"
            rows={twin!.by_branch}
            currency={twin!.currency ?? props.currency}
          />
          <Dimension
            title="SKU profitability"
            rows={twin!.by_sku}
            currency={twin!.currency ?? props.currency}
          />
        </div>
      )}
    </div>
  );
}

function Legend({ color, label, value }: { color: string; label: string; value: number }) {
  return (
    <div className="exec-legend">
      <i style={{ background: color }} />
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
function Dimension({
  title,
  rows,
  currency,
}: {
  title: string;
  rows: TwinDimension[];
  currency: string;
}) {
  return (
    <section className="exec-panel">
      <div className="exec-panel-head">
        <div>
          <h2>{title}</h2>
          <div className="exec-sub">
            Normalized Economic Twin · contribution after evidenced costs
          </div>
        </div>
      </div>
      <div style={{ marginTop: 10 }}>
        {rows.length ? (
          rows.slice(0, 8).map((row) => (
            <div className="exec-dimension-row" key={row.key}>
              <b title={row.key}>{row.key}</b>
              <span>{money(row.contribution, currency)}</span>
              <span className={(row.margin_pct ?? 0) < 0 ? "negative" : "positive"}>
                {row.margin_pct == null ? "Cost needed" : `${row.margin_pct.toFixed(1)}%`}
              </span>
            </div>
          ))
        ) : (
          <div style={{ padding: "18px 0", fontSize: 11, color: "var(--muted)" }}>
            No normalized dimension data yet.
          </div>
        )}
      </div>
    </section>
  );
}
function Alert({ label, detail }: { label: string; detail: string }) {
  return (
    <div className="exec-alert">
      <span className="exec-alert-icon">
        <AlertTriangle size={13} />
      </span>
      <div>
        <strong>{label}</strong>
        <small>{detail}</small>
      </div>
      <span style={{ color: "var(--muted)" }}>›</span>
    </div>
  );
}
