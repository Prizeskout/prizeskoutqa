// Branded PDF export for the multi-document Commission Audit (see
// src/lib/commission-audit.ts). Reuses the same pdfBranding.ts primitives and
// visual conventions already established by exportPayoutReportPdf.ts — clean
// bordered cards for data, color reserved for severity/total figures.
//
// Mirrors CommissionAuditPanel.tsx's tabs as closely as a static PDF
// reasonably can: engagement cover, independent conclusion, assertion
// matrix, four-way evidence chain, financial reconciliation bridge,
// contract compliance, findings, daily ledger, and evidence/lineage.
// Deliberately excluded: Materiality
// framework, Recovery Cases, Month-End Close and Sign-off — those are live
// workflow controls (editable inputs, separately-persisted case/close
// registers) rather than computed report content, so a static export of
// them would either be misleading (unapproved inputs frozen mid-edit) or
// redundant with their own dedicated records.
//
// Deliberately no chart here: jsPDF has no charting primitive worth trusting
// for a 30+ point line series (the earlier hand-drawn warning icon was
// simple vector shapes, not a data plot) — the findings and ledger tables
// carry the full detail, with a note pointing back to the in-app chart.
import { jsPDF } from "jspdf";
import {
  AMBER,
  BLUE,
  BORDER,
  CONTENT_W,
  FAINT,
  GREEN,
  INK,
  MARGIN_X,
  MUTED,
  RED,
  type RGB,
  drawBrandedFooters,
  drawBrandedHeader,
  ensureSpace,
  resolveBrandTheme,
  slugifyBrand,
  tint,
} from "@/lib/pdfBranding";
import {
  formatDateRange, summarizeAudit,
  type AuditAssertion, type AuditAssurance, type ClassifiedDocument, type Finding,
  type FourWayReconciliation, type FourWayStage, type LedgerRow,
} from "@/lib/commission-audit";
import { runContractCompliance, type ComplianceTest } from "@/lib/contract-compliance";
import type { ContractTerm } from "./ContractIntelligenceVault";

export type CommissionAuditPdfData = {
  ledger: LedgerRow[];
  ledgerTotals: LedgerRow | null;
  findings: Finding[];
  coverage: { start: string; end: string } | null;
  netSalesOverrideDocs?: string[];
  assurance?: AuditAssurance;
  fourWay?: FourWayReconciliation;
};

export type CommissionAuditPdfOptions = {
  documents?: ClassifiedDocument[];
  approvedContract?: ContractTerm | null;
  preparedBy?: string;
  reviewStatus?: string;
};

function fmt(n: number, currency: string): string {
  return `${currency} ${Math.round(n).toLocaleString("en-US")}`;
}

function todayLabel(): string {
  return new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}

// Same formula as CommissionAuditPanel.tsx's engagementId useMemo — kept in
// sync deliberately so the ID printed on a PDF export always matches the ID
// shown live for the same audit (same coverage/documentCount/orders seed).
function engagementId(coverage: { start: string; end: string } | null, documentCount: number, orders: number): string {
  const seed = `${coverage?.start ?? "open"}-${coverage?.end ?? "open"}-${documentCount}-${orders}`;
  let hash = 2166136261;
  for (const char of seed) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619);
  return `PS-AUD-${Math.abs(hash >>> 0).toString(16).toUpperCase().padStart(8, "0")}`;
}

const SEVERITY_COLOR: Record<Finding["severity"], RGB> = {
  critical: RED,
  warning: AMBER,
  info: BLUE,
};

const SEVERITY_LABEL: Record<Finding["severity"], string> = {
  critical: "CRITICAL",
  warning: "REVIEW",
  info: "INFO",
};

const STATUS_COLOR: Record<string, RGB> = {
  passed: GREEN, matched: GREEN, verified: GREEN,
  failed: RED, unmatched: RED, critical: RED,
  partial: AMBER, review: AMBER, asserted: AMBER,
  missing: RED, not_testable: FAINT,
};

function drawSectionHeading(doc: jsPDF, y: number, title: string, note?: string): number {
  y = ensureSpace(doc, y, 14);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12.5);
  doc.setTextColor(...INK);
  doc.text(title, MARGIN_X, y);
  if (note) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...MUTED);
    doc.text(note, MARGIN_X + CONTENT_W, y, { align: "right" });
  }
  return y + 7;
}

function drawFindingCard(doc: jsPDF, f: Finding, currency: string, startY: number): number {
  const color = SEVERITY_COLOR[f.severity];
  // Description-derived finding titles can run well past a single line (see
  // friendlyLabel() in commission-audit.ts, which quotes any merchant
  // description up to 60 chars verbatim) — must wrap and draw every title
  // line, not just the first, or the title silently gets cut mid-sentence.
  const titleMaxW = f.amount != null ? CONTENT_W - 55 : CONTENT_W - 14;
  const titleLines = doc.splitTextToSize(f.title, titleMaxW);
  const titleExtra = (titleLines.length - 1) * 4.2;
  const detailStartY = 16.5 + titleExtra;

  const detailLines = doc.splitTextToSize(f.detail, CONTENT_W - 16);
  // Shows the actual investigation, not just the conclusion — every column
  // that could explain the charge, checked and confirmed at its real value.
  const checkedText = f.trace?.checkedColumns?.length
    ? `Checked: ${f.trace.checkedColumns.map(c => `${c.label} (${fmt(c.value, currency)})`).join(", ")} — all read zero.`
    : null;
  const checkedLines = checkedText ? doc.splitTextToSize(checkedText, CONTENT_W - 16) : [];
  const boxH = 13 + titleExtra + detailLines.length * 4.4 + checkedLines.length * 4.2 + (checkedLines.length ? 1.5 : 0);
  let y = ensureSpace(doc, startY, boxH + 5);

  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(...BORDER);
  doc.setLineWidth(0.3);
  doc.roundedRect(MARGIN_X, y, CONTENT_W, boxH, 2, 2, "FD");
  doc.setFillColor(...color);
  doc.rect(MARGIN_X, y, 1.4, boxH, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.5);
  doc.setTextColor(...color);
  doc.text(SEVERITY_LABEL[f.severity], MARGIN_X + 7, y + 6);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(...INK);
  doc.text(titleLines, MARGIN_X + 7, y + 11);

  if (f.amount != null) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10.5);
    doc.setTextColor(...color);
    doc.text(fmt(f.amount, currency), MARGIN_X + CONTENT_W - 7, y + 11, { align: "right" });
  }

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.3);
  doc.setTextColor(...MUTED);
  doc.text(detailLines, MARGIN_X + 7, y + detailStartY);

  if (checkedLines.length) {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(7.8);
    doc.setTextColor(...FAINT);
    doc.text(checkedLines, MARGIN_X + 7, y + detailStartY + detailLines.length * 4.4 + 1.5);
  }

  return y + boxH + 5;
}

// Generic bordered-card stat grid — used for the cover fields, the
// evidence/materiality grid, and the key-figures strip. `cols` cards per
// row, each sized to fit CONTENT_W evenly.
function drawStatGrid(
  doc: jsPDF, startY: number,
  blocks: { label: string; value: string; color?: RGB }[],
  cols: number, cardH: number,
): number {
  const gap = 4.5;
  const bw = (CONTENT_W - gap * (cols - 1)) / cols;
  let y = startY;
  blocks.forEach((b, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    if (col === 0) y = ensureSpace(doc, y, cardH + gap);
    const x = MARGIN_X + col * (bw + gap);
    const cardY = y + row * (cardH + gap);
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(...BORDER);
    doc.setLineWidth(0.3);
    doc.roundedRect(x, cardY, bw, cardH, 2, 2, "FD");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.8);
    doc.setTextColor(...FAINT);
    doc.text(b.label.toUpperCase(), x + 5, cardY + 7.5);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(...(b.color ?? INK));
    const valLines = doc.splitTextToSize(b.value, bw - 10).slice(0, 3);
    doc.text(valLines, x + 5, cardY + 15.5);
  });
  const rows = Math.ceil(blocks.length / cols);
  return y + rows * cardH + (rows - 1) * gap + 9;
}

// Generic dynamic-row-height table: fixed-width columns plus one wrapped
// column (usually the last). Used for the assertion matrix, contract
// compliance and evidence lineage tables.
function drawTable(
  doc: jsPDF, startY: number,
  columns: { header: string; x: number; w: number; align?: "left" | "right" }[],
  rows: { cells: string[]; color?: RGB; bold?: boolean }[],
  wrapColIndex: number,
): number {
  const drawHeader = (hy: number): number => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.8);
    doc.setTextColor(...FAINT);
    columns.forEach(c => doc.text(c.header.toUpperCase(), c.x, hy, c.align === "right" ? { align: "right" } : undefined));
    doc.setDrawColor(...BORDER);
    doc.line(MARGIN_X, hy + 2, MARGIN_X + CONTENT_W, hy + 2);
    return hy + 6.5;
  };

  let y = ensureSpace(doc, startY, 10);
  y = drawHeader(y);

  for (const row of rows) {
    const wrapCol = columns[wrapColIndex];
    const wrapLines = doc.splitTextToSize(row.cells[wrapColIndex] || "—", wrapCol.w);
    const rowH = Math.max(5.8, wrapLines.length * 4 + 2.5);
    const pagesBefore = doc.getNumberOfPages();
    y = ensureSpace(doc, y, rowH + 2);
    if (doc.getNumberOfPages() !== pagesBefore) y = drawHeader(y);

    doc.setFont("helvetica", row.bold ? "bold" : "normal");
    doc.setFontSize(7.6);
    columns.forEach((c, i) => {
      doc.setTextColor(...(i === 1 && row.color ? row.color : INK));
      if (i === wrapColIndex) {
        doc.text(wrapLines, c.x, y, c.align === "right" ? { align: "right" } : undefined);
      } else {
        const lines = doc.splitTextToSize(row.cells[i] || "—", c.w);
        doc.text(lines[0] ?? "", c.x, y, c.align === "right" ? { align: "right" } : undefined);
      }
    });
    doc.setDrawColor(...tint(BORDER, 0.5));
    doc.setLineWidth(0.15);
    doc.line(MARGIN_X, y + rowH - 3.5, MARGIN_X + CONTENT_W, y + rowH - 3.5);
    y += rowH;
  }
  return y + 4;
}

function assertionRows(assertions: AuditAssertion[]): { cells: string[]; color?: RGB }[] {
  return assertions.map(a => ({
    cells: [a.label, a.status.toUpperCase(), a.detail],
    color: STATUS_COLOR[a.status] ?? INK,
  }));
}

function complianceRows(tests: ComplianceTest[], currency: string): { cells: string[]; color?: RGB }[] {
  return tests.map(t => ({
    cells: [t.title, t.status.replaceAll("_", " ").toUpperCase(), t.amount == null ? "—" : fmt(t.amount, currency), t.explanation],
    color: STATUS_COLOR[t.status] ?? INK,
  }));
}

function drawStageCard(doc: jsPDF, stage: FourWayStage, index: number, currency: string, startY: number): number {
  const basisLines = doc.splitTextToSize(stage.evidenceBasis, CONTENT_W - 60);
  const boxH = Math.max(16, 8 + basisLines.length * 3.8);
  let y = ensureSpace(doc, startY, boxH + 4);
  const color = STATUS_COLOR[stage.status] ?? FAINT;

  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(...BORDER);
  doc.setLineWidth(0.3);
  doc.roundedRect(MARGIN_X, y, CONTENT_W, boxH, 2, 2, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.3);
  doc.setTextColor(...INK);
  doc.text(`${index + 1}. ${stage.label}`, MARGIN_X + 5, y + 6.5);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.5);
  doc.setTextColor(...color);
  const coverageLabel = stage.coverage ? formatDateRange(stage.coverage.start, stage.coverage.end) : "Period not established";
  doc.text(stage.status.toUpperCase(), MARGIN_X + CONTENT_W - 55, y + 6.5, { align: "right" });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(...INK);
  doc.text(stage.amount == null ? "Not evidenced" : fmt(stage.amount, currency), MARGIN_X + CONTENT_W - 5, y + 6.5, { align: "right" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.4);
  doc.setTextColor(...MUTED);
  doc.text(basisLines, MARGIN_X + 5, y + 11.5);

  doc.setFont("helvetica", "italic");
  doc.setFontSize(6.8);
  doc.setTextColor(...FAINT);
  doc.text(`${coverageLabel} · ${stage.evidenceIds.length} source${stage.evidenceIds.length === 1 ? "" : "s"}`, MARGIN_X + 5, y + boxH - 2.5);

  return y + boxH + 3.5;
}

export async function exportCommissionAuditPdf(
  data: CommissionAuditPdfData,
  currency: string,
  documentCount = 1,
  options: CommissionAuditPdfOptions = {},
): Promise<void> {
  const { documents = [], approvedContract = null, preparedBy = "PrizeSkout Revenue Assurance Engine", reviewStatus = "Unreviewed draft" } = options;
  const theme = resolveBrandTheme();
  const { branding, accent } = theme;
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const summary = summarizeAudit(data, documentCount);
  const assurance = data.assurance;

  const coverageLabel = data.coverage ? formatDateRange(data.coverage.start, data.coverage.end) : "";
  const subtitle = `Commission reconciliation${coverageLabel ? `  |  ${coverageLabel}` : ""}  |  ${todayLabel()}`;
  let y = await drawBrandedHeader(doc, theme, "Commission Audit Report", subtitle);

  // Disclosed override — drawn first and unmissable, never folded into a
  // smaller note, since it changes the actual figures below away from what
  // this report's own cross-check found. Never silent.
  if (data.netSalesOverrideDocs?.length) {
    const overrideText = `You've marked ${data.netSalesOverrideDocs.join(", ")} as already net of commission. The Commission (Agreed) column below shows what the platform must have already taken to arrive at those figures — it's not deducted again; Expected Net still equals the Sales you reported. This is your own override, not something this audit verified; its own cross-check (see Findings) may say otherwise.`;
    const overrideLines = doc.splitTextToSize(overrideText, CONTENT_W - 10);
    const boxH = 6 + overrideLines.length * 4.2;
    y = ensureSpace(doc, y, boxH + 8);
    doc.setFillColor(...tint(AMBER, 0.9));
    doc.setDrawColor(...tint(AMBER, 0.4));
    doc.setLineWidth(0.4);
    doc.roundedRect(MARGIN_X, y, CONTENT_W, boxH, 2, 2, "FD");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.3);
    doc.setTextColor(120, 78, 8);
    doc.text(overrideLines, MARGIN_X + 5, y + 5);
    y += boxH + 8;
  }

  // ---- Engagement cover ------------------------------------------------
  const statement = documents.find(d => d.document_type === "statement");
  const contractCoversAudit = Boolean(approvedContract
    && (!data.coverage?.start || approvedContract.effective_from <= data.coverage.start)
    && (!approvedContract.effective_to || !data.coverage?.end || approvedContract.effective_to >= data.coverage.end));
  y = drawSectionHeading(doc, y, "Engagement Cover");
  y = drawStatGrid(doc, y, [
    { label: "Platform / branch", value: `${statement?.platform_guess ?? documents[0]?.platform_guess ?? "Not established"}` },
    { label: "Audit period", value: coverageLabel || "Open / not established" },
    { label: "Currency", value: currency },
    { label: "Engagement ID", value: engagementId(data.coverage, documentCount, data.ledgerTotals?.orders ?? 0) },
    { label: "Engine version", value: assurance?.engineVersion ?? "legacy" },
    { label: "Review status", value: reviewStatus },
  ], 3, 16);

  // ---- Independent conclusion -------------------------------------------
  const opinionColor = assurance?.opinion === "insufficient_evidence" ? AMBER : assurance?.opinion === "exceptions_found" ? RED : GREEN;
  y = drawSectionHeading(doc, y, "Independent Conclusion");
  y = ensureSpace(doc, y, 20);
  doc.setFillColor(...tint(opinionColor, 0.94));
  doc.setDrawColor(...tint(opinionColor, 0.5));
  doc.setLineWidth(0.4);
  const headlineLines = doc.splitTextToSize(summary.headline, CONTENT_W - 10);
  const opinionBoxH = 16 + headlineLines.length * 4.4;
  doc.roundedRect(MARGIN_X, y, CONTENT_W, opinionBoxH, 2, 2, "FD");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11.5);
  doc.setTextColor(...opinionColor);
  doc.text(assurance?.opinionLabel ?? "Legacy result — assurance not assessed", MARGIN_X + 5, y + 8);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.3);
  doc.setTextColor(...INK);
  doc.text(headlineLines, MARGIN_X + 5, y + 14.5);
  y += opinionBoxH + 7;

  const receivedLabels = documents.map(d => d.document_type);
  const evidenceReceived = [
    receivedLabels.includes("daily_log") && "activity log",
    receivedLabels.includes("statement") && "platform statement",
    receivedLabels.includes("merchant_received") && "merchant receipt confirmation",
  ].filter(Boolean).join(", ") || "no structured evidence";
  const effectiveAssertions: AuditAssertion[] = (assurance?.assertions ?? []).map(a =>
    a.id === "authorization" && contractCoversAudit
      ? { ...a, status: "passed" as const, detail: `Reviewed ${approvedContract?.contract_name} covers the audit period; ${approvedContract?.commission_rate_pct}% commission was approved by ${approvedContract?.reviewed_by}.` }
      : a);
  const missingEvidence = effectiveAssertions.filter(a => a.status === "missing").map(a => a.label).join(", ") || "none identified";
  const evidenceReadinessPct = Math.round(effectiveAssertions.reduce((s, a) => s + (a.status === "passed" ? 100 : a.status === "partial" ? 50 : 0), 0) / Math.max(effectiveAssertions.length, 1));

  y = drawStatGrid(doc, y, [
    { label: "Evidence received", value: contractCoversAudit ? `${evidenceReceived}, reviewed contract` : evidenceReceived },
    { label: "Evidence missing", value: missingEvidence },
    { label: "Claims-ready", value: fmt(summary.claimsReadyAmount, currency), color: GREEN },
    { label: "Estimated exceptions", value: fmt(summary.estimatedExposure, currency), color: AMBER },
    { label: "Evidence readiness", value: `${evidenceReadinessPct}%` },
    { label: "Documents · Days covered", value: `${documentCount} · ${summary.daysCovered}` },
  ], 3, 18);

  const requiredActions = effectiveAssertions.filter(a => a.status !== "passed").slice(0, 3).map(a => a.detail);
  if (requiredActions.length) {
    y = ensureSpace(doc, y, 8 + requiredActions.length * 8);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(...INK);
    doc.text("Required before a conclusion can be issued:", MARGIN_X, y);
    y += 5.5;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.8);
    doc.setTextColor(...MUTED);
    for (const action of requiredActions) {
      const lines = doc.splitTextToSize(`•  ${action}`, CONTENT_W - 4);
      y = ensureSpace(doc, y, lines.length * 4);
      doc.text(lines, MARGIN_X + 2, y);
      y += lines.length * 4 + 1.5;
    }
    y += 3;
  }

  // ---- Assertion matrix ---------------------------------------------------
  if (effectiveAssertions.length) {
    y = drawSectionHeading(doc, y, "Assertion Matrix", "Status reflects evidence, not appearance");
    y = drawTable(doc, y, [
      { header: "Assertion", x: MARGIN_X, w: 26 },
      { header: "Status", x: MARGIN_X + 28, w: 20 },
      { header: "Auditor note", x: MARGIN_X + 50, w: CONTENT_W - 50 },
    ], assertionRows(effectiveAssertions), 2);
  }

  // ---- Four-way evidence chain ---------------------------------------------
  if (data.fourWay?.stages.length) {
    y = drawSectionHeading(doc, y, "Four-Way Evidence Chain", "Documentary evidence and assertions graded separately");
    data.fourWay.stages.forEach((stage, i) => { y = drawStageCard(doc, stage, i, currency, y); });
    y += 2;
    if (data.fourWay.links.length) {
      const stageLabel = (id: FourWayStage["id"]) => data.fourWay?.stages.find(s => s.id === id)?.label ?? id;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.6);
      for (const link of data.fourWay.links) {
        const text = `${stageLabel(link.from)} -> ${stageLabel(link.to)}: ${link.status.replaceAll("_", " ").toUpperCase()}${link.variance != null ? ` (${fmt(link.variance, currency)})` : ""} — ${link.explanation}`;
        const lines = doc.splitTextToSize(text, CONTENT_W);
        y = ensureSpace(doc, y, lines.length * 4 + 2);
        doc.setTextColor(...(STATUS_COLOR[link.status] ?? INK));
        doc.text(lines, MARGIN_X, y);
        y += lines.length * 4 + 2;
      }
    }
    if (data.fourWay.merchantAssertionOnly) {
      y = ensureSpace(doc, y, 10);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7.6);
      doc.setTextColor(120, 78, 8);
      const lines = doc.splitTextToSize("Merchant-entered receipt is an assertion, not documentary settlement evidence. It cannot support a claims-ready conclusion by itself.", CONTENT_W);
      doc.text(lines, MARGIN_X, y);
      y += lines.length * 4 + 4;
    }
    y += 3;
  }

  // ---- Financial reconciliation bridge --------------------------------------
  {
    const bank = documents.find(d => d.document_type === "merchant_received");
    const statementAmount = statement?.result.expected_payout ?? null;
    const bankAmount = bank?.result.received_amount ?? null;
    const promotions = statement?.result.additional_income ?? 0;
    const additionalCharges = statement?.result.additional_charges ?? 0;
    const gross = data.ledgerTotals?.sales ?? statement?.result.sub_total_sum ?? 0;
    const commissionAmt = data.ledgerTotals?.commission_at_agreed_rate ?? 0;
    const totalExpected = data.ledgerTotals?.expected_net ?? 0;
    const unresolved = bankAmount != null ? bankAmount - totalExpected : statementAmount != null ? statementAmount - totalExpected : 0;
    const money = (n: number, deduction: boolean) => (deduction && n !== 0 ? `(${fmt(n, currency)})` : fmt(n, currency));
    const bridgeRows: { label: string; value: number | null; source: string; deduction?: boolean; unavailable?: boolean; total?: boolean }[] = [
      { label: "Gross eligible product sales", value: gross, source: "Activity ledger" },
      { label: "Less cancellations and refunds", value: 0, source: "Not monetarily evidenced", deduction: true, unavailable: true },
      { label: "Less contractual commission", value: commissionAmt, source: "Agreed rate x eligible sales", deduction: true },
      { label: "Less VAT on fees", value: 0, source: "Not separately evidenced", deduction: true, unavailable: true },
      { label: "Less payment and delivery fees", value: additionalCharges, source: statement ? "Platform statement" : "Not evidenced", deduction: true, unavailable: !statement },
      { label: "Add platform-funded promotions", value: promotions, source: statement ? "Platform statement" : "Not evidenced" },
      { label: "Expected settlement", value: totalExpected, source: "Deterministic ledger", total: true },
      { label: "Platform-reported settlement", value: statementAmount, source: statement?.file_name ?? "No statement supplied" },
      { label: "Bank-supported receipt", value: bankAmount, source: bank?.result.evidence_level === "document_supported" ? "Fingerprint recorded; review pending" : bank ? "Manual assertion" : "No bank evidence" },
      { label: "Unresolved variance", value: unresolved, source: bankAmount != null ? "Receipt confirmation less expected settlement" : statementAmount != null ? "Statement less expected settlement" : "Cannot calculate", total: true },
    ];
    y = drawSectionHeading(doc, y, "Financial Reconciliation Bridge");
    y = drawTable(doc, y, [
      { header: "Reconciliation stage", x: MARGIN_X, w: 58 },
      { header: "Amount", x: MARGIN_X + 78, w: 26, align: "right" },
      { header: "Evidence / basis", x: MARGIN_X + 96, w: CONTENT_W - 96 },
    ], bridgeRows.map(r => ({
      cells: [r.label, r.value == null || r.unavailable ? "Not evidenced" : money(r.value, !!r.deduction), r.source],
      bold: r.total,
    })), 2);
  }

  // ---- Contract compliance -------------------------------------------------
  if (documents.length) {
    const complianceTests = runContractCompliance(documents, contractCoversAudit ? approvedContract : null, data.fourWay);
    y = drawSectionHeading(doc, y, "Contract Compliance", `${complianceTests.filter(t => t.status === "failed").length} failed`);
    y = drawTable(doc, y, [
      { header: "Test", x: MARGIN_X, w: 42 },
      { header: "Result", x: MARGIN_X + 44, w: 20 },
      { header: "Amount", x: MARGIN_X + 88, w: 20, align: "right" },
      { header: "Explanation", x: MARGIN_X + 112, w: CONTENT_W - 112 },
    ], complianceRows(complianceTests, currency), 3);
  }

  // ---- Findings -------------------------------------------------------------
  y = drawSectionHeading(doc, y, "Findings");
  if (data.findings.length === 0) {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(9.5);
    doc.setTextColor(...FAINT);
    doc.text("No discrepancies found.", MARGIN_X, y);
    y += 8;
  } else {
    const severityOrder: Record<Finding["severity"], number> = { critical: 0, warning: 1, info: 2 };
    const sorted = [...data.findings].sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);
    for (const f of sorted) {
      y = drawFindingCard(doc, f, currency, y);
    }
  }
  y += 3;

  // ---- Daily ledger — compact table with header repeated across page breaks.
  if (data.ledger.length > 0) {
    y = drawSectionHeading(doc, y, "Daily Ledger");

    const colX = {
      date: MARGIN_X,
      orders: MARGIN_X + 40,
      sales: MARGIN_X + 70,
      commission: MARGIN_X + 115,
      net: MARGIN_X + 160,
    };
    const drawTableHeader = (headerY: number): number => {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7.5);
      doc.setTextColor(...FAINT);
      doc.text("DATE", colX.date, headerY);
      doc.text("ORDERS", colX.orders, headerY, { align: "right" });
      doc.text("SALES", colX.sales, headerY, { align: "right" });
      doc.text("COMMISSION", colX.commission, headerY, { align: "right" });
      doc.text("EXPECTED NET", colX.net, headerY, { align: "right" });
      let hy = headerY + 2;
      doc.setDrawColor(...BORDER);
      doc.line(MARGIN_X, hy, MARGIN_X + CONTENT_W, hy);
      hy += 4.5;
      return hy;
    };
    y = ensureSpace(doc, y, 8);
    y = drawTableHeader(y);

    for (const row of data.ledger) {
      const pagesBefore = doc.getNumberOfPages();
      y = ensureSpace(doc, y, 6);
      if (doc.getNumberOfPages() !== pagesBefore) {
        y = drawTableHeader(y);
      }
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(...INK);
      doc.text(formatDateRange(row.date), colX.date, y);
      doc.text(String(row.orders), colX.orders, y, { align: "right" });
      doc.text(fmt(row.sales, currency), colX.sales, y, { align: "right" });
      doc.text(fmt(row.commission_at_agreed_rate, currency), colX.commission, y, { align: "right" });
      doc.setFont("helvetica", "bold");
      doc.text(fmt(row.expected_net, currency), colX.net, y, { align: "right" });
      y += 5.5;
    }

    if (data.ledgerTotals) {
      y = ensureSpace(doc, y, 8);
      doc.setDrawColor(...INK);
      doc.setLineWidth(0.4);
      doc.line(MARGIN_X, y, MARGIN_X + CONTENT_W, y);
      y += 5.5;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      doc.setTextColor(...INK);
      doc.text("Total", colX.date, y);
      doc.text(String(data.ledgerTotals.orders), colX.orders, y, { align: "right" });
      doc.text(fmt(data.ledgerTotals.sales, currency), colX.sales, y, { align: "right" });
      doc.text(fmt(data.ledgerTotals.commission_at_agreed_rate, currency), colX.commission, y, { align: "right" });
      doc.setTextColor(...GREEN);
      doc.text(fmt(data.ledgerTotals.expected_net, currency), colX.net, y, { align: "right" });
      y += 9;
    }
  }

  // ---- Evidence & lineage ----------------------------------------------------
  if (documents.length) {
    y = drawSectionHeading(doc, y, "Evidence & Lineage", "Source provenance and processing disclosures");
    y = drawTable(doc, y, [
      { header: "Filename", x: MARGIN_X, w: 44 },
      { header: "SHA-256", x: MARGIN_X + 46, w: 26 },
      { header: "Platform", x: MARGIN_X + 74, w: 22 },
      { header: "Period", x: MARGIN_X + 98, w: 36 },
      { header: "Overrides", x: MARGIN_X + 136, w: CONTENT_W - 136 },
    ], documents.map(d => ({
      cells: [
        d.file_name,
        d.result.evidence_sha256 ? `${d.result.evidence_sha256.slice(0, 10)}…` : "Not recorded",
        d.platform_guess ?? "Not established",
        d.result.period_start ? formatDateRange(d.result.period_start, d.result.period_end) : "Not established",
        d.treat_sales_as_net ? "Sales treated as net" : "None",
      ],
    })), 4);
  }

  // ---- Methodology & limitations ----------------------------------------------
  y = drawSectionHeading(doc, y, "Methodology & Limitations");
  const methodology = [
    "Align periods before comparing totals; disjoint periods are never treated as exceptions.",
    "Quarantine duplicate dates rather than summing potentially duplicated turnover.",
    "Recompute expected commission using merchant-supplied commercial terms.",
    "Separate merchant assertions, single-source estimates and corroborated evidence.",
    "Do not present estimates as claims-ready recoveries.",
    "Current limitations: no reviewed signed contract unless noted above, no order-level vouching where only aggregates exist, and no bank-file content review unless separately performed.",
  ];
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.8);
  doc.setTextColor(...MUTED);
  for (const item of methodology) {
    const lines = doc.splitTextToSize(`•  ${item}`, CONTENT_W - 4);
    y = ensureSpace(doc, y, lines.length * 4 + 1.5);
    doc.text(lines, MARGIN_X + 2, y);
    y += lines.length * 4 + 1.5;
  }

  drawBrandedFooters(doc, theme);
  const suffix = data.coverage ? data.coverage.start.replace(/[^a-z0-9]+/gi, "-") : new Date().toISOString().slice(0, 10);
  doc.save(`${slugifyBrand(branding.brandName)}-commission-audit-${suffix}.pdf`);
}
