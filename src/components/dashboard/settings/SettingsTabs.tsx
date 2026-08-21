import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ChannelsTab } from "./ChannelsTab";
import { MarginRulesTab } from "./MarginRulesTab";
import { LocationsTab } from "./LocationsTab";
import { NotificationsTab } from "./NotificationsTab";
import { CompetitorRadarAccessTab } from "./CompetitorRadarAccessTab";
import { ProductImageManagerTab } from "./ProductImageManagerTab";

const MONO = "ui-monospace,'SFMono-Regular',Menlo,Monaco,monospace";
const OG = "#EF681A";

function BusinessNameCard() {
  const merchantId = typeof window !== "undefined" ? (localStorage.getItem("ps_merchant_id") ?? "") : "";
  const code = typeof window !== "undefined" ? (localStorage.getItem("ps_access_code") ?? "") : "";
  const [name, setName] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!merchantId) { setLoaded(true); return; }
    fetch(`/api/channels/status?merchant_id=${encodeURIComponent(merchantId)}`, { headers: { "X-PrizeSkout-Access-Code": code } })
      .then(r => r.ok ? r.json() : null)
      .then((d: { store_name?: string | null } | null) => { if (d?.store_name) setName(d.store_name); })
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, [merchantId]);

  const save = async () => {
    if (!merchantId || !code || saving) return;
    setSaving(true);
    try {
      const res = await fetch("/api/register-code", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ merchant_id: merchantId, access_code: code, store_name: name.trim() }),
      });
      if (res.ok) { setSaved(true); setTimeout(() => setSaved(false), 2200); }
    } finally { setSaving(false); }
  };

  return (
    <div style={{
      background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 14,
      padding: "20px", boxShadow: "var(--shadow)", height: "100%", boxSizing: "border-box",
    }}>
      <h3 style={{ fontSize: 15, fontWeight: 600, color: "var(--text)", margin: "0 0 6px" }}>Business name</h3>
      <p style={{ fontSize: 13, color: "var(--muted)", margin: "0 0 16px", lineHeight: 1.7 }}>
        Shown across your dashboard and on exported reports. Set this if you skipped it during onboarding.
      </p>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <input
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder={loaded ? "Your restaurant or brand name" : "Loading…"}
          disabled={!loaded}
          style={{
            flex: "1 1 260px", minWidth: 0, border: "1px solid var(--border)", borderRadius: 8,
            padding: "10px 12px", fontSize: 13.5, fontFamily: "inherit", color: "var(--text)",
            background: "var(--surface)",
          }}
        />
        <button
          type="button"
          onClick={save}
          disabled={!loaded || saving || !name.trim()}
          style={{
            cursor: !loaded || saving || !name.trim() ? "default" : "pointer",
            opacity: !loaded || saving || !name.trim() ? 0.5 : 1,
            border: "none", borderRadius: 8, background: OG, color: "#fff",
            fontSize: 13, fontWeight: 600, padding: "10px 18px", fontFamily: "inherit",
          }}
        >
          {saving ? "Saving…" : "Save"}
        </button>
        {saved && (
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--green)", fontWeight: 500 }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
            Saved
          </span>
        )}
      </div>
    </div>
  );
}

function StoreAccessTab() {
  const code = typeof window !== "undefined" ? (localStorage.getItem("ps_access_code") ?? "") : "";
  const [copied, setCopied] = useState(false);

  async function copyCode() {
    if (!code) return;
    try { await navigator.clipboard.writeText(code); } catch (_) {}
    setCopied(true);
    setTimeout(() => setCopied(false), 2200);
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,420px),1fr))", gap: 16 }}>
      <BusinessNameCard />
      <section style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 14, padding: 20, boxShadow: "var(--shadow)" }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, color: "var(--text)", margin: "0 0 6px" }}>Store Access Code</h3>
        <p style={{ fontSize: 13, color: "var(--muted)", margin: "0 0 16px", lineHeight: 1.6 }}>
          This private code restores the same connected store on another device.
        </p>
        {code ? (
          <div style={{ background: "var(--surface2)", border: "1px solid var(--border)", borderRadius: 10, padding: "14px 15px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14, flexWrap: "wrap" }}>
            <span style={{ fontFamily: MONO, fontSize: 20, fontWeight: 750, letterSpacing: ".08em", color: "var(--text)" }}>{code}</span>
            <button type="button" onClick={copyCode} style={{ background: copied ? "color-mix(in srgb, var(--green) 8%, transparent)" : "var(--surface)", color: copied ? "var(--green)" : "var(--text)", border: `1px solid ${copied ? "color-mix(in srgb, var(--green) 30%, transparent)" : "var(--border)"}`, borderRadius: 8, padding: "8px 13px", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>{copied ? "Copied" : "Copy code"}</button>
          </div>
        ) : (
          <div style={{ background: "var(--surface2)", border: "1px solid var(--border)", borderRadius: 10, padding: 15, color: "var(--muted)", fontSize: 13 }}>No access code found in this browser. Connect a store to generate one.</div>
        )}
        <a href="/access" style={{ display: "inline-flex", marginTop: 14, color: "var(--accent-text)", textDecoration: "none", fontSize: 12.5, fontWeight: 750 }}>Open Store Access →</a>
      </section>
    </div>
  );
}

const TABS = ["Store Access", "Channels", "Competitor Radar", "Product Images", "Margin Rules", "Locations", "Notifications"] as const;
type Tab = (typeof TABS)[number];
type SettingsGroup = "Business" | "Connections" | "Protection" | "Catalogue";

const SETTINGS_GROUPS: Record<SettingsGroup, readonly Tab[]> = {
  Business: ["Store Access", "Locations"],
  Connections: ["Channels", "Competitor Radar"],
  Protection: ["Margin Rules", "Notifications"],
  Catalogue: ["Product Images"],
};

const TAB_LABEL_KEYS: Record<Tab, string> = {
  "Store Access": "storeAccess",
  "Channels": "channels",
  "Competitor Radar": "competitors",
  "Product Images": "productImages",
  "Margin Rules": "marginRules",
  "Locations": "locations",
  "Notifications": "notifications",
};

const TAB_TIPS: Record<Tab, string> = {
  "Store Access": "Your business name and the code that restores your dashboard on any device — no password needed.",
  "Channels": "Connect delivery apps and POS systems. This is what powers live catalogue sync and automatic price pushes.",
  "Competitor Radar": "Add exact competitor product URLs, map them by channel, and check the latest public price.",
  "Product Images": "Upload, match, approve, verify, and safely undo product image changes.",
  "Margin Rules": "Review the global margin floor and channel-specific targets enforced by the Margin Policy Engine.",
  "Locations": "Every outlet you operate — PrizeSkout tracks margin and routes price defenses per location.",
  "Notifications": "Choose which events alert you in-dashboard and via webhook.",
};

export function SettingsTabs({ initialTab = "Store Access" }: { initialTab?: Tab }) {
  const { t, i18n } = useTranslation();
  const [active, setActive] = useState<Tab>(initialTab);
  useEffect(() => setActive(initialTab), [initialTab]);
  const activeGroup = (Object.entries(SETTINGS_GROUPS) as [SettingsGroup, readonly Tab[]][]).find(([, tabs]) => tabs.includes(active))?.[0] ?? "Business";
  const groupLabel = (group: SettingsGroup) => {
    const language = i18n.language;
    const labels: Record<SettingsGroup, [string, string, string]> = {
      Business: ["Business", "النشاط التجاري", "Entreprise"],
      Connections: ["Connections", "الاتصالات", "Connexions"],
      Protection: ["Protection", "الحماية", "Protection"],
      Catalogue: ["Catalogue", "الكتالوج", "Catalogue"],
    };
    return language.startsWith("ar") ? labels[group][1] : language.startsWith("fr") ? labels[group][2] : labels[group][0];
  };

  return (
    <div style={{ display: "grid", gap: 18 }}>
      <div style={{ display: "flex", gap: 4, padding: 5, width: "fit-content", maxWidth: "100%", border: "1px solid var(--border)", borderRadius: 12, background: "var(--surface2)", overflowX: "auto", WebkitOverflowScrolling: "touch" as never }}>
        {(Object.keys(SETTINGS_GROUPS) as SettingsGroup[]).map((group) => {
          const isActive = group === activeGroup;
          return (
            <button
              key={group}
              type="button"
              onClick={() => setActive(SETTINGS_GROUPS[group][0])}
              style={{
                padding: "9px 13px", borderRadius: 8, fontSize: 12.5, fontWeight: 750,
                color: isActive ? "#fff" : "var(--text)", cursor: "pointer",
                background: isActive ? "var(--navy)" : "transparent",
                border: "none",
                whiteSpace: "nowrap", flexShrink: 0,
              }}
            >
              {groupLabel(group)}
            </button>
          );
        })}
      </div>
      <div style={{ display: "flex", gap: 18, borderBottom: "1px solid var(--border)",
        overflowX: "auto", WebkitOverflowScrolling: "touch" as never, scrollbarWidth: "none" as never }}>
        {SETTINGS_GROUPS[activeGroup].map((tab) => {
          const isActive = tab === active;
          return (
            <button
              key={tab}
              type="button"
              onClick={() => setActive(tab)}
              data-demo-tip={TAB_TIPS[tab]}
              onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.color = "var(--text)"; }}
              onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.color = "var(--muted)"; }}
              style={{
                padding: "2px 1px 11px", fontSize: 12.5, fontWeight: isActive ? 750 : 550,
                color: isActive ? "var(--text)" : "var(--muted)",
                cursor: "pointer", background: "transparent", border: "none",
                borderBottom: `2px solid ${isActive ? "var(--accent)" : "transparent"}`,
                transition: "all 0.15s", whiteSpace: "nowrap", flexShrink: 0,
              }}
            >{t(`settingsTabs.tabLabels.${TAB_LABEL_KEYS[tab]}`)}</button>
          );
        })}
      </div>
      <div>
        {active === "Store Access" && <StoreAccessTab />}
        {active === "Channels" && <ChannelsTab />}
        {active === "Competitor Radar" && <CompetitorRadarAccessTab />}
        {active === "Product Images" && <ProductImageManagerTab />}
        {active === "Margin Rules" && <MarginRulesTab />}
        {active === "Locations" && <LocationsTab />}
        {active === "Notifications" && <NotificationsTab />}
      </div>
    </div>
  );
}
