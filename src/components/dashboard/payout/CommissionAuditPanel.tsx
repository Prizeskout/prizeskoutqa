import { useState } from "react";
import { AlertTriangle, AlertCircle, Info } from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { Finding, LedgerRow } from "@/lib/commission-audit";
import { SEVERITY_ORDER } from "@/lib/commission-audit";

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

function SeverityIcon({ severity }: { severity: Finding["severity"] }) {
  const color = SEVERITY_COLOR[severity];
  if (severity === "critical") return <AlertCircle size={15} color={color} style={{ flexShrink: 0 }} />;
  if (severity === "warning") return <AlertTriangle size={15} color={color} style={{ flexShrink: 0 }} />;
  return <Info size={15} color={color} style={{ flexShrink: 0 }} />;
}

function fmt(n: number, currency: string): string {
  return `${currency} ${Math.round(n).toLocaleString("en-US")}`;
}

export type CommissionAuditResult = {
  ledger: LedgerRow[];
  ledgerTotals: LedgerRow | null;
  findings: Finding[];
  coverage: { start: string; end: string } | null;
};

export function CommissionAuditPanel({ result, currency }: { result: CommissionAuditResult; currency: string }) {
  const [downloading, setDownloading] = useState(false);
  const sortedFindings = [...result.findings].sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]);
  const criticalCount = result.findings.filter(f => f.severity === "critical").length;
  const warningCount = result.findings.filter(f => f.severity === "warning").length;

  const handleDownload = async () => {
    if (downloading) return;
    setDownloading(true);
    try {
      const { exportCommissionAuditPdf } = await import("./exportAuditReportPdf");
      await exportCommissionAuditPdf(result, currency);
    } catch (err) {
      console.error("Commission audit PDF export failed:", err);
    } finally {
      setDownloading(false);
    }
  };

  const chartData = result.ledger.map(r => ({
    date: r.date,
    sales: r.sales,
    commission: r.commission_at_agreed_rate,
  }));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={{ fontSize: 15, fontWeight: 700, color: "var(--text)" }}>Commission Audit</span>
          <span style={{ fontSize: 12.5, color: "var(--muted)" }}>
            {result.coverage
              ? `Daily ledger covers ${result.coverage.start} to ${result.coverage.end}`
              : "Cross-document findings and reconciliation"}
            {result.findings.length > 0 && (
              <>
                {" · "}
                {criticalCount > 0 && <strong style={{ color: SEVERITY_COLOR.critical }}>{criticalCount} critical</strong>}
                {criticalCount > 0 && warningCount > 0 && ", "}
                {warningCount > 0 && <strong style={{ color: SEVERITY_COLOR.warning }}>{warningCount} to review</strong>}
              </>
            )}
          </span>
        </div>
        <button type="button" onClick={handleDownload} disabled={downloading}
          style={{ cursor: downloading ? "not-allowed" : "pointer", fontFamily: "inherit", fontSize: 12.5,
            fontWeight: 600, color: "var(--text)", background: "var(--surface)",
            border: "1px solid var(--border)", borderRadius: 8, padding: "7px 12px",
            opacity: downloading ? 0.6 : 1, display: "flex", alignItems: "center", gap: 6 }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
            strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          {downloading ? "Preparing…" : "Download Audit Report"}
        </button>
      </div>

      {sortedFindings.length > 0 && (
        <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: "18px 20px" }}>
          <div style={{ fontSize: 13.5, fontWeight: 700, color: "var(--text)", marginBottom: 12 }}>Findings</div>
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

      {result.ledger.length > 0 && (
        <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: "18px 20px" }}>
          <div style={{ fontSize: 13.5, fontWeight: 700, color: "var(--text)", marginBottom: 4 }}>Daily Ledger</div>
          <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 12 }}>
            Per-day sales against the agreed commission rate
          </div>

          <div style={{ height: 220, marginBottom: 16 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="date" tick={{ fontSize: 10.5, fill: "var(--muted)" }} axisLine={{ stroke: "var(--border)" }} tickLine={false} minTickGap={24} />
                <YAxis tick={{ fontSize: 11, fill: "var(--muted)" }} axisLine={false} tickLine={false} width={48} />
                <Tooltip contentStyle={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }} labelStyle={{ color: "var(--text)", fontWeight: 600 }} />
                <Line type="monotone" dataKey="sales" name="Sales" stroke="#3B82F6" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="commission" name="Commission (agreed rate)" stroke="#EA580C" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div style={{ display: "flex", gap: 20, marginBottom: 14 }}>
            {[["#3B82F6", "Sales"], ["#EA580C", "Commission (agreed rate)"]].map(([color, label]) => (
              <div key={label} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: color, display: "inline-block" }} />
                <span style={{ fontSize: 12, color: "var(--muted)" }}>{label}</span>
              </div>
            ))}
          </div>

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
                    <td style={tdStyle}>{r.date}</td>
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
        </div>
      )}
    </div>
  );
}
