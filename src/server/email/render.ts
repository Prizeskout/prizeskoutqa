// Shared HTML shell for all outgoing email.
//
// Design goals: renders in Gmail/Outlook/Apple Mail (table layout, fully
// inline styles, no <style> blocks or web fonts), adapts to RTL for Arabic,
// and always ships a plain-text alternative. All dynamic values are escaped.
import { type EmailLocale, isRtl } from "./locale";
import { strings } from "./strings";

export type EmailButton = { label: string; url: string };

export type RenderInput = {
  locale: EmailLocale;
  previewText: string;
  heading: string;
  /** Body paragraphs, in order. Plain strings; escaped on render. */
  bodyLines: string[];
  cta?: EmailButton;
  /** Optional secondary footer link, e.g. "manage which emails you receive". */
  footerLink?: EmailButton;
};

export function escapeHtml(input: string): string {
  return String(input)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const BRAND_COLOR = "#EA580C";
const INK = "#1A1A18";
const MUTED = "#6B7280";
const HAIRLINE = "#E5E2DB";
const CANVAS = "#F5F4F1";

export function renderEmail(input: RenderInput): { html: string; text: string } {
  const rtl = isRtl(input.locale);
  const dir = rtl ? "rtl" : "ltr";
  const align = rtl ? "right" : "left";
  const s = strings(input.locale);

  const paragraphs = input.bodyLines
    .map(
      (line) =>
        `<p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:${INK};text-align:${align};">${escapeHtml(
          line,
        )}</p>`,
    )
    .join("");

  const button = input.cta
    ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px 0 4px;">
         <tr><td style="border-radius:8px;background:${BRAND_COLOR};">
           <a href="${escapeHtml(input.cta.url)}" target="_blank"
              style="display:inline-block;padding:12px 22px;font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:8px;">
             ${escapeHtml(input.cta.label)}
           </a>
         </td></tr>
       </table>
       <p style="margin:16px 0 0;font-size:12px;line-height:1.6;color:${MUTED};text-align:${align};word-break:break-all;">
         ${escapeHtml(s.layout.fallbackLead)}<br>
         <a href="${escapeHtml(input.cta.url)}" target="_blank" style="color:${BRAND_COLOR};text-decoration:underline;">${escapeHtml(
           input.cta.url,
         )}</a>
       </p>`
    : "";

  const footerLink = input.footerLink
    ? `<p style="margin:0 0 6px;font-size:12px;color:${MUTED};text-align:center;">
         <a href="${escapeHtml(input.footerLink.url)}" target="_blank" style="color:${MUTED};text-decoration:underline;">${escapeHtml(
           input.footerLink.label,
         )}</a>
       </p>`
    : "";

  const html = `<!doctype html>
<html lang="${input.locale}" dir="${dir}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light">
<title>${escapeHtml(input.heading)}</title>
</head>
<body style="margin:0;padding:0;background:${CANVAS};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(input.previewText)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${CANVAS};padding:24px 12px;">
  <tr><td align="center">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" dir="${dir}"
           style="max-width:520px;background:#ffffff;border:1px solid ${HAIRLINE};border-radius:14px;overflow:hidden;">
      <tr><td style="padding:22px 28px;border-bottom:1px solid ${HAIRLINE};">
        <span style="font-size:18px;font-weight:800;color:${INK};letter-spacing:-0.02em;">Prize<span style="color:${BRAND_COLOR};">Skout</span></span>
      </td></tr>
      <tr><td style="padding:28px;">
        <h1 style="margin:0 0 16px;font-size:20px;line-height:1.3;color:${INK};text-align:${align};">${escapeHtml(
          input.heading,
        )}</h1>
        ${paragraphs}
        ${button}
      </td></tr>
      <tr><td style="padding:18px 28px;border-top:1px solid ${HAIRLINE};background:#FBFAF8;">
        <p style="margin:0 0 6px;font-size:12px;line-height:1.6;color:${MUTED};text-align:center;">${escapeHtml(
          s.layout.footerTagline,
        )}</p>
        ${footerLink}
        <p style="margin:0;font-size:11px;color:#9A9A9A;text-align:center;">${escapeHtml(
          s.layout.autoNote,
        )} © PrizeSkout. ${escapeHtml(s.layout.rights)}</p>
      </td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>`;

  const textParts = [
    input.heading,
    "",
    ...input.bodyLines,
    "",
    input.cta ? `${input.cta.label}: ${input.cta.url}` : "",
    "",
    s.layout.footerTagline,
    input.footerLink ? `${input.footerLink.label}: ${input.footerLink.url}` : "",
    s.layout.autoNote,
  ].filter((l) => l !== undefined);

  const text = textParts.join("\n").replace(/\n{3,}/g, "\n\n").trim();

  return { html, text };
}
