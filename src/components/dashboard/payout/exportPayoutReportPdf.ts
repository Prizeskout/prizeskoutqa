// Branded PDF export for Expected Payout Check results — reuses the same
// pdfBranding.ts primitives as every other export in the app (pricing,
// insights, field intel) so this looks like a PrizeSkout report, not a
// generic document dump.
import { jsPDF } from "jspdf";
import {
  AMBER,
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

export type PayoutCheckPdfData = {
  id?: string;
  source?: string | null;
  platform?: string | null;
  order_count: number;
  sub_total_sum: number;
  commission_rate_pct?: number | null;
  expected_payout: number;
  period_start?: string | null;
  period_end?: string | null;
  commission_amount?: number | null;
  additional_charges?: number | null;
  additional_income?: number | null;
  effective_commission_pct?: number | null;
  extra_line_items?: { label: string; value: number }[] | null;
  unexplained_charge?: { label: string; amount: number } | null;
  created_at?: string;
};

export type RepricingPdfData = {
  sku: string | null;
  target_channel: string | null;
  old_price: number | null;
  new_price: number;
  currency: string;
  status: string;
  created_at: string;
};

const PLATFORM_LABEL: Record<string, string> = {
  talabat: "Talabat", jahez: "Jahez", snoonu: "Snoonu", deliveroo: "Deliveroo", keeta: "Keeta",
};

function fmt(n: number, currency: string): string {
  return `${currency} ${Math.round(n).toLocaleString("en-US")}`;
}

function todayLabel(): string {
  return new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}

function platformName(p?: string | null): string {
  return (p && PLATFORM_LABEL[p]) || p || "—";
}

function periodLabel(d: Pick<PayoutCheckPdfData, "period_start" | "period_end">): string {
  if (!d.period_start) return "";
  return d.period_end && d.period_end !== d.period_start ? `${d.period_start} – ${d.period_end}` : d.period_start;
}

/** Draws the itemized breakdown box used by both the single-check and full
 * history reports. Returns the new y-cursor. */
function drawBreakdown(doc: jsPDF, d: PayoutCheckPdfData, currency: string, startY: number, accent: RGB): number {
  const lines: { label: string; value: number }[] = [
    { label: "Gross Sales", value: d.sub_total_sum },
    { label: "Commission Charge", value: -(d.commission_amount ?? 0) },
    { label: "Additional Charges", value: -(d.additional_charges ?? 0) },
    { label: "Additional Income & Vouchers", value: d.additional_income ?? 0 },
    ...(d.extra_line_items ?? []),
  ];
  const rowH = 6.2;
  const boxH = 10 + lines.length * rowH + 10 + (d.commission_rate_pct != null ? 6 : 0);
  let y = ensureSpace(doc, startY, boxH + 6);
  const boxTop = y;

  doc.setFillColor(...tint(accent, 0.95));
  doc.roundedRect(MARGIN_X, y, CONTENT_W, boxH, 2.5, 2.5, "F");
  y += 8;
  y = drawLabel(doc, "PAYOUT BREAKDOWN", MARGIN_X + 6, y);
  y += 1;

  for (const li of lines) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    doc.setTextColor(...MUTED);
    doc.text(li.label, MARGIN_X + 6, y);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...(li.value < 0 ? RED : INK));
    const valText = `${li.value < 0 ? "-" : ""}${fmt(Math.abs(li.value), currency)}`;
    doc.text(valText, MARGIN_X + CONTENT_W - 6, y, { align: "right" });
    y += rowH;
  }

  doc.setDrawColor(...BORDER);
  doc.setLineWidth(0.25);
  doc.line(MARGIN_X + 6, y, MARGIN_X + CONTENT_W - 6, y);
  y += 5.5;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...INK);
  doc.text("Total Payout", MARGIN_X + 6, y);
  doc.text(fmt(d.expected_payout, currency), MARGIN_X + CONTENT_W - 6, y, { align: "right" });

  if (d.commission_rate_pct != null && d.effective_commission_pct != null) {
    y += 6;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(...MUTED);
    doc.text(
      `Agreed rate ${d.commission_rate_pct}%  ->  actual effective rate ${d.effective_commission_pct.toFixed(2)}%`,
      MARGIN_X + 6, y,
    );
  }

  return boxTop + boxH + 6;
}

function drawUnexplainedWarning(doc: jsPDF, charge: { label: string; amount: number }, currency: string, startY: number): number {
  const text = `There's ${fmt(charge.amount, currency)} in ${charge.label} with no itemized breakdown anywhere in this statement — worth asking the platform to explain it.`;
  const lines = doc.splitTextToSize(text, CONTENT_W - 14);
  const boxH = 8 + lines.length * 4.6;
  let y = ensureSpace(doc, startY, boxH + 6);
  doc.setFillColor(...tint(AMBER, 0.9));
  doc.roundedRect(MARGIN_X, y, CONTENT_W, boxH, 2.5, 2.5, "F");
  doc.setFillColor(...AMBER);
  doc.rect(MARGIN_X, y, 1.4, boxH, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...AMBER);
  doc.text(lines, MARGIN_X + 6, y + 6);
  return y + boxH + 6;
}

function drawTotalCallout(doc: jsPDF, d: PayoutCheckPdfData, currency: string, startY: number): number {
  const boxH = 26;
  let y = ensureSpace(doc, startY, boxH + 6);
  doc.setFillColor(...tint(GREEN, 0.92));
  doc.roundedRect(MARGIN_X, y, CONTENT_W, boxH, 2.5, 2.5, "F");
  doc.setFillColor(...GREEN);
  doc.rect(MARGIN_X, y, 1.6, boxH, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...MUTED);
  doc.text("YOU SHOULD HAVE RECEIVED", MARGIN_X + 8, y + 8);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(...GREEN);
  doc.text(fmt(d.expected_payout, currency), MARGIN_X + 8, y + 19);
  return y + boxH + 6;
}

/** Single Expected Payout Check, full detail — mirrors PayoutResultDetail. */
export async function exportPayoutCheckPdf(data: PayoutCheckPdfData, currency: string): Promise<void> {
  const theme = resolveBrandTheme();
  const { branding, accent } = theme;
  const doc = new jsPDF({ unit: "mm", format: "a4" });

  const period = periodLabel(data);
  const subtitle = `${platformName(data.platform)}${period ? `  |  ${period}` : ""}  |  ${todayLabel()}`;
  let y = await drawBrandedHeader(doc, theme, "Expected Payout Check", subtitle);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(...MUTED);
  const sourceNote = data.effective_commission_pct != null
    ? "This is the platform's own stated payout for this period, read directly from the payout statement — not an estimate."
    : "Estimated from order history and the commission rate on file. Compare against your bank deposit for the same period.";
  const introLines = doc.splitTextToSize(sourceNote, CONTENT_W);
  doc.text(introLines, MARGIN_X, y);
  y += introLines.length * 4.6 + 6;

  // Summary strip
  const blocks: { label: string; value: string; color: RGB }[] = [
    { label: "Orders Checked", value: String(data.order_count), color: INK },
    { label: "Total Sales", value: fmt(data.sub_total_sum, currency), color: INK },
    { label: "Commission Rate", value: data.commission_rate_pct != null ? `${data.commission_rate_pct}%` : "—", color: INK },
    { label: "Platform Commission", value: fmt(data.commission_amount ?? (data.sub_total_sum - data.expected_payout), currency), color: accent },
  ];
  const gap = 4;
  const bw = (CONTENT_W - gap * (blocks.length - 1)) / blocks.length;
  blocks.forEach((b, i) => {
    const x = MARGIN_X + i * (bw + gap);
    doc.setFillColor(...tint(accent, 0.94));
    doc.roundedRect(x, y, bw, 20, 2, 2, "F");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(...FAINT);
    doc.text(b.label.toUpperCase(), x + 4, y + 6);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12.5);
    doc.setTextColor(...b.color);
    doc.text(b.value, x + 4, y + 15);
  });
  y += 26;

  if (data.effective_commission_pct != null) {
    y = drawBreakdown(doc, data, currency, y, accent);
  }
  if (data.unexplained_charge) {
    y = drawUnexplainedWarning(doc, data.unexplained_charge, currency, y);
  }
  y = drawTotalCallout(doc, data, currency, y);

  drawBrandedFooters(doc, theme);
  const suffix = period ? period.replace(/[^a-z0-9]+/gi, "-") : new Date().toISOString().slice(0, 10);
  doc.save(`${slugifyBrand(branding.brandName)}-payout-check-${suffix}.pdf`);
}

/** Full History tab export: commission trend (if 2+ statements), every
 * payout check (compact), every repricing event (compact table). */
export async function exportPayoutHistoryPdf(
  payoutChecks: PayoutCheckPdfData[],
  repricings: RepricingPdfData[],
  currency: string,
): Promise<void> {
  const theme = resolveBrandTheme();
  const { branding, accent, accentTint } = theme;
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  let y = await drawBrandedHeader(doc, theme, "Payout & Repricing History", `Full export  |  ${todayLabel()}`);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(...MUTED);
  const intro = "Every payout check you've run and every automated price change made on your behalf, in one document.";
  const introLines = doc.splitTextToSize(intro, CONTENT_W);
  doc.text(introLines, MARGIN_X, y);
  y += introLines.length * 4.6 + 6;

  // Commission Pattern trend — same logic as the in-app History tab.
  const trendRows = payoutChecks.filter(r => r.effective_commission_pct != null && r.commission_rate_pct != null);
  if (trendRows.length >= 2) {
    const avgAgreed = trendRows.reduce((s, r) => s + (r.commission_rate_pct ?? 0), 0) / trendRows.length;
    const avgEffective = trendRows.reduce((s, r) => s + (r.effective_commission_pct ?? 0), 0) / trendRows.length;
    const excessTotal = trendRows.reduce((s, r) => s + r.sub_total_sum * ((r.effective_commission_pct ?? 0) - (r.commission_rate_pct ?? 0)) / 100, 0);
    const unexplained = trendRows.filter(r => r.unexplained_charge);
    const unexplainedTotal = unexplained.reduce((s, r) => s + (r.unexplained_charge?.amount ?? 0), 0);

    const trendLines = [
      `Avg. agreed -> effective rate (across ${trendRows.length} statements): ${avgAgreed.toFixed(1)}% -> ${avgEffective.toFixed(2)}%`,
      ...(Math.abs(excessTotal) > 0.01 ? [`Extra commission paid beyond agreed rate: ${excessTotal < 0 ? "-" : ""}${fmt(Math.abs(excessTotal), currency)}`] : []),
      ...(unexplained.length > 0 ? [`Unexplained Additional Charges: ${unexplained.length}/${trendRows.length} statements, totaling ${fmt(unexplainedTotal, currency)}`] : []),
    ];
    const boxH = 12 + trendLines.length * 5.5;
    y = ensureSpace(doc, y, boxH + 8);
    doc.setFillColor(...tint(accent, 0.94));
    doc.roundedRect(MARGIN_X, y, CONTENT_W, boxH, 2.5, 2.5, "F");
    doc.setFillColor(...accent);
    doc.rect(MARGIN_X, y, 1.6, boxH, "F");
    let ty = y + 8;
    ty = drawLabel(doc, "COMMISSION PATTERN", MARGIN_X + 7, ty);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...INK);
    for (const line of trendLines) {
      doc.text(line, MARGIN_X + 7, ty + 2);
      ty += 5.5;
    }
    y += boxH + 8;
  }

  // Payout Check History
  y = ensureSpace(doc, y, 16);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12.5);
  doc.setTextColor(...INK);
  doc.text("Payout Check History", MARGIN_X, y);
  y += 7;

  if (payoutChecks.length === 0) {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(9.5);
    doc.setTextColor(...FAINT);
    doc.text("No payout checks yet.", MARGIN_X, y);
    y += 8;
  } else {
    for (const chk of payoutChecks) {
      const cardH = chk.unexplained_charge ? 19 : 16;
      y = ensureSpace(doc, y, cardH + 4);
      doc.setFillColor(...(accentTint));
      doc.roundedRect(MARGIN_X, y, CONTENT_W, cardH, 2, 2, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9.5);
      doc.setTextColor(...INK);
      const dateStr = chk.created_at ? new Date(chk.created_at).toLocaleDateString("en-US") : "";
      doc.text(`${platformName(chk.platform)}  ·  ${chk.source === "upload" ? "Uploaded file" : "Live check"}  ·  ${dateStr}`, MARGIN_X + 5, y + 6.5);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(...MUTED);
      doc.text(`${chk.order_count} orders  ·  ${fmt(chk.sub_total_sum, currency)} sales`, MARGIN_X + 5, y + 12);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(...GREEN);
      doc.text(fmt(chk.expected_payout, currency), MARGIN_X + CONTENT_W - 5, y + 9, { align: "right" });
      if (chk.unexplained_charge) {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(7.5);
        doc.setTextColor(...AMBER);
        doc.text("(!) unexplained charge", MARGIN_X + CONTENT_W - 5, y + 16.5, { align: "right" });
      }
      y += cardH + 3;
    }
  }
  y += 4;

  // Repricing History
  y = ensureSpace(doc, y, 16);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12.5);
  doc.setTextColor(...INK);
  doc.text("Repricing History", MARGIN_X, y);
  y += 7;

  if (repricings.length === 0) {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(9.5);
    doc.setTextColor(...FAINT);
    doc.text("No automated price changes yet.", MARGIN_X, y);
  } else {
    // Compact table
    const colX = { date: MARGIN_X, channel: MARGIN_X + 28, sku: MARGIN_X + 55, price: MARGIN_X + 120, status: MARGIN_X + CONTENT_W - 22 };
    const drawTableHeader = (headerY: number): number => {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7.5);
      doc.setTextColor(...FAINT);
      doc.text("DATE", colX.date, headerY);
      doc.text("CHANNEL", colX.channel, headerY);
      doc.text("SKU", colX.sku, headerY);
      doc.text("PRICE CHANGE", colX.price, headerY);
      doc.text("STATUS", colX.status, headerY);
      let hy = headerY + 2;
      doc.setDrawColor(...BORDER);
      doc.line(MARGIN_X, hy, MARGIN_X + CONTENT_W, hy);
      hy += 4.5;
      return hy;
    };
    y = ensureSpace(doc, y, 8);
    y = drawTableHeader(y);

    for (const r of repricings) {
      const pagesBefore = doc.getNumberOfPages();
      y = ensureSpace(doc, y, 6);
      if (doc.getNumberOfPages() !== pagesBefore) {
        y = drawTableHeader(y);
      }
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(...INK);
      doc.text(new Date(r.created_at).toLocaleDateString("en-US"), colX.date, y);
      doc.text(r.target_channel ?? "—", colX.channel, y);
      const skuText = (r.sku ?? "—").length > 22 ? `${(r.sku ?? "").slice(0, 20)}...` : (r.sku ?? "—");
      doc.text(skuText, colX.sku, y);
      const priceText = r.old_price != null ? `${r.old_price} -> ${r.new_price} ${r.currency}` : `${r.new_price} ${r.currency}`;
      doc.text(priceText, colX.price, y);
      const statusColor = r.status === "success" ? GREEN : r.status === "failed" || r.status === "schema_mismatch" || r.status === "circuit_open" ? RED : AMBER;
      doc.setTextColor(...statusColor);
      doc.setFont("helvetica", "bold");
      doc.text(r.status.toUpperCase(), colX.status, y);
      y += 5.5;
    }
  }

  drawBrandedFooters(doc, theme);
  doc.save(`${slugifyBrand(branding.brandName)}-payout-history-${new Date().toISOString().slice(0, 10)}.pdf`);
}
