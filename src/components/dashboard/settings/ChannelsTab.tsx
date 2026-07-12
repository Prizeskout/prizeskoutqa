import { useState, useEffect } from "react";

const OG  = "#EF681A";
const GN  = "#10B981";
const MONO = "ui-monospace,'SFMono-Regular',Menlo,Consolas,monospace";

type ChannelStatus = "connected" | "pending" | "error" | "not_connected";

interface Channel {
  name:     string;
  platform: string;          // matches ps_merchant_channels.platform
  type:     "pos" | "aggregator";
  logo:     string;
  note?:    string;
}

const CHANNELS: Channel[] = [
  { name: "Talabat",   platform: "talabat",  type: "aggregator", logo: "🟠" },
  { name: "Snoonu",    platform: "snoonu",   type: "aggregator", logo: "🟣" },
  { name: "Jahez",     platform: "jahez",    type: "aggregator", logo: "🟡" },
  { name: "Noon Food", platform: "noon",     type: "aggregator", logo: "🟡" },
  { name: "Careem",    platform: "careem",   type: "aggregator", logo: "⚫" },
  { name: "Foodics",   platform: "foodics",  type: "pos",        logo: "🔵" },
  { name: "Salla",     platform: "salla",    type: "pos",        logo: "🟢" },
  { name: "Zid",       platform: "zid",      type: "pos",        logo: "🟤" },
];

// Platforms that support OAuth connect from the dashboard
const OAUTH_PLATFORMS = new Set(["salla", "zid"]);

function StatusBadge({ status }: { status: ChannelStatus }) {
  const map: Record<ChannelStatus, { label: string; color: string; bg: string }> = {
    connected:     { label: "Connected",     color: GN,       bg: "rgba(16,185,129,0.08)" },
    pending:       { label: "Pending",       color: "#F59E0B", bg: "rgba(245,158,11,0.08)" },
    error:         { label: "Error",         color: "#EF4444", bg: "rgba(239,68,68,0.08)" },
    not_connected: { label: "Not connected", color: "#9CA3AF", bg: "transparent" },
  };
  const { label, color, bg } = map[status];
  return (
    <span style={{
      fontFamily: MONO, fontSize: 11, fontWeight: 600, letterSpacing: "0.06em",
      color, background: bg, border: `1px solid ${color}30`,
      borderRadius: 6, padding: "3px 9px",
    }}>{label}</span>
  );
}

function ConnectButton({ platform, onConnect }: { platform: string; onConnect: (p: string) => void }) {
  return (
    <button
      type="button"
      onClick={() => onConnect(platform)}
      style={{
        fontSize: 13, fontWeight: 600, color: OG, background: "transparent",
        border: `1px solid ${OG}40`, borderRadius: 7, padding: "10px 16px",
        cursor: "pointer", fontFamily: "inherit", minHeight: 44,
      }}
      onMouseEnter={e => { e.currentTarget.style.background = `${OG}10`; }}
      onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
    >Connect</button>
  );
}

export function ChannelsTab() {
  const [statuses, setStatuses] = useState<Record<string, ChannelStatus>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const merchantId = typeof window !== "undefined"
      ? (localStorage.getItem("ps_merchant_id") ?? "")
      : "";
    if (!merchantId) { setLoading(false); return; }

    fetch(`/api/channels/status?merchant_id=${encodeURIComponent(merchantId)}`)
      .then(r => r.ok ? r.json() : null)
      .then((data: { channels?: { platform: string; status: string }[] } | null) => {
        if (!data?.channels) return;
        const map: Record<string, ChannelStatus> = {};
        for (const ch of data.channels) {
          map[ch.platform] = ch.status as ChannelStatus;
        }
        setStatuses(map);
      })
      .catch(() => { /* show fallback statuses */ })
      .finally(() => setLoading(false));
  }, []);

  function handleConnect(platform: string) {
    const merchantId = typeof window !== "undefined"
      ? (localStorage.getItem("ps_merchant_id") ?? "")
      : "";
    if (!merchantId) {
      alert("No merchant session found. Please complete onboarding first.");
      return;
    }
    if (OAUTH_PLATFORMS.has(platform)) {
      window.location.href = `/api/auth/${platform}?merchant_id=${encodeURIComponent(merchantId)}`;
    }
    // Delivery aggregators (talabat, snoonu, etc.) — placeholder, will be wired when APIs are approved
  }

  const aggregators = CHANNELS.filter(c => c.type === "aggregator");
  const pos         = CHANNELS.filter(c => c.type === "pos");

  function Section({ title, items }: { title: string; items: Channel[] }) {
    return (
      <div style={{ marginBottom: 36 }}>
        <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.1em", color: "#9CA3AF", fontFamily: MONO, marginBottom: 14 }}>
          {title}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 1, borderRadius: 12, overflow: "hidden", border: "1px solid #E5E2DB" }}>
          {items.map((ch, i) => {
            const status: ChannelStatus = statuses[ch.platform] ?? "not_connected";
            return (
              <div key={ch.name} style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "14px 16px", background: i % 2 === 0 ? "#FAFAF9" : "#fff",
                gap: 12, flexWrap: "wrap",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <span style={{ fontSize: 22 }}>{ch.logo}</span>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: "#1A1A18" }}>{ch.name}</div>
                    {ch.note && <div style={{ fontSize: 13, color: "#9CA3AF", marginTop: 2 }}>{ch.note}</div>}
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <StatusBadge status={loading ? "not_connected" : status} />
                  {!loading && status === "not_connected" && OAUTH_PLATFORMS.has(ch.platform) && (
                    <ConnectButton platform={ch.platform} onConnect={handleConnect} />
                  )}
                  {!loading && status === "connected" && OAUTH_PLATFORMS.has(ch.platform) && (
                    <button
                      type="button"
                      onClick={() => handleConnect(ch.platform)}
                      style={{
                        fontSize: 12, fontWeight: 500, color: "#6B7280", background: "transparent",
                        border: "1px solid #E5E2DB", borderRadius: 7, padding: "10px 16px",
                        cursor: "pointer", fontFamily: "inherit", minHeight: 44,
                      }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = "#9CA3AF"; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = "#E5E2DB"; }}
                    >Reconnect</button>
                  )}
                  {!loading && status === "not_connected" && !OAUTH_PLATFORMS.has(ch.platform) && (
                    <button
                      type="button"
                      disabled
                      style={{
                        fontSize: 12, fontWeight: 500, color: "#9CA3AF", background: "transparent",
                        border: "1px solid #E5E2DB", borderRadius: 7, padding: "10px 16px",
                        cursor: "default", fontFamily: "inherit", minHeight: 44,
                      }}
                    >Coming soon</button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 640 }}>
      <h3 style={{ fontSize: 15, fontWeight: 600, color: "#1A1A18", margin: "0 0 6px" }}>Connected Channels</h3>
      <p style={{ fontSize: 13, color: "#6B7280", margin: "0 0 28px", lineHeight: 1.7 }}>
        Connect your delivery aggregators and POS systems. PrizeSkout syncs live menus,
        commissions, and fees from each channel to calculate your true per-order margin.
      </p>
      <Section title="DELIVERY AGGREGATORS" items={aggregators} />
      <Section title="POS & RESTAURANT PLATFORMS" items={pos} />
    </div>
  );
}
