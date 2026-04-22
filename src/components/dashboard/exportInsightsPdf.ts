// Export a combined PDF report of the AI insights for the Pricing and
// Competitors dashboards, scoped to a chosen time window.

import { jsPDF } from "jspdf";
import {
  BORDER,
  CONTENT_W,
  FAINT,
  INK,
  MARGIN_X,
  MUTED,
  type RGB,
  drawBrandedFooters,
  drawBrandedHeader,
  drawLabel,
  ensureSpace,
  resolveBrandTheme,
  slugifyBrand,
  tint,
} from "@/lib/pdfBranding";
import type { AIInsight, InsightWindow } from "@/server/ai-insights.functions";

const WINDOW_LABEL: Record<InsightWindow, string> = {
  "24h": "Last 24 hours",
  "7d": "Last 7 days",
  "30d": "Last 30 days",
};

type Section = {
  title: string;
  window: InsightWindow;
  insight: AIInsight | null;
};

export async function exportInsightsPdf(sections: Section[]) {
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
    "AI Insights Report",
    `Pricing & Competitors  |  ${today}`,
  );

  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(...INK);
  doc.text("AI-generated reads on this week's data", MARGIN_X, y);
  y += 6;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...MUTED);
  const intro =
    "Each section is a snapshot of one dashboard, summarized by your AI analyst. Every bullet and action references the specific records (products, rules, competitor moves) it was derived from — listed in the Sources block at the end of the section.";
  const introLines = doc.splitTextToSize(intro, CONTENT_W);
  doc.text(introLines, MARGIN_X, y);
  y += introLines.length * 4.6 + 8;

  for (const s of sections) {
    y = drawSection(doc, s, y, accent, accentTint);
    y += 8;
  }

  drawBrandedFooters(doc, theme);
  doc.save(`${slugifyBrand(branding.brandName)}-ai-insights.pdf`);
}

function drawSection(
  doc: jsPDF,
  section: Section,
  startY: number,
  accent: RGB,
  accentTint: RGB,
): number {
  let y = ensureSpace(doc, startY, 60);

  // Section header band
  doc.setFillColor(accentTint[0], accentTint[1], accentTint[2]);
  doc.roundedRect(MARGIN_X, y, CONTENT_W, 14, 2, 2, "F");
  doc.setFillColor(accent[0], accent[1], accent[2]);
  doc.rect(MARGIN_X, y, 1.5, 14, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...INK);
  doc.text(section.title, MARGIN_X + 6, y + 6);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...MUTED);
  doc.text(
    `Time window: ${WINDOW_LABEL[section.window]}`,
    MARGIN_X + 6,
    y + 11,
  );

  if (section.insight?.generated_at) {
    const when = new Date(section.insight.generated_at).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
    doc.text(`Generated ${when}`, MARGIN_X + CONTENT_W - 6, y + 11, { align: "right" });
  }
  y += 18;

  if (!section.insight) {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(10);
    doc.setTextColor(...FAINT);
    doc.text(
      "No insight has been generated yet for this window.",
      MARGIN_X,
      y + 4,
    );
    return y + 10;
  }

  // Headline
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(...INK);
  const headlineLines = doc.splitTextToSize(section.insight.headline, CONTENT_W);
  doc.text(headlineLines, MARGIN_X, y);
  y += headlineLines.length * 5.2 + 4;

  // Bullets
  if (section.insight.bullets.length > 0) {
    y = drawLabel(doc, "OBSERVATIONS", MARGIN_X, y);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    doc.setTextColor(...INK);
    for (const b of section.insight.bullets) {
      const text = b.cites.length
        ? `${b.text}  [${b.cites.join(", ")}]`
        : b.text;
      const lines = doc.splitTextToSize(text, CONTENT_W - 6);
      y = ensureSpace(doc, y, lines.length * 4.8 + 2);
      doc.setFillColor(accent[0], accent[1], accent[2]);
      doc.circle(MARGIN_X + 1.4, y - 1.4, 0.9, "F");
      doc.text(lines, MARGIN_X + 5, y);
      y += lines.length * 4.8 + 2;
    }
    y += 3;
  }

  // Actions
  if (section.insight.actions.length > 0) {
    y = drawLabel(doc, "RECOMMENDED ACTIONS", MARGIN_X, y);
    for (const a of section.insight.actions) {
      const titleLine = a.cites.length
        ? `${a.title}  [${a.cites.join(", ")}]`
        : a.title;
      const detailLines = doc.splitTextToSize(a.detail, CONTENT_W - 12);
      const boxH = 8 + detailLines.length * 4.4 + 4;
      y = ensureSpace(doc, y, boxH + 4);
      doc.setFillColor(...tint(accent, 0.94));
      doc.roundedRect(MARGIN_X, y, CONTENT_W, boxH, 2, 2, "F");
      doc.setFillColor(accent[0], accent[1], accent[2]);
      doc.rect(MARGIN_X, y, 1.2, boxH, "F");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(9.5);
      doc.setTextColor(accent[0], accent[1], accent[2]);
      doc.text(titleLine, MARGIN_X + 5, y + 6);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(...INK);
      doc.text(detailLines, MARGIN_X + 5, y + 11);

      y += boxH + 4;
    }
    y += 2;
  }

  // Sources
  if (section.insight.citations.length > 0) {
    y = drawLabel(doc, "SOURCES", MARGIN_X, y);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.8);
    section.insight.citations.forEach((c, i) => {
      const idx = i + 1;
      const refPart = c.ref ? ` — ${c.ref}` : "";
      const text = `[${idx}] ${c.label} (${c.kind})${refPart}`;
      const lines = doc.splitTextToSize(text, CONTENT_W - 4);
      y = ensureSpace(doc, y, lines.length * 4.2 + 1);
      doc.setTextColor(...MUTED);
      doc.text(lines, MARGIN_X + 2, y);
      y += lines.length * 4.2 + 1;
    });
  }

  // Section divider
  y += 4;
  doc.setDrawColor(...BORDER);
  doc.setLineWidth(0.2);
  doc.line(MARGIN_X, y, MARGIN_X + CONTENT_W, y);

  return y + 4;
}
