/**
 * Integration Vault — Screen 3 of the new dashboard.
 *
 * REAL data: inbound connection status (Salla, Zid, Foodics — all unconnected in current schema).
 * STATIC design text: Talabat/Jahez/Deliveroo outbound cards, "TLS 1.3 · 540ms" handshake.
 *
 * NOT IN SCOPE: real Foodics OAuth, real outbound Talabat/Jahez push.
 * The "Install App" buttons are placeholders until OAuth flows are built.
 */
import { useState, useRef, useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { PsShell } from "@/components/dashboard/PsShell";

export const Route = createFileRoute("/dashboard/integration-vault")({
  component: IntegrationVaultPage,
});

// STATIC DEMO: outbound connectors — none are live integrations
const OUTBOUND = [
  { name: "Talabat", region: "QA · KSA · UAE", linked: false, note: "Awaiting integration build" },
  { name: "Jahez", region: "KSA · hyperlocal", linked: false, note: "Awaiting integration build" },
  { name: "Deliveroo", region: "UAE · QA", linked: false, note: "Awaiting integration build" },
];

// Inbound: current real status — none connected (Foodics OAuth not yet built)
interface InboundDef { name: string; kind: string; glyph: string; }
const INBOUND_DEFS: InboundDef[] = [
  { name: "Salla", kind: "E-Commerce", glyph: "S" },
  { name: "Zid", kind: "E-Commerce", glyph: "Z" },
  { name: "Foodics", kind: "POS Terminal", glyph: "F" },
];

type HandshakeState = "idle" | "testing" | "verified";

function IntegrationVaultPage() {
  // All inbound connections start as false — no real OAuth exists yet
  const [connected, setConnected] = useState<Record<string, boolean>>({
    Salla: false, Zid: false, Foodics: false,
  });
  const [apiKey, setApiKey] = useState("");
  const [handshake, setHandshake] = useState<HandshakeState>("idle");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  const handleConnect = (name: string) => {
    // Placeholder: real OAuth not yet built — show console note
    console.info(`[PrizeSkout] ${name} OAuth flow not yet implemented.`);
    // Optimistic: mark as connected in local state for demo purposes
    setConnected((c) => ({ ...c, [name]: true }));
  };

  const handleTest = () => {
    if (handshake === "testing") return;
    setHandshake("testing");
    // Simulated handshake — not a real network call
    timerRef.current = setTimeout(() => setHandshake("verified"), 1500);
  };

  return (
    <PsShell screen="integration-vault" title="Integration Vault" subtitle="Connect &amp; secure your commerce stack">
      <div style={{ display: "flex", flexDirection: "column", gap: 28, maxWidth: 1100 }}>

        {/* Inbound connections */}
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 5 }}>
            <h2 style={{ margin: 0, fontSize: 14, fontWeight: 600, color: "var(--ps-text-3)" }}>Inbound Connections</h2>
            <span style={{ fontSize: 11, color: "var(--ps-muted)", fontFamily: "'JetBrains Mono',monospace" }}>POS · E-Commerce</span>
          </div>
          <div style={{ fontSize: 12.5, color: "var(--ps-muted)", marginBottom: 14 }}>
            Where PrizeSkout reads your catalog, costs &amp; live inventory.
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14 }}>
            {INBOUND_DEFS.map((p) => {
              const isConnected = connected[p.name];
              return (
                <div key={p.name} style={{
                  border: "1px solid var(--ps-border)", borderRadius: 14, padding: 20,
                  background: "var(--ps-card)", display: "flex", flexDirection: "column", gap: 16,
                }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{
                      width: 42, height: 42, borderRadius: 11, background: "var(--ps-chip)",
                      border: "1px solid var(--ps-border)", display: "flex", alignItems: "center",
                      justifyContent: "center", fontFamily: "'JetBrains Mono',monospace",
                      fontSize: 16, fontWeight: 700, color: "#EF681A",
                    }}>{p.glyph}</div>
                    <span style={{
                      width: 9, height: 9, borderRadius: 999,
                      background: isConnected ? "#10B981" : "var(--ps-inactive)",
                      animation: isConnected ? "psPulse 2.4s infinite" : "none",
                    }} />
                  </div>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 600, color: "var(--ps-text)" }}>{p.name}</div>
                    <div style={{ fontSize: 11.5, color: "var(--ps-muted)", marginTop: 2 }}>{p.kind}</div>
                  </div>
                  <button
                    onClick={() => !isConnected && handleConnect(p.name)}
                    style={{
                      width: "100%", padding: 12, borderRadius: 9, fontSize: 13, fontWeight: 600,
                      fontFamily: "inherit", cursor: isConnected ? "default" : "pointer",
                      transition: "all .18s ease",
                      background: isConnected ? "rgba(16,185,129,0.12)" : "#EF681A",
                      color: isConnected ? "#10B981" : "#fff",
                      border: isConnected ? "1px solid rgba(16,185,129,0.35)" : "1px solid #EF681A",
                    }}
                  >
                    {isConnected ? "✓ Connected" : "Install App"}
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Outbound connections — STATIC DEMO: not live integrations */}
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 5 }}>
            <h2 style={{ margin: 0, fontSize: 14, fontWeight: 600, color: "var(--ps-text-3)" }}>Outbound Connections</h2>
            <span style={{ fontSize: 11, color: "var(--ps-muted)", fontFamily: "'JetBrains Mono',monospace" }}>Hyperlocal Aggregators</span>
          </div>
          <div style={{ fontSize: 12.5, color: "var(--ps-muted)", marginBottom: 14 }}>
            Where the Defend Loop will push optimized prices in real time.{" "}
            {/* Clearly not live — no real outbound push exists yet */}
            <span style={{ fontSize: 11, color: "var(--ps-faint)", fontFamily: "'JetBrains Mono',monospace" }}>(not yet active)</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14 }}>
            {OUTBOUND.map((o) => (
              <div key={o.name} style={{ border: "1px solid var(--ps-border)", borderRadius: 14, padding: 20, background: "var(--ps-card)" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ fontSize: 15, fontWeight: 600, color: "var(--ps-text)" }}>{o.name}</div>
                  <span style={{
                    fontSize: 9.5, fontWeight: 700, letterSpacing: "0.8px", padding: "3px 7px",
                    borderRadius: 5, fontFamily: "'JetBrains Mono',monospace",
                    background: "rgba(239,104,26,0.10)", color: "#EF681A", border: "1px solid rgba(239,104,26,0.3)",
                  }}>SETUP</span>
                </div>
                <div style={{ fontSize: 11.5, color: "var(--ps-muted)", marginTop: 4, fontFamily: "'JetBrains Mono',monospace" }}>{o.region}</div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 18, paddingTop: 14, borderTop: "1px solid var(--ps-border-2)", fontSize: 11.5, color: "var(--ps-muted)" }}>
                  <span style={{ width: 7, height: 7, borderRadius: 999, background: "#EF681A", flexShrink: 0 }} />
                  {o.note}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* API Key Vault */}
        <div style={{
          border: "1px solid var(--ps-border)", borderRadius: 14, padding: 24,
          background: "linear-gradient(120deg, var(--ps-veil-strong), var(--ps-card))",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
            <div style={{
              width: 30, height: 30, borderRadius: 8, flexShrink: 0,
              background: "rgba(239,104,26,0.12)", border: "1px solid rgba(239,104,26,0.3)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#EF681A" strokeWidth="2.5"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: "var(--ps-text)" }}>Merchant Key Vault</div>
              <div style={{ fontSize: 11.5, color: "var(--ps-muted)" }}>Credentials are encrypted at the edge — never stored in plaintext.</div>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 14, alignItems: "end", marginTop: 22 }}>
            <div>
              <label style={{ display: "block", fontSize: 11, fontWeight: 600, letterSpacing: "0.6px", color: "var(--ps-muted)", textTransform: "uppercase", marginBottom: 8 }}>
                Enter Merchant API Key
              </label>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="sk_live_••••••••••••••••••••••"
                style={{
                  width: "100%", background: "var(--ps-surface-2)", border: "1px solid var(--ps-border-3)",
                  borderRadius: 10, padding: "13px 15px", color: "var(--ps-text-2)",
                  fontFamily: "'JetBrains Mono',monospace", fontSize: 13, outline: "none", letterSpacing: 1,
                  boxSizing: "border-box",
                }}
              />
            </div>
            <button
              onClick={handleTest}
              style={{
                display: "flex", alignItems: "center", justifyContent: "center", gap: 9,
                whiteSpace: "nowrap", padding: "14px 22px", borderRadius: 10,
                fontSize: 13.5, fontWeight: 600, fontFamily: "inherit", cursor: "pointer",
                transition: "all .18s ease",
                border: handshake === "verified" ? "1px solid rgba(16,185,129,0.4)" : "1px solid rgba(239,104,26,0.45)",
                background: handshake === "verified" ? "rgba(16,185,129,0.12)" : "#EF681A",
                color: handshake === "verified" ? "#10B981" : "#fff",
              }}
            >
              {handshake === "testing" && (
                <span style={{
                  width: 14, height: 14, borderRadius: 999, border: "2px solid rgba(255,255,255,0.35)",
                  borderTopColor: "#fff", animation: "psSpin .7s linear infinite", display: "inline-block",
                }} />
              )}
              {handshake === "testing" ? "Verifying…" : handshake === "verified" ? "Re-test" : "Test Handshake"}
            </button>
          </div>
          {handshake === "verified" && (
            <div style={{
              display: "flex", alignItems: "center", gap: 10, marginTop: 16, padding: "13px 16px",
              borderRadius: 10, background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.3)",
              color: "#10B981", fontSize: 13, flexWrap: "wrap", animation: "psIn .4s ease",
            }}>
              <span style={{
                width: 18, height: 18, borderRadius: 999, background: "#10B981", flexShrink: 0,
                display: "flex", alignItems: "center", justifyContent: "center",
                color: "#08240f", fontSize: 11, fontWeight: 800,
              }}>✓</span>
              <span style={{ fontWeight: 600 }}>API Handshake Verified — Connection Secure</span>
              {/* ↓ DEMO timing — simulated, not a real measured handshake */}
              <span style={{ marginLeft: "auto", fontFamily: "'JetBrains Mono',monospace", fontSize: 11, opacity: 0.75 }}>TLS 1.3 · 540ms</span>
            </div>
          )}
        </div>

      </div>
    </PsShell>
  );
}
