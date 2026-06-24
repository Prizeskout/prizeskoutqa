import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { useLangSuggestion } from "@/lib/lang-suggestion";
import type { Locale } from "@/lib/i18n";

// ---------------------------------------------------------------------------
// Pill text — intentionally in the TARGET language so a native speaker's eye
// catches it even on an otherwise-English page.
// ---------------------------------------------------------------------------

const PILL_CONTENT: Record<Exclude<Locale, "en">, { text: string; btn: string }> = {
  ar: { text: "العربية؟ — View in Arabic", btn: "تبديل" },
  fr: { text: "Français ? — Voir en français", btn: "Passer" },
};

// ---------------------------------------------------------------------------
// Component — client-only (never renders during SSR to avoid hydration mismatch)
// ---------------------------------------------------------------------------

export function LangSuggestionPill() {
  // Delay rendering until after hydration to avoid SSR/client mismatch.
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const { shouldShow, suggestedLocale, dismiss, accept } = useLangSuggestion();

  if (!mounted || !shouldShow || !suggestedLocale || suggestedLocale === "en") return null;

  const content = PILL_CONTENT[suggestedLocale as Exclude<Locale, "en">];

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={`Language suggestion: ${content.text}`}
      style={{
        position: "fixed",
        top: 72,
        insetInlineEnd: 16,
        zIndex: 200,
        display: "flex",
        alignItems: "center",
        gap: 8,
        backgroundColor: "#FFFFFF",
        border: "1px solid #E5E2DB",
        borderRadius: 10,
        padding: "8px 10px 8px 12px",
        boxShadow: "0 4px 16px rgba(0,0,0,0.12)",
        animation: "ps-pill-in 0.2s ease both",
        maxWidth: "calc(100vw - 32px)",
      }}
    >
      {/* Globe icon */}
      <span style={{ fontSize: 16, lineHeight: 1, flexShrink: 0 }} aria-hidden>🌐</span>

      {/* Text — in the target language */}
      <span
        dir={suggestedLocale === "ar" ? "rtl" : "ltr"}
        style={{
          fontSize: 13,
          fontWeight: 500,
          color: "#1A1A18",
          whiteSpace: "nowrap",
          fontFamily: suggestedLocale === "ar"
            ? '"Noto Sans Arabic", "Segoe UI", system-ui, sans-serif'
            : "inherit",
        }}
      >
        {content.text}
      </span>

      {/* Switch button */}
      <button
        type="button"
        onClick={accept}
        style={{
          padding: "4px 10px",
          border: "none",
          borderRadius: 6,
          backgroundColor: "#EA580C",
          color: "#FFFFFF",
          fontSize: 12,
          fontWeight: 700,
          cursor: "pointer",
          flexShrink: 0,
          transition: "background-color 0.12s",
          fontFamily: suggestedLocale === "ar"
            ? '"Noto Sans Arabic", "Segoe UI", system-ui, sans-serif'
            : "inherit",
          direction: suggestedLocale === "ar" ? "rtl" : "ltr",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#C2410C")}
        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#EA580C")}
        aria-label={`Switch language to ${suggestedLocale === "ar" ? "Arabic" : "French"}`}
      >
        {content.btn}
      </button>

      {/* Dismiss button */}
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss language suggestion"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: 24,
          height: 24,
          border: "none",
          borderRadius: 4,
          backgroundColor: "transparent",
          cursor: "pointer",
          color: "#9A9A9A",
          flexShrink: 0,
          padding: 0,
          transition: "color 0.12s, background-color 0.12s",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.color = "#1A1A18";
          e.currentTarget.style.backgroundColor = "#F1EFE8";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.color = "#9A9A9A";
          e.currentTarget.style.backgroundColor = "transparent";
        }}
      >
        <X size={14} />
      </button>

      <style>{`
        @keyframes ps-pill-in {
          from { opacity: 0; transform: translateY(-8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
