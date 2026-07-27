import { useState } from "react";
import { useTranslation } from "react-i18next";

const OG = "#EF681A";
const MONO = "ui-monospace,'SFMono-Regular',Menlo,Monaco,monospace";

interface Outlet {
  id: string;
  name: string;
  city: string;
  region: string;
  active: boolean;
}

const REGIONS = ["Qatar", "Saudi Arabia", "UAE", "Kuwait", "Bahrain", "Oman"];
const CITIES: Record<string, string[]> = {
  "Qatar":        ["Doha", "Al Wakrah", "Al Khor", "Lusail"],
  "Saudi Arabia": ["Riyadh", "Jeddah", "Dammam", "Mecca"],
  "UAE":          ["Dubai", "Abu Dhabi", "Sharjah", "Ajman"],
  "Kuwait":       ["Kuwait City", "Hawalli", "Farwaniya"],
  "Bahrain":      ["Manama", "Muharraq", "Riffa"],
  "Oman":         ["Muscat", "Salalah", "Sohar"],
};

const BLANK: Omit<Outlet, "id"> = { name: "", city: "", region: "Qatar", active: true };

export function LocationsTab() {
  const { t } = useTranslation();
  const [outlets, setOutlets] = useState<Outlet[]>([
    { id: "1", name: "Main Branch", city: "Doha", region: "Qatar", active: true },
  ]);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState({ ...BLANK });

  function add() {
    if (!draft.name.trim() || !draft.city) return;
    setOutlets(prev => [...prev, { ...draft, id: Date.now().toString() }]);
    setDraft({ ...BLANK });
    setAdding(false);
  }

  function remove(id: string) {
    setOutlets(prev => prev.filter(o => o.id !== id));
  }

  function toggle(id: string) {
    setOutlets(prev => prev.map(o => o.id === id ? { ...o, active: !o.active } : o));
  }

  return (
    <div style={{ maxWidth: 580 }}>
      <h3 style={{ fontSize: 15, fontWeight: 600, color: "var(--text)", margin: "0 0 6px" }}>{t("settingsTabs.locations.heading")}</h3>
      <p style={{ fontSize: 13, color: "var(--muted)", margin: "0 0 24px", lineHeight: 1.7 }}>
        {t("settingsTabs.locations.description")}
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 16 }}>
        {outlets.map(o => (
          <div key={o.id} style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            background: "var(--surface2)", border: "1px solid var(--border)", borderRadius: 10,
            padding: "14px 18px", gap: 16,
          }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text)" }}>{o.name}</div>
              <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2, fontFamily: MONO }}>
                {o.city} · {o.region}
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{
                fontFamily: MONO, fontSize: 11, fontWeight: 600, letterSpacing: "0.06em",
                color: o.active ? "#10B981" : "var(--muted)",
                background: o.active ? "rgba(16,185,129,0.08)" : "transparent",
                border: `1px solid ${o.active ? "rgba(16,185,129,0.3)" : "var(--border)"}`,
                borderRadius: 6, padding: "3px 9px", cursor: "pointer",
              }} onClick={() => toggle(o.id)}>{o.active ? t("settingsTabs.locations.status.active") : t("settingsTabs.locations.status.inactive")}</span>
              <button type="button" onClick={() => remove(o.id)}
                style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--muted)", fontSize: 18, lineHeight: 1, padding: "12px 8px", minHeight: 44, minWidth: 44 }}>×</button>
            </div>
          </div>
        ))}
      </div>

      {adding ? (
        <div style={{ background: "var(--surface2)", border: `1px solid ${OG}40`, borderRadius: 12, padding: "18px 20px", marginBottom: 12 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <input
              placeholder={t("settingsTabs.locations.namePlaceholder")}
              value={draft.name}
              onChange={e => setDraft(p => ({ ...p, name: e.target.value }))}
              style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, padding: "10px 13px", fontSize: 13, color: "var(--text)", fontFamily: "inherit", outline: "none" }}
            />
            <div style={{ display: "flex", gap: 10 }}>
              <select value={draft.region} onChange={e => setDraft(p => ({ ...p, region: e.target.value, city: "" }))}
                style={{ flex: 1, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, padding: "12px 13px", fontSize: 13, color: "var(--text)", fontFamily: "inherit", minHeight: 44 }}>
                {REGIONS.map(r => <option key={r}>{r}</option>)}
              </select>
              <select value={draft.city} onChange={e => setDraft(p => ({ ...p, city: e.target.value }))}
                style={{ flex: 1, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, padding: "12px 13px", fontSize: 13, color: "var(--text)", fontFamily: "inherit", minHeight: 44 }}>
                <option value="">{t("settingsTabs.locations.selectCity")}</option>
                {(CITIES[draft.region] ?? []).map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button type="button" onClick={add}
                style={{ flex: 1, background: OG, color: "#fff", border: "none", borderRadius: 8, padding: "10px", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                {t("settingsTabs.locations.addOutlet")}
              </button>
              <button type="button" onClick={() => setAdding(false)}
                style={{ flex: 1, background: "transparent", color: "var(--muted)", border: "1px solid var(--border)", borderRadius: 8, padding: "10px", fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>
                {t("settingsTabs.locations.cancel")}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <button type="button" onClick={() => setAdding(true)}
          style={{ display: "flex", alignItems: "center", gap: 8, background: "transparent", border: "1px dashed var(--border)", borderRadius: 10, padding: "12px 20px", fontSize: 13, fontWeight: 600, color: "var(--muted)", cursor: "pointer", fontFamily: "inherit", width: "100%" }}>
          <span style={{ fontSize: 18, lineHeight: 1 }}>+</span> {t("settingsTabs.locations.addOutlet")}
        </button>
      )}
    </div>
  );
}
