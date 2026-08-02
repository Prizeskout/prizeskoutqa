import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";

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
type ByokField = { key: string; labelKey: string; hintKey?: string };
const BYOK_PLATFORMS: Record<string, { fields: ByokField[]; portalHintKey?: string }> = {
  talabat: {
    fields: [
      { key: "client_id",     labelKey: "settingsTabs.channels.byok.talabat.clientId.label",     hintKey: "settingsTabs.channels.byok.talabat.clientId.hint" },
      { key: "client_secret", labelKey: "settingsTabs.channels.byok.talabat.clientSecret.label" },
      { key: "vendor_id",     labelKey: "settingsTabs.channels.byok.talabat.vendorId.label",      hintKey: "settingsTabs.channels.byok.talabat.vendorId.hint" },
      { key: "chain_id",      labelKey: "settingsTabs.channels.byok.talabat.chainId.label" },
    ],
    portalHintKey: "settingsTabs.channels.byok.talabat.portalHint",
  },
  jahez: {
    fields: [
      { key: "api_key",     labelKey: "settingsTabs.channels.byok.jahez.apiKey.label",     hintKey: "settingsTabs.channels.byok.jahez.apiKey.hint" },
      { key: "secret_code", labelKey: "settingsTabs.channels.byok.jahez.secretCode.label" },
      { key: "branch_id",   labelKey: "settingsTabs.channels.byok.jahez.branchId.label",   hintKey: "settingsTabs.channels.byok.jahez.branchId.hint" },
    ],
    portalHintKey: "settingsTabs.channels.byok.jahez.portalHint",
  },
};

function StatusBadge({ status, t }: { status: ChannelStatus; t: (key: string) => string }) {
  const map: Record<ChannelStatus, { labelKey: string; color: string; bg: string }> = {
    connected:     { labelKey: "settingsTabs.channels.status.connected",    color: GN,       bg: "rgba(16,185,129,0.08)" },
    pending:       { labelKey: "settingsTabs.channels.status.pending",      color: "#F59E0B", bg: "rgba(245,158,11,0.08)" },
    error:         { labelKey: "settingsTabs.channels.status.error",        color: "#EF4444", bg: "rgba(239,68,68,0.08)" },
    not_connected: { labelKey: "settingsTabs.channels.status.notConnected", color: "var(--muted)", bg: "transparent" },
  };
  const { labelKey, color, bg } = map[status];
  return (
    <span style={{
      fontFamily: MONO, fontSize: 11, fontWeight: 600, letterSpacing: "0.06em",
      color, background: bg, border: `1px solid ${color}30`,
      borderRadius: 6, padding: "3px 9px",
    }}>{t(labelKey)}</span>
  );
}

function ConnectButton({ platform, onConnect, t }: { platform: string; onConnect: (p: string) => void; t: (key: string) => string }) {
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
    >{t("settingsTabs.channels.actions.connect")}</button>
  );
}

export function ChannelsTab() {
  const { t } = useTranslation();
  const [statuses, setStatuses]         = useState<Record<string, ChannelStatus>>({});
  const [loading, setLoading]           = useState(true);
  const [disconnecting, setDisconnecting] = useState<string | null>(null);
  const [pendingDisconnect, setPendingDisconnect] = useState<string | null>(null);
  const [disconnectError, setDisconnectError] = useState<string | null>(null);
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
      alert(t("settingsTabs.channels.alerts.noMerchantSession"));
      return;
    }
    if (OAUTH_PLATFORMS.has(platform)) {
      window.location.href = `/api/auth/${platform}?merchant_id=${encodeURIComponent(merchantId)}`;
    } else if (platform in BYOK_PLATFORMS) {
      setByokPlatform(platform); setByokFields({}); setByokStatus("idle"); setByokError(null);
    }
  }

  async function handleDisconnect(platform: string) {
    const mid        = typeof window !== "undefined" ? (localStorage.getItem("ps_merchant_id") ?? "") : "";
    const accessCode = typeof window !== "undefined" ? (localStorage.getItem("ps_access_code") ?? "")  : "";

    setDisconnecting(platform);
    setDisconnectError(null);
    try {
      const res  = await fetch("/api/channels/disconnect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ merchant_id: mid, access_code: accessCode, platform }),
      });
      const data = await res.json() as { ok?: boolean; error?: string };
      if (data.ok) {
        setStatuses(prev => ({ ...prev, [platform]: "not_connected" }));
        setPendingDisconnect(null);
      } else {
        setDisconnectError(data.error ?? "PrizeSkout could not disconnect this channel. Please try again.");
      }
    } catch {
      setDisconnectError("PrizeSkout could not reach the server. Your channel is still connected.");
    } finally {
      setDisconnecting(null);
    }
  }

  async function submitByok(e: React.FormEvent) {
    e.preventDefault();
    const p = byokPlatform as string;
    const mid = typeof window !== "undefined" ? (localStorage.getItem("ps_merchant_id") ?? "") : "";
    const accessCode = typeof window !== "undefined" ? (localStorage.getItem("ps_access_code") ?? "") : "";
    if (!mid) { setByokError(t("settingsTabs.channels.alerts.noMerchantSession")); return; }
    setByokStatus("loading"); setByokError(null);
    try {
      const res = await fetch("/api/channels/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ merchant_id: mid, access_code: accessCode, platform: p, ...byokFields }),
      });
      const data = await res.json() as { ok?: boolean; error?: string };
      if (data.ok) {
        setByokStatus("ok");
        setStatuses(prev => ({ ...prev, [p]: "connected" }));
        setTimeout(() => { setByokPlatform(null); setByokStatus("idle"); setByokError(null); setByokFields({}); }, 1200);
      } else {
        setByokStatus("err");
        setByokError(data.error ?? t("settingsTabs.channels.errors.connectionFailed"));
      }
    } catch {
      setByokStatus("err");
      setByokError(t("settingsTabs.channels.errors.network"));
    }
  }

  const aggregators = CHANNELS.filter(c => c.type === "aggregator");
  const pos         = CHANNELS.filter(c => c.type === "pos");

  function Section({ title, items }: { title: string; items: Channel[] }) {
    return (
      <div style={{ marginBottom: 36 }}>
        <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.1em", color: "var(--muted)", fontFamily: MONO, marginBottom: 14 }}>
          {title}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 1, borderRadius: 12, overflow: "hidden", border: "1px solid var(--border)" }}>
          {items.map((ch, i) => {
            const status: ChannelStatus = statuses[ch.platform] ?? "not_connected";
            return (
              <div key={ch.name} style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "14px 16px", background: i % 2 === 0 ? "var(--surface2)" : "var(--surface)",
                gap: 12, flexWrap: "wrap",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <span style={{ fontSize: 22 }}>{ch.logo}</span>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text)" }}>{ch.name}</div>
                    {ch.note && <div style={{ fontSize: 13, color: "var(--muted)", marginTop: 2 }}>{ch.note}</div>}
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <StatusBadge status={loading ? "not_connected" : status} t={t} />
                  {!loading && status === "not_connected" && OAUTH_PLATFORMS.has(ch.platform) && (
                    <ConnectButton platform={ch.platform} onConnect={handleConnect} t={t} />
                  )}
                  {!loading && status === "connected" && OAUTH_PLATFORMS.has(ch.platform) && (
                    <>
                      <button
                        type="button"
                        onClick={() => { setPendingDisconnect(ch.platform); setDisconnectError(null); }}
                        disabled={disconnecting === ch.platform}
                        style={{
                          fontSize: 12, fontWeight: 500,
                          color: disconnecting === ch.platform ? "var(--muted)" : "#EF4444",
                          background: "transparent",
                          border: `1px solid ${disconnecting === ch.platform ? "var(--border)" : "rgba(239,68,68,0.3)"}`,
                          borderRadius: 7, padding: "10px 16px",
                          cursor: disconnecting === ch.platform ? "default" : "pointer",
                          fontFamily: "inherit", minHeight: 44, transition: "all .15s",
                        }}
                        onMouseEnter={e => { if (disconnecting !== ch.platform) e.currentTarget.style.background = "rgba(239,68,68,0.06)"; }}
                        onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
                      >
                        {disconnecting === ch.platform ? t("settingsTabs.channels.actions.disconnecting") : t("settingsTabs.channels.actions.disconnect")}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleConnect(ch.platform)}
                        style={{
                          fontSize: 12, fontWeight: 500, color: "var(--muted)", background: "transparent",
                          border: "1px solid var(--border)", borderRadius: 7, padding: "10px 16px",
                          cursor: "pointer", fontFamily: "inherit", minHeight: 44,
                        }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--muted)"; }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border)"; }}
                      >{t("settingsTabs.channels.actions.reconnect")}</button>
                    </>
                  )}
                  {!loading && status === "not_connected" && !OAUTH_PLATFORMS.has(ch.platform) && ch.platform in BYOK_PLATFORMS && (
                    <ConnectButton platform={ch.platform} onConnect={handleConnect} t={t} />
                  )}
                  {!loading && status === "not_connected" && !OAUTH_PLATFORMS.has(ch.platform) && !(ch.platform in BYOK_PLATFORMS) && (
                    <button
                      type="button"
                      disabled
                      style={{
                        fontSize: 12, fontWeight: 500, color: "var(--muted)", background: "transparent",
                        border: "1px solid var(--border)", borderRadius: 7, padding: "10px 16px",
                        cursor: "default", fontFamily: "inherit", minHeight: 44,
                      }}
                    >{t("settingsTabs.channels.actions.comingSoon")}</button>
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
        <h3 style={{ fontSize: 15, fontWeight: 600, color: "var(--text)", margin: "0 0 6px" }}>{t("settingsTabs.channels.heading")}</h3>
        <p style={{ fontSize: 13, color: "var(--muted)", margin: "0 0 28px", lineHeight: 1.7 }}>
          {t("settingsTabs.channels.description")}
        </p>
        <Section title={t("settingsTabs.channels.sections.aggregators")} items={aggregators} />
        <Section title={t("settingsTabs.channels.sections.pos")} items={pos} />
      </div>

      {/* In-app channel disconnect confirmation */}
      {pendingDisconnect && (() => {
        const channel = CHANNELS.find(c => c.platform === pendingDisconnect);
        const name = channel?.name ?? pendingDisconnect;
        const busy = disconnecting === pendingDisconnect;
        return (
          <div
            role="presentation"
            onClick={() => { if (!busy) { setPendingDisconnect(null); setDisconnectError(null); } }}
            style={{ position: "fixed", inset: 0, zIndex: 80, background: "rgba(9,12,18,.58)", backdropFilter: "blur(7px)", display: "grid", placeItems: "center", padding: 20 }}
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="disconnect-channel-title"
              onClick={e => e.stopPropagation()}
              style={{ width: "min(500px,100%)", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 20, boxShadow: "var(--shadow-lg)", padding: "28px 30px" }}
            >
              <div style={{ width: 46, height: 46, borderRadius: 13, display: "grid", placeItems: "center", background: "rgba(239,68,68,.09)", border: "1px solid rgba(239,68,68,.2)", fontSize: 22, marginBottom: 18 }}>!</div>
              <h3 id="disconnect-channel-title" style={{ margin: 0, color: "var(--text)", fontSize: 20, fontWeight: 800 }}>Disconnect {name}?</h3>
              <p style={{ margin: "10px 0 0", color: "var(--muted)", fontSize: 14, lineHeight: 1.7 }}>
                PrizeSkout will stop syncing this store and remove its saved connection credentials. Your products and orders in {name} will not be deleted.
              </p>
              {disconnectError && <p role="alert" style={{ margin: "16px 0 0", padding: "11px 13px", borderRadius: 9, color: "#EF4444", background: "rgba(239,68,68,.07)", border: "1px solid rgba(239,68,68,.2)", fontSize: 13 }}>{disconnectError}</p>}
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 24, flexWrap: "wrap" }}>
                <button type="button" disabled={busy} onClick={() => { setPendingDisconnect(null); setDisconnectError(null); }} style={{ minHeight: 44, padding: "10px 17px", borderRadius: 9, border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text)", fontFamily: "inherit", fontWeight: 700, cursor: busy ? "default" : "pointer" }}>Keep connected</button>
                <button type="button" disabled={busy} onClick={() => handleDisconnect(pendingDisconnect)} style={{ minHeight: 44, padding: "10px 17px", borderRadius: 9, border: 0, background: "#EF4444", color: "#fff", fontFamily: "inherit", fontWeight: 800, cursor: busy ? "wait" : "pointer", opacity: busy ? .7 : 1 }}>{busy ? "Disconnecting…" : `Disconnect ${name}`}</button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* BYOK credential modal */}
      {byokPlatform && byokCfg && (
        <div
          onClick={() => { setByokPlatform(null); setByokStatus("idle"); setByokError(null); setByokFields({}); }}
          style={{ position: "fixed", inset: 0, zIndex: 70, background: "rgba(9,12,18,.5)",
            backdropFilter: "blur(6px)", display: "grid", placeItems: "center",
            padding: 20 }}>
          <div onClick={e => e.stopPropagation()}
            style={{ width: "min(520px,100%)", background: "var(--surface)",
              border: "1px solid var(--border)", borderRadius: 20,
              boxShadow: "var(--shadow-lg)", padding: "28px 30px",
              display: "flex", flexDirection: "column", gap: 22 }}>

            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, letterSpacing: "-0.3px", color: "var(--text)" }}>
                  {t("settingsTabs.channels.modal.title", { name: byokName })}
                </h3>
                <p style={{ margin: "6px 0 0", fontSize: 13, color: "var(--muted)", lineHeight: 1.6 }}>
                  {t("settingsTabs.channels.modal.description", { name: byokName })}
                </p>
              </div>
              <button
                type="button"
                onClick={() => { setByokPlatform(null); setByokStatus("idle"); setByokError(null); setByokFields({}); }}
                aria-label={t("settingsTabs.channels.modal.close")}
                style={{ cursor: "pointer", flexShrink: 0, width: 34, height: 34,
                  borderRadius: 10, border: "1px solid var(--border)", background: "var(--surface)",
                  color: "var(--muted)", fontSize: 15, fontWeight: 700 }}>✕</button>
            </div>

            <form onSubmit={submitByok} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {byokCfg.fields.map(f => (
                <div key={f.key} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <label htmlFor={`ct-byok-${f.key}`}
                    style={{ fontSize: 12.5, fontWeight: 600, color: "var(--text)" }}>
                    {t(f.labelKey)}
                  </label>
                  {f.hintKey && (
                    <span style={{ fontSize: 11.5, color: "var(--muted)", marginTop: -3 }}>{t(f.hintKey)}</span>
                  )}
                  <input
                    id={`ct-byok-${f.key}`}
                    type="password"
                    autoComplete="off"
                    required
                    value={byokFields[f.key] ?? ""}
                    onChange={e => setByokFields(prev => ({ ...prev, [f.key]: e.target.value }))}
                    style={{ height: 44, borderRadius: 9, border: "1px solid var(--border)",
                      background: "var(--surface)", color: "var(--text)", padding: "0 13px",
                      fontSize: 14, fontFamily: "inherit", outline: "none",
                      transition: "border-color .15s" }}
                    onFocus={e => { e.currentTarget.style.borderColor = OG; }}
                    onBlur={e => { e.currentTarget.style.borderColor = "var(--border)"; }}
                  />
                </div>
              ))}

              {byokCfg.portalHintKey && (
                <p style={{ margin: 0, fontSize: 12, color: "var(--muted)", lineHeight: 1.6,
                  padding: "10px 14px", background: "var(--surface2)",
                  borderRadius: 9, border: "1px solid var(--border)" }}>
                  {t(byokCfg.portalHintKey)}
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
                  {t("settingsTabs.channels.modal.successMessage")}
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
                {byokStatus === "loading" ? t("settingsTabs.channels.modal.connecting") : byokStatus === "ok" ? t("settingsTabs.channels.modal.connected") : t("settingsTabs.channels.modal.connectCta", { name: byokName })}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
