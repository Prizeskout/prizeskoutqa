import { useState } from "react";
import { useTranslation } from "react-i18next";

const OG = "#EF681A";
const GN = "#10B981";
const MONO = "ui-monospace,'SFMono-Regular',Menlo,Monaco,monospace";

const CATEGORIES = [
  { name: "Mains",        default: 22 },
  { name: "Beverages",    default: 35 },
  { name: "Desserts",     default: 30 },
  { name: "Starters",     default: 25 },
  { name: "Sides",        default: 20 },
  { name: "Meal Deals",   default: 18 },
];

const CATEGORY_LABEL_KEYS: Record<string, string> = {
  "Mains":      "mains",
  "Beverages":  "beverages",
  "Desserts":   "desserts",
  "Starters":   "starters",
  "Sides":      "sides",
  "Meal Deals": "mealDeals",
};

export function MarginRulesTab() {
  const { t } = useTranslation();
  const [global, setGlobal] = useState(20);
  const [cats, setCats] = useState<Record<string, number>>(
    Object.fromEntries(CATEGORIES.map(c => [c.name, c.default]))
  );
  const [saved, setSaved] = useState(false);

  function save() {
    setSaved(true);
    setTimeout(() => setSaved(false), 2200);
  }

  return (
    <div style={{ maxWidth: 560 }}>
      <h3 style={{ fontSize: 15, fontWeight: 600, color: "#1A1A18", margin: "0 0 6px" }}>{t("settingsTabs.marginRules.heading")}</h3>
      <p style={{ fontSize: 13, color: "#6B7280", margin: "0 0 28px", lineHeight: 1.7 }}>
        {t("settingsTabs.marginRules.description")}
      </p>

      {/* Global floor */}
      <div style={{ background: "#FAFAF9", border: "1px solid #E5E2DB", borderRadius: 12, padding: "20px 24px", marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: "#1A1A18" }}>{t("settingsTabs.marginRules.globalFloor.label")}</div>
            <div style={{ fontSize: 12, color: "#9CA3AF", marginTop: 2 }}>{t("settingsTabs.marginRules.globalFloor.hint")}</div>
          </div>
          <span style={{ fontFamily: MONO, fontSize: 22, fontWeight: 700, color: OG }}>{global}%</span>
        </div>
        <input
          type="range" min={5} max={50} value={global}
          onChange={e => setGlobal(Number(e.target.value))}
          style={{ width: "100%", accentColor: OG }}
        />
        <div style={{ display: "flex", justifyContent: "space-between", fontFamily: MONO, fontSize: 11, color: "#9CA3AF", marginTop: 4 }}>
          <span>5%</span><span>50%</span>
        </div>
      </div>

      {/* Per-category */}
      <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.1em", color: "#9CA3AF", fontFamily: MONO, marginBottom: 14 }}>
        {t("settingsTabs.marginRules.categoryOverrides")}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 28 }}>
        {CATEGORIES.map(cat => (
          <div key={cat.name} style={{ background: "#FAFAF9", border: "1px solid #E5E2DB", borderRadius: 10, padding: "14px 18px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
              <span style={{ fontSize: 13.5, fontWeight: 600, color: "#1A1A18" }}>{t(`settingsTabs.marginRules.categories.${CATEGORY_LABEL_KEYS[cat.name]}`)}</span>
              <span style={{ fontFamily: MONO, fontSize: 16, fontWeight: 700, color: cats[cat.name] < global ? "#F59E0B" : GN }}>
                {cats[cat.name]}%
              </span>
            </div>
            <input
              type="range" min={5} max={50} value={cats[cat.name]}
              onChange={e => setCats(prev => ({ ...prev, [cat.name]: Number(e.target.value) }))}
              style={{ width: "100%", accentColor: OG }}
            />
            {cats[cat.name] < global && (
              <div style={{ fontSize: 13, color: "#F59E0B", marginTop: 6, fontFamily: MONO }}>
                {t("settingsTabs.marginRules.belowFloor")}
              </div>
            )}
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={save}
        style={{
          background: saved ? GN : OG, color: "#fff", border: "none", borderRadius: 10,
          padding: "14px 28px", fontSize: 14, fontWeight: 700, cursor: "pointer",
          fontFamily: "inherit", transition: "background .2s",
          width: "100%", minHeight: 48,
        }}
      >
        {saved ? t("settingsTabs.marginRules.saved") : t("settingsTabs.marginRules.save")}
      </button>
    </div>
  );
}
