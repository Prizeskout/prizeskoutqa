import { useMemo, useState } from "react";
import { FileSearch, Lock, ShieldCheck, X } from "lucide-react";
import type {
  AuditAssurance, ClassifiedDocument, CrossCheckWindow, Finding, LedgerRow,
} from "@/lib/commission-audit";
import { SEVERITY_ORDER, formatDateRange, summarizeAudit } from "@/lib/commission-audit";

const NAVY = "#14213D";
const GREEN = "#087F5B";
const AMBER = "#A16207";
const RED = "#B42318";

export type CommissionAuditResult = {
  ledger: LedgerRow[];
  ledgerTotals: LedgerRow | null;
  findings: Finding[];
  coverage: { start: string; end: string } | null;
  crossCheckWindows?: CrossCheckWindow[];
  netSalesOverrideDocs?: string[];
  assurance?: AuditAssurance;
};

type Tab = "summary" | "reconciliation" | "exceptions" | "transactions" | "evidence" | "methodology" | "signoff";

const tabs: { id: Tab; label: string }[] = [
  { id: "summary", label: "Executive Summary" },
  { id: "reconciliation", label: "Reconciliation" },
  { id: "exceptions", label: "Exceptions" },
  { id: "transactions", label: "Transactions" },
  { id: "evidence", label: "Evidence" },
  { id: "methodology", label: "Methodology" },
  { id: "signoff", label: "Sign-off" },
];

const panel = { background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12 };
const th = { padding: "10px 12px", fontSize: 10.5, fontWeight: 800, color: "var(--muted)", textTransform: "uppercase" as const, letterSpacing: ".04em", textAlign: "start" as const, borderBottom: "1px solid var(--border)" };
const td = { padding: "11px 12px", fontSize: 12.5, color: "var(--text)", borderBottom: "1px solid var(--border)", verticalAlign: "top" as const };

function money(n: number, currency: string, deduction = false) {
  const formatted = `${currency} ${Math.abs(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  return deduction && Math.abs(n) > 0 ? `(${formatted})` : formatted;
}

function pct(n: number) { return `${Math.round(n)}%`; }

function shortDate(iso: string) {
  const date = new Date(`${iso}T00:00:00Z`);
  return Number.isNaN(date.getTime()) ? iso : date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" });
}

function statusColor(status: string) {
  if (status === "passed" || status === "closed" || status === "approved") return GREEN;
  if (status === "failed" || status === "critical") return RED;
  return AMBER;
}

function Badge({ children, color = NAVY }: { children: React.ReactNode; color?: string }) {
  return <span style={{ display: "inline-flex", alignItems: "center", border: `1px solid color-mix(in srgb,${color} 35%,var(--border))`, background: `color-mix(in srgb,${color} 7%,var(--surface))`, color, borderRadius: 999, padding: "3px 8px", fontSize: 10.5, fontWeight: 800 }}>{children}</span>;
}

function SectionTitle({ number, title, note }: { number: string; title: string; note?: string }) {
  return <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-end", marginBottom: 12 }}>
    <div><div style={{ fontSize: 10.5, color: "var(--muted)", fontWeight: 800, letterSpacing: ".06em" }}>SECTION {number}</div><div style={{ fontSize: 17, color: NAVY, fontWeight: 900 }}>{title}</div></div>
    {note && <div style={{ fontSize: 11.5, color: "var(--muted)", textAlign: "end" }}>{note}</div>}
  </div>;
}

export function CommissionAuditPanel({
  result, currency, documentCount = 1, documents = [],
}: {
  result: CommissionAuditResult;
  currency: string;
  documentCount?: number;
  documents?: ClassifiedDocument[];
}) {
  const [activeTab, setActiveTab] = useState<Tab>("summary");
  const [selectedFinding, setSelectedFinding] = useState<Finding | null>(null);
  const [traceStage, setTraceStage] = useState<string | null>(null);
  const [materialityPct, setMaterialityPct] = useState("1");
  const [trivialPct, setTrivialPct] = useState("5");
  const [materialityApproved, setMaterialityApproved] = useState(false);
  const [preparedBy, setPreparedBy] = useState("PrizeSkout Revenue Assurance Engine");
  const [reviewedBy, setReviewedBy] = useState("");
  const [merchantAcknowledged, setMerchantAcknowledged] = useState(false);
  const [adjustmentsApproved, setAdjustmentsApproved] = useState(false);
  const [subsequentEvents, setSubsequentEvents] = useState("");
  const [locked, setLocked] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const summary = summarizeAudit(result, documentCount);
  const assurance = result.assurance;
  const sortedFindings = [...result.findings].sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity] || (b.amount ?? 0) - (a.amount ?? 0));
  const totalExpected = result.ledgerTotals?.expected_net ?? 0;
  const overallMateriality = totalExpected * ((Number(materialityPct) || 0) / 100);
  const performanceMateriality = overallMateriality * .75;
  const trivialThreshold = overallMateriality * ((Number(trivialPct) || 0) / 100);
  const engagementId = useMemo(() => {
    const seed = `${result.coverage?.start ?? "open"}-${result.coverage?.end ?? "open"}-${documentCount}-${result.ledgerTotals?.orders ?? 0}`;
    let hash = 2166136261;
    for (const char of seed) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619);
    return `PS-AUD-${Math.abs(hash >>> 0).toString(16).toUpperCase().padStart(8, "0")}`;
  }, [documentCount, result.coverage, result.ledgerTotals?.orders]);

  const statement = documents.find(d => d.document_type === "statement");
  const bank = documents.find(d => d.document_type === "merchant_received");
  const statementAmount = statement?.result.expected_payout ?? null;
  const bankAmount = bank?.result.received_amount ?? null;
  const promotions = statement?.result.additional_income ?? 0;
  const additionalCharges = statement?.result.additional_charges ?? 0;
  const gross = result.ledgerTotals?.sales ?? statement?.result.sub_total_sum ?? 0;
  const commission = result.ledgerTotals?.commission_at_agreed_rate ?? 0;
  const unresolved = bankAmount != null ? bankAmount - totalExpected : statementAmount != null ? statementAmount - totalExpected : 0;
  const receivedLabels = documents.map(d => d.document_type);
  const evidenceReceived = [
    receivedLabels.includes("daily_log") && "activity log",
    receivedLabels.includes("statement") && "platform statement",
    receivedLabels.includes("merchant_received") && "bank settlement record",
  ].filter(Boolean).join(", ") || "no structured evidence";
  const missingEvidence = assurance?.assertions.filter(a => a.status === "missing").map(a => a.label).join(", ") || "none identified";
  const requiredActions = assurance?.assertions.filter(a => a.status !== "passed").slice(0, 3).map(a => a.detail) ?? [];

  const handleDownload = async () => {
    if (downloading) return;
    setDownloading(true);
    try {
      const { exportCommissionAuditPdf } = await import("./exportAuditReportPdf");
      await exportCommissionAuditPdf(result, currency, documentCount);
    } finally { setDownloading(false); }
  };

  const assertionEvidence = (id: string) => {
    if (id === "completeness" || id === "occurrence") return receivedLabels.includes("daily_log") ? "Daily activity log" : "No activity evidence";
    if (id === "accuracy" || id === "cutoff") return receivedLabels.includes("statement") ? "Statement vs activity log" : "No platform statement";
    if (id === "authorization") return "Merchant-entered commercial terms";
    return bank?.result.evidence_level === "document_supported" ? "Evidence fingerprint recorded" : bank ? "Manual deposit assertion" : "No bank evidence";
  };

  const assertionCoverage = (a: AuditAssurance["assertions"][number]) => a.status === "passed" ? 100 : a.status === "partial" ? 50 : 0;

  const reconciliationRows = [
    { label: "Gross eligible product sales", value: gross, source: "Activity ledger", deduction: false },
    { label: "Less cancellations and refunds", value: 0, source: "Not monetarily evidenced", deduction: true, unavailable: true },
    { label: "Less contractual commission", value: commission, source: "Agreed rate × eligible sales", deduction: true },
    { label: "Less VAT on fees", value: 0, source: "Not separately evidenced", deduction: true, unavailable: true },
    { label: "Less payment and delivery fees", value: additionalCharges, source: statement ? "Platform statement" : "Not evidenced", deduction: true, unavailable: !statement },
    { label: "Add platform-funded promotions", value: promotions, source: statement ? "Platform statement" : "Not evidenced", deduction: false, unavailable: !statement },
    { label: "Expected settlement", value: totalExpected, source: "Deterministic ledger", total: true },
    { label: "Platform-reported settlement", value: statementAmount, source: statement?.file_name ?? "No statement supplied" },
    { label: "Bank-supported receipt", value: bankAmount, source: bank?.result.evidence_level === "document_supported" ? "Fingerprint recorded; review pending" : bank ? "Manual assertion" : "No bank evidence" },
    { label: "Unresolved variance", value: unresolved, source: bankAmount != null ? "Bank receipt less expected settlement" : statementAmount != null ? "Statement less expected settlement" : "Cannot calculate", total: true },
  ];

  const coverFields = [
    ["Client / restaurant", "Current merchant account"],
    ["Platform / branch", `${statement?.platform_guess ?? documents[0]?.platform_guess ?? "Not established"} / ${"Not evidenced"}`],
    ["Audit period", result.coverage ? formatDateRange(result.coverage.start, result.coverage.end) : "Open / not established"],
    ["Currency", currency],
    ["Engagement ID", engagementId],
    ["Engine version", assurance?.engineVersion ?? "legacy"],
    ["Prepared", new Date().toLocaleString("en-GB")],
    ["Prepared by", preparedBy],
    ["Review status", locked ? "Locked final" : reviewedBy ? "Review in progress" : "Unreviewed draft"],
    ["Data cut-off", result.coverage?.end ? shortDate(result.coverage.end) : "Not established"],
    ["Scope", `${result.ledgerTotals?.orders ?? 0} orders · ${documents.filter(d => d.document_type === "statement").length} statements · ${documents.filter(d => d.document_type === "merchant_received").length} deposits · 0 reviewed contracts`],
  ];

  return <div style={{ ...panel, overflow: "hidden", color: "var(--text)" }}>
    <div style={{ padding: "18px 22px", background: NAVY, color: "#fff", display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
      <div><div style={{ fontSize: 10.5, opacity: .7, fontWeight: 800, letterSpacing: ".08em" }}>CONFIDENTIAL · PAYOUT ASSURANCE WORKPAPER</div><div style={{ fontSize: 21, fontWeight: 900, marginTop: 4 }}>Independent Payout Reconciliation</div><div style={{ fontSize: 11.5, opacity: .75, marginTop: 3 }}>{engagementId} · Draft generated {new Date().toLocaleDateString("en-GB")}</div></div>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}><Badge color={locked ? GREEN : AMBER}>{locked ? "LOCKED FINAL" : "UNREVIEWED DRAFT"}</Badge><button onClick={handleDownload} style={{ border: "1px solid #ffffff55", color: "#fff", background: "transparent", borderRadius: 7, padding: "7px 10px", cursor: "pointer", fontWeight: 700 }}>{downloading ? "Preparing…" : "Export report"}</button></div>
    </div>

    <div className="table-scroll" style={{ borderBottom: "1px solid var(--border)", background: "var(--surface2)" }}>
      <div style={{ display: "flex", minWidth: 790 }}>{tabs.map(tab => <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{ cursor: "pointer", border: 0, borderBottom: activeTab === tab.id ? `3px solid ${NAVY}` : "3px solid transparent", background: "transparent", color: activeTab === tab.id ? NAVY : "var(--muted)", padding: "12px 14px", fontSize: 11.5, fontWeight: activeTab === tab.id ? 900 : 700 }}>{tab.label}</button>)}</div>
    </div>

    <div style={{ padding: "22px", display: "flex", flexDirection: "column", gap: 18 }}>
      {activeTab === "summary" && <>
        <section style={{ ...panel, padding: 18 }}><SectionTitle number="1" title="Engagement cover" note="Identifiable · reproducible · versioned" /><div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(210px,1fr))", gap: 0 }}>{coverFields.map(([label, value]) => <div key={label} style={{ borderTop: "1px solid var(--border)", padding: "9px 10px" }}><div style={{ fontSize: 10, color: "var(--muted)", fontWeight: 800, textTransform: "uppercase" }}>{label}</div><div style={{ fontSize: 12.5, fontWeight: 700, marginTop: 2 }}>{value}</div></div>)}</div></section>

        <section style={{ border: `2px solid ${assurance?.opinion === "insufficient_evidence" ? AMBER : assurance?.opinion === "exceptions_found" ? RED : GREEN}`, borderRadius: 12, padding: 20, background: `color-mix(in srgb,${assurance?.opinion === "insufficient_evidence" ? AMBER : assurance?.opinion === "exceptions_found" ? RED : GREEN} 4%,var(--surface))` }}>
          <SectionTitle number="2" title="Independent conclusion" />
          <div style={{ fontSize: 22, lineHeight: 1.25, fontWeight: 900, color: statusColor(assurance?.opinion === "exceptions_found" ? "failed" : assurance?.opinion === "reconciled" ? "passed" : "partial") }}>{assurance?.opinionLabel ?? "Legacy result — assurance not assessed"}</div>
          <div style={{ marginTop: 9, fontSize: 13, lineHeight: 1.55 }}>{summary.headline}</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(170px,1fr))", gap: 10, marginTop: 16 }}>
            {[["Evidence received", evidenceReceived], ["Evidence missing", missingEvidence], ["Materiality", materialityApproved ? money(overallMateriality, currency) : "Not approved"], ["Claims-ready", money(summary.claimsReadyAmount, currency)], ["Estimated exceptions", money(summary.estimatedExposure, currency)], ["Evidence readiness", `${summary.evidenceScore}% (${assurance?.assertions.filter(a => a.status === "passed").length ?? 0} passed, ${assurance?.assertions.filter(a => a.status === "partial").length ?? 0} partial, ${assurance?.assertions.filter(a => a.status === "missing").length ?? 0} missing)`]].map(([label, value]) => <div key={label} style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, padding: 11 }}><div style={{ fontSize: 10, color: "var(--muted)", fontWeight: 800, textTransform: "uppercase" }}>{label}</div><div style={{ fontSize: 12.5, fontWeight: 700, marginTop: 4 }}>{value}</div></div>)}
          </div>
          {!!requiredActions.length && <div style={{ marginTop: 15, borderTop: "1px solid var(--border)", paddingTop: 12 }}><div style={{ fontSize: 11, fontWeight: 900, color: NAVY }}>Required before a conclusion can be issued</div><ol style={{ margin: "7px 0 0 18px", padding: 0, fontSize: 12.5, lineHeight: 1.6 }}>{requiredActions.map(action => <li key={action}>{action}</li>)}</ol></div>}
        </section>

        <section style={{ ...panel, padding: 18 }}><SectionTitle number="3" title="Assertion matrix" note="Status reflects evidence, not appearance" />
          <div className="table-scroll"><table style={{ width: "100%", borderCollapse: "collapse", minWidth: 720 }}><thead><tr>{["Assertion", "Status", "Evidence", "Coverage", "Auditor note"].map(h => <th key={h} style={th}>{h}</th>)}</tr></thead><tbody>{(assurance?.assertions ?? []).map(a => <tr key={a.id}><td style={{ ...td, fontWeight: 800 }}>{a.label}</td><td style={td}><Badge color={statusColor(a.status)}>{a.status.toUpperCase()}</Badge></td><td style={td}>{assertionEvidence(a.id)}</td><td style={{ ...td, fontVariantNumeric: "tabular-nums" }}>{assertionCoverage(a)}%</td><td style={{ ...td, color: "var(--muted)" }}>{a.detail}</td></tr>)}</tbody></table></div>
        </section>
      </>}

      {activeTab === "reconciliation" && <section style={{ ...panel, padding: 18 }}><SectionTitle number="3" title="Four-way reconciliation bridge" note="Select any row to inspect its lineage" /><div className="table-scroll"><table style={{ width: "100%", borderCollapse: "collapse", minWidth: 650 }}><thead><tr><th style={th}>Reconciliation stage</th><th style={{ ...th, textAlign: "end" }}>Amount</th><th style={th}>Evidence / basis</th><th style={th}>Trace</th></tr></thead><tbody>{reconciliationRows.map(row => <tr key={row.label} style={{ background: row.total ? "var(--surface2)" : undefined }}><td style={{ ...td, fontWeight: row.total ? 900 : 600 }}>{row.label}</td><td style={{ ...td, textAlign: "end", fontWeight: row.total ? 900 : 700, fontVariantNumeric: "tabular-nums", color: row.unavailable ? "var(--muted)" : undefined }}>{row.value == null || row.unavailable ? "Not evidenced" : money(row.value, currency, row.deduction)}</td><td style={{ ...td, color: "var(--muted)" }}>{row.source}</td><td style={td}><button onClick={() => setTraceStage(row.label)} style={{ border: "1px solid var(--border)", background: "transparent", borderRadius: 6, padding: "5px 8px", cursor: "pointer", fontSize: 11, fontWeight: 700 }}>View lineage</button></td></tr>)}</tbody></table></div></section>}

      {activeTab === "exceptions" && <section style={{ ...panel, padding: 18 }}><SectionTitle number="4" title="Exception register" note={`${sortedFindings.length} cases · ${money(summary.claimsReadyAmount, currency)} claims-ready`} /><div className="table-scroll"><table style={{ width: "100%", borderCollapse: "collapse", minWidth: 1050 }}><thead><tr>{["Exception ID", "Category", "Status", "Severity", "Amount", "Claims-ready", "Confidence", "Affected orders", "Root cause", "Owner", "Due date", "Recovery"].map(h => <th key={h} style={th}>{h}</th>)}</tr></thead><tbody>{sortedFindings.map((f, i) => { const caseId = `EX-${String(i + 1).padStart(3, "0")}`; const substantiated = f.recoverability === "claims_ready"; return <tr key={f.id} onClick={() => setSelectedFinding(f)} style={{ cursor: "pointer" }}><td style={{ ...td, fontWeight: 900, color: NAVY }}>{caseId}</td><td style={td}>{f.assertion ?? "reconciliation"}</td><td style={td}><Badge color={AMBER}>OPEN</Badge></td><td style={td}><Badge color={statusColor(f.severity)}>{f.severity.toUpperCase()}</Badge></td><td style={{ ...td, textAlign: "end" }}>{f.amount != null ? money(f.amount, currency) : "Unquantified"}</td><td style={{ ...td, textAlign: "end" }}>{substantiated && f.amount != null ? money(f.amount, currency) : money(0, currency)}</td><td style={td}>{f.evidence_level === "corroborated" ? "High" : f.evidence_level === "single_source" ? "Medium" : "Low"}</td><td style={td}>{result.ledgerTotals?.orders ?? "Not traced"}</td><td style={td}>Pending investigation</td><td style={td}>Unassigned</td><td style={td}>Not set</td><td style={td}>Not filed</td></tr>; })}</tbody></table></div><div style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 10 }}>Select a case to inspect calculations, evidence basis, limitations and next actions.</div></section>}

      {activeTab === "transactions" && <section style={{ ...panel, padding: 18 }}><SectionTitle number="5" title="Transaction ledger" note={`${result.ledger.length} days · ${result.ledgerTotals?.orders ?? 0} orders`} /><div className="table-scroll"><table style={{ width: "100%", borderCollapse: "collapse", minWidth: 650 }}><thead><tr>{["Date", "Orders", "Eligible sales", "Contractual commission", "Expected net"].map((h, i) => <th key={h} style={{ ...th, textAlign: i ? "end" : "start" }}>{h}</th>)}</tr></thead><tbody>{result.ledger.map(row => <tr key={row.date}><td style={td}>{shortDate(row.date)}</td><td style={{ ...td, textAlign: "end" }}>{row.orders}</td><td style={{ ...td, textAlign: "end" }}>{money(row.sales, currency)}</td><td style={{ ...td, textAlign: "end" }}>{money(row.commission_at_agreed_rate, currency, true)}</td><td style={{ ...td, textAlign: "end", fontWeight: 800 }}>{money(row.expected_net, currency)}</td></tr>)}</tbody>{result.ledgerTotals && <tfoot><tr>{["Total", result.ledgerTotals.orders, money(result.ledgerTotals.sales, currency), money(result.ledgerTotals.commission_at_agreed_rate, currency, true), money(result.ledgerTotals.expected_net, currency)].map((value, i) => <td key={i} style={{ ...td, textAlign: i > 0 ? "end" : "start", fontWeight: 900, borderTop: `2px solid ${NAVY}` }}>{value}</td>)}</tr></tfoot>}</table></div></section>}

      {activeTab === "evidence" && <section style={{ ...panel, padding: 18 }}><SectionTitle number="6" title="Evidence and lineage index" note="Source provenance and processing disclosures" /><div className="table-scroll"><table style={{ width: "100%", borderCollapse: "collapse", minWidth: 1080 }}><thead><tr>{["Document ID", "Filename", "SHA-256", "Source", "Period", "Parser", "Rows", "AI confidence", "Overrides", "Review"].map(h => <th key={h} style={th}>{h}</th>)}</tr></thead><tbody>{documents.map((doc, i) => <tr key={doc.id}><td style={{ ...td, fontWeight: 900 }}>{`EV-${String(i + 1).padStart(3, "0")}`}</td><td style={td}>{doc.file_name}</td><td style={{ ...td, fontFamily: "monospace", fontSize: 10.5 }}>{doc.result.evidence_sha256 ? `${doc.result.evidence_sha256.slice(0, 12)}…` : "Not recorded"}</td><td style={td}>{doc.platform_guess ?? "Not established"}</td><td style={td}>{doc.result.period_start ? formatDateRange(doc.result.period_start, doc.result.period_end) : "Not established"}</td><td style={td}>PrizeSkout deterministic parser v1</td><td style={td}>{doc.result.daily_rows?.length ?? "N/A"}</td><td style={td}>See intake record</td><td style={td}>{doc.treat_sales_as_net ? "Sales treated as net" : "None"}</td><td style={td}><Badge color={AMBER}>REVIEW PENDING</Badge></td></tr>)}</tbody></table></div>{!documents.length && <div style={{ padding: 25, textAlign: "center", color: "var(--muted)" }}>Detailed source lineage was not retained for this historical audit.</div>}</section>}

      {activeTab === "methodology" && <>
        <section style={{ ...panel, padding: 18 }}><SectionTitle number="7" title="Materiality framework" note="Merchant approval required before severity is final" /><div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(190px,1fr))", gap: 12 }}><label style={{ fontSize: 12, fontWeight: 700 }}>Overall materiality (% of expected payout)<input disabled={locked} value={materialityPct} onChange={e => { setMaterialityPct(e.target.value); setMaterialityApproved(false); }} type="number" min="0" step=".1" style={{ width: "100%", marginTop: 6, padding: 9, border: "1px solid var(--border)", borderRadius: 7, background: "var(--surface)", color: "var(--text)" }} /></label><label style={{ fontSize: 12, fontWeight: 700 }}>Trivial threshold (% of materiality)<input disabled={locked} value={trivialPct} onChange={e => { setTrivialPct(e.target.value); setMaterialityApproved(false); }} type="number" min="0" step="1" style={{ width: "100%", marginTop: 6, padding: 9, border: "1px solid var(--border)", borderRadius: 7, background: "var(--surface)", color: "var(--text)" }} /></label></div><div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(170px,1fr))", gap: 9, marginTop: 14 }}>{[["Overall materiality", overallMateriality], ["Performance materiality (75%)", performanceMateriality], ["Trivial-error threshold", trivialThreshold]].map(([label, value]) => <div key={String(label)} style={{ padding: 11, border: "1px solid var(--border)", borderRadius: 8 }}><div style={{ fontSize: 10, color: "var(--muted)", fontWeight: 800 }}>{label}</div><div style={{ fontSize: 17, fontWeight: 900, marginTop: 3 }}>{money(Number(value), currency)}</div></div>)}</div><label style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 13, fontSize: 12.5, fontWeight: 700 }}><input disabled={locked} type="checkbox" checked={materialityApproved} onChange={e => setMaterialityApproved(e.target.checked)} /> Merchant approves this materiality basis</label></section>
        <section style={{ ...panel, padding: 18 }}><SectionTitle number="8" title="Methodology and limitations" /><ol style={{ margin: 0, paddingInlineStart: 20, fontSize: 12.5, lineHeight: 1.7 }}><li>Align periods before comparing totals; disjoint periods are never treated as exceptions.</li><li>Quarantine duplicate dates rather than summing potentially duplicated turnover.</li><li>Recompute expected commission using merchant-supplied commercial terms.</li><li>Separate merchant assertions, single-source estimates and corroborated evidence.</li><li>Do not present estimates as claims-ready recoveries.</li><li>Current limitations: no reviewed signed contract, no order-level vouching where only aggregates exist, and no bank-file content review unless separately performed.</li></ol></section>
      </>}

      {activeTab === "signoff" && <section style={{ ...panel, padding: 18 }}><SectionTitle number="9" title="Review, approval and report lock" note={locked ? "This workpaper is locked in the current session" : "Draft until all required approvals are complete"} /><div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(230px,1fr))", gap: 12 }}><label style={{ fontSize: 12, fontWeight: 700 }}>Prepared by<input disabled={locked} value={preparedBy} onChange={e => setPreparedBy(e.target.value)} style={{ width: "100%", boxSizing: "border-box", marginTop: 6, padding: 9, border: "1px solid var(--border)", borderRadius: 7, background: "var(--surface)", color: "var(--text)" }} /></label><label style={{ fontSize: 12, fontWeight: 700 }}>Reviewed by<input disabled={locked} value={reviewedBy} onChange={e => setReviewedBy(e.target.value)} placeholder="Independent reviewer name" style={{ width: "100%", boxSizing: "border-box", marginTop: 6, padding: 9, border: "1px solid var(--border)", borderRadius: 7, background: "var(--surface)", color: "var(--text)" }} /></label></div><label style={{ display: "block", marginTop: 14, fontSize: 12, fontWeight: 700 }}>Subsequent-event disclosure<textarea disabled={locked} value={subsequentEvents} onChange={e => setSubsequentEvents(e.target.value)} placeholder="Record events after the data cut-off, or state that none were identified." rows={3} style={{ width: "100%", boxSizing: "border-box", marginTop: 6, padding: 9, border: "1px solid var(--border)", borderRadius: 7, background: "var(--surface)", color: "var(--text)", fontFamily: "inherit" }} /></label><div style={{ display: "flex", flexDirection: "column", gap: 9, marginTop: 14 }}>{[["Merchant acknowledgement", merchantAcknowledged, setMerchantAcknowledged], ["Adjustment approval", adjustmentsApproved, setAdjustmentsApproved]].map(([label, value, setter]) => <label key={String(label)} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, fontWeight: 700 }}><input disabled={locked} type="checkbox" checked={Boolean(value)} onChange={e => (setter as (v: boolean) => void)(e.target.checked)} />{String(label)}</label>)}</div><button disabled={locked || !reviewedBy.trim() || !merchantAcknowledged || !adjustmentsApproved || !materialityApproved} onClick={() => setLocked(true)} style={{ marginTop: 18, border: 0, borderRadius: 8, padding: "10px 14px", background: locked ? GREEN : NAVY, color: "#fff", fontWeight: 900, cursor: locked ? "default" : "pointer", opacity: !locked && (!reviewedBy.trim() || !merchantAcknowledged || !adjustmentsApproved || !materialityApproved) ? .45 : 1, display: "inline-flex", alignItems: "center", gap: 7 }}>{locked ? <ShieldCheck size={16} /> : <Lock size={16} />}{locked ? "Report locked" : "Lock reviewed report"}</button><div style={{ marginTop: 8, fontSize: 11.5, color: "var(--muted)" }}>Lock requires a reviewer, approved materiality, merchant acknowledgement and adjustment approval. Persistent cryptographic report locking requires server-side signing and is not implied by this session control.</div></section>}
    </div>

    {selectedFinding && <div style={{ position: "fixed", inset: 0, zIndex: 100, background: "#0006", display: "flex", justifyContent: "flex-end" }} onClick={() => setSelectedFinding(null)}><aside onClick={e => e.stopPropagation()} style={{ width: "min(520px,92vw)", height: "100%", overflowY: "auto", background: "var(--surface)", padding: 22, boxShadow: "-10px 0 30px #0002" }}><button onClick={() => setSelectedFinding(null)} style={{ float: "right", border: 0, background: "transparent", cursor: "pointer", color: "var(--text)" }}><X /></button><div style={{ fontSize: 10.5, fontWeight: 900, color: "var(--muted)" }}>EXCEPTION WORKPAPER</div><h3 style={{ color: NAVY, marginTop: 7 }}>{selectedFinding.title}</h3><Badge color={statusColor(selectedFinding.severity)}>{selectedFinding.severity.toUpperCase()}</Badge><div style={{ fontSize: 26, fontWeight: 900, marginTop: 18 }}>{selectedFinding.amount != null ? money(selectedFinding.amount, currency) : "Unquantified"}</div><p style={{ fontSize: 13, lineHeight: 1.65 }}>{selectedFinding.detail}</p><div style={{ ...panel, padding: 13, marginTop: 15 }}><strong style={{ fontSize: 12 }}>Evidence assessment</strong><div style={{ fontSize: 12, color: "var(--muted)", marginTop: 6 }}>Level: {selectedFinding.evidence_level?.replaceAll("_", " ") ?? "legacy"}<br />Recoverability: {selectedFinding.recoverability?.replaceAll("_", " ") ?? "not classified"}<br />Assertion: {selectedFinding.assertion ?? "reconciliation"}</div></div><div style={{ ...panel, padding: 13, marginTop: 10 }}><strong style={{ fontSize: 12 }}>Required case actions</strong><ol style={{ fontSize: 12, lineHeight: 1.65, paddingInlineStart: 18 }}><li>Trace the exception to source rows and contract clauses.</li><li>Obtain platform response and supporting adjustment details.</li><li>Assign an owner and recovery due date.</li><li>Obtain reviewer approval before filing a claim.</li></ol></div></aside></div>}

    {traceStage && <div style={{ position: "fixed", inset: 0, zIndex: 101, background: "#0006", display: "grid", placeItems: "center", padding: 20 }} onClick={() => setTraceStage(null)}><div onClick={e => e.stopPropagation()} style={{ ...panel, width: "min(560px,95vw)", padding: 20, boxShadow: "0 20px 50px #0003" }}><button onClick={() => setTraceStage(null)} style={{ float: "right", border: 0, background: "transparent", cursor: "pointer" }}><X /></button><FileSearch color={NAVY} /><h3 style={{ color: NAVY }}>{traceStage}</h3><p style={{ fontSize: 12.5, lineHeight: 1.6 }}>This balance is derived from the evidence basis shown in the reconciliation table. Review the Evidence tab for source identity and the Transactions tab for the underlying ledger. A value marked “not evidenced” has deliberately not been inferred.</p></div></div>}

    <div style={{ padding: "10px 22px", borderTop: "1px solid var(--border)", display: "flex", justifyContent: "space-between", fontSize: 10, color: "var(--muted)" }}><span>CONFIDENTIAL · PRIZESKOUT PAYOUT ASSURANCE</span><span>Workpaper {engagementId} · Page 1 of 1</span></div>
  </div>;
}
