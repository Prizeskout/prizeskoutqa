import { useTranslation } from "react-i18next";
import { LOCALES, LOCALE_NAMES, LOCALE_LABELS, applyLocale, type Locale } from "@/lib/i18n";

export function LanguageSwitcher() {
  const { i18n } = useTranslation();
  const current = (i18n.language?.slice(0, 2) ?? "en") as Locale;

  const handleChange = (lng: Locale) => {
    i18n.changeLanguage(lng);
    applyLocale(lng);
  };

  return (
    <div
      role="group"
      aria-label="Language"
      style={{ display: "flex", gap: 2, alignItems: "center" }}
    >
      {LOCALES.map((lng) => {
        const active = current === lng;
        return (
          <button
            key={lng}
            type="button"
            onClick={() => handleChange(lng)}
            title={LOCALE_NAMES[lng]}
            aria-label={LOCALE_NAMES[lng]}
            aria-pressed={active}
            style={{
              padding: "2px 7px",
              borderRadius: 5,
              border: "1px solid",
              borderColor: active ? "#EA580C" : "transparent",
              background: active ? "rgba(234,88,12,0.08)" : "transparent",
              color: active ? "#EA580C" : "#6B6B6B",
              fontSize: 11,
              fontWeight: 600,
              cursor: "pointer",
              transition: "all 0.12s",
              fontFamily: "system-ui, -apple-system, sans-serif",
              lineHeight: 1.5,
              letterSpacing: lng === "ar" ? 0 : "0.03em",
            }}
            onMouseEnter={(e) => {
              if (!active) {
                e.currentTarget.style.color = "#1A1A18";
                e.currentTarget.style.borderColor = "#E5E2DB";
              }
            }}
            onMouseLeave={(e) => {
              if (!active) {
                e.currentTarget.style.color = "#6B6B6B";
                e.currentTarget.style.borderColor = "transparent";
              }
            }}
          >
            {LOCALE_LABELS[lng]}
          </button>
        );
      })}
    </div>
  );
}
