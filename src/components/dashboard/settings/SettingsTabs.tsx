import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ChannelsTab } from "./ChannelsTab";
import { MarginRulesTab } from "./MarginRulesTab";
import { LocationsTab } from "./LocationsTab";
import { NotificationsTab } from "./NotificationsTab";

const MONO = "ui-monospace,'SFMono-Regular',Menlo,Monaco,monospace";
const OG = "#EF681A";

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
      <h3 style={{ fontSize: 15, fontWeight: 600, color: "#1A1A18", margin: "0 0 6px" }}>Store Access Code</h3>
      <p style={{ fontSize: 13, color: "#6B7280", margin: "0 0 20px", lineHeight: 1.7 }}>
        This code identifies your store. Enter it on any device to restore your full dashboard — no account needed.
      </p>

      {code ? (
        <div style={{
          background: "#FAFAF9", border: "1px solid #E5E2DB", borderRadius: 12,
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
              background: copied ? "rgba(16,185,129,0.08)" : "transparent",
              color: copied ? "#10B981" : "#6B7280",
              border: `1px solid ${copied ? "rgba(16,185,129,0.3)" : "#E5E2DB"}`,
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
          background: "#FAFAF9", border: "1px solid #E5E2DB", borderRadius: 12,
          padding: "18px 20px", color: "#9A9A9A", fontSize: 13, fontFamily: MONO,
        }}>
          No access code found in this browser. Connect a store to generate one.
        </div>
      )}

      <p style={{ fontSize: 12, color: "#9A9A9A", margin: "16px 0 0", lineHeight: 1.6 }}>
        To restore your dashboard on another device, go to{" "}
        <a href="/onboarding" style={{ color: OG, textDecoration: "none" }}>prizeskout.qa → Dashboard</a>
        {" "}and enter this code.
      </p>
    </div>
  );
}

const TABS = ["Store Access", "Channels", "Margin Rules", "Locations", "Notifications"] as const;
type Tab = (typeof TABS)[number];

const TAB_LABEL_KEYS: Record<Tab, string> = {
  "Store Access": "storeAccess",
  "Channels": "channels",
  "Margin Rules": "marginRules",
  "Locations": "locations",
  "Notifications": "notifications",
};

export function SettingsTabs() {
  const { t } = useTranslation();
  const [active, setActive] = useState<Tab>("Store Access");

  return (
    <div>
      <div style={{ display: "flex", gap: 0, borderBottom: "1px solid #E5E2DB", marginBottom: 24,
        overflowX: "auto", WebkitOverflowScrolling: "touch" as never, scrollbarWidth: "none" as never }}>
        {TABS.map((tab) => {
          const isActive = tab === active;
          return (
            <button
              key={tab}
              type="button"
              onClick={() => setActive(tab)}
              onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.color = "#1A1A18"; }}
              onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.color = "#9A9A9A"; }}
              style={{
                padding: "12px 14px", fontSize: 13, fontWeight: 500,
                color: isActive ? "#1A1A18" : "#9A9A9A",
                cursor: "pointer", background: "transparent", border: "none",
                borderBottom: `2px solid ${isActive ? "#EA580C" : "transparent"}`,
                transition: "all 0.15s", whiteSpace: "nowrap", flexShrink: 0,
              }}
            >{t(`settingsTabs.tabLabels.${TAB_LABEL_KEYS[tab]}`)}</button>
          );
        })}
      </div>
      <div style={{ display: active === "Store Access"  ? "block" : "none" }}><StoreAccessTab /></div>
      <div style={{ display: active === "Channels"      ? "block" : "none" }}><ChannelsTab /></div>
      <div style={{ display: active === "Margin Rules"  ? "block" : "none" }}><MarginRulesTab /></div>
      <div style={{ display: active === "Locations"     ? "block" : "none" }}><LocationsTab /></div>
      <div style={{ display: active === "Notifications" ? "block" : "none" }}><NotificationsTab /></div>
    </div>
  );
}
