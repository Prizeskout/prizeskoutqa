import { useEffect, useRef, useState } from "react";
import { Upload, Trash2, Check } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Card, CardTitle, Field, FieldLabel, FieldRow, PrimaryButton, TextField } from "./primitives";
import {
  DEFAULT_BRANDING,
  getBranding,
  hexToRgb,
  resetBranding,
  setBranding,
} from "@/lib/brandingStore";
import { getCompany, subscribeCompany } from "@/lib/companyStore";

const PRESET_COLORS = [
  "#EA580C", // PrizeSkout orange
  "#3B82F6", // blue
  "#8B5CF6", // violet
  "#EC4899", // pink
  "#22C55E", // green
  "#0EA5E9", // sky
  "#F59E0B", // amber
  "#1A1A18", // ink
];

const MAX_LOGO_BYTES = 500 * 1024; // 500 KB

export function BrandingTab() {
  const { t } = useTranslation();
  const initial = getBranding();
  const initialCompany = getCompany().name;
  const [companyName, setCompanyName] = useState(initialCompany);
  const [accentColor, setAccentColor] = useState(initial.accentColor);
  // Brand name defaults to the company name from Account when the user
  // hasn't explicitly customized it (i.e. it's still the PrizeSkout default).
  const [brandName, setBrandName] = useState(
    initial.brandName === DEFAULT_BRANDING.brandName ? initialCompany : initial.brandName,
  );
  const [logoDataUrl, setLogoDataUrl] = useState(initial.logoDataUrl);
  const [logoError, setLogoError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // If Account tab updates the company name and the user hasn't typed a
  // custom brand name yet, mirror the new company name into the field.
  useEffect(() => {
    return subscribeCompany(() => {
      const fresh = getCompany().name;
      setCompanyName(fresh);
      setBrandName((prev) =>
        prev.trim() === "" ||
        prev === DEFAULT_BRANDING.brandName ||
        prev === companyName
          ? fresh
          : prev,
      );
    });
    // companyName intentionally captured by closure for "previous value" check
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep "Saved" indicator visible briefly
  useEffect(() => {
    if (savedAt === null) return;
    const t = setTimeout(() => setSavedAt(null), 1800);
    return () => clearTimeout(t);
  }, [savedAt]);

  const colorIsValid = hexToRgb(accentColor) !== null;

  const onPickLogo = (file: File) => {
    setLogoError(null);
    if (!file.type.startsWith("image/")) {
      setLogoError(t("settingsTabs.branding.logo.errors.invalidType"));
      return;
    }
    if (file.size > MAX_LOGO_BYTES) {
      setLogoError(t("settingsTabs.branding.logo.errors.tooLarge"));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : "";
      setLogoDataUrl(result);
    };
    reader.onerror = () => setLogoError(t("settingsTabs.branding.logo.errors.readError"));
    reader.readAsDataURL(file);
  };

  const onSave = () => {
    if (!colorIsValid) return;
    setBranding({
      accentColor,
      logoDataUrl,
      brandName: brandName.trim() || DEFAULT_BRANDING.brandName,
    });
    setSavedAt(Date.now());
  };

  const onReset = () => {
    resetBranding();
    setAccentColor(DEFAULT_BRANDING.accentColor);
    setBrandName(companyName);
    setLogoDataUrl("");
    setLogoError(null);
    setSavedAt(Date.now());
  };

  // Live preview color (falls back to default if invalid)
  const previewColor = colorIsValid ? accentColor : DEFAULT_BRANDING.accentColor;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <Card>
        <CardTitle>{t("settingsTabs.branding.identity.heading")}</CardTitle>
        <div style={{ fontSize: 12, color: "#6B6B6B", marginTop: 4 }}>
          {t("settingsTabs.branding.identity.description")}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 18, marginTop: 18 }}>
          <FieldRow>
            <Field label={t("settingsTabs.branding.identity.brandName")}>
              <TextField
                value={brandName}
                onChange={setBrandName}
                placeholder={companyName || t("settingsTabs.branding.identity.brandNamePlaceholderDefault")}
              />
            </Field>
            <Field label={t("settingsTabs.branding.identity.accentColor")}>
              <div style={{ display: "flex", gap: 8, alignItems: "stretch" }}>
                <div
                  aria-hidden
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 8,
                    border: "1px solid #E5E2DB",
                    backgroundColor: previewColor,
                    flexShrink: 0,
                  }}
                />
                <div style={{ flex: 1 }}>
                  <TextField
                    value={accentColor}
                    onChange={(v) => setAccentColor(v)}
                    placeholder="#EA580C"
                  />
                </div>
              </div>
              {!colorIsValid && (
                <div style={{ fontSize: 11, color: "#EF4444", marginTop: 6 }}>
                  {t("settingsTabs.branding.identity.accentColorInvalid")}
                </div>
              )}
            </Field>
          </FieldRow>

          <div>
            <FieldLabel>{t("settingsTabs.branding.identity.colorPresets")}</FieldLabel>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              {PRESET_COLORS.map((c) => {
                const active = c.toLowerCase() === accentColor.trim().toLowerCase();
                return (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setAccentColor(c)}
                    aria-label={t("settingsTabs.branding.identity.pickColorAria", { color: c })}
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 8,
                      backgroundColor: c,
                      border: active
                        ? "2px solid #1A1A18"
                        : "1px solid #E5E2DB",
                      cursor: "pointer",
                      padding: 0,
                      boxShadow: active ? "0 0 0 3px #FFFFFF inset" : "none",
                      transition: "border-color 0.15s",
                    }}
                  />
                );
              })}
            </div>
          </div>
        </div>
      </Card>

      <Card>
        <CardTitle>{t("settingsTabs.branding.logo.heading")}</CardTitle>
        <div style={{ fontSize: 12, color: "#6B6B6B", marginTop: 4 }}>
          {t("settingsTabs.branding.logo.description")}
        </div>

        <div
          style={{
            display: "flex",
            gap: 18,
            marginTop: 18,
            alignItems: "stretch",
            flexWrap: "wrap",
          }}
        >
          {/* Preview */}
          <div
            style={{
              width: 180,
              height: 100,
              backgroundColor: "#0a0a0a",
              borderRadius: 10,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 14,
              flexShrink: 0,
            }}
          >
            {logoDataUrl ? (
              <img
                src={logoDataUrl}
                alt={t("settingsTabs.branding.logo.previewAlt")}
                style={{
                  maxWidth: "100%",
                  maxHeight: "100%",
                  objectFit: "contain",
                }}
              />
            ) : (
              <div style={{ fontSize: 11, color: "#6B6B6B", textAlign: "center" }}>
                {t("settingsTabs.branding.logo.noLogo")}
              </div>
            )}
          </div>

          {/* Actions */}
          <div
            style={{
              flex: 1,
              minWidth: 200,
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              gap: 10,
            }}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/jpg,image/svg+xml"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) onPickLogo(f);
                e.target.value = "";
              }}
              style={{ display: "none" }}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                backgroundColor: "#FFFFFF",
                border: "1px solid #EA580C",
                color: "#EA580C",
                fontSize: 13,
                fontWeight: 600,
                padding: "9px 16px",
                borderRadius: 8,
                cursor: "pointer",
                width: "fit-content",
              }}
            >
              <Upload size={14} />
              {logoDataUrl ? t("settingsTabs.branding.logo.replace") : t("settingsTabs.branding.logo.upload")}
            </button>
            {logoDataUrl && (
              <button
                type="button"
                onClick={() => setLogoDataUrl("")}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  background: "transparent",
                  border: "none",
                  color: "#6B6B6B",
                  fontSize: 12,
                  fontWeight: 500,
                  padding: 0,
                  cursor: "pointer",
                  width: "fit-content",
                }}
              >
                <Trash2 size={12} />
                {t("settingsTabs.branding.logo.remove")}
              </button>
            )}
            {logoError && (
              <div style={{ fontSize: 11, color: "#EF4444" }}>{logoError}</div>
            )}
          </div>
        </div>
      </Card>

      {/* Live PDF header preview */}
      <Card>
        <CardTitle>{t("settingsTabs.branding.preview.heading")}</CardTitle>
        <div style={{ fontSize: 12, color: "#6B6B6B", marginTop: 4 }}>
          {t("settingsTabs.branding.preview.description")}
        </div>
        <div
          style={{
            marginTop: 16,
            backgroundColor: "#1A1A18",
            borderRadius: 10,
            padding: "20px 24px",
            display: "flex",
            alignItems: "center",
            gap: 14,
          }}
        >
          {logoDataUrl ? (
            <img
              src={logoDataUrl}
              alt=""
              style={{ height: 32, maxWidth: 120, objectFit: "contain" }}
            />
          ) : (
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 7,
                backgroundColor: previewColor,
                flexShrink: 0,
              }}
            />
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontSize: 10,
                fontWeight: 700,
                color: previewColor,
                letterSpacing: "0.08em",
              }}
            >
              {(brandName || DEFAULT_BRANDING.brandName).toUpperCase()}
            </div>
            <div
              style={{
                fontSize: 18,
                fontWeight: 700,
                color: "#FAFAF9",
                marginTop: 2,
              }}
            >
              {t("settingsTabs.branding.preview.sampleTitle")}
            </div>
            <div
              style={{
                fontSize: 11,
                color: "#8A8A8A",
                marginTop: 2,
              }}
            >
              {t("settingsTabs.branding.preview.sampleSubtitle")}
            </div>
          </div>
        </div>
      </Card>

      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
        <PrimaryButton onClick={onSave}>{t("settingsTabs.branding.save")}</PrimaryButton>
        <button
          type="button"
          onClick={onReset}
          style={{
            background: "transparent",
            border: "none",
            color: "#6B6B6B",
            fontSize: 13,
            fontWeight: 500,
            cursor: "pointer",
            padding: "10px 8px",
          }}
        >
          {t("settingsTabs.branding.reset")}
        </button>
        {savedAt !== null && (
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              fontSize: 12,
              color: "#16A34A",
              fontWeight: 500,
            }}
          >
            <Check size={14} />
            {t("settingsTabs.branding.saved")}
          </span>
        )}
      </div>
    </div>
  );
}
