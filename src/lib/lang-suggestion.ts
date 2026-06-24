import { createContext, useContext, useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { applyLocale, type Locale } from "@/lib/i18n";
import type { GeoSuggestion } from "@/server/geo-suggest.functions";

// ---------------------------------------------------------------------------
// Context — root route sets this from loader data (server-derived geo)
// ---------------------------------------------------------------------------

export const GeoSuggestionContext = createContext<GeoSuggestion>({
  suggestedLocale: null,
  country: null,
});

// ---------------------------------------------------------------------------
// Persistence keys
// ---------------------------------------------------------------------------

const LOCALE_KEY = "ps-locale";       // set by applyLocale() — user's explicit choice
const DISMISS_KEY = "ps-lang-dismissed"; // set on × dismiss

// ---------------------------------------------------------------------------
// Dev-only: ?geo=QA / ?geo=FR / ?geo=US override
// Mirrors the same country sets as the server fn.
// Ignored in production builds.
// ---------------------------------------------------------------------------

const ARABIC_COUNTRIES = new Set([
  "QA", "AE", "SA", "KW", "BH", "OM",
  "YE", "IQ", "SY", "JO", "LB", "PS",
  "LY", "TN", "MA", "DZ", "SD", "SO", "DJ", "KM", "MR",
]);
const FRENCH_COUNTRIES = new Set([
  "FR", "BE", "CH", "LU", "MC",
  "SN", "CI", "ML", "BF", "NE", "TD", "CM", "BJ", "TG",
  "GA", "CG", "CD", "MG", "RW", "BI", "CF", "GQ",
  "MU", "SC", "RE", "GP", "MQ", "GF", "PM", "PF", "NC", "WF",
  "VU", "HT",
]);

function readDevOverride(): Locale | null {
  if (import.meta.env.PROD) return null;
  if (typeof window === "undefined") return null;
  try {
    const geo = new URLSearchParams(window.location.search).get("geo")?.toUpperCase() ?? "";
    if (!geo || geo === "US") return null;
    if (ARABIC_COUNTRIES.has(geo)) return "ar";
    if (FRENCH_COUNTRIES.has(geo)) return "fr";
  } catch {}
  return null;
}

function readDismissed(): boolean {
  if (typeof window === "undefined") return true; // never show during SSR
  try {
    if (localStorage.getItem(DISMISS_KEY)) return true;
    // If user has previously chosen any language via switcher, treat as dismissed
    if (localStorage.getItem(LOCALE_KEY)) return true;
  } catch {}
  return false;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useLangSuggestion() {
  const geo = useContext(GeoSuggestionContext);
  const { i18n } = useTranslation();
  const currentLocale = (i18n.language?.slice(0, 2) ?? "en") as Locale;

  const [dismissed, setDismissed] = useState<boolean>(readDismissed);

  // Dev override is stable per page load — useMemo with empty deps
  const devOverride = useMemo(readDevOverride, []); // eslint-disable-line react-hooks/exhaustive-deps

  const suggestedLocale: Locale | null = devOverride ?? geo.suggestedLocale;

  // Show only if: not dismissed, suggestion exists, and differs from current language
  const shouldShow =
    !dismissed && !!suggestedLocale && suggestedLocale !== currentLocale;

  const dismiss = () => {
    try { localStorage.setItem(DISMISS_KEY, "1"); } catch {}
    setDismissed(true);
  };

  const accept = () => {
    if (!suggestedLocale) return;
    i18n.changeLanguage(suggestedLocale);
    applyLocale(suggestedLocale); // saves LOCALE_KEY to localStorage → future visits won't prompt
    setDismissed(true);
  };

  return { shouldShow, suggestedLocale, dismiss, accept } as const;
}
