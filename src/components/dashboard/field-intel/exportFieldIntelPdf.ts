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
  SURFACE,
  type RGB,
  drawBrandedFooters,
  drawBrandedHeader,
  drawLabel,
  ensureSpace,
  resolveBrandTheme,
  slugifyBrand,
} from "@/lib/pdfBranding";

export type FieldObservation = {
  product: string;
  store: string;
  price: number;
  condition: "Regular price" | "On promotion" | "Clearance";
  promoDetail?: string;
  status: "Reviewed" | "Pending" | "Flagged";
  agent: string;
  time: string;
};

export type PriceGap = {
  product: string;
  competitor: string;
  online: number;
  inStore: number;
  gap: string;
  direction: "up" | "down";
  observed: string;
};

const CURRENCY = "QAR";

function fmtPrice(n: number) {
  return `${CURRENCY} ${n.toLocaleString("en-US", {
    minimumFractionDigits: n % 1 ? 2 : 0,
    maximumFractionDigits: 2,
  })}`;
}

function statusColor(s: FieldObservation["status"]): RGB {
  if (s === "Reviewed") return GREEN;
  if (s === "Pending") return AMBER;
  return RED;
}

export async function exportFieldIntelPdf(input: {
  observations: FieldObservation[];
  gaps: PriceGap[];
}) {
  const theme = resolveBrandTheme();
  const { branding, accent, accentTint } = theme;
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const today = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  let y = await drawBrandedHeader(
    doc,
    theme,
    "Field Intelligence Report",
    `Field intel  |  ${today}`,
  );

  // Intro
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(...INK);
  doc.text("What your field team saw on the shelf", MARGIN_X, y);
  y += 6;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...MUTED);
  const intro =
    "Web scrapers cannot see in-store prices, promotional displays, or stock conditions. These observations were collected by your field agents in person. Use them to catch online vs in-store gaps and seasonal promotions before they hit your category.";
  const introLines = doc.splitTextToSize(intro, CONTENT_W);
  doc.text(introLines, MARGIN_X, y);
  y += introLines.length * 4.6 + 4;

  // Summary strip
  drawFieldSummary(doc, y, input, accent, accentTint);
  y += 24;

  // Observations section
  y = ensureSpace(doc, y, 16);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(...INK);
  doc.text("Recent observations", MARGIN_X, y);
  y += 6;

  for (let i = 0; i < input.observations.length; i++) {
    y = drawObservationRow(doc, input.observations[i], y, accent);
  }
  y += 4;

  // Gaps section
  y = ensureSpace(doc, y, 24);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(...INK);
  doc.text("In-store vs online price discrepancies", MARGIN_X, y);
  y += 6;

  y = drawGapsTable(doc, input.gaps, y);

  drawBrandedFooters(doc, theme);
  doc.save(`${slugifyBrand(branding.brandName)}-field-intel.pdf`);
}

function drawFieldSummary(
  doc: jsPDF,
  y: number,
  input: { observations: FieldObservation[]; gaps: PriceGap[] },
  accent: RGB,
  accentTint: RGB,
) {
  const pending = input.observations.filter((o) => o.status === "Pending").length;
  const flagged = input.observations.filter((o) => o.status === "Flagged").length;

  const blocks: { label: string; value: string; color: RGB; bg: RGB }[] = [
    {
      label: "Observations",
      value: String(input.observations.length),
      color: accent,
      bg: accentTint,
    },
    { label: "Pending review", value: String(pending), color: AMBER, bg: [255, 251, 235] },
    { label: "Price gaps", value: String(input.gaps.length), color: BLUE, bg: [239, 246, 255] },
    { label: "Flagged", value: String(flagged), color: RED, bg: [254, 242, 242] },
  ];
  const gap = 4;
  const w = (CONTENT_W - gap * (blocks.length - 1)) / blocks.length;
  blocks.forEach((b, i) => {
    const x = MARGIN_X + i * (w + gap);
    doc.setFillColor(b.bg[0], b.bg[1], b.bg[2]);
    doc.roundedRect(x, y, w, 20, 2, 2, "F");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...FAINT);
    doc.text(b.label.toUpperCase(), x + 5, y + 6);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(b.color[0], b.color[1], b.color[2]);
    doc.text(b.value, x + 5, y + 15);
  });
}

function drawObservationRow(
  doc: jsPDF,
  o: FieldObservation,
  startY: number,
  accent: RGB,
): number {
  const innerW = CONTENT_W - 12;
  // Estimate height
  const promoLines = o.promoDetail
    ? doc.splitTextToSize(o.promoDetail, innerW - 60)
    : [];
  const rowH = 18 + (promoLines.length ? promoLines.length * 4 + 2 : 0);
  let y = ensureSpace(doc, startY, rowH + 2);

  const cardX = MARGIN_X;
  const cardTop = y;
  const innerX = cardX + 6;

  // Light surface background
  doc.setFillColor(...SURFACE);
  doc.roundedRect(cardX, cardTop, CONTENT_W, rowH, 2, 2, "F");

  // Status accent bar
  const sColor = statusColor(o.status);
  doc.setFillColor(sColor[0], sColor[1], sColor[2]);
  doc.rect(cardX, cardTop, 1.2, rowH, "F");

  y = cardTop + 6;

  // Product
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10.5);
  doc.setTextColor(...INK);
  doc.text(o.product, innerX, y);

  // Price (right)
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(accent[0], accent[1], accent[2]);
  doc.text(fmtPrice(o.price), cardX + CONTENT_W - 6, y, { align: "right" });

  y += 5;

  // Store + condition
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...MUTED);
  doc.text(`${o.store}  -  ${o.condition}`, innerX, y);

  // Status pill (right)
  const statusLabel = o.status.toUpperCase();
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(sColor[0], sColor[1], sColor[2]);
  doc.text(statusLabel, cardX + CONTENT_W - 6, y, { align: "right" });

  y += 5;

  // Agent / time
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...FAINT);
  doc.text(`Agent: ${o.agent}  |  ${o.time}`, innerX, y);

  if (promoLines.length) {
    y += 4;
    doc.setFont("helvetica", "italic");
    doc.setFontSize(8.5);
    doc.setTextColor(...MUTED);
    doc.text(promoLines, innerX, y);
  }

  return cardTop + rowH + 3;
}

function drawGapsTable(doc: jsPDF, gaps: PriceGap[], startY: number): number {
  const colX = {
    product: MARGIN_X + 2,
    competitor: MARGIN_X + 60,
    online: MARGIN_X + 95,
    inStore: MARGIN_X + 122,
    gap: MARGIN_X + 150,
    observed: MARGIN_X + 168,
  };

  let y = startY;

  // Header row
  y = ensureSpace(doc, y, 10);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(...FAINT);
  doc.text("PRODUCT", colX.product, y);
  doc.text("COMPETITOR", colX.competitor, y);
  doc.text("ONLINE", colX.online, y, { align: "right" });
  doc.text("IN-STORE", colX.inStore, y, { align: "right" });
  doc.text("GAP", colX.gap, y, { align: "right" });
  doc.text("OBSERVED", colX.observed, y);
  y += 2;
  doc.setDrawColor(...BORDER);
  doc.setLineWidth(0.2);
  doc.line(MARGIN_X, y, MARGIN_X + CONTENT_W, y);
  y += 5;

  for (const g of gaps) {
    y = ensureSpace(doc, y, 10);

    // Zebra row
    if (gaps.indexOf(g) % 2 === 1) {
      doc.setFillColor(...SURFACE);
      doc.rect(MARGIN_X, y - 4, CONTENT_W, 9, "F");
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...INK);
    doc.text(g.product, colX.product, y);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...MUTED);
    doc.text(g.competitor, colX.competitor, y);

    doc.setTextColor(...INK);
    doc.text(fmtPrice(g.online), colX.online, y, { align: "right" });

    doc.setFont("helvetica", "bold");
    doc.text(fmtPrice(g.inStore), colX.inStore, y, { align: "right" });

    const gapColor: RGB = g.direction === "up" ? AMBER : GREEN;
    doc.setTextColor(gapColor[0], gapColor[1], gapColor[2]);
    doc.text(g.gap, colX.gap, y, { align: "right" });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(...FAINT);
    doc.text(g.observed, colX.observed, y);

    y += 7;
  }

  // Closing rule
  doc.setDrawColor(...BORDER);
  doc.setLineWidth(0.2);
  doc.line(MARGIN_X, y - 3, MARGIN_X + CONTENT_W, y - 3);

  y += 4;

  // Insight callout
  y = ensureSpace(doc, y, 22);
  const purple: RGB = [124, 58, 237];
  doc.setFillColor(245, 243, 255);
  doc.roundedRect(MARGIN_X, y, CONTENT_W, 18, 2, 2, "F");
  doc.setFillColor(purple[0], purple[1], purple[2]);
  doc.rect(MARGIN_X, y, 1.2, 18, "F");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...MUTED);
  const insight = doc.splitTextToSize(
    "Several competitors are offering lower prices in-store than online. This is common during seasonal promotions and clearance events. Field intel helps you catch these gaps that web scrapers cannot see.",
    CONTENT_W - 10,
  );
  doc.text(insight, MARGIN_X + 5, y + 6);

  return y + 22;
}

// Re-exports for callers that want a one-stop import
export { drawLabel };
