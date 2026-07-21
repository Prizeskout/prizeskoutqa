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
} from "@/lib/pdfBranding";
import type { Finding, LedgerRow } from "@/lib/commission-audit";

export type CommissionAuditPdfData = {
  ledger: LedgerRow[];
  ledgerTotals: LedgerRow | null;
  findings: Finding[];
  coverage: { start: string; end: string } | null;
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
  const boxH = 13 + detailLines.length * 4.4;
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

  return y + boxH + 5;
}

export async function exportCommissionAuditPdf(data: CommissionAuditPdfData, currency: string): Promise<void> {
  const theme = resolveBrandTheme();
  const { branding, accent } = theme;
  const doc = new jsPDF({ unit: "mm", format: "a4" });

  const coverageLabel = data.coverage ? `${data.coverage.start} to ${data.coverage.end}` : "";
  const subtitle = `Commission reconciliation${coverageLabel ? `  |  ${coverageLabel}` : ""}  |  ${todayLabel()}`;
  let y = await drawBrandedHeader(doc, theme, "Commission Audit Report", subtitle);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(...MUTED);
  const intro = "A per-day reconciliation against your agreed commission rate, with every discrepancy across the uploaded documents surfaced below. See the in-app chart for the full Sales vs. Commission trend.";
  const introLines = doc.splitTextToSize(intro, CONTENT_W);
  doc.text(introLines, MARGIN_X, y);
  y += introLines.length * 4.6 + 8;

  // Summary strip
  const criticalCount = data.findings.filter(f => f.severity === "critical").length;
  const warningCount = data.findings.filter(f => f.severity === "warning").length;
  const blocks: { label: string; value: string; color: RGB }[] = [
    { label: "Days Covered", value: String(data.ledger.length), color: INK },
    { label: "Total Sales", value: data.ledgerTotals ? fmt(data.ledgerTotals.sales, currency) : "—", color: INK },
    { label: "Expected Net", value: data.ledgerTotals ? fmt(data.ledgerTotals.expected_net, currency) : "—", color: accent },
    { label: "Findings", value: `${criticalCount} critical, ${warningCount} to review`, color: criticalCount > 0 ? RED : INK },
  ];
  const gap = 5;
  const bw = (CONTENT_W - gap * (blocks.length - 1)) / blocks.length;
  const cardH = 22;
  blocks.forEach((b, i) => {
    const x = MARGIN_X + i * (bw + gap);
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(...BORDER);
    doc.setLineWidth(0.3);
    doc.roundedRect(x, y, bw, cardH, 2, 2, "FD");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.8);
    doc.setTextColor(...FAINT);
    doc.text(b.label.toUpperCase(), x + 4.5, y + 7.5);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(b.label === "Findings" ? 9.5 : 13);
    doc.setTextColor(...b.color);
    const valLines = doc.splitTextToSize(b.value, bw - 9);
    doc.text(valLines, x + 4.5, y + 16.5);
  });
  y += cardH + 10;

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
      doc.text(row.date, colX.date, y);
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
