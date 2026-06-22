import type { Locale } from "./i18n";

// BCP 47 locale tags that produce correct QAR formatting and number grouping
// per locale convention.
const LOCALE_MAP: Record<Locale, string> = {
  en: "en-QA",
  ar: "ar-QA",
  fr: "fr-FR",
};

export function fmtCurrency(amount: number, locale: Locale): string {
  return new Intl.NumberFormat(LOCALE_MAP[locale], {
    style: "currency",
    currency: "QAR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function fmtNumber(
  n: number,
  locale: Locale,
  opts?: Intl.NumberFormatOptions,
): string {
  return new Intl.NumberFormat(LOCALE_MAP[locale], opts).format(n);
}

export function fmtPercent(n: number, locale: Locale): string {
  return new Intl.NumberFormat(LOCALE_MAP[locale], {
    style: "percent",
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(n);
}

export function fmtDate(date: Date, locale: Locale): string {
  return new Intl.DateTimeFormat(LOCALE_MAP[locale], {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

export function fmtTime(date: Date, locale: Locale): string {
  return new Intl.DateTimeFormat(LOCALE_MAP[locale], {
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}
