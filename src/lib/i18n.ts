import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "../locales/en.json";
import ar from "../locales/ar.json";
import fr from "../locales/fr.json";

export const LOCALES = ["en", "ar", "fr"] as const;
export type Locale = (typeof LOCALES)[number];

export const LOCALE_LABELS: Record<Locale, string> = { en: "EN", ar: "ع", fr: "FR" };
export const LOCALE_NAMES: Record<Locale, string> = {
  en: "English",
  ar: "العربية",
  fr: "Français",
};
export const RTL_LOCALES = new Set<Locale>(["ar"]);

const STORAGE_KEY = "ps-locale";

export function getStoredLocale(): Locale {
  if (typeof window === "undefined") return "en";
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored && LOCALES.includes(stored as Locale)) return stored as Locale;
  const browser = navigator.language.slice(0, 2) as Locale;
  if (LOCALES.includes(browser)) return browser;
  return "en";
}

export function applyLocale(lng: Locale) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, lng);
  document.documentElement.lang = lng;
  document.documentElement.dir = RTL_LOCALES.has(lng) ? "rtl" : "ltr";
}

// Initialize once at module level. Guards against double-init during HMR.
if (!i18n.isInitialized) {
  i18n.use(initReactI18next).init({
    resources: {
      en: { ui: en },
      ar: { ui: ar },
      fr: { ui: fr },
    },
    lng: "en",
    fallbackLng: "en",
    ns: ["ui"],
    defaultNS: "ui",
    interpolation: { escapeValue: false },
    // Disable suspense — we load all resources upfront so there's no async fetch.
    react: { useSuspense: false },
  });
}

export { i18n };
