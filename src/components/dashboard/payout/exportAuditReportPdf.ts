// Branded PDF export for the multi-document Commission Audit (see
// src/lib/commission-audit.ts). Reuses the same pdfBranding.ts primitives and
// visual conventions already established by exportPayoutReportPdf.ts — clean
// bordered cards for data, color reserved for severity/total figures.
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
  drawLabel,
  ensureSpace,
  resolveBrandTheme,
  slugifyBrand,
  tint,
} from "@/lib/pdfBranding";
import { formatDateRange, summarizeAudit, type Finding, type LedgerRow } from "@/lib/commission-audit";

export type CommissionAuditPdfData = {
  ledger: LedgerRow[];
  ledgerTotals: LedgerRow | null;
  findings: Finding[];
  coverage: { start: string; end: string } | null;
  netSalesOverrideDocs?: string[];
};

function fmt(n: number, currency: string): string {
  return `${currency} ${Math.round(n).toLocaleString("en-US")}`;
}

function todayLabel(): string {
  return new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
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

function drawFindingCard(doc: jsPDF, f: Finding, currency: string, startY: number): number {
  const color = SEVERITY_COLOR[f.severity];
  const detailLines = doc.splitTextToSize(f.detail, CONTENT_W - 16);
  // Shows the actual investigation, not just the conclusion — every column
  // that could explain the charge, checked and confirmed at its real value.
  const checkedText = f.trace?.checkedColumns?.length
    ? `Checked: ${f.trace.checkedColumns.map(c => `${c.label} (${fmt(c.value, currency)})`).join(", ")} — all read zero.`
    : null;
  const checkedLines = checkedText ? doc.splitTextToSize(checkedText, CONTENT_W - 16) : [];
  const boxH = 13 + detailLines.length * 4.4 + checkedLines.length * 4.2 + (checkedLines.length ? 1.5 : 0);
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
  const titleMaxW = f.amount != null ? CONTENT_W - 55 : CONTENT_W - 14;
  const titleLines = doc.splitTextToSize(f.title, titleMaxW);
  doc.text(titleLines[0], MARGIN_X + 7, y + 11);

  if (f.amount != null) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10.5);
    doc.setTextColor(...color);
    doc.text(fmt(f.amount, currency), MARGIN_X + CONTENT_W - 7, y + 11, { align: "right" });
  }

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.3);
  doc.setTextColor(...MUTED);
  doc.text(detailLines, MARGIN_X + 7, y + 16.5);

  if (checkedLines.length) {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(7.8);
    doc.setTextColor(...FAINT);
    doc.text(checkedLines, MARGIN_X + 7, y + 16.5 + detailLines.length * 4.4 + 1.5);
  }

  return y + boxH + 5;
}

export async function exportCommissionAuditPdf(data: CommissionAuditPdfData, currency: string, documentCount = 1): Promise<void> {
  const theme = resolveBrandTheme();
  const { branding, accent } = theme;
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const summary = summarizeAudit(data, documentCount);

  const coverageLabel = data.coverage ? formatDateRange(data.coverage.start, data.coverage.end) : "";
  const subtitle = `Commission reconciliation${coverageLabel ? `  |  ${coverageLabel}` : ""}  |  ${todayLabel()}`;
  let y = await drawBrandedHeader(doc, theme, "Commission Audit Report", subtitle);

  // Disclosed override — drawn first and unmissable, never folded into a
  // smaller note, since it changes the actual figures below away from what
  // this report's own cross-check found. Never silent.
  if (data.netSalesOverrideDocs?.length) {
    const overrideText = `You've marked ${data.netSalesOverrideDocs.join(", ")} as already net of commission — no commission was deducted again for those days below. This is your own override, not something this audit verified; its own cross-check (see Findings) may say otherwise. Figures in this report follow your setting.`;
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

  // Executive summary — the one-sentence takeaway, before any numbers.
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...INK);
  const headlineLines = doc.splitTextToSize(summary.headline, CONTENT_W);
  doc.text(headlineLines, MARGIN_X, y);
  y += headlineLines.length * 5.4 + 8;

  // Summary strip — 2 rows of 3 (not 6-across) so each card is wide enough
  // that "QAR 12,663"-style values never wrap inside a fixed-height card.
  const blocks: { label: string; value: string; color: RGB }[] = [
    { label: "Documents", value: String(summary.documentCount), color: INK },
    { label: "Days Covered", value: String(summary.daysCovered), color: INK },
    { label: "Total Sales", value: fmt(summary.totalSales, currency), color: INK },
    { label: "Commission / Order", value: summary.commissionPerOrder != null ? `${currency} ${summary.commissionPerOrder.toFixed(2)}` : "—", color: INK },
    { label: "Expected Net", value: fmt(summary.totalExpectedNet, currency), color: accent },
    { label: "Findings", value: `${summary.criticalCount} critical, ${summary.warningCount} to review`, color: summary.criticalCount > 0 ? RED : INK },
  ];
  const cols = 3;
  const gap = 4.5;
  const bw = (CONTENT_W - gap * (cols - 1)) / cols;
  const cardH = 22;
  blocks.forEach((b, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
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
    doc.setFontSize(b.label === "Findings" ? 9.5 : 13);
    doc.setTextColor(...b.color);
    const valLines = doc.splitTextToSize(b.value, bw - 10);
    doc.text(valLines, x + 5, cardY + 16.5);
  });
  const rows = Math.ceil(blocks.length / cols);
  y += rows * cardH + (rows - 1) * gap + 10;

  // Findings
  y = ensureSpace(doc, y, 14);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12.5);
  doc.setTextColor(...INK);
  doc.text("Findings", MARGIN_X, y);
  y += 7;

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

  // Daily ledger — compact table with header repeated across page breaks.
  if (data.ledger.length > 0) {
    y = ensureSpace(doc, y, 16);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12.5);
    doc.setTextColor(...INK);
    doc.text("Daily Ledger", MARGIN_X, y);
    y += 7;

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
    }
  }

  drawBrandedFooters(doc, theme);
  const suffix = data.coverage ? data.coverage.start.replace(/[^a-z0-9]+/gi, "-") : new Date().toISOString().slice(0, 10);
  doc.save(`${slugifyBrand(branding.brandName)}-commission-audit-${suffix}.pdf`);
}
