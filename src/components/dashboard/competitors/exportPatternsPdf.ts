import { jsPDF } from "jspdf";
import {
  BORDER,
  BLUE,
  CONTENT_W,
  FAINT,
  GREEN,
  INK,
  MARGIN_X,
  MUTED,
  PAGE_H,
  type RGB,
  drawBrandedFooters,
  drawBrandedHeader,
  drawLabel,
  ensureSpace,
  resolveBrandTheme,
  slugifyBrand,
} from "@/lib/pdfBranding";

type Pattern = {
  competitor: string;
  channel: "Online" | "In-Store" | "Both";
  category: string;
  detectionPeriod: string;
  confidence: number;
  pattern: string;
  depth: string | null;
  evidence: { date: string; description: string }[];
  recommendation: string;
  impact: string;
};

export async function exportPatternsPdf(patterns: Pattern[]) {
  const theme = resolveBrandTheme();
  const { branding, accent, accentTint } = theme;

  const doc = new jsPDF({ unit: "mm", format: "a4" });
  let y = await drawBrandedHeader(doc, theme, "Competitor Behavior Patterns");

  // ---------- Intro ----------
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(...INK);
  doc.text("Patterns no one else can see", MARGIN_X, y);
  y += 6;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...MUTED);
  const intro =
    "These behavioral patterns were detected by monitoring competitors continuously over 8 to 14 months. They reveal recurring pricing strategies, promotional rhythms, and stock management habits. A competitor or in-house tool starting today would need the same amount of time to detect them.";
  const introLines = doc.splitTextToSize(intro, CONTENT_W);
  doc.text(introLines, MARGIN_X, y);
  y += introLines.length * 4.6 + 4;

  // Summary strip
  drawSummaryStrip(doc, y, patterns.length, accent, accentTint);
  y += 24;

  // ---------- Patterns ----------
  const recLabel = `RECOMMENDATION FOR ${branding.brandName.toUpperCase()}`;
  for (let i = 0; i < patterns.length; i++) {
    y = drawPatternCard(doc, patterns[i], i + 1, y, accent, accentTint, recLabel);
    y += 6;
  }

  drawBrandedFooters(doc, theme);
  doc.save(`${slugifyBrand(branding.brandName)}-behavior-patterns.pdf`);
}

function drawSummaryStrip(
  doc: jsPDF,
  y: number,
  count: number,
  accent: RGB,
  accentTint: RGB,
) {
  const blocks: { label: string; value: string; color: RGB; bg: RGB }[] = [
    { label: "Monthly value", value: "+QAR 45K", color: GREEN, bg: [240, 253, 244] },
    { label: "Patterns detected", value: String(count), color: accent, bg: accentTint },
    { label: "Time to replicate", value: "8-14 months", color: BLUE, bg: [239, 246, 255] },
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

function estimateCardHeight(doc: jsPDF, p: Pattern, innerW: number): number {
  let h = 8;
  h += 5;
  h += 6;
  h += 4;
  const patternLines = doc.splitTextToSize(p.pattern, innerW);
  h += patternLines.length * 4.6;
  if (p.depth) h += 4;
  h += 5;
  h += 4;
  for (const ev of p.evidence) {
    const descLines = doc.splitTextToSize(ev.description, innerW - 32);
    h += Math.max(5, descLines.length * 4.4) + 1;
  }
  h += 3;
  const recLines = doc.splitTextToSize(p.recommendation, innerW - 8);
  h += recLines.length * 4.6 + 22;
  h += 8;
  return h;
}

function drawPatternCard(
  doc: jsPDF,
  p: Pattern,
  index: number,
  startY: number,
  accent: RGB,
  accentTint: RGB,
  recLabel: string,
): number {
  const innerW = CONTENT_W - 12;
  const cardH = estimateCardHeight(doc, p, innerW);
  let y = ensureSpace(doc, startY, cardH);

  const cardTop = y;
  const cardX = MARGIN_X;
  const cardW = CONTENT_W;
  const innerX = cardX + 6;
  y += 8;

  // Title row
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(...INK);
  doc.text(`${index}. ${p.competitor}`, innerX, y);

  // Confidence badge
  const conf = p.confidence;
  const confColor: RGB =
    conf > 90 ? GREEN : conf >= 80 ? accent : [245, 158, 11];
  const badgeW = 28;
  const badgeX = cardX + cardW - 6 - badgeW;
  doc.setFillColor(confColor[0], confColor[1], confColor[2]);
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
  doc.text(
    `${p.channel}  |  ${p.category}  |  ${p.detectionPeriod}`,
    innerX,
    y,
  );
  y += 6;

  // Detected pattern
  y = drawLabel(doc, "DETECTED PATTERN", innerX, y);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...INK);
  const patternLines = doc.splitTextToSize(p.pattern, innerW);
  doc.text(patternLines, innerX, y);
  y += patternLines.length * 4.6;
  if (p.depth) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...MUTED);
    doc.text(`Typical depth: ${p.depth}`, innerX, y + 4);
    y += 4;
  }
  y += 5;

  // Evidence
  y = drawLabel(doc, "EVIDENCE", innerX, y);
  for (const ev of p.evidence) {
    const descLines = doc.splitTextToSize(ev.description, innerW - 32);
    const rowH = Math.max(5, descLines.length * 4.4) + 1;
    doc.setFillColor(accent[0], accent[1], accent[2]);
    doc.circle(innerX + 1.2, y - 1.4, 0.9, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(...INK);
    doc.text(ev.date, innerX + 5, y);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...MUTED);
    doc.text(descLines, innerX + 32, y);
    y += rowH;
  }
  y += 3;

  // Recommendation block
  const recLines = doc.splitTextToSize(p.recommendation, innerW - 8);
  const recBoxH = recLines.length * 4.6 + 22;
  const recTop = y;
  doc.setFillColor(accentTint[0], accentTint[1], accentTint[2]);
  doc.roundedRect(innerX, recTop, innerW, recBoxH, 2, 2, "F");
  doc.setFillColor(accent[0], accent[1], accent[2]);
  doc.rect(innerX, recTop, 1.2, recBoxH, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(accent[0], accent[1], accent[2]);
  doc.text(recLabel, innerX + 5, recTop + 6);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(...INK);
  doc.text(recLines, innerX + 5, recTop + 12);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...FAINT);
  doc.text("Estimated impact:", innerX + 5, recTop + recBoxH - 5);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...GREEN);
  doc.text(p.impact, innerX + 32, recTop + recBoxH - 5);

  y = recTop + recBoxH + 6;

  // Card border
  doc.setDrawColor(...BORDER);
  doc.setLineWidth(0.3);
  doc.roundedRect(cardX, cardTop, cardW, y - cardTop - 2, 2.5, 2.5, "S");

  return y;
}

// Re-export for callers that still want PAGE_H reference
export { PAGE_H };
