import { useState } from "react";
import { useTranslation } from "react-i18next";

const OG = "#EF681A";

const ALERTS = [
  { key: "margin_breach",   i18nKey: "marginBreach" },
  { key: "reprice_applied", i18nKey: "repriceApplied" },
  { key: "channel_down",    i18nKey: "channelDown" },
  { key: "competitor_drop", i18nKey: "competitorDrop" },
  { key: "promo_overlap",   i18nKey: "promoOverlap" },
  { key: "weekly_digest",   i18nKey: "weeklyDigest" },
];

function Toggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      style={{
        width: 52, height: 32, borderRadius: 999, border: "none", cursor: "pointer",
        background: on ? OG : "#E5E7EB", position: "relative", flexShrink: 0,
        transition: "background .2s", minWidth: 52,
      }}
    >
      <span style={{
        position: "absolute", top: 4, left: on ? 24 : 4,
        width: 24, height: 24, borderRadius: "50%", background: "#fff",
        transition: "left .2s", boxShadow: "0 1px 3px rgba(0,0,0,0.15)",
      }} />
    </button>
  );
}

export function NotificationsTab() {
  const { t } = useTranslation();
  const [state, setState] = useState<Record<string, boolean>>(
    Object.fromEntries(ALERTS.map(a => [a.key, a.key !== "weekly_digest"]))
  );

  return (
    <div style={{ maxWidth: 560 }}>
      <h3 style={{ fontSize: 15, fontWeight: 600, color: "#1A1A18", margin: "0 0 6px" }}>{t("settingsTabs.notifications.heading")}</h3>
      <p style={{ fontSize: 13, color: "#6B7280", margin: "0 0 28px", lineHeight: 1.7 }}>
        {t("settingsTabs.notifications.description")}
      </p>

      <div style={{ display: "flex", flexDirection: "column", borderRadius: 12, overflow: "hidden", border: "1px solid #E5E2DB" }}>
        {ALERTS.map((a, i) => (
          <div key={a.key} style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "16px 20px", background: i % 2 === 0 ? "#FAFAF9" : "#fff",
            gap: 20,
          }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: "#1A1A18" }}>{t(`settingsTabs.notifications.alerts.${a.i18nKey}.name`)}</div>
              <div style={{ fontSize: 13, color: "#9CA3AF", marginTop: 2 }}>{t(`settingsTabs.notifications.alerts.${a.i18nKey}.desc`)}</div>
            </div>
            <Toggle on={state[a.key]} onToggle={() => setState(p => ({ ...p, [a.key]: !p[a.key] }))} />
          </div>
        ))}
      </div>
    </div>
  );
}
