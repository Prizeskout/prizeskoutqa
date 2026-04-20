import { jsPDF } from "jspdf";
import { getBranding, hexToRgb } from "@/lib/brandingStore";

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

type RGB = readonly [number, number, number];

// Static palette
const INK: RGB = [26, 26, 24];
const MUTED: RGB = [107, 107, 107];
const FAINT: RGB = [154, 154, 154];
const GREEN: RGB = [34, 197, 94];
const BLUE: RGB = [59, 130, 246];
const BORDER: RGB = [229, 226, 219];
const DEFAULT_ACCENT: RGB = [234, 88, 12]; // PrizeSkout orange

const PAGE_W = 210;
const PAGE_H = 297;
const MARGIN_X = 18;
const CONTENT_W = PAGE_W - MARGIN_X * 2;

/** Lighten an RGB toward white by `amount` (0..1). Used for tinted backgrounds. */
function tint(rgb: RGB, amount: number): RGB {
  const f = Math.max(0, Math.min(1, amount));
  return [
    Math.round(rgb[0] + (255 - rgb[0]) * f),
    Math.round(rgb[1] + (255 - rgb[1]) * f),
    Math.round(rgb[2] + (255 - rgb[2]) * f),
  ];
}

/**
 * Load a logo data URL into a PNG via a hidden canvas. Handles SVG by drawing
 * it onto a canvas at a comfortable size for the PDF header.
 * Returns a PNG data URL plus the natural width/height in pixels.
 */
function loadLogoAsPng(
  dataUrl: string,
): Promise<{ png: string; w: number; h: number } | null> {
  return new Promise((resolve) => {
    if (!dataUrl || typeof window === "undefined") return resolve(null);
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      // Render at up to 320px on the longer edge for crisp output without bloat.
      const max = 320;
      const scale = Math.min(1, max / Math.max(img.width || max, img.height || max));
      const w = Math.max(1, Math.round((img.width || max) * scale));
      const h = Math.max(1, Math.round((img.height || max) * scale));
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) return resolve(null);
      try {
        ctx.drawImage(img, 0, 0, w, h);
        resolve({ png: canvas.toDataURL("image/png"), w, h });
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = dataUrl;
  });
}

export async function exportPatternsPdf(patterns: Pattern[]) {
  const branding = getBranding();
  const accent: RGB = hexToRgb(branding.accentColor) ?? DEFAULT_ACCENT;
  const accentTint: RGB = tint(accent, 0.92); // very pale background fill

  const doc = new jsPDF({ unit: "mm", format: "a4" });
  let y = 0;

  // ---------- Cover header ----------
  doc.setFillColor(...INK);
  doc.rect(0, 0, PAGE_W, 38, "F");

  // Try to render the brand logo on the right
  let titleX = MARGIN_X;
  const logo = await loadLogoAsPng(branding.logoDataUrl);
  if (logo) {
    // Fit logo into a 32mm wide x 14mm tall slot at top-right
    const slotW = 32;
    const slotH = 14;
    const ratio = logo.w / logo.h;
    let drawW = slotW;
    let drawH = slotW / ratio;
    if (drawH > slotH) {
      drawH = slotH;
      drawW = slotH * ratio;
    }
    const logoX = PAGE_W - MARGIN_X - drawW;
    const logoY = (38 - drawH) / 2;
    try {
      doc.addImage(logo.png, "PNG", logoX, logoY, drawW, drawH);
    } catch {
      // ignore image errors, keep going without logo
    }
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...accent);
  doc.text(branding.brandName.toUpperCase(), titleX, 16);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.setTextColor(255, 255, 255);
  doc.text("Competitor Behavior Patterns", titleX, 26);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(200, 200, 200);
  const today = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  doc.text(`Intelligence report  |  ${today}`, titleX, 33);

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
  drawSummaryStrip(doc, y, patterns.length, accent, accentTint);
  y += 24;

  // ---------- Patterns ----------
  for (let i = 0; i < patterns.length; i++) {
    y = drawPatternCard(doc, patterns[i], i + 1, y, accent, accentTint);
    y += 6;
  }

  // ---------- Footer on every page ----------
  const total = doc.getNumberOfPages();
  const footerLeft = `${branding.brandName}  -  Confidential intelligence`;
  for (let p = 1; p <= total; p++) {
    doc.setPage(p);
    doc.setDrawColor(...BORDER);
    doc.setLineWidth(0.2);
    doc.line(MARGIN_X, PAGE_H - 12, PAGE_W - MARGIN_X, PAGE_H - 12);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...FAINT);
    doc.text(footerLeft, MARGIN_X, PAGE_H - 7);
    doc.text(`Page ${p} of ${total}`, PAGE_W - MARGIN_X, PAGE_H - 7, {
      align: "right",
    });
  }

  const slug = branding.brandName
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "report";
  doc.save(`${slug}-behavior-patterns.pdf`);
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

  // Draw content first, then stroke the card border at the end.
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
