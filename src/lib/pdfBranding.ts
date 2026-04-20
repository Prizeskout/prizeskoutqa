// Shared branded PDF helpers: header, footer, palette, logo loader.
// Used by every "Export PDF report" feature so all reports share a
// consistent identity driven by Settings → Branding.

import type { jsPDF } from "jspdf";
import { getBranding, hexToRgb, type Branding } from "@/lib/brandingStore";

export type RGB = readonly [number, number, number];

// ---------- Static palette (shared) ----------
export const INK: RGB = [26, 26, 24];
export const MUTED: RGB = [107, 107, 107];
export const FAINT: RGB = [154, 154, 154];
export const GREEN: RGB = [34, 197, 94];
export const BLUE: RGB = [59, 130, 246];
export const AMBER: RGB = [245, 158, 11];
export const RED: RGB = [239, 68, 68];
export const BORDER: RGB = [229, 226, 219];
export const SURFACE: RGB = [250, 250, 249];
export const DEFAULT_ACCENT: RGB = [234, 88, 12]; // PrizeSkout orange

// ---------- Page geometry (A4 portrait, mm) ----------
export const PAGE_W = 210;
export const PAGE_H = 297;
export const MARGIN_X = 18;
export const CONTENT_W = PAGE_W - MARGIN_X * 2;
export const HEADER_H = 38;

/** Lighten an RGB toward white by `amount` (0..1). */
export function tint(rgb: RGB, amount: number): RGB {
  const f = Math.max(0, Math.min(1, amount));
  return [
    Math.round(rgb[0] + (255 - rgb[0]) * f),
    Math.round(rgb[1] + (255 - rgb[1]) * f),
    Math.round(rgb[2] + (255 - rgb[2]) * f),
  ];
}

export type BrandTheme = {
  branding: Branding;
  accent: RGB;
  /** Very pale fill of the accent color, for soft callout backgrounds. */
  accentTint: RGB;
};

/** Resolve the user's saved branding into a usable theme for a PDF render. */
export function resolveBrandTheme(): BrandTheme {
  const branding = getBranding();
  const accent: RGB = hexToRgb(branding.accentColor) ?? DEFAULT_ACCENT;
  return { branding, accent, accentTint: tint(accent, 0.92) };
}

/**
 * Load a logo data URL into a PNG via a hidden canvas. Handles SVG by
 * rasterizing it onto a canvas at a comfortable size for the PDF header.
 */
export function loadLogoAsPng(
  dataUrl: string,
): Promise<{ png: string; w: number; h: number } | null> {
  return new Promise((resolve) => {
    if (!dataUrl || typeof window === "undefined") return resolve(null);
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
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

/**
 * Draw the standard branded header (dark band, brand name in accent, title,
 * subtitle, and brand logo top-right). Returns the y-coordinate (mm) at
 * which page content should start.
 */
export async function drawBrandedHeader(
  doc: jsPDF,
  theme: BrandTheme,
  title: string,
  subtitle?: string,
): Promise<number> {
  const { branding, accent } = theme;

  // Dark header band
  doc.setFillColor(...INK);
  doc.rect(0, 0, PAGE_W, HEADER_H, "F");

  // Logo (top-right slot)
  const logo = await loadLogoAsPng(branding.logoDataUrl);
  if (logo) {
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
    const logoY = (HEADER_H - drawH) / 2;
    try {
      doc.addImage(logo.png, "PNG", logoX, logoY, drawW, drawH);
    } catch {
      // ignore image errors
    }
  }

  // Brand name
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...accent);
  doc.text(branding.brandName.toUpperCase(), MARGIN_X, 16);

  // Title
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.setTextColor(255, 255, 255);
  doc.text(title, MARGIN_X, 26);

  // Subtitle (defaults to "<kind> | <date>")
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(200, 200, 200);
  const today = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const sub = subtitle ?? `Intelligence report  |  ${today}`;
  doc.text(sub, MARGIN_X, 33);

  return HEADER_H + 12; // first content y
}

/** Draw the standard branded footer on every page. Call AFTER all content. */
export function drawBrandedFooters(doc: jsPDF, theme: BrandTheme): void {
  const total = doc.getNumberOfPages();
  const footerLeft = `${theme.branding.brandName}  -  Confidential intelligence`;
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
}

/** If the next block won't fit, push to a new page and return the new y. */
export function ensureSpace(doc: jsPDF, y: number, needed: number): number {
  if (y + needed > PAGE_H - 18) {
    doc.addPage();
    return 20;
  }
  return y;
}

/** Small uppercase muted label; returns the y-cursor below it. */
export function drawLabel(
  doc: jsPDF,
  label: string,
  x: number,
  y: number,
): number {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(...FAINT);
  doc.text(label, x, y);
  return y + 4;
}

/** Filename-safe slug from the brand name, falling back to "report". */
export function slugifyBrand(brandName: string): string {
  return (
    brandName
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "report"
  );
}
