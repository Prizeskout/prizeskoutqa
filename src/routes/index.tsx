import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { applyLocale, type Locale } from "@/lib/i18n";
import logoDark from "@/assets/logo-dark.svg";
import qstpLogoColored from "@/assets/qstp-logo-colored.png";
import qatarFoundationLogo from "@/assets/qatar-foundation-logo.png";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "PrizeSkout | Pricing Infrastructure for GCC Commerce" },
      {
        name: "description",
        content:
          "Stop managing API hell and scraping liabilities. Deploy a serverless event middleware that programmatically syncs, calculates, and defends merchant net margins across regional delivery platforms — instantly.",
      },
      { property: "og:title", content: "PrizeSkout | Pricing Infrastructure for GCC Commerce" },
    ],
  }),
  component: LandingPage,
});

// ── Design tokens ─────────────────────────────────────────────────────────────
const OG = "#EF681A";
const GN = "#56C28A";
const BG = "#080505";
const MONO = "'JetBrains Mono','SFMono-Regular',Menlo,monospace";

// ── Packet stream ─────────────────────────────────────────────────────────────
type LogLine = { time: string; evt: string; target: string; ms: number; evtColor: string; slow: boolean };

const LINE_POOL = [
  { evt: "POST /v1/ingest",  target: "salla.order.updated",       kind: "in"     },
  { evt: "WEBHOOK",          target: "foodics.product.price",      kind: "in"     },
  { evt: "POST /v1/ingest",  target: "sap.s4hana.material",        kind: "in"     },
  { evt: "STREAM ▸",    target: "redpanda.partition-7",       kind: "stream" },
  { evt: "EVAL margin",      target: "region=QA  comm=22%",        kind: "rule"   },
  { evt: "EVAL margin",      target: "region=AE  comm=25%",        kind: "rule"   },
  { evt: "CACHE hit",        target: "redis.floor.QA-8842",        kind: "rule"   },
  { evt: "DEFEND",           target: "competitor ↓4.2% detected", kind: "defend" },
  { evt: "PUSH price",       target: "talabat.menu.sync",          kind: "out"    },
  { evt: "PUSH price",       target: "jahez.item.4821",            kind: "out"    },
  { evt: "ACK 200",          target: "noon.food.confirm",          kind: "ok"     },
  { evt: "AUDIT",            target: "pdpl.route QA→KSA ✓", kind: "audit" },
] as const;

function kindColor(kind: string) {
  if (kind === "out" || kind === "defend") return OG;
  if (kind === "ok"  || kind === "audit")  return GN;
  if (kind === "rule")                     return "#C97B4A";
  return "#9C938F";
}

function nowStamp() {
  const d = new Date(), p = (n: number, l = 2) => String(n).padStart(l, "0");
  return `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}.${p(d.getMilliseconds(), 3)}`;
}

function makeLine(): LogLine {
  const p = LINE_POOL[Math.floor(Math.random() * LINE_POOL.length)];
  const base = p.kind === "stream" ? 8 : p.kind === "in" ? 40 : p.kind === "rule" ? 130 : p.kind === "out" ? 540 : 90;
  const ms = base + Math.floor(Math.random() * 22) - 8;
  return { time: nowStamp(), evt: p.evt, target: p.target, ms, evtColor: kindColor(p.kind), slow: ms > 400 };
}

// ── PacketStreamer ────────────────────────────────────────────────────────────
function PacketStreamer() {
  const [lines, setLines] = useState<LogLine[]>(() => Array.from({ length: 9 }, makeLine));
  useEffect(() => {
    const id = setInterval(() => setLines(p => [...p.slice(-8), makeLine()]), 1150);
    return () => clearInterval(id);
  }, []);

  return (
    <div style={{ position: "relative" }}>
      <div aria-hidden style={{ position: "absolute", inset: -1, borderRadius: 13, background: "linear-gradient(180deg,rgba(239,104,26,0.25),transparent 40%)", pointerEvents: "none" }} />
      <div style={{ position: "relative", background: "#0B0807", border: "1px solid #251F1D", borderRadius: 12, overflow: "hidden", boxShadow: "0 30px 80px -20px rgba(0,0,0,0.8)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "11px 14px", borderBottom: "1px solid #1E1917", background: "#0E0A09" }}>
          <div style={{ display: "flex", gap: 7 }}>
            {[0,1,2].map(i => <span key={i} style={{ width: 11, height: 11, borderRadius: "50%", background: "#241E1C", display: "block" }} />)}
          </div>
          <span style={{ fontFamily: MONO, fontSize: 11, color: "#6E6360" }}>packet-stream.prizeskout.io</span>
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontFamily: MONO, fontSize: 10, color: GN }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: GN, display: "inline-block", animation: "ps-pulse 1.4s infinite" }} />
            LIVE
          </div>
        </div>
        <div className="ps-scroll" style={{ height: 380, padding: "14px 15px", overflow: "hidden", fontFamily: MONO, fontSize: 12, lineHeight: 1.85, display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
          {lines.map((ln, i) => (
            <div key={i} className="ps-line-enter" style={{ display: "flex", alignItems: "baseline", gap: 9, whiteSpace: "nowrap" }}>
              <span style={{ color: "#52483F", flexShrink: 0 }}>{ln.time}</span>
              <span style={{ color: ln.evtColor, fontWeight: 500, flexShrink: 0 }}>{ln.evt}</span>
              <span style={{ color: "#9C938F", overflow: "hidden", textOverflow: "ellipsis" }}>{ln.target}</span>
              <span style={{ marginLeft: "auto", color: ln.slow ? "#C9742E" : GN, fontSize: 11, flexShrink: 0 }}>{ln.ms}ms</span>
            </div>
          ))}
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4, color: OG }}>
            <span>prizeskout&nbsp;❯</span>
            <span className="ps-cursor" />
          </div>
        </div>
      </div>
    </div>
  );
}

// ── LoopSimulator ─────────────────────────────────────────────────────────────
const BUDGET_MS = 1850;
const LOOP_NODE_KEYS = [
  { nameKey: "landing.infra.loop.node1Name", subKey: "landing.infra.loop.node1Sub", budget: "50ms",  w: 0.05 },
  { nameKey: "landing.infra.loop.node2Name", subKey: "landing.infra.loop.node2Sub", budget: "10ms",  w: 0.13 },
  { nameKey: "landing.infra.loop.node3Name", subKey: "landing.infra.loop.node3Sub", budget: "150ms", w: 0.42 },
  { nameKey: "landing.infra.loop.node4Name", subKey: "landing.infra.loop.node4Sub", budget: "600ms", w: 1.00 },
];

function LoopSimulator() {
  const { t } = useTranslation();
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setElapsed(p => { const n = p + BUDGET_MS / 64; return n >= BUDGET_MS ? 0 : n; }), 34);
    return () => clearInterval(id);
  }, []);

  const pct = Math.min(100, (elapsed / BUDGET_MS) * 100);
  let activeIdx = LOOP_NODE_KEYS.findIndex(d => pct / 100 <= d.w);
  if (activeIdx < 0) activeIdx = LOOP_NODE_KEYS.length - 1;

  return (
    <section style={{ position: "relative", zIndex: 2, maxWidth: 1440, margin: "0 auto", padding: "80px clamp(24px,5vw,72px) 100px" }}>
      <div style={{ borderTop: "1px solid var(--lp-border)", paddingTop: 40, marginBottom: 52 }}>
        <div style={{ fontFamily: MONO, fontSize: 11, letterSpacing: "0.1em", color: OG, marginBottom: 12 }}>{t("landing.infra.loop.sectionLabel")}</div>
        <h2 style={{ fontSize: "clamp(28px,3.2vw,40px)", lineHeight: 1.05, letterSpacing: "-0.03em", fontWeight: 600, margin: 0, color: "var(--lp-text)" }}>{t("landing.infra.loop.title")}</h2>
      </div>
      <div style={{ background: "#0A0706", border: "1px solid #221D1B", borderRadius: 16, padding: "40px 40px 36px", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 60, background: "linear-gradient(180deg,rgba(239,104,26,0.05),transparent)", pointerEvents: "none" }} />
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 34 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 14 }}>
            <span style={{ fontFamily: MONO, fontSize: 46, fontWeight: 600, color: OG, letterSpacing: "-0.02em", fontVariantNumeric: "tabular-nums" as const }}>{Math.round(elapsed).toLocaleString("en-US")}</span>
            <span style={{ fontFamily: MONO, fontSize: 16, color: "#6E6360" }}>/ {BUDGET_MS.toLocaleString("en-US")}ms budget</span>
          </div>
          <div style={{ fontFamily: MONO, fontSize: 12, color: "#8A7F7B", textAlign: "right" }}>
            <div>{t("landing.infra.loop.eventLabel")}</div>
            <div style={{ color: GN }}>● {t("landing.infra.loop.inFlight")}</div>
          </div>
        </div>
        <div style={{ position: "relative", height: 3, background: "#1E1917", borderRadius: 2, marginBottom: 26 }}>
          <div style={{ position: "absolute", top: 0, left: 0, bottom: 0, background: OG, borderRadius: 2, boxShadow: "0 0 12px rgba(239,104,26,0.6)", width: `${pct}%`, transition: "width 0.03s linear" }} />
          <div style={{ position: "absolute", top: "50%", transform: "translate(-50%,-50%)", left: `${pct}%`, width: 13, height: 13, borderRadius: "50%", background: OG, boxShadow: "0 0 0 4px rgba(239,104,26,0.18),0 0 16px rgba(239,104,26,0.9)", transition: "left 0.03s linear" }} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16 }}>
          {LOOP_NODE_KEYS.map((nd, i) => {
            const active = i === activeIdx, done = i < activeIdx;
            const color = active ? OG : done ? GN : "#3A332F";
            const statusLabel = active ? t("landing.infra.loop.processing") : done ? t("landing.infra.loop.complete") : t("landing.infra.loop.idle");
            return (
              <div key={nd.nameKey} style={{ background: "#0B0807", border: "1px solid #1E1917", borderRadius: 11, padding: "18px 16px 16px" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 13 }}>
                  <span style={{ fontFamily: MONO, fontSize: 10.5, color: "#6E6360" }}>0{i + 1}</span>
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: color, display: "inline-block", ...(active ? { boxShadow: `0 0 10px ${color}`, animation: "ps-pulse 1s infinite" } : {}) }} />
                </div>
                <div style={{ fontSize: 14.5, fontWeight: 600, letterSpacing: "-0.01em", color: "#FAFAF9", marginBottom: 4 }}>{t(nd.nameKey)}</div>
                <div style={{ fontFamily: MONO, fontSize: 10.5, color: "#8A7F7B", lineHeight: 1.5, marginBottom: 14, minHeight: 30 }}>{t(nd.subKey)}</div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderTop: "1px solid #1A1513", paddingTop: 11 }}>
                  <span style={{ fontFamily: MONO, fontSize: 10, letterSpacing: "0.04em", color }}>{statusLabel}</span>
                  <span style={{ fontFamily: MONO, fontSize: 11, color: "#C9C2BE", fontWeight: 600 }}>{nd.budget}</span>
                </div>
              </div>
            );
          })}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 9, marginTop: 24, fontFamily: MONO, fontSize: 11.5, color: "#6E6360" }}>
          <span style={{ color: OG }}>❯</span>
          Salla/Foodics webhook → Redpanda partition → Redis rule engine → Talabat/Jahez egress · idempotent · ordered · exactly-once
        </div>
      </div>
    </section>
  );
}

// ── NavLangSwitcher ───────────────────────────────────────────────────────────
const LANG_DISPLAY: Record<string, { short: string; full: string }> = {
  en: { short: "EN", full: "English" },
  ar: { short: "AR", full: "Arabic" },
  fr: { short: "FR", full: "Français" },
};

function NavLangSwitcher() {
  const { i18n } = useTranslation();
  const current = i18n.language?.slice(0, 2) ?? "en";
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, [open]);

  const handleChange = (lng: string) => {
    i18n.changeLanguage(lng);
    applyLocale(lng as Locale);
    setOpen(false);
  };

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 7, border: "1px solid #2A2422", background: "transparent", color: "#A8A29E", fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/>
          <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
        </svg>
        {LANG_DISPLAY[current]?.full ?? "English"}
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform 0.15s" }}>
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </button>
      {open && (
        <div style={{ position: "absolute", top: "calc(100% + 8px)", right: 0, background: "#141010", border: "1px solid #2A2422", borderRadius: 10, padding: "10px 6px", zIndex: 200, minWidth: 168, boxShadow: "0 8px 32px rgba(0,0,0,0.55)" }}>
          <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: "0.1em", color: "#52483F", padding: "2px 10px 10px" }}>LANGUAGE</div>
          {["en", "ar", "fr"].map(lng => {
            const active = current === lng;
            const d = LANG_DISPLAY[lng];
            return (
              <button key={lng} type="button" onClick={() => handleChange(lng)} style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "9px 10px", borderRadius: 6, border: "none", background: active ? "rgba(239,104,26,0.1)" : "transparent", color: active ? OG : "#A8A29E", fontSize: 13.5, fontWeight: active ? 600 : 400, cursor: "pointer", fontFamily: "inherit" }}>
                <span style={{ fontFamily: MONO, fontSize: 10, border: "1px solid #2A2422", borderRadius: 4, padding: "1px 5px", color: "#6E6360", flexShrink: 0 }}>{d.short}</span>
                {d.full}
                {active && <span style={{ marginLeft: "auto", color: OG }}>✓</span>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Nav ───────────────────────────────────────────────────────────────────────
function ThemeToggle({ dark, onToggle }: { dark: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      title={dark ? "Switch to light mode" : "Switch to dark mode"}
      style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 34, height: 34, borderRadius: 7, border: "1px solid #2A2422", background: "transparent", color: "#A8A29E", cursor: "pointer", flexShrink: 0, transition: "border-color 0.15s, color 0.15s" }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = OG; e.currentTarget.style.color = OG; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = "#2A2422"; e.currentTarget.style.color = "#A8A29E"; }}
    >
      {dark ? (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
          <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
          <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
          <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
        </svg>
      ) : (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
        </svg>
      )}
    </button>
  );
}

function Nav({ dark, onToggleDark }: { dark: boolean; onToggleDark: () => void }) {
  const { t } = useTranslation();
  const navItems = [
    t("landing.infra.nav.infrastructure"),
    t("landing.infra.nav.loop"),
    t("landing.infra.nav.latency"),
    t("landing.infra.nav.docs"),
  ];
  return (
    <nav style={{ position: "relative", zIndex: 5, maxWidth: 1440, margin: "0 auto", padding: "22px clamp(24px,5vw,72px)", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid var(--lp-border)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
        <img src={logoDark} alt="PrizeSkout" style={{ height: 28, width: "auto", display: "block" }} />
        <span style={{ fontFamily: MONO, fontSize: 10, color: "var(--lp-dim)", border: "1px solid #2A2422", borderRadius: 4, padding: "2px 6px" }}>v1.0 · GA</span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
        {navItems.map(item => (
          <span key={item} style={{ fontSize: 13.5, color: "var(--lp-muted)", cursor: "pointer" }}>{item}</span>
        ))}
        <NavLangSwitcher />
        <ThemeToggle dark={dark} onToggle={onToggleDark} />
        <a href="/onboarding" style={{ fontFamily: MONO, fontSize: 12, color: OG, border: "1px solid #3A2418", background: "rgba(239,104,26,0.06)", borderRadius: 6, padding: "7px 13px", textDecoration: "none" }}>{t("landing.infra.nav.generateKeys")}</a>
      </div>
    </nav>
  );
}

// ── HeroSection ───────────────────────────────────────────────────────────────
function HeroSection() {
  const { t } = useTranslation();
  return (
    <section className="ps-hero-grid" style={{ position: "relative", zIndex: 2, maxWidth: 1440, margin: "0 auto", padding: "90px clamp(24px,5vw,72px) 104px", alignItems: "center" }}>
      <div>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 9, fontFamily: MONO, fontSize: 11, letterSpacing: "0.08em", color: "#8A7F7B", border: "1px solid #2A2422", borderRadius: 100, padding: "6px 13px", marginBottom: 30 }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: GN, boxShadow: `0 0 8px ${GN}`, animation: "ps-pulse 1.8s infinite", display: "inline-block" }} />
          {t("landing.infra.hero.eyebrow")}
        </div>
        <h1 style={{ fontSize: "clamp(40px,4.6vw,62px)", lineHeight: 1.02, letterSpacing: "-0.035em", fontWeight: 600, margin: "0 0 24px", color: "var(--lp-text)" }}>
          {t("landing.infra.hero.title")}
        </h1>
        <p style={{ fontSize: 17, lineHeight: 1.62, color: "#A8A29E", margin: "0 0 18px", maxWidth: 520 }}>
          {t("landing.infra.hero.subtitle")}
        </p>
        <div style={{ display: "flex", alignItems: "center", gap: 14, fontFamily: MONO, fontSize: 12.5, color: "#8A7F7B", margin: "0 0 34px", flexWrap: "wrap" }}>
          <span style={{ color: OG, fontWeight: 600, fontSize: 14 }}>&lt; 2s</span>
          <span style={{ width: 1, height: 13, background: "#2A2422" }} />
          <span>{t("landing.infra.hero.tagline")}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 13, flexWrap: "wrap" }}>
          <a href="/onboarding" style={{ fontFamily: "inherit", fontSize: 14, fontWeight: 600, color: BG, background: OG, border: "none", borderRadius: 9, padding: "13px 22px", cursor: "pointer", boxShadow: "0 0 0 1px rgba(239,104,26,0.4),0 8px 28px rgba(239,104,26,0.28)", textDecoration: "none", display: "inline-block" }}>
            {t("landing.infra.hero.cta1")}
          </a>
          <a href="/docs" style={{ fontFamily: "inherit", fontSize: 14, fontWeight: 500, color: "#E7E2DF", background: "transparent", border: "1px solid #2A2422", borderRadius: 9, padding: "13px 22px", cursor: "pointer", textDecoration: "none", display: "inline-block" }}>
            {t("landing.infra.hero.cta2")}
          </a>
        </div>
        <div style={{ display: "flex", gap: 30, marginTop: 42, paddingTop: 26, borderTop: "1px solid var(--lp-border)" }}>
          {([["1,850ms", t("landing.infra.hero.stat1Label")], ["99.98%", t("landing.infra.hero.stat2Label")], ["4", t("landing.infra.hero.stat3Label")]] as [string,string][]).map(([val, label]) => (
            <div key={label}>
              <div style={{ fontFamily: MONO, fontSize: 21, fontWeight: 600, color: "var(--lp-text)" }}>{val}</div>
              <div style={{ fontSize: 11.5, color: "#6E6360", marginTop: 3 }}>{label}</div>
            </div>
          ))}
        </div>
      </div>
      <PacketStreamer />
    </section>
  );
}

// ── CredentialStrip ───────────────────────────────────────────────────────────
function CredentialStrip() {
  const { t } = useTranslation();
  return (
    <div style={{ borderTop: "1px solid #1A1A1A", borderBottom: "1px solid #1A1A1A", background: "#050505", padding: "32px clamp(24px,5vw,72px)" }}>
      <div style={{ maxWidth: 1440, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "center", gap: 28 }}>
        <span style={{ fontFamily: MONO, fontSize: 11, letterSpacing: "0.12em", color: "#52483F", textTransform: "uppercase", whiteSpace: "nowrap" }}>{t("landing.infra.backedBy")}</span>
        <div style={{ width: 1, height: 28, background: "#2A2422" }} />
        <div style={{ background: "rgba(255,255,255,0.97)", borderRadius: 10, padding: "12px 28px", display: "inline-flex", alignItems: "center", justifyContent: "center", boxShadow: "0 2px 16px rgba(0,0,0,0.3)" }}>
          <img src={qstpLogoColored} alt="Qatar Science & Technology Park" style={{ height: 52, width: "auto", display: "block" }} />
        </div>
        <div style={{ width: 1, height: 28, background: "#2A2422" }} />
        <div style={{ background: "rgba(255,255,255,0.97)", borderRadius: 10, padding: "12px 28px", display: "inline-flex", alignItems: "center", justifyContent: "center", boxShadow: "0 2px 16px rgba(0,0,0,0.3)" }}>
          <img src={qatarFoundationLogo} alt="Qatar Foundation" style={{ height: 52, width: "auto", display: "block" }} />
        </div>
      </div>
    </div>
  );
}

// ── SurfaceMatrix ─────────────────────────────────────────────────────────────
function SurfaceMatrix() {
  const { t } = useTranslation();
  return (
    <section style={{ position: "relative", zIndex: 2, maxWidth: 1440, margin: "0 auto", padding: "80px clamp(24px,5vw,72px) 100px" }}>
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 52, borderTop: "1px solid var(--lp-border)", paddingTop: 40, flexWrap: "wrap", gap: 16 }}>
        <div>
          <div style={{ fontFamily: MONO, fontSize: 11, letterSpacing: "0.1em", color: OG, marginBottom: 12 }}>{t("landing.infra.surface.sectionLabel")}</div>
          <h2 style={{ fontSize: "clamp(28px,3.2vw,40px)", lineHeight: 1.05, letterSpacing: "-0.03em", fontWeight: 600, margin: 0, color: "var(--lp-text)" }}>{t("landing.infra.surface.title")}</h2>
        </div>
        <p style={{ fontSize: 14, color: "#8A7F7B", maxWidth: 300, textAlign: "right", lineHeight: 1.55, margin: 0 }}>{t("landing.infra.surface.subtitle")}</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", border: "1px solid #221D1B", borderRadius: 14, overflow: "hidden", background: "#0A0706" }}>
        {/* SYNC */}
        <div style={{ padding: "30px 30px 32px", borderRight: "1px solid #1C1715", borderBottom: "1px solid #1C1715" }}>
          <CardHeader idx="01" name={t("landing.infra.surface.syncName")} badge={t("landing.infra.surface.syncBadge")} />
          <p style={cardDesc}>{t("landing.infra.surface.syncDesc")}</p>
          <div style={codeBlock}>
            <div style={{ color: "#52483F" }}># inbound · salla.order.updated</div>
            <div style={{ color: "#9C938F" }}>{'{ '}<span style={{ color: "#C97B4A" }}>"sku"</span>{': '}<span style={{ color: GN }}>"QA-8842"</span>{', '}<span style={{ color: "#C97B4A" }}>"raw"</span>{': 41.00 }'}</div>
            <div style={{ color: OG, margin: "5px 0" }}>  ▼ transform()</div>
            <div style={{ color: "#9C938F" }}>{'{ '}<span style={{ color: "#C97B4A" }}>"sku"</span>:<span style={{ color: GN }}>"QA-8842"</span>{', '}<span style={{ color: "#C97B4A" }}>"region"</span>:<span style={{ color: GN }}>"QA"</span>{', '}<span style={{ color: "#C97B4A" }}>"event"</span>:<span style={{ color: GN }}>"price.sync"</span>{' }'}</div>
          </div>
        </div>

        {/* DECIDE */}
        <div style={{ padding: "30px 30px 32px", borderBottom: "1px solid #1C1715" }}>
          <CardHeader idx="02" name={t("landing.infra.surface.decideName")} badge={t("landing.infra.surface.decideBadge")} />
          <p style={cardDesc}>{t("landing.infra.surface.decideDesc")}</p>
          <div style={codeBlock}>
            <div style={{ color: "#9C938F" }}><span style={{ color: "#C97B4A" }}>net</span> = sell − commission(<span style={{ color: GN }}>region</span>)</div>
            <div style={{ color: "#52483F", paddingLeft: 14 }}>↓ vat ↓ logistics</div>
            <div style={{ display: "flex", gap: 14, margin: "9px 0", color: "#6E6360" }}>
              <span>QA <span style={{ color: OG }}>22%</span></span>
              <span>AE <span style={{ color: OG }}>25%</span></span>
              <span>SA <span style={{ color: OG }}>21%</span></span>
            </div>
            <div style={{ color: GN }}>→ net_margin = <strong>+18.4%</strong>  ✓ above floor</div>
          </div>
        </div>

        {/* DEFEND */}
        <div style={{ padding: "30px 30px 32px", borderRight: "1px solid #1C1715" }}>
          <CardHeader idx="03" name={t("landing.infra.surface.defendName")} badge={t("landing.infra.surface.defendBadge")} />
          <p style={cardDesc}>{t("landing.infra.surface.defendDesc")}</p>
          <div style={{ position: "relative", height: 92, background: "#080605", border: "1px solid #1E1917", borderRadius: 9, overflow: "hidden" }}>
            <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center" }}>
              <svg width="200%" height="100%" viewBox="0 0 800 92" preserveAspectRatio="none" style={{ animation: "ps-wave 3.4s linear infinite" }}>
                <path d="M0,46 Q50,18 100,46 T200,46 T300,46 T400,46 T500,46 T600,46 T700,46 T800,46" fill="none" stroke={OG} strokeWidth="1.5" opacity="0.85" />
                <path d="M0,46 Q50,74 100,46 T200,46 T300,46 T400,46 T500,46 T600,46 T700,46 T800,46" fill="none" stroke="#3A2A22" strokeWidth="1" />
              </svg>
            </div>
            <div style={{ position: "absolute", top: 9, left: 13, fontFamily: MONO, fontSize: 10.5, color: OG }}>competitor ↓4.2% detected</div>
            <div style={{ position: "absolute", bottom: 9, left: 13, fontFamily: MONO, fontSize: 10.5, color: GN }}>↻ reprice pushed · 540ms</div>
          </div>
        </div>

        {/* GOVERN */}
        <div style={{ padding: "30px 30px 32px" }}>
          <CardHeader idx="04" name={t("landing.infra.surface.governName")} badge={t("landing.infra.surface.governBadge")} />
          <p style={cardDesc}>{t("landing.infra.surface.governDesc")}</p>
          <div style={codeBlock}>
            <div style={{ display: "flex", justifyContent: "space-between", color: "#9C938F" }}>
              <span>sha256: 0xa4f9..e21b</span>
              <span style={{ color: GN }}>VERIFIED ✓</span>
            </div>
            <div style={{ color: "#52483F" }}>route: QA → KSA · PDPL-compliant</div>
            <div dir="rtl" style={{ color: "#A8A29E", marginTop: 6, fontFamily: "inherit" }}>تم التحقق من توجيه البيانات عبر الحدود</div>
            <div dir="rtl" style={{ color: "#52483F", fontFamily: "inherit" }}>يتوافق مع إطار QFC و PDPL</div>
          </div>
        </div>
      </div>
    </section>
  );
}

const cardDesc: React.CSSProperties = { fontSize: 13.5, lineHeight: 1.55, color: "#A8A29E", margin: "0 0 18px" };
const codeBlock: React.CSSProperties = { fontFamily: MONO, fontSize: 11.5, lineHeight: 1.7, background: "#080605", border: "1px solid #1E1917", borderRadius: 9, padding: "13px 15px" };

function CardHeader({ idx, name, badge }: { idx: string; name: string; badge: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
      <span style={{ fontFamily: MONO, fontSize: 12, color: OG }}>{idx}</span>
      <span style={{ fontSize: 18, fontWeight: 600, letterSpacing: "-0.01em" }}>{name}</span>
      <span style={{ fontFamily: MONO, fontSize: 10.5, color: "#6E6360", border: "1px solid #2A2422", borderRadius: 4, padding: "2px 7px" }}>{badge}</span>
    </div>
  );
}

// ── LatencyBudget ─────────────────────────────────────────────────────────────
const LATENCY_ROW_KEYS = [
  { idx: "01", nodeKey: "landing.infra.latency.r1Node", detailKey: "landing.infra.latency.r1Detail", max: "50ms"   },
  { idx: "02", nodeKey: "landing.infra.latency.r2Node", detailKey: "landing.infra.latency.r2Detail", max: "10ms"   },
  { idx: "03", nodeKey: "landing.infra.latency.r3Node", detailKey: "landing.infra.latency.r3Detail", max: "40ms"   },
  { idx: "04", nodeKey: "landing.infra.latency.r4Node", detailKey: "landing.infra.latency.r4Detail", max: "150ms"  },
  { idx: "05", nodeKey: "landing.infra.latency.r5Node", detailKey: "landing.infra.latency.r5Detail", max: "600ms"  },
  { idx: "06", nodeKey: "landing.infra.latency.r6Node", detailKey: "landing.infra.latency.r6Detail", max: "1000ms" },
];

function LatencyBudget() {
  const { t } = useTranslation();
  return (
    <section style={{ position: "relative", zIndex: 2, maxWidth: 1440, margin: "0 auto", padding: "80px clamp(24px,5vw,72px) 100px" }}>
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", borderTop: "1px solid var(--lp-border)", paddingTop: 40, marginBottom: 48, flexWrap: "wrap", gap: 12 }}>
        <div>
          <div style={{ fontFamily: MONO, fontSize: 11, letterSpacing: "0.1em", color: OG, marginBottom: 12 }}>{t("landing.infra.latency.sectionLabel")}</div>
          <h2 style={{ fontSize: "clamp(28px,3.2vw,40px)", lineHeight: 1.05, letterSpacing: "-0.03em", fontWeight: 600, margin: 0, color: "var(--lp-text)" }}>{t("landing.infra.latency.title")}</h2>
        </div>
        <div style={{ fontFamily: MONO, fontSize: 12, color: "#8A7F7B" }}>{t("landing.infra.latency.p99")}</div>
      </div>
      <div style={{ border: "1px solid #221D1B", borderRadius: 13, overflow: "hidden", background: "#0A0706" }}>
        <div style={{ display: "grid", gridTemplateColumns: "40px 1fr 1.3fr 130px", fontFamily: MONO, fontSize: 10.5, letterSpacing: "0.06em", color: "#6E6360", background: "#0E0A09", borderBottom: "1px solid #1E1917", padding: "13px 22px" }}>
          <div>#</div><div>{t("landing.infra.latency.colNode")}</div><div>{t("landing.infra.latency.colOp")}</div><div style={{ textAlign: "right" }}>{t("landing.infra.latency.colMax")}</div>
        </div>
        {LATENCY_ROW_KEYS.map(r => (
          <div key={r.idx} style={{ display: "grid", gridTemplateColumns: "40px 1fr 1.3fr 130px", alignItems: "center", padding: "15px 22px", borderBottom: "1px solid #15110F" }}>
            <div style={{ fontFamily: MONO, fontSize: 11, color: "#52483F" }}>{r.idx}</div>
            <div style={{ fontSize: 14, fontWeight: 500, color: "#EDE8E5" }}>{t(r.nodeKey)}</div>
            <div style={{ fontSize: 13, color: "#8A7F7B" }}>{t(r.detailKey)}</div>
            <div style={{ textAlign: "right", fontFamily: MONO, fontSize: 14, fontWeight: 600, color: "#FAFAF9" }}>{r.max}</div>
          </div>
        ))}
        <div style={{ display: "grid", gridTemplateColumns: "40px 1fr 130px", alignItems: "center", padding: "18px 22px", background: "rgba(239,104,26,0.05)" }}>
          <div />
          <div style={{ fontSize: 14, fontWeight: 600, color: OG }}>{t("landing.infra.latency.totalLabel")}</div>
          <div style={{ textAlign: "right", fontFamily: MONO, fontSize: 18, fontWeight: 700, color: OG }}>1,850ms</div>
        </div>
      </div>
    </section>
  );
}

// ── Deploy CTA + Footer ───────────────────────────────────────────────────────
function DeployCTA() {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);
  function handleCopy() {
    try { navigator.clipboard.writeText("npm install @prizeskout/core"); } catch {}
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  }

  const footerCols = [
    { titleKey: "landing.infra.deploy.col1", items: ["Event Spine","Margin Engine","Reprice Loop","Status / SLA"] },
    { titleKey: "landing.infra.deploy.col2", items: ["SDK Docs","API Reference","Webhooks","Changelog"] },
    { titleKey: "landing.infra.deploy.col3", items: ["QFC Licensing","KSA PDPL Framework","Data Residency","DPA / Terms"] },
  ];

  return (
    <section style={{ position: "relative", zIndex: 2, maxWidth: 1440, margin: "0 auto", padding: "80px clamp(24px,5vw,72px) 0" }}>
      <div style={{ borderTop: "1px solid var(--lp-border)", paddingTop: 60, textAlign: "center" }}>
        <div style={{ fontFamily: MONO, fontSize: 11, letterSpacing: "0.1em", color: OG, marginBottom: 18 }}>{t("landing.infra.deploy.sectionLabel")}</div>
        <h2 style={{ fontSize: "clamp(30px,3.6vw,46px)", lineHeight: 1.04, letterSpacing: "-0.03em", fontWeight: 600, margin: "0 0 16px", color: "var(--lp-text)" }}>
          {t("landing.infra.deploy.title")}
        </h2>
        <p style={{ fontSize: 16, color: "#A8A29E", margin: "0 auto 36px", maxWidth: 460, lineHeight: 1.6 }}>
          {t("landing.infra.deploy.subtitle")}
        </p>
        <div style={{ maxWidth: 560, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "#0B0807", border: "1px solid #251F1D", borderRadius: 11, padding: "16px 18px", boxShadow: "0 20px 60px -20px rgba(0,0,0,0.7)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 13, fontFamily: MONO, fontSize: 14 }}>
              <span style={{ color: "#52483F" }}>❯</span>
              <span style={{ color: "#E7E2DF" }}>npm install <span style={{ color: OG }}>@prizeskout/core</span></span>
            </div>
            <button onClick={handleCopy} style={{ fontFamily: MONO, fontSize: 11.5, fontWeight: 600, color: copied ? GN : "#A8A29E", background: "#15110F", border: "1px solid #2A2422", borderRadius: 7, padding: "8px 14px", cursor: "pointer" }}>
              {copied ? t("landing.infra.deploy.copied") : t("landing.infra.deploy.copy")}
            </button>
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 9, marginTop: 22 }}>
            <a href="/onboarding" style={{ fontFamily: "inherit", fontSize: 14, fontWeight: 600, color: BG, background: OG, border: "none", borderRadius: 9, padding: "13px 24px", cursor: "pointer", boxShadow: "0 8px 28px rgba(239,104,26,0.28)", textDecoration: "none", display: "inline-block" }}>{t("landing.infra.deploy.cta1")}</a>
            <a href="/docs" style={{ fontFamily: "inherit", fontSize: 14, fontWeight: 500, color: "#E7E2DF", background: "transparent", border: "1px solid #2A2422", borderRadius: 9, padding: "13px 24px", cursor: "pointer", textDecoration: "none", display: "inline-block" }}>{t("landing.infra.deploy.cta2")}</a>
          </div>
        </div>
      </div>

      <footer style={{ marginTop: 90, borderTop: "1px solid #1C1715", padding: "42px 0 50px", display: "grid", gridTemplateColumns: "1.6fr 1fr 1fr 1fr", gap: 32 }}>
        <div>
          <div style={{ marginBottom: 14 }}>
            <img src={logoDark} alt="PrizeSkout" style={{ height: 24, width: "auto", display: "block" }} />
          </div>
          <p style={{ fontSize: 12.5, color: "#6E6360", lineHeight: 1.6, margin: "0 0 16px", maxWidth: 260 }}>{t("landing.infra.deploy.footerDesc")}</p>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, fontFamily: MONO, fontSize: 10.5, color: "#8A7F7B", border: "1px solid #2A2422", borderRadius: 6, padding: "6px 11px" }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: GN, display: "inline-block" }} />
            {t("landing.infra.deploy.footerLicense")}
          </div>
        </div>
        {footerCols.map(col => (
          <div key={col.titleKey}>
            <div style={{ fontFamily: MONO, fontSize: 10.5, letterSpacing: "0.08em", color: "#52483F", marginBottom: 15 }}>{t(col.titleKey)}</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 11, fontSize: 13, color: "#A8A29E" }}>
              {col.items.map(item => <span key={item}>{item}</span>)}
            </div>
          </div>
        ))}
      </footer>

      <div style={{ borderTop: "1px solid #1C1715", padding: "20px 0 40px", display: "flex", alignItems: "center", justifyContent: "space-between", fontFamily: MONO, fontSize: 11, color: "#52483F", flexWrap: "wrap", gap: 8 }}>
        <span>{t("landing.infra.deploy.copyright")}</span>
        <span>{t("landing.infra.deploy.tagline")}</span>
      </div>
    </section>
  );
}

// ── ROISandbox ────────────────────────────────────────────────────────────────
function ROISandbox() {
  const [orders, setOrders] = useState(180);
  const [aov, setAov] = useState(145);
  const [commission, setCommission] = useState(22);
  const monthlySavings = Math.round(orders * 30 * aov * (commission / 100) * 0.32);

  return (
    <section style={{ position: "relative", zIndex: 2, maxWidth: 1440, margin: "0 auto", padding: "80px clamp(24px,5vw,72px) 100px" }}>
      <div style={{ borderTop: "1px solid var(--lp-border)", paddingTop: 40, marginBottom: 52 }}>
        <div style={{ fontFamily: MONO, fontSize: 11, letterSpacing: "0.1em", color: OG, marginBottom: 12 }}>[ MARGIN LEAK CALCULATOR ]</div>
        <h2 style={{ fontSize: "clamp(28px,3.2vw,40px)", lineHeight: 1.05, letterSpacing: "-0.03em", fontWeight: 600, margin: 0, color: "var(--lp-text)" }}>See exactly what you are losing</h2>
      </div>
      <div className="ps-roi-grid" style={{ display: "grid", gap: 48, alignItems: "start" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
          {([
            { label: "Daily Orders", value: orders, set: setOrders, min: 10, max: 2000, fmt: (v: number) => v.toLocaleString() },
            { label: "Avg Order Value (QAR)", value: aov, set: setAov, min: 20, max: 1000, fmt: (v: number) => `QAR ${v}` },
            { label: "Platform Commission", value: commission, set: setCommission, min: 15, max: 35, fmt: (v: number) => `${v}%` },
          ] as const).map(s => (
            <div key={s.label}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 12 }}>
                <span style={{ fontSize: 13.5, color: "var(--lp-muted)" }}>{s.label}</span>
                <span style={{ fontFamily: MONO, fontSize: 16, fontWeight: 700, color: OG }}>{s.fmt(s.value)}</span>
              </div>
              <div style={{ position: "relative" }}>
                <input type="range" min={s.min} max={s.max} value={s.value}
                  onChange={e => (s.set as (v: number) => void)(+e.target.value)}
                  style={{ width: "100%", height: 4, accentColor: OG, cursor: "pointer", background: "transparent" }}
                />
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontFamily: MONO, fontSize: 10, color: "#52483F", marginTop: 5 }}>
                <span>{s.min.toLocaleString()}</span><span>{s.max.toLocaleString()}</span>
              </div>
            </div>
          ))}
        </div>

        <div style={{ background: "#0A0706", border: "1px solid #221D1B", borderRadius: 16, padding: "36px" }}>
          <div style={{ fontFamily: MONO, fontSize: 11, letterSpacing: "0.1em", color: "#6E6360", marginBottom: 10 }}>PROJECTED MONTHLY SAVINGS</div>
          <div style={{ fontFamily: MONO, fontSize: "clamp(38px,4vw,52px)", fontWeight: 700, color: GN, letterSpacing: "-0.03em", lineHeight: 1 }}>
            QAR {monthlySavings.toLocaleString()}
          </div>
          <div style={{ fontFamily: MONO, fontSize: 11, color: "#6E6360", marginTop: 8, marginBottom: 28 }}>
            {commission}% commission · {orders.toLocaleString()} orders · 30 days
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 9, background: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.2)", borderRadius: 10, padding: "10px 14px", marginBottom: 22 }}>
            <span style={{ width: 7, height: 7, borderRadius: 999, background: GN, flexShrink: 0, animation: "ps-pulse 1.8s infinite" }} />
            <span style={{ fontSize: 12.5, color: GN, fontFamily: MONO }}>Guaranteed Min. Profit Protected</span>
          </div>
          <a href="/onboarding" style={{ display: "block", textAlign: "center", fontFamily: MONO, fontSize: 13.5, fontWeight: 700, color: BG, background: OG, borderRadius: 10, padding: "14px", textDecoration: "none", boxShadow: "0 8px 28px rgba(239,104,26,0.28)", letterSpacing: "0.02em" }}>
            Protect this Profit →
          </a>
        </div>
      </div>
    </section>
  );
}

// ── PricingSection ────────────────────────────────────────────────────────────
const TIERS = [
  {
    name: "Core", badge: null, featured: false,
    monthly: 349, annual: 279, currency: "QAR",
    features: ["1 Inbound Channel", "1,500 syncs / month", "Margin Engine", "Email Support", "QFC Licensing"],
    cta: "Start Core Trial", ctaHref: "/onboarding",
  },
  {
    name: "Growth", badge: "72× ROI", featured: true,
    monthly: 1099, annual: 879, currency: "QAR",
    features: ["Unlimited Channels", "Sub-2s Latency Guarantee", "15,000 syncs / month", "Competitor Radar", "Slack + Priority Support"],
    cta: "Secure Growth Plan", ctaHref: "/onboarding",
  },
  {
    name: "Enterprise", badge: "Custom ACV", featured: false,
    monthly: null, annual: null, currency: null,
    features: ["SAP / Oracle ERP Hooks", "Dedicated DB Residency", "99.99% SLA", "Dedicated CSM", "QFC + PDPL Advisory"],
    cta: "Contact Sales", ctaHref: "/contact",
  },
] as const;

function PricingSection() {
  const [annual, setAnnual] = useState(false);
  return (
    <section style={{ position: "relative", zIndex: 2, maxWidth: 1440, margin: "0 auto", padding: "80px clamp(24px,5vw,72px) 100px" }}>
      <div style={{ borderTop: "1px solid var(--lp-border)", paddingTop: 40, marginBottom: 18, display: "flex", alignItems: "flex-end", justifyContent: "space-between", flexWrap: "wrap", gap: 20 }}>
        <div>
          <div style={{ fontFamily: MONO, fontSize: 11, letterSpacing: "0.1em", color: OG, marginBottom: 12 }}>[ GCC-SEGMENTED PRICING ]</div>
          <h2 style={{ fontSize: "clamp(28px,3.2vw,40px)", lineHeight: 1.05, letterSpacing: "-0.03em", fontWeight: 600, margin: 0, color: "var(--lp-text)" }}>Pricing that scales with your margin</h2>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 0, background: "#0E0A09", border: "1px solid #2A2422", borderRadius: 9, padding: 3 }}>
          {(["Monthly", "Annual"] as const).map(b => (
            <button key={b} type="button" onClick={() => setAnnual(b === "Annual")}
              style={{ fontFamily: MONO, fontSize: 11.5, fontWeight: 600, padding: "7px 16px", borderRadius: 7, border: "none", cursor: "pointer", transition: "all 0.15s",
                background: (b === "Annual") === annual ? OG : "transparent",
                color: (b === "Annual") === annual ? BG : "#A8A29E",
              }}>
              {b}{b === "Annual" && <span style={{ marginLeft: 5, fontSize: 9.5, opacity: 0.85 }}>SAVE 20%</span>}
            </button>
          ))}
        </div>
      </div>

      <div className="ps-pricing-grid" style={{ display: "grid", gap: 20, marginTop: 44 }}>
        {TIERS.map(tier => (
          <div key={tier.name} style={{
            background: "#0A0706", borderRadius: 16, padding: "32px 28px",
            border: tier.featured ? `1px solid ${OG}` : "1px solid #221D1B",
            position: "relative", display: "flex", flexDirection: "column",
            boxShadow: tier.featured ? `0 0 40px rgba(239,104,26,0.12)` : "none",
          }}>
            {tier.featured && (
              <div style={{ position: "absolute", top: -12, left: "50%", transform: "translateX(-50%)", fontFamily: MONO, fontSize: 10.5, fontWeight: 700, color: BG, background: OG, borderRadius: 20, padding: "3px 14px", letterSpacing: "0.06em", whiteSpace: "nowrap" }}>
                MOST POPULAR
              </div>
            )}
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: "#FAFAF9" }}>{tier.name}</div>
              {tier.badge && (
                <span style={{ fontFamily: MONO, fontSize: 10, color: tier.featured ? OG : "#6E6360", border: `1px solid ${tier.featured ? "rgba(239,104,26,0.35)" : "#2A2422"}`, borderRadius: 4, padding: "2px 7px" }}>{tier.badge}</span>
              )}
            </div>
            <div style={{ marginBottom: 24 }}>
              {tier.monthly !== null ? (
                <>
                  <span style={{ fontFamily: MONO, fontSize: 38, fontWeight: 700, color: "#FAFAF9", letterSpacing: "-0.02em" }}>
                    {tier.currency} {annual ? tier.annual : tier.monthly}
                  </span>
                  <span style={{ fontFamily: MONO, fontSize: 13, color: "#6E6360" }}> / mo</span>
                  {annual && <div style={{ fontFamily: MONO, fontSize: 10.5, color: GN, marginTop: 4 }}>↓ billed annually</div>}
                </>
              ) : (
                <span style={{ fontFamily: MONO, fontSize: 32, fontWeight: 700, color: "#FAFAF9" }}>Custom</span>
              )}
            </div>
            <ul style={{ listStyle: "none", padding: 0, margin: "0 0 28px", display: "flex", flexDirection: "column", gap: 10, flex: 1 }}>
              {tier.features.map(f => (
                <li key={f} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13, color: "#A8A29E" }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={GN} strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12" /></svg>
                  {f}
                </li>
              ))}
            </ul>
            <a href={tier.ctaHref} style={{
              display: "block", textAlign: "center", fontSize: 13.5, fontWeight: 700, padding: "13px",
              borderRadius: 9, textDecoration: "none", fontFamily: MONO, letterSpacing: "0.02em",
              background: tier.featured ? OG : "transparent",
              color: tier.featured ? BG : "#A8A29E",
              border: tier.featured ? "none" : "1px solid #2A2422",
              boxShadow: tier.featured ? "0 6px 22px rgba(239,104,26,0.26)" : "none",
            }}>
              {tier.cta}
            </a>
          </div>
        ))}
      </div>
    </section>
  );
}

// ── FAQSection ────────────────────────────────────────────────────────────────
const FAQS = [
  {
    q: "Where is our transactional financial data hosted?",
    a: "All transactional data is processed and stored within Qatar (Doha AWS availability zone) or your chosen GCC residency zone. We never route pricing decisions through third-country infrastructure. Data residency certificates are available on request for QFC and PDPL compliance audits.",
  },
  {
    q: "Will PrizeSkout impact our core POS performance?",
    a: "No. PrizeSkout operates as an asynchronous event middleware — it listens to webhooks from your inbound channels (Salla, Foodics, SAP) and fires outbound reprices independently. Your POS, ERP, and checkout flows have zero latency dependency on us. We consume their events; they never wait on us.",
  },
  {
    q: "How do you guarantee the sub-2-second latency loops?",
    a: "The guarantee is architectural. Redpanda partitions events by merchant ID (no cross-tenant queue contention), Redis Lua scripts execute rule evaluation atomically in under 10ms, and our Cloudflare Workers egress layer sits at the network edge closest to each aggregator's API. The 1,850ms P99 figure is continuously measured across all six pipeline nodes under production load.",
  },
];

function FAQSection() {
  const [openIdx, setOpenIdx] = useState<number | null>(null);
  return (
    <section style={{ position: "relative", zIndex: 2, maxWidth: 1440, margin: "0 auto", padding: "80px clamp(24px,5vw,72px) 100px" }}>
      <div style={{ borderTop: "1px solid var(--lp-border)", paddingTop: 40, marginBottom: 52 }}>
        <div style={{ fontFamily: MONO, fontSize: 11, letterSpacing: "0.1em", color: OG, marginBottom: 12 }}>[ TECHNICAL OBJECTIONS ]</div>
        <h2 style={{ fontSize: "clamp(28px,3.2vw,40px)", lineHeight: 1.05, letterSpacing: "-0.03em", fontWeight: 600, margin: 0, color: "var(--lp-text)" }}>Built for GCC compliance teams</h2>
      </div>
      <div style={{ border: "1px solid #221D1B", borderRadius: 14, overflow: "hidden", background: "#0A0706" }}>
        {FAQS.map((faq, i) => (
          <div key={i} style={{ borderBottom: i < FAQS.length - 1 ? "1px solid #1C1715" : "none" }}>
            <button
              type="button"
              onClick={() => setOpenIdx(openIdx === i ? null : i)}
              style={{
                width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "22px 28px", background: "transparent", border: "none", cursor: "pointer",
                textAlign: "left", gap: 20, fontFamily: "inherit",
              }}
            >
              <span style={{ fontSize: 15.5, fontWeight: 600, color: "#E7E2DF", lineHeight: 1.35 }}>{faq.q}</span>
              <span style={{ width: 26, height: 26, borderRadius: "50%", border: "1px solid #2A2422", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, color: openIdx === i ? OG : "#6E6360", flexShrink: 0, transition: "all 0.15s" }}>
                {openIdx === i ? "−" : "+"}
              </span>
            </button>
            {openIdx === i && (
              <div style={{ padding: "0 28px 24px", fontSize: 14.5, color: "#A8A29E", lineHeight: 1.7, maxWidth: 720 }}>
                {faq.a}
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

// ── Page root ─────────────────────────────────────────────────────────────────
function LandingPage() {
  const [dark, setDark] = useState(() => {
    if (typeof window === "undefined") return true;
    return localStorage.getItem("ps-lp-theme") !== "light";
  });

  function toggleDark() {
    const next = !dark;
    setDark(next);
    try { localStorage.setItem("ps-lp-theme", next ? "dark" : "light"); } catch {}
  }

  return (
    <div
      data-lp-theme={dark ? "dark" : "light"}
      style={{ position: "relative", minHeight: "100vh", width: "100%", background: dark ? BG : "#FAF9F7", color: dark ? "#FAFAF9" : "#1A1A18", fontFamily: "'Geist',-apple-system,BlinkMacSystemFont,sans-serif", WebkitFontSmoothing: "antialiased", transition: "background 0.2s, color 0.2s" }}
    >
      <style>{PAGE_CSS}</style>
      {/* Grid overlay */}
      <div aria-hidden style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 0, backgroundImage: "linear-gradient(rgba(255,255,255,0.022) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.022) 1px,transparent 1px)", backgroundSize: "64px 64px", WebkitMaskImage: "radial-gradient(ellipse 90% 70% at 50% 0%,#000 35%,transparent 100%)", maskImage: "radial-gradient(ellipse 90% 70% at 50% 0%,#000 35%,transparent 100%)", opacity: dark ? 1 : 0.15 }} />
      {/* Radial glow */}
      <div aria-hidden style={{ position: "absolute", top: -280, left: "50%", transform: "translateX(-50%)", width: 900, height: 560, background: "radial-gradient(ellipse at center,rgba(239,104,26,0.16),transparent 68%)", pointerEvents: "none", zIndex: 0, filter: "blur(8px)", opacity: dark ? 1 : 0.35 }} />
      <Nav dark={dark} onToggleDark={toggleDark} />
      <HeroSection />
      <CredentialStrip />
      <SurfaceMatrix />
      <LoopSimulator />
      <LatencyBudget />
      <ROISandbox />
      <PricingSection />
      <FAQSection />
      <DeployCTA />
    </div>
  );
}

const PAGE_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Geist:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;600;700&display=swap');
  :root { --lp-text: #FAFAF9; --lp-muted: #A8A29E; --lp-dim: #6E6360; --lp-border: #211C1A; }
  [data-lp-theme="light"] { --lp-text: #1A1A18; --lp-muted: #57534E; --lp-dim: #8C8480; --lp-border: #D4CEC8; }
  *, *::before, *::after { box-sizing: border-box; }
  @keyframes ps-blink  { 0%,49%{opacity:1} 50%,100%{opacity:0} }
  @keyframes ps-wave   { 0%{transform:translateX(0)} 100%{transform:translateX(-50%)} }
  @keyframes ps-pulse  { 0%,100%{opacity:0.35} 50%{opacity:1} }
  @keyframes ps-fadein { from{opacity:0;transform:translateY(4px)} to{opacity:1;transform:translateY(0)} }
  .ps-line-enter { animation: ps-fadein 0.28s ease-out; }
  .ps-cursor     { width:8px; height:15px; background:#EF681A; display:inline-block; animation:ps-blink 1s step-end infinite; }
  .ps-scroll::-webkit-scrollbar { width:0; height:0; }
  .ps-hero-grid  { display:grid; grid-template-columns:1fr; gap:48px; }
  .ps-roi-grid   { grid-template-columns:1fr; }
  .ps-pricing-grid { grid-template-columns:1fr; }
  @media(min-width:900px) {
    .ps-hero-grid { grid-template-columns:1fr 1fr; gap:56px; }
    .ps-roi-grid  { grid-template-columns:1fr 1fr; }
    .ps-pricing-grid { grid-template-columns:repeat(3,1fr); }
  }
  @media(max-width:640px) {
    nav > div:last-child > span { display:none; }
  }
`;
