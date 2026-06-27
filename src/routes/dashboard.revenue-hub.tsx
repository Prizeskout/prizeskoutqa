/**
 * Revenue Protection Hub — Screen 1 of the new dashboard.
 *
 * REAL data: Active Rules count (pricing_rules), Today's Decisions count (pricing_decisions).
 * DEMO data (clearly marked): profit total, sparkline, ROI badge, system nodes, execution stream.
 */
import { useState, useEffect, useRef } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { PsShell } from "@/components/dashboard/PsShell";

// ── Real data loader ──────────────────────────────────────────────────────────
async function loadRevenueHubData() {
  const [rulesRes, decisionsRes] = await Promise.all([
    supabase.from("pricing_rules").select("id", { count: "exact" }).eq("enabled", true),
    supabase.from("pricing_decisions").select("id", { count: "exact" })
      .gte("created_at", new Date(Date.now() - 86_400_000).toISOString()),
  ]);
  return {
    activeRules: rulesRes.count ?? 0,
    decisionsToday: decisionsRes.count ?? 0,
  };
}

export const Route = createFileRoute("/dashboard/revenue-hub")({
  component: RevenueHubPage,
});

// ── Demo animation helpers ────────────────────────────────────────────────────
const PLATFORMS = ["Talabat", "Jahez", "Deliveroo", "Snoonu"] as const;
const LOCS = ["Doha West Bay", "Doha Al Sadd", "Riyadh Olaya", "Dubai Marina"];

// DEMO: static edge node data — infrastructure latency not measured by this app
const DEMO_NODES = [
  { city: "Doha", region: "QA · West Bay", ms: 12 },
  { city: "Riyadh", region: "KSA · Olaya", ms: 18 },
  { city: "Dubai", region: "UAE · Marina", ms: 15 },
  { city: "Kuwait City", region: "KW · Salmiya", ms: 21 },
];

interface LogEntry { id: number; t: string; sku: string; platform: string; loc: string; m: number; ms: number; }

let logIdSeq = 0;
function makeLog(): LogEntry {
  const now = new Date();
  return {
    id: ++logIdSeq,
    t: "[" + now.toTimeString().slice(0, 8) + "]",
    sku: "SKU-" + (1000 + Math.floor(Math.random() * 9000)),
    platform: PLATFORMS[Math.floor(Math.random() * PLATFORMS.length)],
    loc: LOCS[Math.floor(Math.random() * LOCS.length)],
    m: 22 + Math.floor(Math.random() * 22),
    ms: 120 + Math.floor(Math.random() * 720),
  };
}

// ── Page component ────────────────────────────────────────────────────────────
function RevenueHubPage() {
  // Real data
  const [activeRules, setActiveRules] = useState<number | null>(null);
  const [decisionsToday, setDecisionsToday] = useState<number | null>(null);

  // DEMO: animated margin counter
  const [margin, setMargin] = useState(14250);
  const [delta, setDelta] = useState(0);

  // DEMO: sparkline bars
  const [spark, setSpark] = useState<number[]>(() => Array.from({ length: 34 }, () => 0.25 + Math.random() * 0.7));

  // DEMO: node latencies (animated slightly)
  const [nodes, setNodes] = useState(DEMO_NODES);

  // DEMO: execution log
  const [logs, setLogs] = useState<LogEntry[]>(() => {
    const seed: LogEntry[] = [];
    for (let i = 0; i < 14; i++) seed.unshift(makeLog());
    return seed;
  });

  const isMounted = useRef(true);
  useEffect(() => { isMounted.current = true; return () => { isMounted.current = false; }; }, []);

  useEffect(() => {
    loadRevenueHubData().then(({ activeRules: ar, decisionsToday: dt }) => {
      if (!isMounted.current) return;
      setActiveRules(ar);
      setDecisionsToday(dt);
    });
  }, []);

  // DEMO ticker — clearly demo, NOT live telemetry
  useEffect(() => {
    const tick = setInterval(() => {
      const d = Math.floor(20 + Math.random() * 170);
      setMargin((m) => m + d);
      setDelta(d);
      setSpark((s) => [...s.slice(1), 0.25 + Math.random() * 0.7]);
      setNodes((ns) => ns.map((n) => {
        let ms = n.ms + (Math.random() < 0.5 ? -1 : 1);
        if (ms < 9) ms = 9; if (ms > 26) ms = 26;
        return { ...n, ms };
      }));
    }, 1700);
    const logTick = setInterval(() => {
      setLogs((ls) => { const next = [makeLog(), ...ls]; if (next.length > 26) next.pop(); return next; });
    }, 1400);
    return () => { clearInterval(tick); clearInterval(logTick); };
  }, []);

  const STAT_CARDS = [
    { label: "Tracked Products", value: "1,203", sub: "+48 today", tone: "#10B981", isDemo: true },
    { label: "Price Updates Today", value: decisionsToday !== null ? decisionsToday.toLocaleString() : "—", sub: "avg 540ms", tone: "var(--ps-muted)", isDemo: false },
    { label: "Avg. Margin Saved", value: "31.4%", sub: "above floor", tone: "#10B981", isDemo: true },
    { label: "Active Rules", value: activeRules !== null ? String(activeRules) : "—", sub: "price guardrails", tone: "var(--ps-muted)", isDemo: false },
  ];

  return (
    <PsShell screen="revenue-hub" title="Revenue Protection Hub" subtitle="Active price optimization and loss prevention">
      <div style={{ display: "flex", flexDirection: "column", gap: 22, maxWidth: 1180 }}>

        {/* Hero row */}
        <div style={{ display: "grid", gridTemplateColumns: "1.55fr 1fr", gap: 18 }}>
          {/* Profits protected card — DEMO animated counter */}
          <div style={{
            position: "relative", overflow: "hidden",
            border: "1px solid rgba(239,104,26,0.22)", borderRadius: 16,
            padding: "28px 30px",
            background: "linear-gradient(135deg, rgba(239,104,26,0.10), var(--ps-card-veil) 55%), var(--ps-card)",
          }}>
            {/* DEMO label */}
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ width: 7, height: 7, borderRadius: 999, background: "#10B981", animation: "psPulse 2.2s infinite" }} />
              <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: "1px", color: "var(--ps-soft)", textTransform: "uppercase" }}>
                Profits Protected · This Month
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginTop: 16, flexWrap: "wrap" }}>
              <span style={{ fontSize: 20, fontWeight: 600, color: "var(--ps-muted)", fontFamily: "'JetBrains Mono',monospace" }}>QAR</span>
              <span style={{
                fontFamily: "'JetBrains Mono',monospace", fontSize: 62, fontWeight: 700,
                letterSpacing: -2, color: "#EF681A", lineHeight: 1,
                animation: "psFlash .6s ease", textShadow: "0 0 18px rgba(239,104,26,0.3)",
              }}>
                {margin.toLocaleString("en-US")}
              </span>
              {/* ↓ DEMO metric — not a measured value */}
              <span style={{
                alignSelf: "center", fontFamily: "'JetBrains Mono',monospace", fontSize: 13, fontWeight: 700,
                color: "#10B981", background: "rgba(16,185,129,0.10)", border: "1px solid rgba(16,185,129,0.32)",
                padding: "6px 12px", borderRadius: 9, letterSpacing: "0.3px", whiteSpace: "nowrap",
              }}>72× ROI</span>
            </div>
            {delta > 0 && (
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 18, flexWrap: "wrap" }}>
                <span style={{
                  fontFamily: "'JetBrains Mono',monospace", fontSize: 12.5, fontWeight: 600,
                  color: "#10B981", background: "rgba(16,185,129,0.10)", border: "1px solid rgba(16,185,129,0.25)",
                  padding: "4px 9px", borderRadius: 7,
                }}>▲ {delta} QAR / cycle</span>
                <span style={{ fontSize: 12.5, color: "var(--ps-muted)" }}>across all active store items</span>
              </div>
            )}
            {/* DEMO sparkline */}
            <div style={{ display: "flex", alignItems: "flex-end", gap: 3, height: 54, marginTop: 24 }}>
              {spark.map((v, i) => {
                const last = i >= spark.length - 3;
                return (
                  <div key={i} style={{
                    flex: 1, minWidth: 0, borderRadius: 2,
                    height: Math.round(v * 100) + "%", animation: "psBar .5s ease",
                    background: last ? "#EF681A" : "rgba(239,104,26,0.32)",
                  }} />
                );
              })}
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 9, fontFamily: "'JetBrains Mono',monospace", fontSize: 10.5, color: "var(--ps-faint)", letterSpacing: "0.3px" }}>
              <span>01 Jun</span><span>10 Jun</span><span>20 Jun</span><span style={{ color: "var(--ps-soft)" }}>Today</span>
            </div>
            <div style={{ position: "absolute", bottom: 8, right: 12, fontSize: 9, color: "var(--ps-faint)", fontFamily: "'JetBrains Mono',monospace" }}>DEMO</div>
          </div>

          {/* Stat cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 14 }}>
            {STAT_CARDS.map((s) => (
              <div key={s.label} style={{
                border: "1px solid var(--ps-border)", borderRadius: 13, padding: "16px 17px",
                background: "var(--ps-card)", display: "flex", flexDirection: "column",
                justifyContent: "space-between", minHeight: 104, position: "relative",
              }}>
                <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.4px", color: "var(--ps-muted)", textTransform: "uppercase" }}>{s.label}</div>
                <div style={{ marginTop: 14, fontFamily: "'JetBrains Mono',monospace", fontSize: 24, fontWeight: 600, color: "var(--ps-text)", letterSpacing: "-0.5px" }}>{s.value}</div>
                <div style={{ fontSize: 11, color: s.tone, marginTop: 4, fontFamily: "'JetBrains Mono',monospace" }}>{s.sub}</div>
                {s.isDemo && <div style={{ position: "absolute", top: 8, right: 10, fontSize: 9, color: "var(--ps-faint)", fontFamily: "'JetBrains Mono',monospace" }}>DEMO</div>}
              </div>
            ))}
          </div>
        </div>

        {/* System Nodes — DEMO: static/animated, not live infrastructure */}
        <div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 13 }}>
            <h2 style={{ margin: 0, fontSize: 14, fontWeight: 600, color: "var(--ps-text-3)", letterSpacing: "0.2px" }}>System Nodes &amp; Response Times</h2>
            <span style={{ fontSize: 11.5, color: "var(--ps-muted)", fontFamily: "'JetBrains Mono',monospace" }}>
              4 / 4 active &nbsp;<span style={{ fontSize: 9, color: "var(--ps-faint)" }}>(DEMO)</span>
            </span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14 }}>
            {nodes.map((n) => (
              <div key={n.city} style={{ border: "1px solid var(--ps-border)", borderRadius: 13, padding: "16px 17px", background: "var(--ps-card)" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 13.5, fontWeight: 600, color: "var(--ps-text)" }}>{n.city}</span>
                  <span style={{ width: 9, height: 9, borderRadius: 999, background: "#10B981", animation: "psPulse 2.6s infinite" }} />
                </div>
                <div style={{ fontSize: 11, color: "var(--ps-muted)", marginTop: 3, fontFamily: "'JetBrains Mono',monospace" }}>{n.region}</div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 5, marginTop: 14 }}>
                  <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 22, fontWeight: 600, color: "#10B981", letterSpacing: "-0.5px" }}>{n.ms}</span>
                  <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 12, color: "var(--ps-muted)" }}>ms</span>
                </div>
                <div style={{ fontSize: 10.5, fontWeight: 600, color: "#10B981", letterSpacing: "0.6px", marginTop: 6, textTransform: "uppercase" }}>✓ Active</div>
              </div>
            ))}
          </div>
        </div>

        {/* Live Execution Stream — DEMO: animated fake log, not real event stream */}
        <div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 13, gap: 10, flexWrap: "wrap" }}>
            <div>
              <h2 style={{ margin: 0, fontSize: 14, fontWeight: 600, color: "var(--ps-text-3)", letterSpacing: "0.2px" }}>Live Execution Stream</h2>
              <div style={{ fontSize: 11, color: "var(--ps-faint)", marginTop: 2, fontFamily: "'JetBrains Mono',monospace" }}>Simulated · not real event feed</div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 9, flexWrap: "wrap" }}>
              <button style={{
                fontFamily: "'JetBrains Mono',monospace", fontSize: 11.5, color: "var(--ps-soft)",
                background: "transparent", border: "1px solid var(--ps-border-3)", borderRadius: 8,
                padding: "8px 12px", cursor: "pointer",
              }}>Download Audit Log (CSV)</button>
              <button style={{
                fontFamily: "'JetBrains Mono',monospace", fontSize: 11.5, color: "#EF681A",
                background: "rgba(239,104,26,0.07)", border: "1px solid rgba(239,104,26,0.28)",
                borderRadius: 8, padding: "8px 12px", cursor: "pointer",
              }}>Export Dispute Proofs</button>
            </div>
          </div>
          <div style={{ border: "1px solid var(--ps-border)", borderRadius: 13, background: "var(--ps-surface-2)", overflow: "hidden" }}>
            <div style={{
              display: "flex", alignItems: "center", gap: 7, padding: "11px 15px",
              borderBottom: "1px solid var(--ps-border-2)", background: "var(--ps-surface-3)",
            }}>
              <span style={{ width: 10, height: 10, borderRadius: 999, background: "#EF681A" }} />
              <span style={{ width: 10, height: 10, borderRadius: 999, background: "var(--ps-chip-2)" }} />
              <span style={{ width: 10, height: 10, borderRadius: 999, background: "var(--ps-chip-2)" }} />
              <span style={{ marginLeft: 8, fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: "var(--ps-muted)" }}>prizeskout://defend-loop/exec.log</span>
              <span style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 11, color: "var(--ps-muted)", fontFamily: "'JetBrains Mono',monospace", marginLeft: "auto" }}>
                <span style={{ width: 7, height: 7, borderRadius: 999, background: "#EF681A", animation: "psPulse 1.6s infinite" }} />
                streaming
              </span>
            </div>
            <div style={{ height: 300, overflowY: "auto", padding: "8px 0", fontFamily: "'JetBrains Mono',monospace", fontSize: 12 }}>
              {logs.map((l, i) => (
                <div key={l.id} style={{
                  display: "flex", alignItems: "center", gap: 9, padding: "5px 16px", whiteSpace: "nowrap",
                  borderLeft: `2px solid ${i === 0 ? "#EF681A" : "transparent"}`,
                  background: i === 0 ? "rgba(239,104,26,0.07)" : "transparent",
                  animation: i === 0 ? "psIn .35s ease" : "none",
                }}>
                  <span style={{ color: "var(--ps-faint)" }}>{l.t}</span>
                  <span style={{ color: "#EF681A", fontWeight: 600 }}>{l.sku}</span>
                  <span style={{ color: "var(--ps-soft)" }}>Reprice on</span>
                  <span style={{ color: "var(--ps-text-2)", fontWeight: 600 }}>{l.platform}</span>
                  <span style={{ color: "var(--ps-muted)" }}>({l.loc})</span>
                  <span style={{ color: "var(--ps-soft)" }}>→</span>
                  <span style={{ color: "#10B981", fontWeight: 600 }}>Margin Defended @ {l.m}%</span>
                  <span style={{ color: "var(--ps-faint)", marginLeft: "auto" }}>{l.ms}ms</span>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>
    </PsShell>
  );
}
