import { useEffect, useRef, useState } from "react";
import { Upload, Trash2, Check } from "lucide-react";
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
  const initial = getBranding();
  const [accentColor, setAccentColor] = useState(initial.accentColor);
  const [brandName, setBrandName] = useState(initial.brandName);
  const [logoDataUrl, setLogoDataUrl] = useState(initial.logoDataUrl);
  const [logoError, setLogoError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      setLogoError("Please choose a PNG, JPG, or SVG image.");
      return;
    }
    if (file.size > MAX_LOGO_BYTES) {
      setLogoError("Logo must be under 500 KB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : "";
      setLogoDataUrl(result);
    };
    reader.onerror = () => setLogoError("Could not read that file.");
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
    setBrandName(DEFAULT_BRANDING.brandName);
    setLogoDataUrl("");
    setLogoError(null);
    setSavedAt(Date.now());
  };

  // Live preview color (falls back to default if invalid)
  const previewColor = colorIsValid ? accentColor : DEFAULT_BRANDING.accentColor;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <Card>
        <CardTitle>Brand identity</CardTitle>
        <div style={{ fontSize: 12, color: "#6B6B6B", marginTop: 4 }}>
          These values are used in PDF reports you export from PrizeSkout. Your
          logo and accent color appear in the report header.
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 18, marginTop: 18 }}>
          <FieldRow>
            <Field label="Brand name">
              <TextField
                value={brandName}
                onChange={setBrandName}
                placeholder="Snoonu"
              />
            </Field>
            <Field label="Accent color (hex)">
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
                  Use a 6-digit hex like #EA580C
                </div>
              )}
            </Field>
          </FieldRow>

          <div>
            <FieldLabel>Color presets</FieldLabel>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              {PRESET_COLORS.map((c) => {
                const active = c.toLowerCase() === accentColor.trim().toLowerCase();
                return (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setAccentColor(c)}
                    aria-label={`Pick color ${c}`}
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
        <CardTitle>Logo</CardTitle>
        <div style={{ fontSize: 12, color: "#6B6B6B", marginTop: 4 }}>
          PNG, JPG, or SVG. Recommended: square or wide rectangle on transparent
          background. Max 500 KB.
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
                alt="Brand logo preview"
                style={{
                  maxWidth: "100%",
                  maxHeight: "100%",
                  objectFit: "contain",
                }}
              />
            ) : (
              <div style={{ fontSize: 11, color: "#6B6B6B", textAlign: "center" }}>
                No logo uploaded
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
              {logoDataUrl ? "Replace logo" : "Upload logo"}
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
                Remove logo
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
        <CardTitle>PDF header preview</CardTitle>
        <div style={{ fontSize: 12, color: "#6B6B6B", marginTop: 4 }}>
          This is how the top of every exported PDF report will look.
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
              Competitor Behavior Patterns
            </div>
            <div
              style={{
                fontSize: 11,
                color: "#8A8A8A",
                marginTop: 2,
              }}
            >
              Intelligence report
            </div>
          </div>
        </div>
      </Card>

      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
        <PrimaryButton onClick={onSave}>Save branding</PrimaryButton>
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
          Reset to PrizeSkout default
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
            Saved
          </span>
        )}
      </div>
    </div>
  );
}
