import { jsPDF } from "jspdf";
import { resolveReason } from "@/locales/reasons";
import {
  BORDER,
  BLUE,
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

export type PricingRecommendation = {
  id: string;
  product: string;
  category: string;
  channel: "Online" | "In-Store";
  current: number;
  recommended: number;
  reason: string;
  unitImpact: string;
  marginImpact: string;
  netMonthly: string;
  confidence: number;
};

const CURRENCY = "QAR";

function fmtPrice(n: number) {
  return `${CURRENCY} ${n.toLocaleString("en-US", {
    minimumFractionDigits: n % 1 ? 2 : 0,
    maximumFractionDigits: 2,
  })}`;
}

function impactColor(value: string): RGB {
  if (value.startsWith("+")) return GREEN;
  if (value.startsWith("-")) return RED;
  return MUTED;
}

function confidenceColor(score: number, accent: RGB): RGB {
  if (score > 90) return GREEN;
  if (score >= 80) return accent;
  return [245, 158, 11];
}

export async function exportPricingPdf(recs: PricingRecommendation[]) {
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
    "AI Pricing Recommendations",
    `Pricing report  |  ${today}`,
  );

  // Intro
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(...INK);
  doc.text("Recommendations to act on this week", MARGIN_X, y);
  y += 6;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...MUTED);
  const intro =
    "Each recommendation is based on live competitor prices and your margin floor. The headline tells you the action — lower, hold, or raise — and the exact QAR figure. Review the ones marked lower-confidence manually.";
  const introLines = doc.splitTextToSize(intro, CONTENT_W);
  doc.text(introLines, MARGIN_X, y);
  y += introLines.length * 4.6 + 4;

  // Summary strip
  drawPricingSummary(doc, y, recs, accent, accentTint);
  y += 24;

  for (let i = 0; i < recs.length; i++) {
    y = drawRecommendationCard(doc, recs[i], i + 1, y, accent, accentTint);
    y += 6;
  }

  drawBrandedFooters(doc, theme);
  doc.save(`${slugifyBrand(branding.brandName)}-pricing-recommendations.pdf`);
}

function drawPricingSummary(
  doc: jsPDF,
  y: number,
  recs: PricingRecommendation[],
  accent: RGB,
  accentTint: RGB,
) {
  // Average price change across all recommendations (real number, not elasticity-derived).
  const avgPctChange =
    recs.length > 0
      ? recs.reduce((s, r) => s + ((r.recommended - r.current) / r.current) * 100, 0) /
        recs.length
      : 0;
  const formattedAvgChange =
    `${avgPctChange >= 0 ? "+" : ""}${avgPctChange.toFixed(1)}%`;

  const avgConf = Math.round(
    recs.reduce((s, r) => s + r.confidence, 0) / Math.max(1, recs.length),
  );

  const blocks: { label: string; value: string; color: RGB; bg: RGB }[] = [
    {
      label: "Recommendations",
      value: String(recs.length),
      color: accent,
      bg: accentTint,
    },
    {
      label: "Avg price adjustment",
      value: formattedAvgChange,
      color: avgPctChange >= 0 ? GREEN : RED,
      bg: avgPctChange >= 0 ? [240, 253, 244] : [254, 242, 242],
    },
    {
      label: "Avg model confidence",
      value: `${avgConf}%`,
      color: BLUE,
      bg: [239, 246, 255],
    },
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

function estimateRecHeight(
  doc: jsPDF,
  r: PricingRecommendation,
  innerW: number,
): number {
  const { headline, detail } = resolveReason(r.reason, r.current, r.recommended);
  let h = 8; // top padding
  h += 5; // title
  h += 6; // tag row
  h += 5; // label
  h += doc.splitTextToSize(headline, innerW).length * 4.6;
  if (detail) h += doc.splitTextToSize(detail, innerW).length * 4.2 + 4;
  else h += 4;
  h += 24; // price + impact strip
  h += 8;  // bottom padding
  return h;
}

function drawRecommendationCard(
  doc: jsPDF,
  r: PricingRecommendation,
  index: number,
  startY: number,
  accent: RGB,
  accentTint: RGB,
): number {
  const innerW = CONTENT_W - 12;
  const cardH = estimateRecHeight(doc, r, innerW);
  let y = ensureSpace(doc, startY, cardH);

  const cardTop = y;
  const cardX = MARGIN_X;
  const cardW = CONTENT_W;
  const innerX = cardX + 6;
  y += 8;

  // Title
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12.5);
  doc.setTextColor(...INK);
  doc.text(`${index}. ${r.product}`, innerX, y);

  // Confidence badge (right)
  const conf = r.confidence;
  const cColor = confidenceColor(conf, accent);
  const badgeW = 28;
  const badgeX = cardX + cardW - 6 - badgeW;
  doc.setFillColor(cColor[0], cColor[1], cColor[2]);
  doc.roundedRect(badgeX, y - 5, badgeW, 7, 1.5, 1.5, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(255, 255, 255);
  doc.text(`${conf}% confidence`, badgeX + badgeW / 2, y, { align: "center" });

  y += 5;

  // Meta line
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...MUTED);
  doc.text(`${r.category}  |  ${r.channel}`, innerX, y);
  y += 6;

  // Reason — resolve v2 JSON blob or transform legacy string to plain language.
  const { headline: reasonHeadline, detail: reasonDetail } = resolveReason(
    r.reason,
    r.current,
    r.recommended,
  );
  y = drawLabel(doc, "RECOMMENDATION", innerX, y);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(...INK);
  const headlineLines = doc.splitTextToSize(reasonHeadline, innerW);
  doc.text(headlineLines, innerX, y);
  y += headlineLines.length * 4.6;
  if (reasonDetail) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(...MUTED);
    const detailLines = doc.splitTextToSize(reasonDetail, innerW);
    doc.text(detailLines, innerX, y);
    y += detailLines.length * 4.2 + 4;
  } else {
    y += 4;
  }

  // Price + impact strip
  const stripTop = y;
  const stripH = 22;
  doc.setFillColor(...tint(accent, 0.96));
  doc.roundedRect(innerX, stripTop, innerW, stripH, 2, 2, "F");

  // Current → Recommended
  let cx = innerX + 5;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(...FAINT);
  doc.text("CURRENT", cx, stripTop + 6);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(...MUTED);
  doc.text(fmtPrice(r.current), cx, stripTop + 14);

  cx += 36;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...MUTED);
  doc.text(">", cx, stripTop + 14);

  cx += 6;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(...FAINT);
  doc.text("RECOMMENDED", cx, stripTop + 6);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(...GREEN);
  doc.text(fmtPrice(r.recommended), cx, stripTop + 14);

  // Right side: price change (real number, not elasticity-derived).
  const pctChange = ((r.recommended - r.current) / r.current) * 100;
  const pctLabel = `${pctChange >= 0 ? "+" : ""}${pctChange.toFixed(1)}%`;
  const pctColor: RGB = pctChange >= 0 ? GREEN : RED;
  const rightX = innerX + innerW - 44;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(...FAINT);
  doc.text("PRICE CHANGE", rightX, stripTop + 6);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...pctColor);
  doc.text(pctLabel, rightX, stripTop + 14);

  y = stripTop + stripH + 4;

  // Card border
  doc.setDrawColor(...BORDER);
  doc.setLineWidth(0.3);
  doc.roundedRect(cardX, cardTop, cardW, y - cardTop - 2, 2.5, 2.5, "S");

  return y;
}
