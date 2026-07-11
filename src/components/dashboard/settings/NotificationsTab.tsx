import { useState } from "react";

const OG = "#EF681A";

const ALERTS = [
  { key: "margin_breach",   name: "Margin breach",         desc: "Alert when a channel's true margin drops below your floor on any item" },
  { key: "reprice_applied", name: "Reprice applied",        desc: "Notify every time PrizeSkout applies an automatic price adjustment" },
  { key: "channel_down",    name: "Channel sync failure",   desc: "Alert if a delivery aggregator or POS connection stops syncing" },
  { key: "competitor_drop", name: "Competitor price drop",  desc: "Notify when a tracked competitor lowers their price on a shared item" },
  { key: "promo_overlap",   name: "Promotion conflict",     desc: "Alert when an active platform promotion could undermine your margin floor" },
  { key: "weekly_digest",   name: "Weekly margin digest",   desc: "Summary of margin performance across all channels, every Monday" },
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
  const [state, setState] = useState<Record<string, boolean>>(
    Object.fromEntries(ALERTS.map(a => [a.key, a.key !== "weekly_digest"]))
  );

  return (
    <div style={{ maxWidth: 560 }}>
      <h3 style={{ fontSize: 15, fontWeight: 600, color: "#1A1A18", margin: "0 0 6px" }}>Notifications</h3>
      <p style={{ fontSize: 13, color: "#6B7280", margin: "0 0 28px", lineHeight: 1.7 }}>
        Choose which events trigger an alert. Notifications are delivered in-dashboard
        and via the webhook you configure in Channels.
      </p>

      <div style={{ display: "flex", flexDirection: "column", borderRadius: 12, overflow: "hidden", border: "1px solid #E5E2DB" }}>
        {ALERTS.map((a, i) => (
          <div key={a.key} style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "16px 20px", background: i % 2 === 0 ? "#FAFAF9" : "#fff",
            gap: 20,
          }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: "#1A1A18" }}>{a.name}</div>
              <div style={{ fontSize: 13, color: "#9CA3AF", marginTop: 2 }}>{a.desc}</div>
            </div>
            <Toggle on={state[a.key]} onToggle={() => setState(p => ({ ...p, [a.key]: !p[a.key] }))} />
          </div>
        ))}
      </div>
    </div>
  );
}
