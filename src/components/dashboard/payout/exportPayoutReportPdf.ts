// Branded PDF export for Expected Payout Check results — reuses the same
// pdfBranding.ts primitives as every other export in the app (pricing,
// insights, field intel) so this looks like a PrizeSkout report.
//
// Deliberately varies visual treatment by content type instead of wrapping
// every section in the same tinted-box-with-left-bar pattern: data (the
// breakdown table, summary stats) reads as clean white/bordered content;
// color is reserved for the one number that actually matters (the headline
// payout) and the one thing that needs to alarm (the unexplained-charge
// warning). A page where everything is equally loud reads as generated,
// not designed.
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

/** What Total Payout should have been if commission had actually been
 * charged at the agreed rate — not just the rate gap in isolation. This is
 * the figure that belongs in the headline "you should have received" spot,
 * not the platform's own (already rate-inflated) stated total. */
function computeAgreedRateCorrection(d: PayoutCheckPdfData) {
  const hasRates = d.commission_rate_pct != null && d.effective_commission_pct != null;
  const expectedAtAgreed = hasRates
    ? d.expected_payout + ((d.commission_amount ?? 0) - d.sub_total_sum * (d.commission_rate_pct ?? 0) / 100)
    : d.expected_payout;
  const delta = expectedAtAgreed - d.expected_payout;
  const showDelta = hasRates && Math.abs(delta) > 0.01;
  return { hasRates, expectedAtAgreed, delta, showDelta };
}

/** A small triangular warning glyph built from vector primitives — not a
 * font glyph, so it can't hit the Unicode/standard-font corruption that a
 * "⚠" character does in jsPDF's Helvetica. */
function drawWarningIcon(doc: jsPDF, cx: number, cy: number, size: number, color: RGB) {
  const h = size * 0.9;
  doc.setFillColor(...color);
  doc.triangle(cx, cy - h / 2, cx - size / 2, cy + h / 2, cx + size / 2, cy + h / 2, "F");
  doc.setFillColor(255, 255, 255);
  doc.rect(cx - size * 0.05, cy - h * 0.12, size * 0.1, size * 0.32, "F");
  doc.circle(cx, cy + h * 0.3, size * 0.06, "F");
}

/** Clean bordered table (white, not filled) for the itemized breakdown —
 * reads like a real statement line item list, not a colored callout. */
function drawBreakdown(doc: jsPDF, d: PayoutCheckPdfData, currency: string, startY: number, accent: RGB): number {
  const lines: { label: string; value: number }[] = [
    { label: "Gross Sales", value: d.sub_total_sum },
    { label: "Commission Charge", value: -(d.commission_amount ?? 0) },
    { label: "Additional Charges", value: -(d.additional_charges ?? 0) },
    { label: "Additional Income & Vouchers", value: d.additional_income ?? 0 },
    ...(d.extra_line_items ?? []),
  ];
  const rowH = 7;
  const hasRates = d.commission_rate_pct != null && d.effective_commission_pct != null;
  const padTop = 6;
  const padBottom = 8 + (hasRates ? 8 : 0);
  const boxH = padTop + lines.length * rowH + 9 + padBottom;
  let y = ensureSpace(doc, startY, boxH + 12);

  y = drawLabel(doc, "PAYOUT BREAKDOWN", MARGIN_X, y);
  y += 2;
  const boxTop = y;

  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(...BORDER);
  doc.setLineWidth(0.3);
  doc.roundedRect(MARGIN_X, y, CONTENT_W, boxH, 2, 2, "FD");
  y += padTop + 3;

  for (let i = 0; i < lines.length; i++) {
    const li = lines[i];
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    doc.setTextColor(...MUTED);
    doc.text(li.label, MARGIN_X + 7, y);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...(li.value < 0 ? RED : INK));
    const valText = `${li.value < 0 ? "-" : ""}${fmt(Math.abs(li.value), currency)}`;
    doc.text(valText, MARGIN_X + CONTENT_W - 7, y, { align: "right" });
    if (i < lines.length - 1) {
      doc.setDrawColor(...tint(BORDER, 0.4));
      doc.setLineWidth(0.15);
      doc.line(MARGIN_X + 7, y + 2.6, MARGIN_X + CONTENT_W - 7, y + 2.6);
    }
    y += rowH;
  }

  // Double rule before the total — the accounting-statement convention.
  doc.setDrawColor(...INK);
  doc.setLineWidth(0.4);
  doc.line(MARGIN_X + 7, y, MARGIN_X + CONTENT_W - 7, y);
  doc.line(MARGIN_X + 7, y + 1, MARGIN_X + CONTENT_W - 7, y + 1);
  y += 6.5;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10.5);
  doc.setTextColor(...INK);
  doc.text("Total Payout (platform's statement)", MARGIN_X + 7, y);
  doc.text(fmt(d.expected_payout, currency), MARGIN_X + CONTENT_W - 7, y, { align: "right" });

  if (hasRates) {
    y += 7;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(...MUTED);
    doc.text(`Agreed rate ${d.commission_rate_pct}%`, MARGIN_X + 7, y);

    const badgeText = `effective ${(d.effective_commission_pct ?? 0).toFixed(2)}%`;
    const badgeW = doc.getTextWidth(badgeText) + 6;
    const badgeX = MARGIN_X + 7 + doc.getTextWidth(`Agreed rate ${d.commission_rate_pct}%   `);
    doc.setFillColor(...tint(accent, 0.85));
    doc.roundedRect(badgeX, y - 3.6, badgeW, 5, 1.5, 1.5, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(...accent);
    doc.text(badgeText, badgeX + 3, y - 0.2);
  }

  return boxTop + boxH + 8;
}

function drawUnexplainedWarning(doc: jsPDF, charge: { label: string; amount: number }, currency: string, startY: number, orderCount?: number): number {
  let text = `${fmt(charge.amount, currency)} in ${charge.label} has no itemized breakdown anywhere in this statement — worth asking the platform to explain it.`;
  // Traced as a per-order rate — a plausible clue to take back to the
  // platform even though the statement itself has no itemized column for it.
  if (orderCount) {
    const perOrder = charge.amount / orderCount;
    text += ` Traced as a rate: approximately ${currency} ${perOrder.toFixed(2)} per order across ${orderCount} orders.`;
  }
  const lines = doc.splitTextToSize(text, CONTENT_W - 22);
  const boxH = Math.max(16, 8 + lines.length * 4.6);
  let y = ensureSpace(doc, startY, boxH + 8);
  doc.setFillColor(...tint(AMBER, 0.94));
  doc.setDrawColor(...tint(AMBER, 0.5));
  doc.setLineWidth(0.4);
  doc.roundedRect(MARGIN_X, y, CONTENT_W, boxH, 2, 2, "FD");
  drawWarningIcon(doc, MARGIN_X + 9, y + boxH / 2, 6, AMBER);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.5);
  doc.setTextColor(150, 100, 10);
  doc.text("UNEXPLAINED CHARGE", MARGIN_X + 18, y + 6.5);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(120, 78, 8);
  doc.text(lines, MARGIN_X + 18, y + 11.5);
  return y + boxH + 8;
}

/** The one element on the page allowed to be loud: a pale band with a solid
 * top rule (not a filled box with a left bar, which reads as "callout" —
 * this reads as a total line on a statement, scaled up). */
function drawTotalCallout(doc: jsPDF, d: PayoutCheckPdfData, currency: string, startY: number): number {
  const { expectedAtAgreed, delta, showDelta } = computeAgreedRateCorrection(d);
  const headline = showDelta ? expectedAtAgreed : d.expected_payout;
  const boxH = showDelta ? 38 : 30;
  let y = ensureSpace(doc, startY, boxH + 6);
  doc.setFillColor(...tint(GREEN, 0.93));
  doc.rect(MARGIN_X, y, CONTENT_W, boxH, "F");
  doc.setFillColor(...GREEN);
  doc.rect(MARGIN_X, y, CONTENT_W, 1.4, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(...MUTED);
  doc.text("YOU SHOULD HAVE RECEIVED", MARGIN_X + 8, y + 11);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(27);
  doc.setTextColor(...GREEN);
  doc.text(fmt(headline, currency), MARGIN_X + 8, y + 24);

  if (showDelta) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...MUTED);
    const suffix = delta > 0 ? "less than you should have received" : "more than your agreed rate alone would have produced";
    const note = `Corrected for your agreed rate — the platform's own statement said ${fmt(d.expected_payout, currency)},`;
    const note2 = `${fmt(Math.abs(delta), currency)} ${suffix}.`;
    doc.text(note, MARGIN_X + 8, y + 31);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...RED);
    doc.text(note2, MARGIN_X + 8, y + 35.2);
  } else {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(...MUTED);
    doc.text("Compare this to your bank deposit for the same period.", MARGIN_X + 8, y + 31);
  }
  return y + boxH + 8;
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
  y += introLines.length * 4.6 + 8;

  // Summary strip — clean white stat cards, not filled. Only the one figure
  // worth drawing the eye to (commission taken) carries the accent color.
  const blocks: { label: string; value: string; color: RGB }[] = [
    { label: "Orders Checked", value: String(data.order_count), color: INK },
    { label: "Total Sales", value: fmt(data.sub_total_sum, currency), color: INK },
    { label: "Commission Rate", value: data.commission_rate_pct != null ? `${data.commission_rate_pct}%` : "—", color: INK },
    { label: "Platform Commission", value: fmt(data.commission_amount ?? (data.sub_total_sum - data.expected_payout), currency), color: accent },
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
    doc.setFontSize(13);
    doc.setTextColor(...b.color);
    doc.text(b.value, x + 4.5, y + 16.5);
  });
  y += cardH + 10;

  if (data.effective_commission_pct != null) {
    y = drawBreakdown(doc, data, currency, y, accent);
  }
  if (data.unexplained_charge) {
    y = drawUnexplainedWarning(doc, data.unexplained_charge, currency, y, data.order_count);
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
  const { branding, accent } = theme;
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  let y = await drawBrandedHeader(doc, theme, "Payout & Repricing History", `Full export  |  ${todayLabel()}`);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(...MUTED);
  const intro = "Every payout check you've run and every automated price change made on your behalf, in one document.";
  const introLines = doc.splitTextToSize(intro, CONTENT_W);
  doc.text(introLines, MARGIN_X, y);
  y += introLines.length * 4.6 + 8;

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
    const boxH = 13 + trendLines.length * 5.5;
    y = ensureSpace(doc, y, boxH + 10);
    y = drawLabel(doc, "COMMISSION PATTERN", MARGIN_X, y);
    y += 2;
    const boxTop = y;
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(...BORDER);
    doc.setLineWidth(0.3);
    doc.roundedRect(MARGIN_X, y, CONTENT_W, boxH, 2, 2, "FD");
    doc.setFillColor(...accent);
    doc.rect(MARGIN_X, y, 1.4, boxH, "F");
    let ty = y + 9;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...INK);
    for (const line of trendLines) {
      doc.text(line, MARGIN_X + 7, ty);
      ty += 5.5;
    }
    y = boxTop + boxH + 9;
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
      const cardH = chk.unexplained_charge ? 20 : 16;
      y = ensureSpace(doc, y, cardH + 4);
      doc.setFillColor(255, 255, 255);
      doc.setDrawColor(...BORDER);
      doc.setLineWidth(0.3);
      doc.roundedRect(MARGIN_X, y, CONTENT_W, cardH, 2, 2, "FD");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9.5);
      doc.setTextColor(...INK);
      const dateStr = chk.created_at ? new Date(chk.created_at).toLocaleDateString("en-US") : "";
      doc.text(`${platformName(chk.platform)}  ·  ${chk.source === "upload" ? "Uploaded file" : "Live check"}  ·  ${dateStr}`, MARGIN_X + 6, y + 7);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(...MUTED);
      doc.text(`${chk.order_count} orders  ·  ${fmt(chk.sub_total_sum, currency)} sales`, MARGIN_X + 6, y + 12.5);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11.5);
      doc.setTextColor(...GREEN);
      const { expectedAtAgreed: chkExpectedAtAgreed, showDelta: chkShowDelta } = computeAgreedRateCorrection(chk);
      doc.text(fmt(chkShowDelta ? chkExpectedAtAgreed : chk.expected_payout, currency), MARGIN_X + CONTENT_W - 6, y + 9.5, { align: "right" });
      if (chk.unexplained_charge) {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(7.5);
        doc.setTextColor(150, 100, 10);
        doc.text("(!) unexplained charge", MARGIN_X + CONTENT_W - 6, y + 16.5, { align: "right" });
      }
      y += cardH + 4;
    }
  }
  y += 3;

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
