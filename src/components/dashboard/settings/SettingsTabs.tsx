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
    fetch(`/api/channels/status?merchant_id=${encodeURIComponent(merchantId)}`)
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
        body: JSON.stringify({ merchant_id: merchantId, code, store_name: name.trim() }),
      });
      if (res.ok) { setSaved(true); setTimeout(() => setSaved(false), 2200); }
    } finally { setSaving(false); }
  };

  return (
    <div style={{
      background: "var(--surface2)", border: "1px solid var(--border)", borderRadius: 12,
      padding: "18px 20px", marginBottom: 24,
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
    <div style={{ maxWidth: 540 }}>
      <BusinessNameCard />
      <h3 style={{ fontSize: 15, fontWeight: 600, color: "var(--text)", margin: "0 0 6px" }}>Store Access Code</h3>
      <p style={{ fontSize: 13, color: "var(--muted)", margin: "0 0 20px", lineHeight: 1.7 }}>
        This code identifies your store. Enter it on any device to restore your full dashboard — no account needed.
      </p>

      {code ? (
        <div style={{
          background: "var(--surface2)", border: "1px solid var(--border)", borderRadius: 12,
          padding: "18px 20px", display: "flex", alignItems: "center", justifyContent: "space-between",
          gap: 14, flexWrap: "wrap",
        }}>
          <span style={{ fontFamily: MONO, fontSize: 24, fontWeight: 700, letterSpacing: "0.10em", color: OG }}>
            {code}
          </span>
          <button
            type="button"
            onClick={copyCode}
            style={{
              background: copied ? "color-mix(in srgb, var(--green) 8%, transparent)" : "transparent",
              color: copied ? "var(--green)" : "var(--muted)",
              border: `1px solid ${copied ? "color-mix(in srgb, var(--green) 30%, transparent)" : "var(--border)"}`,
              borderRadius: 8, padding: "8px 16px", fontSize: 13, fontWeight: 500,
              cursor: "pointer", fontFamily: "inherit", transition: "all .15s",
              display: "inline-flex", alignItems: "center", gap: 6,
            }}
          >
            {copied
              ? <><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>Copied</>
              : <><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>Copy</>
            }
          </button>
        </div>
      ) : (
        <div style={{
          background: "var(--surface2)", border: "1px solid var(--border)", borderRadius: 12,
          padding: "18px 20px", color: "var(--muted)", fontSize: 13, fontFamily: MONO,
        }}>
          No access code found in this browser. Connect a store to generate one.
        </div>
      )}

      <p style={{ fontSize: 12, color: "var(--muted)", margin: "16px 0 0", lineHeight: 1.6 }}>
        To restore your dashboard on another device, go to{" "}
        <a href="/onboarding" style={{ color: OG, textDecoration: "none" }}>prizeskout.qa → Dashboard</a>
        {" "}and enter this code.
      </p>
    </div>
  );
}

const TABS = ["Store Access", "Channels", "Competitor Radar", "Product Images", "Margin Rules", "Locations", "Notifications"] as const;
type Tab = (typeof TABS)[number];

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
  "Margin Rules": "The minimum margin PrizeSkout defends per category — the floor everything else respects.",
  "Locations": "Every outlet you operate — PrizeSkout tracks margin and routes price defenses per location.",
  "Notifications": "Choose which events alert you in-dashboard and via webhook.",
};

export function SettingsTabs() {
  const { t } = useTranslation();
  const [active, setActive] = useState<Tab>("Store Access");

  return (
    <div>
      <div style={{ display: "flex", gap: 0, borderBottom: "1px solid var(--border)", marginBottom: 24,
        overflowX: "auto", WebkitOverflowScrolling: "touch" as never, scrollbarWidth: "none" as never }}>
        {TABS.map((tab) => {
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
                padding: "12px 14px", fontSize: 13, fontWeight: 500,
                color: isActive ? "var(--text)" : "var(--muted)",
                cursor: "pointer", background: "transparent", border: "none",
                borderBottom: `2px solid ${isActive ? "var(--accent)" : "transparent"}`,
                transition: "all 0.15s", whiteSpace: "nowrap", flexShrink: 0,
              }}
            >{t(`settingsTabs.tabLabels.${TAB_LABEL_KEYS[tab]}`)}</button>
          );
        })}
      </div>
      {active === "Store Access" && <StoreAccessTab />}
      {active === "Channels" && <ChannelsTab />}
      {active === "Competitor Radar" && <CompetitorRadarAccessTab />}
      {active === "Product Images" && <ProductImageManagerTab />}
      {active === "Margin Rules" && <MarginRulesTab />}
      {active === "Locations" && <LocationsTab />}
      {active === "Notifications" && <NotificationsTab />}
    </div>
  );
}
