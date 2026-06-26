import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { ChevronDown } from "lucide-react";
import { LOCALES, LOCALE_NAMES, applyLocale, type Locale } from "@/lib/i18n";

export function LanguageSwitcher() {
  const { i18n } = useTranslation();
  const current = (i18n.language?.slice(0, 2) ?? "en") as Locale;
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, [open]);

  const handleChange = (lng: Locale) => {
    i18n.changeLanguage(lng);
    applyLocale(lng);
    setOpen(false);
  };

  return (
    <div
      ref={containerRef}
      style={{ display: "inline-flex", alignItems: "center", gap: 8, position: "relative" }}
    >
      <span style={{ fontSize: 11, color: "#9A9A9A", whiteSpace: "nowrap", display: "none" }}
        className="md:inline">
        Choose language
      </span>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 4,
          padding: "4px 10px",
          borderRadius: 6,
          border: "1px solid #E5E2DB",
          background: "#FFFFFF",
          color: "#1A1A18",
          fontSize: 12,
          fontWeight: 600,
          cursor: "pointer",
          transition: "border-color 0.12s",
          whiteSpace: "nowrap",
        }}
        onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#D1CDC7"; }}
        onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#E5E2DB"; }}
      >
        {LOCALE_NAMES[current]}
        <ChevronDown
          size={11}
          style={{
            color: "#9A9A9A",
            transform: open ? "rotate(180deg)" : "none",
            transition: "transform 0.15s",
          }}
        />
      </button>

      {open && (
        <div
          role="listbox"
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            right: 0,
            background: "#FFFFFF",
            border: "1px solid #E5E2DB",
            borderRadius: 8,
            padding: 4,
            zIndex: 200,
            minWidth: 120,
            boxShadow: "0 4px 16px rgba(0,0,0,0.10)",
          }}
        >
          {LOCALES.map((lng) => {
            const active = current === lng;
            return (
              <button
                key={lng}
                role="option"
                aria-selected={active}
                type="button"
                onClick={() => handleChange(lng)}
                style={{
                  display: "block",
                  width: "100%",
                  padding: "7px 10px",
                  borderRadius: 5,
                  border: "none",
                  background: active ? "rgba(234,88,12,0.07)" : "transparent",
                  color: active ? "#EA580C" : "#4A4A48",
                  fontSize: 13,
                  fontWeight: active ? 600 : 400,
                  textAlign: "left",
                  cursor: "pointer",
                  transition: "background 0.1s",
                }}
                onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = "#F5F4F2"; }}
                onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = "transparent"; }}
              >
                {LOCALE_NAMES[lng]}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
