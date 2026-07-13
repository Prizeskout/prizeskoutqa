import { useState, useEffect } from "react";

const OG  = "#EF681A";
const GN  = "#10B981";
const MONO = "ui-monospace,'SFMono-Regular',Menlo,Monaco,monospace";

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

// Platforms that support BYOK (Bring Your Own Key) credential entry
type ByokField = { key: string; label: string; hint?: string };
const BYOK_PLATFORMS: Record<string, { fields: ByokField[]; portalHint?: string }> = {
  talabat: {
    fields: [
      { key: "client_id",     label: "Client ID",     hint: "Talabat Partner Portal → Settings → API Credentials" },
      { key: "client_secret", label: "Client Secret" },
      { key: "vendor_id",     label: "Vendor ID",     hint: "Your store's vendor ID from the Talabat portal" },
      { key: "chain_id",      label: "Chain ID" },
    ],
    portalHint: "Find your credentials at partner.talabat.com",
  },
  jahez: {
    fields: [
      { key: "api_key",     label: "API Key",     hint: "Request from integration@jahez.net" },
      { key: "secret_code", label: "Secret Code" },
      { key: "branch_id",   label: "Branch ID",   hint: "Your branch ID from the Jahez partner dashboard" },
    ],
    portalHint: "Contact integration@jahez.net to receive your API credentials",
  },
};

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
  const [byokPlatform, setByokPlatform] = useState<string | null>(null);
  const [byokFields, setByokFields]     = useState<Record<string, string>>({});
  const [byokStatus, setByokStatus]     = useState<"idle" | "loading" | "ok" | "err">("idle");
  const [byokError, setByokError]       = useState<string | null>(null);

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
    } else if (platform in BYOK_PLATFORMS) {
      setByokPlatform(platform); setByokFields({}); setByokStatus("idle"); setByokError(null);
    }
  }

  async function submitByok(e: React.FormEvent) {
    e.preventDefault();
    const p = byokPlatform as string;
    const mid = typeof window !== "undefined" ? (localStorage.getItem("ps_merchant_id") ?? "") : "";
    if (!mid) { setByokError("No merchant session found. Please complete onboarding first."); return; }
    setByokStatus("loading"); setByokError(null);
    try {
      const res = await fetch("/api/channels/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ merchant_id: mid, platform: p, ...byokFields }),
      });
      const data = await res.json() as { ok?: boolean; error?: string };
      if (data.ok) {
        setByokStatus("ok");
        setStatuses(prev => ({ ...prev, [p]: "connected" }));
        setTimeout(() => { setByokPlatform(null); setByokStatus("idle"); setByokError(null); setByokFields({}); }, 1200);
      } else {
        setByokStatus("err");
        setByokError(data.error ?? "Connection failed. Check your credentials and try again.");
      }
    } catch {
      setByokStatus("err");
      setByokError("Network error. Please try again.");
    }
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
                  {!loading && status === "not_connected" && !OAUTH_PLATFORMS.has(ch.platform) && ch.platform in BYOK_PLATFORMS && (
                    <ConnectButton platform={ch.platform} onConnect={handleConnect} />
                  )}
                  {!loading && status === "not_connected" && !OAUTH_PLATFORMS.has(ch.platform) && !(ch.platform in BYOK_PLATFORMS) && (
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

  const byokCfg = byokPlatform ? BYOK_PLATFORMS[byokPlatform] : null;
  const byokName = byokPlatform ? (CHANNELS.find(c => c.platform === byokPlatform)?.name ?? byokPlatform) : "";

  return (
    <>
      <div style={{ maxWidth: 640 }}>
        <h3 style={{ fontSize: 15, fontWeight: 600, color: "#1A1A18", margin: "0 0 6px" }}>Connected Channels</h3>
        <p style={{ fontSize: 13, color: "#6B7280", margin: "0 0 28px", lineHeight: 1.7 }}>
          Connect your delivery aggregators and POS systems. PrizeSkout syncs live menus,
          commissions, and fees from each channel to calculate your true per-order margin.
        </p>
        <Section title="DELIVERY AGGREGATORS" items={aggregators} />
        <Section title="POS & RESTAURANT PLATFORMS" items={pos} />
      </div>

      {/* BYOK credential modal */}
      {byokPlatform && byokCfg && (
        <div
          onClick={() => { setByokPlatform(null); setByokStatus("idle"); setByokError(null); setByokFields({}); }}
          style={{ position: "fixed", inset: 0, zIndex: 70, background: "rgba(9,12,18,.5)",
            backdropFilter: "blur(6px)", display: "grid", placeItems: "center",
            padding: 20 }}>
          <div onClick={e => e.stopPropagation()}
            style={{ width: "min(520px,100%)", background: "#fff",
              border: "1px solid #E5E2DB", borderRadius: 20,
              boxShadow: "0 24px 64px rgba(16,24,40,.18)", padding: "28px 30px",
              display: "flex", flexDirection: "column", gap: 22 }}>

            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, letterSpacing: "-0.3px", color: "#111827" }}>
                  Connect {byokName}
                </h3>
                <p style={{ margin: "6px 0 0", fontSize: 13, color: "#6B7280", lineHeight: 1.6 }}>
                  Paste your credentials from your {byokName} partner portal. PrizeSkout uses them to push margin-safe prices to your live menu.
                </p>
              </div>
              <button
                type="button"
                onClick={() => { setByokPlatform(null); setByokStatus("idle"); setByokError(null); setByokFields({}); }}
                aria-label="Close"
                style={{ cursor: "pointer", flexShrink: 0, width: 34, height: 34,
                  borderRadius: 10, border: "1px solid #E5E2DB", background: "#fff",
                  color: "#6B7280", fontSize: 15, fontWeight: 700 }}>✕</button>
            </div>

            <form onSubmit={submitByok} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {byokCfg.fields.map(f => (
                <div key={f.key} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <label htmlFor={`ct-byok-${f.key}`}
                    style={{ fontSize: 12.5, fontWeight: 600, color: "#111827" }}>
                    {f.label}
                  </label>
                  {f.hint && (
                    <span style={{ fontSize: 11.5, color: "#9CA3AF", marginTop: -3 }}>{f.hint}</span>
                  )}
                  <input
                    id={`ct-byok-${f.key}`}
                    type="password"
                    autoComplete="off"
                    required
                    value={byokFields[f.key] ?? ""}
                    onChange={e => setByokFields(prev => ({ ...prev, [f.key]: e.target.value }))}
                    style={{ height: 44, borderRadius: 9, border: "1px solid #E5E2DB",
                      background: "#fff", color: "#111827", padding: "0 13px",
                      fontSize: 14, fontFamily: "inherit", outline: "none",
                      transition: "border-color .15s" }}
                    onFocus={e => { e.currentTarget.style.borderColor = OG; }}
                    onBlur={e => { e.currentTarget.style.borderColor = "#E5E2DB"; }}
                  />
                </div>
              ))}

              {byokCfg.portalHint && (
                <p style={{ margin: 0, fontSize: 12, color: "#6B7280", lineHeight: 1.6,
                  padding: "10px 14px", background: "#FAFAF9",
                  borderRadius: 9, border: "1px solid #E5E2DB" }}>
                  {byokCfg.portalHint}
                </p>
              )}

              {byokError && (
                <p style={{ margin: 0, fontSize: 13, color: "#EF4444", fontWeight: 500,
                  padding: "10px 14px", background: "rgba(239,68,68,.07)",
                  borderRadius: 9, border: "1px solid rgba(239,68,68,.2)" }}>
                  {byokError}
                </p>
              )}

              {byokStatus === "ok" && (
                <p style={{ margin: 0, fontSize: 13, color: GN, fontWeight: 600,
                  padding: "10px 14px", background: "rgba(16,185,129,.08)",
                  borderRadius: 9, border: "1px solid rgba(16,185,129,.25)" }}>
                  Store connected successfully
                </p>
              )}

              <button
                type="submit"
                disabled={byokStatus === "loading" || byokStatus === "ok"}
                style={{ height: 46, borderRadius: 10, border: "none",
                  cursor: byokStatus === "loading" || byokStatus === "ok" ? "default" : "pointer",
                  background: byokStatus === "ok" ? GN : OG, color: "#fff",
                  fontSize: 14, fontWeight: 700, fontFamily: "inherit",
                  opacity: byokStatus === "loading" ? 0.75 : 1,
                  transition: "opacity .2s,background .2s" }}>
                {byokStatus === "loading" ? "Connecting…" : byokStatus === "ok" ? "Connected" : `Connect ${byokName}`}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
