import { useState } from "react";
import { AlertTriangle, AlertCircle, Info, ChevronDown, ChevronUp } from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceArea,
} from "recharts";
import type { Finding, LedgerRow, CrossCheckWindow } from "@/lib/commission-audit";
import { SEVERITY_ORDER, summarizeAudit } from "@/lib/commission-audit";

const thStyle = {
  fontSize: 11,
  textTransform: "uppercase" as const,
  fontWeight: 600,
  color: "var(--muted)",
  padding: "10px 12px",
  borderBottom: "1px solid var(--border)",
  letterSpacing: "0.04em",
};

const tdStyle = {
  padding: "12px",
  fontSize: 13,
  color: "var(--text)",
  borderBottom: "1px solid var(--border)",
};

const SEVERITY_COLOR: Record<Finding["severity"], string> = {
  critical: "#DC2626",
  warning: "#B45309",
  info: "#3B82F6",
};

function SeverityIcon({ severity, size = 15 }: { severity: Finding["severity"]; size?: number }) {
  const color = SEVERITY_COLOR[severity];
  if (severity === "critical") return <AlertCircle size={size} color={color} style={{ flexShrink: 0 }} />;
  if (severity === "warning") return <AlertTriangle size={size} color={color} style={{ flexShrink: 0 }} />;
  return <Info size={size} color={color} style={{ flexShrink: 0 }} />;
}

function fmt(n: number, currency: string): string {
  return `${currency} ${Math.round(n).toLocaleString("en-US")}`;
}

// Compact "Jun 19" form (no year — the coverage sentence above already
// states the full range with year) for the chart axis, ledger table, and
// peak/lowest-day cards, so dates read like a calendar, not a raw ISO key.
function shortDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
}

const chip = {
  fontSize: 10.5,
  fontWeight: 600,
  color: "var(--muted)",
  background: "var(--surface2)",
  border: "1px solid var(--border)",
  borderRadius: 6,
  padding: "3px 8px",
  whiteSpace: "nowrap" as const,
};

const statCard = {
  background: "var(--surface)",
  border: "1px solid var(--border)",
  borderRadius: 10,
  padding: "11px 13px",
  display: "flex",
  flexDirection: "column" as const,
  gap: 4,
};

export type CommissionAuditResult = {
  ledger: LedgerRow[];
  ledgerTotals: LedgerRow | null;
  findings: Finding[];
  coverage: { start: string; end: string } | null;
  crossCheckWindows?: CrossCheckWindow[];
};

export function CommissionAuditPanel({
  result,
  currency,
  documentCount = 1,
}: {
  result: CommissionAuditResult;
  currency: string;
  documentCount?: number;
}) {
  const [downloading, setDownloading] = useState(false);
  const [ledgerExpanded, setLedgerExpanded] = useState(false);

  const summary = summarizeAudit(result, documentCount);
  const sortedFindings = [...result.findings].sort(
    (a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity] || (b.amount ?? 0) - (a.amount ?? 0),
  );
  const topFinding = summary.topFinding && summary.topFinding.severity !== "info" ? summary.topFinding : null;

  const handleDownload = async () => {
    if (downloading) return;
    setDownloading(true);
    try {
      const { exportCommissionAuditPdf } = await import("./exportAuditReportPdf");
      await exportCommissionAuditPdf(result, currency, documentCount);
    } catch (err) {
      console.error("Commission audit PDF export failed:", err);
    } finally {
      setDownloading(false);
    }
  };

  const chartData = result.ledger.map(r => ({
    date: shortDate(r.date),
    sales: r.sales,
    commission: r.commission_at_agreed_rate,
  }));

  const hasLedger = result.ledger.length > 0;
  const sortedBySales = hasLedger ? [...result.ledger].sort((a, b) => a.sales - b.sales) : [];
  const lowestDay = sortedBySales[0];
  const peakDay = sortedBySales[sortedBySales.length - 1];
  const avgSales = hasLedger ? result.ledger.reduce((s, r) => s + r.sales, 0) / result.ledger.length : 0;
  const showOutliers = result.ledger.length >= 5 && lowestDay && peakDay && lowestDay.date !== peakDay.date;

  const heroBg = summary.criticalCount > 0
    ? "color-mix(in srgb,#DC2626 6%,var(--surface))"
    : summary.warningCount > 0
    ? "color-mix(in srgb,#B45309 6%,var(--surface))"
    : "color-mix(in srgb,#22C55E 6%,var(--surface))";
  const heroBorder = summary.criticalCount > 0
    ? "color-mix(in srgb,#DC2626 22%,transparent)"
    : summary.warningCount > 0
    ? "color-mix(in srgb,#B45309 22%,transparent)"
    : "color-mix(in srgb,#22C55E 22%,transparent)";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      {/* Executive summary hero */}
      <div style={{ background: heroBg, border: `1px solid ${heroBorder}`, borderRadius: 14, padding: "22px 24px", display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 6, flex: 1, minWidth: 260 }}>
            <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.06em", color: "var(--muted)" }}>
              Commission Audit
            </span>
            <span style={{ fontSize: 16, fontWeight: 700, color: "var(--text)", lineHeight: 1.45 }}>
              {summary.headline}
            </span>
          </div>
          <button type="button" onClick={handleDownload} disabled={downloading}
            style={{ cursor: downloading ? "not-allowed" : "pointer", fontFamily: "inherit", fontSize: 12.5,
              fontWeight: 600, color: "var(--text)", background: "var(--surface)",
              border: "1px solid var(--border)", borderRadius: 8, padding: "7px 12px",
              opacity: downloading ? 0.6 : 1, display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
              strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            {downloading ? "Preparing…" : "Download Audit Report"}
          </button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(120px,1fr))", gap: 10 }}>
          {[
            { label: "Documents", value: String(summary.documentCount) },
            { label: "Days Covered", value: String(summary.daysCovered) },
            { label: "Total Orders", value: summary.totalOrders.toLocaleString("en-US") },
            { label: "Total Sales", value: fmt(summary.totalSales, currency) },
            { label: "Commission (Agreed)", value: fmt(summary.totalCommissionAtAgreed, currency) },
            { label: "Commission / Order", value: summary.commissionPerOrder != null ? `${currency} ${summary.commissionPerOrder.toFixed(2)}` : "—" },
            { label: "Expected Net", value: fmt(summary.totalExpectedNet, currency), accent: true },
          ].map(kpi => (
            <div key={kpi.label} style={statCard}>
              <span style={{ fontSize: 10.5, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase" as const, letterSpacing: "0.03em" }}>{kpi.label}</span>
              <span style={{ fontSize: 15.5, fontWeight: 800, color: kpi.accent ? "#22C55E" : "var(--text)", fontVariantNumeric: "tabular-nums" }}>{kpi.value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Top finding callout — the one thing to look at first */}
      {topFinding && (
        <div style={{ background: `color-mix(in srgb,${SEVERITY_COLOR[topFinding.severity]} 7%,var(--surface))`,
          border: `1px solid color-mix(in srgb,${SEVERITY_COLOR[topFinding.severity]} 30%,transparent)`,
          borderRadius: 12, padding: "16px 20px", display: "flex", gap: 14, alignItems: "flex-start" }}>
          <SeverityIcon severity={topFinding.severity} size={20} />
          <div style={{ display: "flex", flexDirection: "column", gap: 4, flex: 1, minWidth: 0 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: SEVERITY_COLOR[topFinding.severity], textTransform: "uppercase" as const, letterSpacing: "0.04em" }}>
              {topFinding.severity === "critical" ? "Top priority" : "Worth reviewing"}
            </span>
            <span style={{ fontSize: 14.5, fontWeight: 700, color: "var(--text)" }}>{topFinding.title}</span>
            <span style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.6 }}>{topFinding.detail}</span>
          </div>
          {topFinding.amount != null && (
            <span style={{ fontSize: 21, fontWeight: 800, color: SEVERITY_COLOR[topFinding.severity], fontVariantNumeric: "tabular-nums", flexShrink: 0 }}>
              {fmt(topFinding.amount, currency)}
            </span>
          )}
        </div>
      )}

      {/* Findings table */}
      {sortedFindings.length > 0 && (
        <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: "18px 20px" }}>
          <div style={{ fontSize: 13.5, fontWeight: 700, color: "var(--text)", marginBottom: 12 }}>
            All Findings ({sortedFindings.length})
          </div>
          <div className="table-scroll">
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 620 }}>
              <thead>
                <tr>
                  <th style={{ ...thStyle, textAlign: "center", width: 30 }}></th>
                  <th style={{ ...thStyle, textAlign: "start" }}>Finding</th>
                  <th style={{ ...thStyle, textAlign: "end" }}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {sortedFindings.map((f, i) => (
                  <tr key={f.id} style={{ background: i % 2 === 0 ? "transparent" : "var(--surface2)" }}>
                    <td style={{ ...tdStyle, textAlign: "center" }}>
                      <SeverityIcon severity={f.severity} />
                    </td>
                    <td style={tdStyle}>
                      <div style={{ fontWeight: 600 }}>{f.title}</div>
                      <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 3, lineHeight: 1.5 }}>{f.detail}</div>
                      {!!f.trace?.checkedColumns?.length && (
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 7 }}>
                          <span style={{ ...chip, background: "transparent", border: "none", padding: "3px 0", color: "var(--muted)", fontWeight: 700 }}>Checked:</span>
                          {f.trace.checkedColumns.map(c => (
                            <span key={c.label} style={chip}>{c.label}: {fmt(c.value, currency)}</span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td style={{ ...tdStyle, textAlign: "end", fontWeight: 600, fontVariantNumeric: "tabular-nums", color: f.amount != null ? SEVERITY_COLOR[f.severity] : "var(--muted)" }}>
                      {f.amount != null ? fmt(f.amount, currency) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Chart + daily ledger */}
      {result.ledger.length > 0 && (
        <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: "18px 20px" }}>
          <div style={{ fontSize: 13.5, fontWeight: 700, color: "var(--text)", marginBottom: 4 }}>Daily Ledger</div>
          <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 12 }}>
            Per-day sales against the agreed commission rate
            {!!result.crossCheckWindows?.length && (
              <>
                {" · "}shaded region{result.crossCheckWindows.length > 1 ? "s" : ""} show{result.crossCheckWindows.length > 1 ? "" : "s"} the period cross-checked against a statement
              </>
            )}
          </div>

          <div style={{ height: 220, marginBottom: 16 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="date" tick={{ fontSize: 10.5, fill: "var(--muted)" }} axisLine={{ stroke: "var(--border)" }} tickLine={false} minTickGap={24} />
                <YAxis tick={{ fontSize: 11, fill: "var(--muted)" }} axisLine={false} tickLine={false} width={48} />
                <Tooltip contentStyle={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }} labelStyle={{ color: "var(--text)", fontWeight: 600 }} />
                {(result.crossCheckWindows ?? []).map((w, i) => (
                  <ReferenceArea key={i} x1={shortDate(w.start)} x2={shortDate(w.end)} fill={w.matched ? "#22C55E" : "#F59E0B"} fillOpacity={0.09} strokeOpacity={0} />
                ))}
                <Line type="monotone" dataKey="sales" name="Sales" stroke="#3B82F6" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="commission" name="Commission (agreed rate)" stroke="#EA580C" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div style={{ display: "flex", gap: 20, marginBottom: 16, flexWrap: "wrap" }}>
            {[["#3B82F6", "Sales"], ["#EA580C", "Commission (agreed rate)"]].map(([color, label]) => (
              <div key={label} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: color, display: "inline-block" }} />
                <span style={{ fontSize: 12, color: "var(--muted)" }}>{label}</span>
              </div>
            ))}
          </div>

          {showOutliers && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))", gap: 10, marginBottom: 14 }}>
              <div style={statCard}>
                <span style={{ fontSize: 10.5, fontWeight: 700, color: "#22C55E", textTransform: "uppercase" as const, letterSpacing: "0.03em" }}>Peak day</span>
                <span style={{ fontSize: 14, fontWeight: 700, color: "var(--text)" }}>{shortDate(peakDay.date)}</span>
                <span style={{ fontSize: 12.5, color: "var(--muted)", fontVariantNumeric: "tabular-nums" }}>{fmt(peakDay.sales, currency)} · {peakDay.orders} orders</span>
              </div>
              <div style={statCard}>
                <span style={{ fontSize: 10.5, fontWeight: 700, color: "#B45309", textTransform: "uppercase" as const, letterSpacing: "0.03em" }}>Lowest day</span>
                <span style={{ fontSize: 14, fontWeight: 700, color: "var(--text)" }}>{shortDate(lowestDay.date)}</span>
                <span style={{ fontSize: 12.5, color: "var(--muted)", fontVariantNumeric: "tabular-nums" }}>{fmt(lowestDay.sales, currency)} · {lowestDay.orders} orders</span>
              </div>
              <div style={statCard}>
                <span style={{ fontSize: 10.5, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase" as const, letterSpacing: "0.03em" }}>Average day</span>
                <span style={{ fontSize: 14, fontWeight: 700, color: "var(--text)" }}>{fmt(avgSales, currency)}</span>
                <span style={{ fontSize: 12.5, color: "var(--muted)" }}>across {result.ledger.length} days</span>
              </div>
            </div>
          )}

          <button type="button" onClick={() => setLedgerExpanded(v => !v)}
            style={{ cursor: "pointer", fontFamily: "inherit", fontSize: 12.5, fontWeight: 700, color: "var(--text)",
              background: "var(--surface2)", border: "1px solid var(--border)", borderRadius: 8, padding: "8px 14px",
              display: "flex", alignItems: "center", gap: 6, marginBottom: ledgerExpanded ? 12 : 0 }}>
            {ledgerExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            {ledgerExpanded ? "Hide day-by-day ledger" : `View full day-by-day ledger (${result.ledger.length} days)`}
          </button>

          {ledgerExpanded && (
            <div className="table-scroll">
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 560 }}>
                <thead>
                  <tr>
                    <th style={{ ...thStyle, textAlign: "start" }}>Date</th>
                    <th style={{ ...thStyle, textAlign: "end" }}>Orders</th>
                    <th style={{ ...thStyle, textAlign: "end" }}>Sales</th>
                    <th style={{ ...thStyle, textAlign: "end" }}>Commission (agreed)</th>
                    <th style={{ ...thStyle, textAlign: "end" }}>Expected Net</th>
                  </tr>
                </thead>
                <tbody>
                  {result.ledger.map((r, i) => (
                    <tr key={r.date} style={{ background: i % 2 === 0 ? "transparent" : "var(--surface2)" }}>
                      <td style={tdStyle}>
                        {shortDate(r.date)}
                        {showOutliers && r.date === peakDay.date && <span style={{ ...chip, marginInlineStart: 8, color: "#22C55E", borderColor: "color-mix(in srgb,#22C55E 40%,transparent)" }}>Peak day</span>}
                        {showOutliers && r.date === lowestDay.date && <span style={{ ...chip, marginInlineStart: 8, color: "#B45309", borderColor: "color-mix(in srgb,#B45309 40%,transparent)" }}>Lowest day</span>}
                      </td>
                      <td style={{ ...tdStyle, textAlign: "end", fontVariantNumeric: "tabular-nums" }}>{r.orders}</td>
                      <td style={{ ...tdStyle, textAlign: "end", fontVariantNumeric: "tabular-nums" }}>{fmt(r.sales, currency)}</td>
                      <td style={{ ...tdStyle, textAlign: "end", fontVariantNumeric: "tabular-nums" }}>{fmt(r.commission_at_agreed_rate, currency)}</td>
                      <td style={{ ...tdStyle, textAlign: "end", fontVariantNumeric: "tabular-nums", fontWeight: 600 }}>{fmt(r.expected_net, currency)}</td>
                    </tr>
                  ))}
                </tbody>
                {result.ledgerTotals && (
                  <tfoot>
                    <tr>
                      <td style={{ ...tdStyle, borderBottom: "none", fontWeight: 800 }}>Total</td>
                      <td style={{ ...tdStyle, borderBottom: "none", textAlign: "end", fontWeight: 800, fontVariantNumeric: "tabular-nums" }}>{result.ledgerTotals.orders}</td>
                      <td style={{ ...tdStyle, borderBottom: "none", textAlign: "end", fontWeight: 800, fontVariantNumeric: "tabular-nums" }}>{fmt(result.ledgerTotals.sales, currency)}</td>
                      <td style={{ ...tdStyle, borderBottom: "none", textAlign: "end", fontWeight: 800, fontVariantNumeric: "tabular-nums" }}>{fmt(result.ledgerTotals.commission_at_agreed_rate, currency)}</td>
                      <td style={{ ...tdStyle, borderBottom: "none", textAlign: "end", fontWeight: 800, fontVariantNumeric: "tabular-nums" }}>{fmt(result.ledgerTotals.expected_net, currency)}</td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
