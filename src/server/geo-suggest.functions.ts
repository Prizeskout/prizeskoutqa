import { createServerFn } from "@tanstack/react-start";
import { getRequest, getRequestHeader } from "@tanstack/react-start/server";
import type { Locale } from "@/lib/i18n";

export type GeoSuggestion = {
  suggestedLocale: Locale | null;
  country: string | null;
};

// Arabic-majority countries (GCC + MENA)
const ARABIC_COUNTRIES = new Set([
  "QA", "AE", "SA", "KW", "BH", "OM",
  "YE", "IQ", "SY", "JO", "LB", "PS",
  "LY", "TN", "MA", "DZ", "SD", "SO",
  "DJ", "KM", "MR",
]);

// French-speaking countries
const FRENCH_COUNTRIES = new Set([
  "FR", "BE", "CH", "LU", "MC",
  "SN", "CI", "ML", "BF", "NE", "TD", "CM", "BJ", "TG",
  "GA", "CG", "CD", "MG", "RW", "BI", "CF", "GQ",
  "MU", "SC", "RE", "GP", "MQ", "GF", "PM", "PF", "NC", "WF",
  "VU", "HT",
]);

export const getGeoSuggestion = createServerFn({ method: "GET" }).handler(
  async (): Promise<GeoSuggestion> => {
    try {
      // PRIMARY: getRequest() returns the H3 event's underlying Web API Request.
      // In Cloudflare Workers, H3 v2 preserves the original request object, so
      // request.cf.country is available here (set by CF runtime before the handler).
      const req = getRequest() as Request & { cf?: { country?: string } };
      const cfObjectCountry = req?.cf?.country?.trim().toUpperCase() ?? null;

      // FALLBACK: CF-IPCountry header — Cloudflare also sets this on all requests
      // that pass through their network, including Worker requests.
      const headerCountry =
        (getRequestHeader("CF-IPCountry") ?? "").trim().toUpperCase() || null;

      const country = cfObjectCountry ?? headerCountry;

      // Suppress suggestion if the browser strongly prefers English.
      const acceptLang = getRequestHeader("Accept-Language") ?? "";
      const primaryLang =
        acceptLang.split(",")[0]?.split(";")[0]?.trim().toLowerCase().slice(0, 2) ?? "";

      // Structured log — visible in `wrangler tail` for production verification.
      console.log("[GEO]", JSON.stringify({
        cfObject: cfObjectCountry,
        cfHeader: headerCountry,
        resolved: country,
        acceptLang: acceptLang.slice(0, 60),
        suppressedByLang: primaryLang === "en",
      }));

      if (primaryLang === "en") return { suggestedLocale: null, country };

      if (country) {
        if (ARABIC_COUNTRIES.has(country)) return { suggestedLocale: "ar", country };
        if (FRENCH_COUNTRIES.has(country)) return { suggestedLocale: "fr", country };
      }
    } catch (err) {
      // Never let geo detection crash the app.
      console.warn("[GEO] detection error:", String(err));
    }
    return { suggestedLocale: null, country: null };
  },
);
