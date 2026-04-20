import { jsPDF } from "jspdf";

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

// Brand palette
const INK = [26, 26, 24] as const;
const MUTED = [107, 107, 107] as const;
const FAINT = [154, 154, 154] as const;
const ORANGE = [234, 88, 12] as const;
const GREEN = [34, 197, 94] as const;
const BLUE = [59, 130, 246] as const;
const SURFACE = [250, 250, 249] as const;
const BORDER = [229, 226, 219] as const;

const PAGE_W = 210;
const PAGE_H = 297;
const MARGIN_X = 18;
const CONTENT_W = PAGE_W - MARGIN_X * 2;

export async function exportPatternsPdf(patterns: Pattern[]) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  let y = 0;

  // ---------- Cover header ----------
  doc.setFillColor(...INK);
  doc.rect(0, 0, PAGE_W, 38, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...ORANGE);
  doc.text("PRIZESKOUT", MARGIN_X, 16);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.setTextColor(255, 255, 255);
  doc.text("Competitor Behavior Patterns", MARGIN_X, 26);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(200, 200, 200);
  const today = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  doc.text(`Intelligence report  |  ${today}`, MARGIN_X, 33);

  y = 50;

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
  drawSummaryStrip(doc, y, patterns.length);
  y += 24;

  // ---------- Patterns ----------
  for (let i = 0; i < patterns.length; i++) {
    y = drawPatternCard(doc, patterns[i], i + 1, y);
    y += 6;
  }

  // ---------- Footer on every page ----------
  const total = doc.getNumberOfPages();
  for (let p = 1; p <= total; p++) {
    doc.setPage(p);
    doc.setDrawColor(...BORDER);
    doc.setLineWidth(0.2);
    doc.line(MARGIN_X, PAGE_H - 12, PAGE_W - MARGIN_X, PAGE_H - 12);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...FAINT);
    doc.text("PrizeSkout  -  Confidential intelligence", MARGIN_X, PAGE_H - 7);
    doc.text(`Page ${p} of ${total}`, PAGE_W - MARGIN_X, PAGE_H - 7, {
      align: "right",
    });
  }

  doc.save("prizeskout-behavior-patterns.pdf");
}

function drawSummaryStrip(doc: jsPDF, y: number, count: number) {
  const blocks = [
    { label: "Monthly value", value: "+QAR 45K", color: GREEN, bg: [240, 253, 244] as const },
    { label: "Patterns detected", value: String(count), color: ORANGE, bg: [254, 243, 235] as const },
    { label: "Time to replicate", value: "8-14 months", color: BLUE, bg: [239, 246, 255] as const },
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

function ensureSpace(doc: jsPDF, y: number, needed: number): number {
  if (y + needed > PAGE_H - 18) {
    doc.addPage();
    return 20;
  }
  return y;
}

function estimateCardHeight(doc: jsPDF, p: Pattern, innerW: number): number {
  // Mirrors the layout in drawPatternCard so we can reserve full card height upfront.
  let h = 8; // top padding
  h += 5; // title row baseline
  h += 6; // meta line
  h += 4; // detected pattern label
  const patternLines = doc.splitTextToSize(p.pattern, innerW);
  h += patternLines.length * 4.6;
  if (p.depth) h += 4;
  h += 5;
  h += 4; // evidence label
  for (const ev of p.evidence) {
    const descLines = doc.splitTextToSize(ev.description, innerW - 32);
    h += Math.max(5, descLines.length * 4.4) + 1;
  }
  h += 3;
  const recLines = doc.splitTextToSize(p.recommendation, innerW - 8);
  h += recLines.length * 4.6 + 22; // recommendation box
  h += 8; // bottom padding
  return h;
}

function drawPatternCard(
  doc: jsPDF,
  p: Pattern,
  index: number,
  startY: number,
): number {
  const innerW = CONTENT_W - 12;
  const cardH = estimateCardHeight(doc, p, innerW);
  // Reserve the full card height. If it doesn't fit, push to a new page.
  let y = ensureSpace(doc, startY, cardH);

  // Card background
  const cardTop = y;
  const cardX = MARGIN_X;
  const cardW = CONTENT_W;

  // We'll draw content first, measure, then stroke a border at the end.
  const innerX = cardX + 6;
  y += 8;

  // Title row
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(...INK);
  doc.text(`${index}. ${p.competitor}`, innerX, y);

  // Confidence badge (right)
  const conf = p.confidence;
  const confColor =
    conf > 90 ? GREEN : conf >= 80 ? ORANGE : ([245, 158, 11] as const);
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
    // dot
    doc.setFillColor(...ORANGE);
    doc.circle(innerX + 1.2, y - 1.4, 0.9, "F");
    // date
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(...INK);
    doc.text(ev.date, innerX + 5, y);
    // desc
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
  doc.setFillColor(254, 243, 235);
  doc.roundedRect(innerX, recTop, innerW, recBoxH, 2, 2, "F");
  doc.setFillColor(...ORANGE);
  doc.rect(innerX, recTop, 1.2, recBoxH, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...ORANGE);
  doc.text("RECOMMENDATION FOR SNOONU", innerX + 5, recTop + 6);

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

function drawLabel(doc: jsPDF, label: string, x: number, y: number): number {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(...FAINT);
  doc.text(label, x, y);
  // underline accent dot
  doc.setFillColor(...SURFACE);
  return y + 4;
}
