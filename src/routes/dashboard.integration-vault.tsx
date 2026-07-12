import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, type FormEvent } from "react";
import { CheckCircle, XCircle, Loader, Link2Off, ExternalLink, ChevronDown, ChevronUp } from "lucide-react";

export const Route = createFileRoute("/dashboard/integration-vault")({
  component: IntegrationVaultPage,
});

// ── Types ─────────────────────────────────────────────────────────────────────
type ChannelStatus = "connected" | "error" | "not_connected" | "pending";
interface Channel { platform: string; status: ChannelStatus; connected_at: string | null }

// ── Constants ─────────────────────────────────────────────────────────────────
const OG = "#EF681A";
const MONO = "ui-monospace,'SFMono-Regular',Menlo,Consolas,monospace";

const PLATFORM_META: Record<string, { label: string; color: string; portalUrl: string; instructions: string }> = {
  talabat: {
    label: "Talabat",
    color: "#FF6A00",
    portalUrl: "https://partner.talabat.com",
    instructions: "Go to your Talabat Partner Portal → Settings → Shop Integrations Plugin → generate Client ID and Client Secret.",
  },
  jahez: {
    label: "Jahez",
    color: "#E8312A",
    portalUrl: "mailto:integration@jahez.net",
    instructions: "Email integration@jahez.net with your restaurant name and request your API Key and Secret Code. They typically respond within 1–2 business days.",
  },
};

// ── Status badge ──────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: ChannelStatus }) {
  const map: Record<ChannelStatus, { color: string; bg: string; label: string }> = {
    connected:     { color: "#10B981", bg: "rgba(16,185,129,0.1)",  label: "Connected" },
    error:         { color: "#EF4444", bg: "rgba(239,68,68,0.1)",   label: "Error" },
    not_connected: { color: "#6B7280", bg: "rgba(107,114,128,0.1)", label: "Not connected" },
    pending:       { color: OG,        bg: "rgba(239,104,26,0.1)",  label: "Pending" },
  };
  const s = map[status];
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 6,
      background: s.bg, color: s.color, border: `1px solid ${s.color}30`,
      borderRadius: 6, padding: "3px 10px", fontSize: 11.5, fontWeight: 600,
      fontFamily: MONO, letterSpacing: "0.04em",
    }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: s.color, flexShrink: 0 }} />
      {s.label}
    </span>
  );
}

// ── Talabat form ──────────────────────────────────────────────────────────────
function TalabatForm({ merchantId, onSuccess }: { merchantId: string; onSuccess: () => void }) {
  const [clientId,     setClientId]     = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [vendorId,     setVendorId]     = useState("");
  const [chainId,      setChainId]      = useState("");
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/channels/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          merchant_id:   merchantId,
          platform:      "talabat",
          client_id:     clientId.trim(),
          client_secret: clientSecret.trim(),
          vendor_id:     vendorId.trim(),
          chain_id:      chainId.trim(),
        }),
      });
      const data = await res.json() as { ok?: boolean; error?: string };
      if (data.ok) { onSuccess(); }
      else { setError(data.error ?? "Connection failed."); }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 16 }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label="Client ID" value={clientId} onChange={setClientId} placeholder="From Talabat Partner Portal" />
        <Field label="Client Secret" value={clientSecret} onChange={setClientSecret} placeholder="From Talabat Partner Portal" type="password" />
        <Field label="Vendor ID" value={vendorId} onChange={setVendorId} placeholder="Your Talabat Vendor ID" />
        <Field label="Chain ID" value={chainId} onChange={setChainId} placeholder="Your Talabat Chain ID" />
      </div>
      {error && <ErrorMsg>{error}</ErrorMsg>}
      <SubmitBtn loading={loading} label="Connect Talabat" />
    </form>
  );
}

// ── Jahez form ────────────────────────────────────────────────────────────────
function JahezForm({ merchantId, onSuccess }: { merchantId: string; onSuccess: () => void }) {
  const [apiKey,     setApiKey]     = useState("");
  const [secretCode, setSecretCode] = useState("");
  const [branchId,   setBranchId]   = useState("");
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/channels/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          merchant_id: merchantId,
          platform:    "jahez",
          api_key:     apiKey.trim(),
          secret_code: secretCode.trim(),
          branch_id:   branchId.trim(),
        }),
      });
      const data = await res.json() as { ok?: boolean; error?: string };
      if (data.ok) { onSuccess(); }
      else { setError(data.error ?? "Connection failed."); }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 16 }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label="API Key" value={apiKey} onChange={setApiKey} placeholder="From integration@jahez.net" />
        <Field label="Secret Code" value={secretCode} onChange={setSecretCode} placeholder="From integration@jahez.net" type="password" />
        <Field label="Branch ID" value={branchId} onChange={setBranchId} placeholder="Your Jahez Branch ID" style={{ gridColumn: "1 / -1" }} />
      </div>
      {error && <ErrorMsg>{error}</ErrorMsg>}
      <SubmitBtn loading={loading} label="Connect Jahez" />
    </form>
  );
}

// ── Platform card ─────────────────────────────────────────────────────────────
function PlatformCard({
  platform,
  channel,
  merchantId,
  onRefresh,
}: {
  platform: string;
  channel: Channel | undefined;
  merchantId: string;
  onRefresh: () => void;
}) {
  const meta      = PLATFORM_META[platform];
  const status    = channel?.status ?? "not_connected";
  const connected = status === "connected";
  const [expanded,    setExpanded]    = useState(!connected);
  const [disconnecting, setDisconnecting] = useState(false);

  const handleDisconnect = async () => {
    setDisconnecting(true);
    await fetch("/api/channels/disconnect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ merchant_id: merchantId, platform }),
    }).catch(() => {});
    setDisconnecting(false);
    onRefresh();
  };

  return (
    <div style={{
      background: "#0E0F12", border: "1px solid rgba(255,255,255,0.07)",
      borderRadius: 12, padding: "20px 22px",
    }}>
      {/* Header row */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {/* Platform colour dot */}
          <span style={{
            width: 36, height: 36, borderRadius: 9, flexShrink: 0,
            background: meta.color,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontWeight: 800, fontSize: 14, color: "#fff",
          }}>
            {meta.label[0]}
          </span>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: "#F5F6FA" }}>{meta.label}</div>
            {connected && channel?.connected_at && (
              <div style={{ fontFamily: MONO, fontSize: 10.5, color: "#6B7280", marginTop: 2 }}>
                Connected {new Date(channel.connected_at).toLocaleDateString()}
              </div>
            )}
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <StatusBadge status={status} />
          {connected && (
            <button
              type="button"
              onClick={handleDisconnect}
              disabled={disconnecting}
              style={{
                display: "inline-flex", alignItems: "center", gap: 5,
                background: "transparent", border: "1px solid rgba(239,68,68,0.3)",
                borderRadius: 7, padding: "5px 11px",
                fontSize: 12, color: "#EF4444", cursor: "pointer",
                fontFamily: "inherit", transition: "border-color 0.15s",
              }}
              onMouseEnter={e => e.currentTarget.style.borderColor = "rgba(239,68,68,0.7)"}
              onMouseLeave={e => e.currentTarget.style.borderColor = "rgba(239,68,68,0.3)"}
            >
              <Link2Off size={12} />
              {disconnecting ? "Disconnecting…" : "Disconnect"}
            </button>
          )}
          <button
            type="button"
            onClick={() => setExpanded(v => !v)}
            style={{
              background: "transparent", border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 7, padding: "5px 9px", color: "#9BA1B0",
              cursor: "pointer", display: "flex", alignItems: "center",
            }}
          >
            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        </div>
      </div>

      {/* Expanded: instructions + form */}
      {expanded && (
        <div style={{ marginTop: 18, borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 18 }}>
          {/* Instructions */}
          <div style={{
            background: "rgba(239,104,26,0.06)", border: "1px solid rgba(239,104,26,0.15)",
            borderRadius: 8, padding: "11px 14px", marginBottom: 16,
          }}>
            <div style={{ fontSize: 11.5, color: "#C4A882", lineHeight: 1.6 }}>{meta.instructions}</div>
            <a
              href={meta.portalUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{ display: "inline-flex", alignItems: "center", gap: 5, marginTop: 8, fontSize: 11.5, color: OG, textDecoration: "none" }}
            >
              Open {meta.label} portal <ExternalLink size={11} />
            </a>
          </div>

          {/* Credential form */}
          {platform === "talabat" && <TalabatForm merchantId={merchantId} onSuccess={() => { setExpanded(false); onRefresh(); }} />}
          {platform === "jahez"   && <JahezForm   merchantId={merchantId} onSuccess={() => { setExpanded(false); onRefresh(); }} />}
        </div>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
function IntegrationVaultPage() {
  const merchantId = typeof window !== "undefined" ? (localStorage.getItem("ps_merchant_id") ?? "") : "";
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading,  setLoading]  = useState(true);

  const fetchStatus = async () => {
    if (!merchantId) return;
    setLoading(true);
    try {
      const res  = await fetch(`/api/channels/status?merchant_id=${merchantId}`);
      const data = await res.json() as { channels?: Channel[] };
      setChannels(data.channels ?? []);
    } catch { /* noop */ }
    finally { setLoading(false); }
  };

  useEffect(() => { void fetchStatus(); }, [merchantId]);

  const channelMap = Object.fromEntries(channels.map(c => [c.platform, c]));
  const SUPPORTED = ["talabat", "jahez"] as const;
  const connectedCount = SUPPORTED.filter(p => channelMap[p]?.status === "connected").length;

  return (
    <div style={{ padding: "28px 24px", maxWidth: 860, margin: "0 auto" }}>

      {/* Page header */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontFamily: MONO, fontSize: 10.5, letterSpacing: "0.12em", color: OG, marginBottom: 8 }}>
          INTEGRATION VAULT
        </div>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: "#F5F6FA", margin: 0 }}>
          Aggregator Connections
        </h1>
        <p style={{ fontSize: 13.5, color: "#9BA1B0", marginTop: 6, maxWidth: 560, lineHeight: 1.6 }}>
          Connect your delivery platform accounts using your own API credentials.
          PrizeSkout uses these to push margin-safe prices on your behalf.
        </p>
      </div>

      {/* Summary bar */}
      <div style={{
        display: "flex", alignItems: "center", gap: 10,
        background: connectedCount > 0 ? "rgba(16,185,129,0.06)" : "rgba(239,104,26,0.06)",
        border: `1px solid ${connectedCount > 0 ? "rgba(16,185,129,0.2)" : "rgba(239,104,26,0.2)"}`,
        borderRadius: 10, padding: "12px 16px", marginBottom: 24,
        fontSize: 13, color: connectedCount > 0 ? "#10B981" : "#C4A882",
      }}>
        {loading ? (
          <><Loader size={14} style={{ animation: "spin 1s linear infinite" }} /> Checking connections…</>
        ) : (
          <>
            {connectedCount > 0
              ? <><CheckCircle size={14} /> {connectedCount} of {SUPPORTED.length} aggregators connected. PrizeSkout can push prices live.</>
              : <><XCircle size={14} /> No aggregators connected yet. Add at least one to enable price pushing.</>
            }
          </>
        )}
      </div>

      {/* Platform cards */}
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {SUPPORTED.map(platform => (
          <PlatformCard
            key={platform}
            platform={platform}
            channel={channelMap[platform] as Channel | undefined}
            merchantId={merchantId}
            onRefresh={fetchStatus}
          />
        ))}

        {/* Snoonu — coming soon */}
        <div style={{
          background: "#0A0B0E", border: "1px solid rgba(255,255,255,0.05)",
          borderRadius: 12, padding: "20px 22px",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          opacity: 0.55,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{
              width: 36, height: 36, borderRadius: 9, background: "#1B4332",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontWeight: 800, fontSize: 14, color: "#6EE7B7",
            }}>S</span>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: "#F5F6FA" }}>Snoonu</div>
              <div style={{ fontSize: 11.5, color: "#6B7280", marginTop: 2 }}>Partner API in progress</div>
            </div>
          </div>
          <span style={{
            fontFamily: MONO, fontSize: 10.5, letterSpacing: "0.1em",
            color: "#6B7280", border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 6, padding: "4px 10px",
          }}>COMING SOON</span>
        </div>
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @media (max-width: 600px) {
          .iv-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}

// ── Shared form primitives ────────────────────────────────────────────────────
function Field({
  label, value, onChange, placeholder, type = "text", style,
}: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; type?: string; style?: React.CSSProperties;
}) {
  return (
    <div style={style}>
      <label style={{ display: "block", fontSize: 11.5, fontWeight: 500, color: "#9BA1B0", marginBottom: 5 }}>
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          width: "100%", background: "#080909", border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 7, padding: "9px 12px", fontSize: 12.5, color: "#E7E8EA",
          outline: "none", fontFamily: "inherit", boxSizing: "border-box",
        }}
        onFocus={e => { e.currentTarget.style.borderColor = OG; }}
        onBlur={e =>  { e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"; }}
      />
    </div>
  );
}

function ErrorMsg({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontSize: 12, color: "#EF4444",
      background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)",
      borderRadius: 7, padding: "8px 12px",
    }}>
      {children}
    </div>
  );
}

function SubmitBtn({ loading, label }: { loading: boolean; label: string }) {
  return (
    <button
      type="submit"
      disabled={loading}
      style={{
        alignSelf: "flex-start", background: OG, color: "#fff",
        border: "none", borderRadius: 8, padding: "10px 20px",
        fontSize: 13, fontWeight: 600, cursor: loading ? "not-allowed" : "pointer",
        opacity: loading ? 0.65 : 1, fontFamily: "inherit",
        display: "flex", alignItems: "center", gap: 7,
      }}
    >
      {loading && <Loader size={14} style={{ animation: "spin 1s linear infinite" }} />}
      {loading ? "Connecting…" : label}
    </button>
  );
}
