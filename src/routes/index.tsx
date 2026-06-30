import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { applyLocale, type Locale } from "@/lib/i18n";
import logoDark from "@/assets/logo-dark.svg";
import logoLight from "@/assets/logo-light.svg";
import qstpLogoColored from "@/assets/qstp-logo-colored.png";
import qatarFoundationLogo from "@/assets/qatar-foundation-logo.png";
import { DemoPlayer } from "@/components/landing/DemoPlayer";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "PrizeSkout | Pricing Infrastructure for GCC Commerce" },
      {
        name: "description",
        content:
          "Stop managing API hell and scraping liabilities. Deploy a serverless event middleware that programmatically syncs, calculates, and defends merchant net margins across regional delivery platforms, instantly.",
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
        style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 7, border: "1px solid var(--lp-border-em)", background: "transparent", color: "var(--lp-muted)", fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}
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
        <div style={{ position: "absolute", top: "calc(100% + 8px)", right: 0, background: "var(--lp-surface-6)", border: "1px solid var(--lp-border-em)", borderRadius: 10, padding: "10px 6px", zIndex: 200, minWidth: 168, boxShadow: "0 8px 32px rgba(0,0,0,0.55)" }}>
          <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: "0.1em", color: "var(--lp-faint)", padding: "2px 10px 10px" }}>LANGUAGE</div>
          {["en", "ar", "fr"].map(lng => {
            const active = current === lng;
            const d = LANG_DISPLAY[lng];
            return (
              <button key={lng} type="button" onClick={() => handleChange(lng)} style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "9px 10px", borderRadius: 6, border: "none", background: active ? "rgba(239,104,26,0.1)" : "transparent", color: active ? OG : "var(--lp-muted)", fontSize: 13.5, fontWeight: active ? 600 : 400, cursor: "pointer", fontFamily: "inherit" }}>
                <span style={{ fontFamily: MONO, fontSize: 10, border: "1px solid var(--lp-border-em)", borderRadius: 4, padding: "1px 5px", color: "var(--lp-dim)", flexShrink: 0 }}>{d.short}</span>
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
      style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 34, height: 34, borderRadius: 7, border: "1px solid var(--lp-border-em)", background: "transparent", color: "var(--lp-muted)", cursor: "pointer", flexShrink: 0, transition: "border-color 0.15s, color 0.15s" }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = OG; e.currentTarget.style.color = OG; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = "#2A2422"; e.currentTarget.style.color = "var(--lp-muted)"; }}
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
        <img src={dark ? logoDark : logoLight} alt="PrizeSkout" style={{ height: 28, width: "auto", display: "block" }} />
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
    <section style={{ position: "relative", zIndex: 2, maxWidth: 1440, margin: "0 auto", padding: "90px clamp(24px,5vw,72px) 72px", textAlign: "center" }}>
      <div style={{ display: "inline-flex", alignItems: "center", gap: 9, fontFamily: MONO, fontSize: 11, letterSpacing: "0.08em", color: "var(--lp-muted-2)", border: "1px solid var(--lp-border-em)", borderRadius: 100, padding: "6px 13px", marginBottom: 30 }}>
        <span style={{ width: 6, height: 6, borderRadius: "50%", background: GN, boxShadow: `0 0 8px ${GN}`, animation: "ps-pulse 1.8s infinite", display: "inline-block" }} />
        {t("landing.infra.hero.eyebrow")}
      </div>
      <h1 style={{ fontSize: "clamp(40px,5vw,72px)", lineHeight: 1.02, letterSpacing: "-0.035em", fontWeight: 600, margin: "0 0 24px", color: "var(--lp-text)", maxWidth: 900, marginInline: "auto" }}>
        {t("landing.infra.hero.title")}
      </h1>
      <p style={{ fontSize: 18, lineHeight: 1.62, color: "var(--lp-muted)", margin: "0 auto 28px", maxWidth: 560 }}>
        {t("landing.infra.hero.subtitle")}
      </p>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 14, fontFamily: MONO, fontSize: 12.5, color: "var(--lp-muted-2)", marginBottom: 36, flexWrap: "wrap" }}>
        <span style={{ color: OG, fontWeight: 600, fontSize: 14 }}>&lt; 2s</span>
        <span style={{ width: 1, height: 13, background: "#2A2422" }} />
        <span>{t("landing.infra.hero.tagline")}</span>
      </div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 13, flexWrap: "wrap", marginBottom: 52 }}>
        <a href="/onboarding" style={{ fontFamily: "inherit", fontSize: 14, fontWeight: 600, color: BG, background: OG, border: "none", borderRadius: 9, padding: "13px 26px", cursor: "pointer", boxShadow: "0 0 0 1px rgba(239,104,26,0.4),0 8px 28px rgba(239,104,26,0.28)", textDecoration: "none", display: "inline-block" }}>
          {t("landing.infra.hero.cta1")}
        </a>
        <a href="/docs" style={{ fontFamily: "inherit", fontSize: 14, fontWeight: 500, color: "var(--lp-text-2)", background: "transparent", border: "1px solid var(--lp-border-em)", borderRadius: 9, padding: "13px 26px", cursor: "pointer", textDecoration: "none", display: "inline-block" }}>
          {t("landing.infra.hero.cta2")}
        </a>
      </div>
      <div style={{ display: "flex", gap: 40, justifyContent: "center", paddingTop: 26, borderTop: "1px solid var(--lp-border)" }}>
        {([["1,850ms", t("landing.infra.hero.stat1Label")], ["99.98%", t("landing.infra.hero.stat2Label")], ["4", t("landing.infra.hero.stat3Label")]] as [string,string][]).map(([val, label]) => (
          <div key={label}>
            <div style={{ fontFamily: MONO, fontSize: 21, fontWeight: 600, color: "var(--lp-text)" }}>{val}</div>
            <div style={{ fontSize: 11.5, color: "var(--lp-dim)", marginTop: 3 }}>{label}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

// ── CredentialStrip ───────────────────────────────────────────────────────────
function CredentialStrip() {
  const { t } = useTranslation();
  return (
    <div style={{ borderTop: "1px solid var(--lp-border-strip)", borderBottom: "1px solid var(--lp-border-strip)", background: "var(--lp-surface-strip)", padding: "32px clamp(24px,5vw,72px)" }}>
      <div style={{ maxWidth: 1440, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "center", gap: 28 }}>
        <span style={{ fontFamily: MONO, fontSize: 11, letterSpacing: "0.12em", color: "var(--lp-fg)", textTransform: "uppercase", whiteSpace: "nowrap", fontWeight: 700 }}>{t("landing.infra.backedBy")}</span>
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
        <p style={{ fontSize: 14, color: "var(--lp-muted-2)", maxWidth: 300, textAlign: "right", lineHeight: 1.55, margin: 0 }}>{t("landing.infra.surface.subtitle")}</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", border: "1px solid var(--lp-border-4)", borderRadius: 14, overflow: "hidden", background: "var(--lp-surface)" }}>
        {/* SYNC */}
        <div style={{ padding: "30px 30px 32px", borderRight: "1px solid var(--lp-border-2)", borderBottom: "1px solid var(--lp-border-2)" }}>
          <CardHeader idx="01" name={t("landing.infra.surface.syncName")} badge={t("landing.infra.surface.syncBadge")} />
          <p style={cardDesc}>{t("landing.infra.surface.syncDesc")}</p>
          <div style={codeBlock}>
            <div style={{ color: "var(--lp-faint)" }}># inbound · salla.order.updated</div>
            <div style={{ color: "var(--lp-text-code)" }}>{'{ '}<span style={{ color: "var(--lp-rule-color)" }}>"sku"</span>{': '}<span style={{ color: GN }}>"QA-8842"</span>{', '}<span style={{ color: "var(--lp-rule-color)" }}>"raw"</span>{': 41.00 }'}</div>
            <div style={{ color: OG, margin: "5px 0" }}>  ▼ transform()</div>
            <div style={{ color: "var(--lp-text-code)" }}>{'{ '}<span style={{ color: "var(--lp-rule-color)" }}>"sku"</span>:<span style={{ color: GN }}>"QA-8842"</span>{', '}<span style={{ color: "var(--lp-rule-color)" }}>"region"</span>:<span style={{ color: GN }}>"QA"</span>{', '}<span style={{ color: "var(--lp-rule-color)" }}>"event"</span>:<span style={{ color: GN }}>"price.sync"</span>{' }'}</div>
          </div>
        </div>

        {/* DECIDE */}
        <div style={{ padding: "30px 30px 32px", borderBottom: "1px solid var(--lp-border-2)" }}>
          <CardHeader idx="02" name={t("landing.infra.surface.decideName")} badge={t("landing.infra.surface.decideBadge")} />
          <p style={cardDesc}>{t("landing.infra.surface.decideDesc")}</p>
          <div style={codeBlock}>
            <div style={{ color: "var(--lp-text-code)" }}><span style={{ color: "var(--lp-rule-color)" }}>net</span> = sell − commission(<span style={{ color: GN }}>region</span>)</div>
            <div style={{ color: "var(--lp-faint)", paddingLeft: 14 }}>↓ vat ↓ logistics</div>
            <div style={{ display: "flex", gap: 14, margin: "9px 0", color: "var(--lp-dim)" }}>
              <span>QA <span style={{ color: OG }}>22%</span></span>
              <span>AE <span style={{ color: OG }}>25%</span></span>
              <span>SA <span style={{ color: OG }}>21%</span></span>
            </div>
            <div style={{ color: GN }}>→ net_margin = <strong>+18.4%</strong>  ✓ above floor</div>
          </div>
        </div>

        {/* DEFEND */}
        <div style={{ padding: "30px 30px 32px", borderRight: "1px solid var(--lp-border-2)" }}>
          <CardHeader idx="03" name={t("landing.infra.surface.defendName")} badge={t("landing.infra.surface.defendBadge")} />
          <p style={cardDesc}>{t("landing.infra.surface.defendDesc")}</p>
          <div style={{ position: "relative", height: 92, background: "var(--lp-surface-5)", border: "1px solid var(--lp-border-3)", borderRadius: 9, overflow: "hidden" }}>
            <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center" }}>
              <svg width="200%" height="100%" viewBox="0 0 800 92" preserveAspectRatio="none" style={{ animation: "ps-wave 3.4s linear infinite" }}>
                <path d="M0,46 Q50,18 100,46 T200,46 T300,46 T400,46 T500,46 T600,46 T700,46 T800,46" fill="none" stroke={OG} strokeWidth="1.5" opacity="0.85" />
                <path d="M0,46 Q50,74 100,46 T200,46 T300,46 T400,46 T500,46 T600,46 T700,46 T800,46" fill="none" stroke="#3A2A22" strokeWidth="1" />
              </svg>
            </div>
            <div style={{ position: "absolute", top: 9, left: 13, fontFamily: MONO, fontSize: 10.5, color: OG }}>competitor ↓4.2% detected</div>
            <div style={{ position: "absolute", bottom: 9, left: 13, fontFamily: MONO, fontSize: 10.5, color: GN }}>↻ reprice completed in 540ms</div>
          </div>
        </div>

        {/* GOVERN */}
        <div style={{ padding: "30px 30px 32px" }}>
          <CardHeader idx="04" name={t("landing.infra.surface.governName")} badge={t("landing.infra.surface.governBadge")} />
          <p style={cardDesc}>{t("landing.infra.surface.governDesc")}</p>
          <div style={codeBlock}>
            <div style={{ display: "flex", justifyContent: "space-between", color: "var(--lp-text-code)" }}>
              <span>sha256: 0xa4f9..e21b</span>
              <span style={{ color: GN }}>VERIFIED ✓</span>
            </div>
            <div style={{ color: "var(--lp-faint)" }}>route: QA → KSA, PDPL compliant</div>
            <div dir="rtl" style={{ color: "var(--lp-muted)", marginTop: 6, fontFamily: "inherit" }}>تم التحقق من توجيه البيانات عبر الحدود</div>
            <div dir="rtl" style={{ color: "var(--lp-faint)", fontFamily: "inherit" }}>يتوافق مع إطار QFC و PDPL</div>
          </div>
        </div>
      </div>
    </section>
  );
}

const cardDesc: React.CSSProperties = { fontSize: 13.5, lineHeight: 1.55, color: "var(--lp-muted)", margin: "0 0 18px" };
const codeBlock: React.CSSProperties = { fontFamily: MONO, fontSize: 11.5, lineHeight: 1.7, background: "var(--lp-surface-5)", border: "1px solid var(--lp-border-3)", borderRadius: 9, padding: "13px 15px" };

function CardHeader({ idx, name, badge }: { idx: string; name: string; badge: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
      <span style={{ fontFamily: MONO, fontSize: 12, color: OG }}>{idx}</span>
      <span style={{ fontSize: 18, fontWeight: 600, letterSpacing: "-0.01em" }}>{name}</span>
      <span style={{ fontFamily: MONO, fontSize: 10.5, color: "var(--lp-dim)", border: "1px solid var(--lp-border-em)", borderRadius: 4, padding: "2px 7px" }}>{badge}</span>
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
        <div style={{ fontFamily: MONO, fontSize: 12, color: "var(--lp-muted-2)" }}>{t("landing.infra.latency.p99")}</div>
      </div>
      <div style={{ border: "1px solid var(--lp-border-4)", borderRadius: 13, overflow: "hidden", background: "var(--lp-surface)" }}>
        <div style={{ display: "grid", gridTemplateColumns: "40px 1fr 1.3fr 130px", fontFamily: MONO, fontSize: 10.5, letterSpacing: "0.06em", color: "var(--lp-dim)", background: "var(--lp-surface-3)", borderBottom: "1px solid var(--lp-border-3)", padding: "13px 22px" }}>
          <div>#</div><div>{t("landing.infra.latency.colNode")}</div><div>{t("landing.infra.latency.colOp")}</div><div style={{ textAlign: "right" }}>{t("landing.infra.latency.colMax")}</div>
        </div>
        {LATENCY_ROW_KEYS.map(r => (
          <div key={r.idx} style={{ display: "grid", gridTemplateColumns: "40px 1fr 1.3fr 130px", alignItems: "center", padding: "15px 22px", borderBottom: "1px solid var(--lp-border-3)" }}>
            <div style={{ fontFamily: MONO, fontSize: 11, color: "var(--lp-faint)" }}>{r.idx}</div>
            <div style={{ fontSize: 14, fontWeight: 500, color: "var(--lp-text-3)" }}>{t(r.nodeKey)}</div>
            <div style={{ fontSize: 13, color: "var(--lp-muted-2)" }}>{t(r.detailKey)}</div>
            <div style={{ textAlign: "right", fontFamily: MONO, fontSize: 14, fontWeight: 600, color: "var(--lp-text)" }}>{r.max}</div>
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
function DeployCTA({ dark }: { dark: boolean }) {
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
    { titleKey: "landing.infra.deploy.col3", items: [
      { label: "QFC Licensing", href: null },
      { label: "KSA PDPL Framework", href: null },
      { label: "Data Residency", href: null },
      { label: "Terms of Service", href: "/terms" },
      { label: "Privacy Policy", href: "/privacy" },
    ]},
  ];

  return (
    <section style={{ position: "relative", zIndex: 2, maxWidth: 1440, margin: "0 auto", padding: "80px clamp(24px,5vw,72px) 0" }}>
      <div style={{ borderTop: "1px solid var(--lp-border)", paddingTop: 60, textAlign: "center" }}>
        <div style={{ fontFamily: MONO, fontSize: 11, letterSpacing: "0.1em", color: OG, marginBottom: 18 }}>{t("landing.infra.deploy.sectionLabel")}</div>
        <h2 style={{ fontSize: "clamp(30px,3.6vw,46px)", lineHeight: 1.04, letterSpacing: "-0.03em", fontWeight: 600, margin: "0 0 16px", color: "var(--lp-text)" }}>
          {t("landing.infra.deploy.title")}
        </h2>
        <p style={{ fontSize: 16, color: "var(--lp-muted)", margin: "0 auto 36px", maxWidth: 460, lineHeight: 1.6 }}>
          {t("landing.infra.deploy.subtitle")}
        </p>
        <div style={{ maxWidth: 560, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "var(--lp-surface-2)", border: "1px solid var(--lp-border-5)", borderRadius: 11, padding: "16px 18px", boxShadow: "0 20px 60px -20px rgba(0,0,0,0.7)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 13, fontFamily: MONO, fontSize: 14 }}>
              <span style={{ color: "var(--lp-faint)" }}>❯</span>
              <span style={{ color: "var(--lp-text-2)" }}>npm install <span style={{ color: OG }}>@prizeskout/core</span></span>
            </div>
            <button onClick={handleCopy} style={{ fontFamily: MONO, fontSize: 11.5, fontWeight: 600, color: copied ? GN : "var(--lp-muted)", background: "var(--lp-surface-4)", border: "1px solid var(--lp-border-em)", borderRadius: 7, padding: "8px 14px", cursor: "pointer" }}>
              {copied ? t("landing.infra.deploy.copied") : t("landing.infra.deploy.copy")}
            </button>
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 9, marginTop: 22 }}>
            <a href="/onboarding" style={{ fontFamily: "inherit", fontSize: 14, fontWeight: 600, color: BG, background: OG, border: "none", borderRadius: 9, padding: "13px 24px", cursor: "pointer", boxShadow: "0 8px 28px rgba(239,104,26,0.28)", textDecoration: "none", display: "inline-block" }}>{t("landing.infra.deploy.cta1")}</a>
            <a href="/docs" style={{ fontFamily: "inherit", fontSize: 14, fontWeight: 500, color: "var(--lp-text-2)", background: "transparent", border: "1px solid var(--lp-border-em)", borderRadius: 9, padding: "13px 24px", cursor: "pointer", textDecoration: "none", display: "inline-block" }}>{t("landing.infra.deploy.cta2")}</a>
          </div>
        </div>
      </div>

      <footer style={{ marginTop: 90, borderTop: "1px solid var(--lp-border-2)", padding: "42px 0 50px", display: "grid", gridTemplateColumns: "1.6fr 1fr 1fr 1fr", gap: 32 }}>
        <div>
          <div style={{ marginBottom: 14 }}>
            <img src={dark ? logoDark : logoLight} alt="PrizeSkout" style={{ height: 24, width: "auto", display: "block" }} />
          </div>
          <p style={{ fontSize: 12.5, color: "var(--lp-dim)", lineHeight: 1.6, margin: "0 0 16px", maxWidth: 260 }}>{t("landing.infra.deploy.footerDesc")}</p>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, fontFamily: MONO, fontSize: 10.5, color: "var(--lp-muted-2)", border: "1px solid var(--lp-border-em)", borderRadius: 6, padding: "6px 11px" }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: GN, display: "inline-block" }} />
            {t("landing.infra.deploy.footerLicense")}
          </div>
        </div>
        {footerCols.map(col => (
          <div key={col.titleKey}>
            <div style={{ fontFamily: MONO, fontSize: 10.5, letterSpacing: "0.08em", color: "var(--lp-faint)", marginBottom: 15 }}>{t(col.titleKey)}</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 11, fontSize: 13, color: "var(--lp-muted)" }}>
              {col.items.map(item => {
                if (typeof item === "string") return <span key={item}>{item}</span>;
                return item.href
                  ? <a key={item.label} href={item.href} style={{ color: "var(--lp-muted)", textDecoration: "none" }}>{item.label}</a>
                  : <span key={item.label}>{item.label}</span>;
              })}
            </div>
          </div>
        ))}
      </footer>

      <div style={{ borderTop: "1px solid var(--lp-border-2)", padding: "20px 0 40px", display: "flex", alignItems: "center", justifyContent: "space-between", fontFamily: MONO, fontSize: 11, color: "var(--lp-faint)", flexWrap: "wrap", gap: 8 }}>
        <span>{t("landing.infra.deploy.copyright")}</span>
        <span>{t("landing.infra.deploy.tagline")}</span>
      </div>
    </section>
  );
}


// ── PricingSection ────────────────────────────────────────────────────────────
const TIERS = [
  {
    name: "Core", badge: null, featured: false,
    monthly: 349, annual: 279, currency: "QAR",
    features: ["1 Inbound Channel", "1,500 syncs / month", "Margin Engine", "Email Support"],
    cta: "Start Core Trial", ctaHref: "/onboarding",
  },
  {
    name: "Growth", badge: "72× ROI", featured: true,
    monthly: 1099, annual: 879, currency: "QAR",
    features: ["Unlimited Channels", "Under 2 Second Latency Guarantee", "15,000 syncs / month", "Competitor Radar", "Slack + Priority Support"],
    cta: "Secure Growth Plan", ctaHref: "/onboarding",
  },
  {
    name: "Enterprise", badge: "Custom ACV", featured: false,
    monthly: null, annual: null, currency: null,
    features: ["SAP / Oracle ERP Hooks", "Dedicated DB Residency", "99.99% SLA", "Dedicated CSM", "Unlimited syncs / month", "24/7 Support"],
    cta: "Contact Sales", ctaHref: "/contact",
  },
] as const;

function PricingSection() {
  const [annual, setAnnual] = useState(false);
  return (
    <section style={{ position: "relative", zIndex: 2, maxWidth: 1440, margin: "0 auto", padding: "80px clamp(24px,5vw,72px) 100px" }}>
      <div style={{ borderTop: "1px solid var(--lp-border)", paddingTop: 40, marginBottom: 18, display: "flex", alignItems: "flex-end", justifyContent: "space-between", flexWrap: "wrap", gap: 20 }}>
        <div>
          <div style={{ fontFamily: MONO, fontSize: 11, letterSpacing: "0.1em", color: OG, marginBottom: 12 }}>GCC-SEGMENTED PRICING</div>
          <h2 style={{ fontSize: "clamp(28px,3.2vw,40px)", lineHeight: 1.05, letterSpacing: "-0.03em", fontWeight: 600, margin: 0, color: "var(--lp-text)" }}>Pricing that scales with your margin</h2>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 0, background: "var(--lp-surface-3)", border: "1px solid var(--lp-border-em)", borderRadius: 9, padding: 3 }}>
          {(["Monthly", "Annual"] as const).map(b => (
            <button key={b} type="button" onClick={() => setAnnual(b === "Annual")}
              style={{ fontFamily: MONO, fontSize: 11.5, fontWeight: 600, padding: "7px 16px", borderRadius: 7, border: "none", cursor: "pointer", transition: "all 0.15s",
                background: (b === "Annual") === annual ? OG : "transparent",
                color: (b === "Annual") === annual ? BG : "var(--lp-muted)",
              }}>
              {b}{b === "Annual" && <span style={{ marginLeft: 5, fontSize: 9.5, opacity: 0.85 }}>SAVE 20%</span>}
            </button>
          ))}
        </div>
      </div>

      <div className="ps-pricing-grid" style={{ display: "grid", gap: 20, marginTop: 44 }}>
        {TIERS.map(tier => (
          <div key={tier.name} style={{
            background: "var(--lp-surface)", borderRadius: 16, padding: "32px 28px",
            border: tier.featured ? `1px solid ${OG}` : "1px solid var(--lp-border-4)",
            position: "relative", display: "flex", flexDirection: "column",
            boxShadow: tier.featured ? `0 0 40px rgba(239,104,26,0.12)` : "none",
          }}>
            {tier.featured && (
              <div style={{ position: "absolute", top: -12, left: "50%", transform: "translateX(-50%)", fontFamily: MONO, fontSize: 10.5, fontWeight: 700, color: BG, background: OG, borderRadius: 20, padding: "3px 14px", letterSpacing: "0.06em", whiteSpace: "nowrap" }}>
                MOST POPULAR
              </div>
            )}
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: "var(--lp-text)" }}>{tier.name}</div>
              {tier.badge && (
                <span style={{ fontFamily: MONO, fontSize: 10, color: tier.featured ? OG : "var(--lp-dim)", border: `1px solid ${tier.featured ? "rgba(239,104,26,0.35)" : "#2A2422"}`, borderRadius: 4, padding: "2px 7px" }}>{tier.badge}</span>
              )}
            </div>
            <div style={{ marginBottom: 24 }}>
              {tier.monthly !== null ? (
                <>
                  <span style={{ fontFamily: MONO, fontSize: 38, fontWeight: 700, color: "var(--lp-text)", letterSpacing: "-0.02em" }}>
                    {tier.currency} {annual ? tier.annual : tier.monthly}
                  </span>
                  <span style={{ fontFamily: MONO, fontSize: 13, color: "var(--lp-dim)" }}> / mo</span>
                  {annual && <div style={{ fontFamily: MONO, fontSize: 10.5, color: GN, marginTop: 4 }}>↓ billed annually</div>}
                </>
              ) : (
                <span style={{ fontFamily: MONO, fontSize: 32, fontWeight: 700, color: "var(--lp-text)" }}>Custom</span>
              )}
            </div>
            <ul style={{ listStyle: "none", padding: 0, margin: "0 0 28px", display: "flex", flexDirection: "column", gap: 10, flex: 1 }}>
              {tier.features.map(f => (
                <li key={f} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13, color: "var(--lp-muted)" }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={GN} strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12" /></svg>
                  {f}
                </li>
              ))}
            </ul>
            <a href={tier.ctaHref} style={{
              display: "block", textAlign: "center", fontSize: 13.5, fontWeight: 700, padding: "13px",
              borderRadius: 9, textDecoration: "none", fontFamily: MONO, letterSpacing: "0.02em",
              background: tier.featured ? OG : "transparent",
              color: tier.featured ? BG : "var(--lp-muted)",
              border: tier.featured ? "none" : "1px solid var(--lp-border-em)",
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
    a: "No. PrizeSkout operates as an asynchronous event middleware. It listens to webhooks from your inbound channels (Salla, Foodics, SAP) and fires outbound reprices independently. Your POS, ERP, and checkout flows have zero latency dependency on us. We consume their events; they never wait on us.",
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
        <div style={{ fontFamily: MONO, fontSize: 11, letterSpacing: "0.1em", color: OG, marginBottom: 12 }}>TECHNICAL OBJECTIONS</div>
        <h2 style={{ fontSize: "clamp(28px,3.2vw,40px)", lineHeight: 1.05, letterSpacing: "-0.03em", fontWeight: 600, margin: 0, color: "var(--lp-text)" }}>Built for GCC compliance teams</h2>
      </div>
      <div style={{ border: "1px solid var(--lp-border-4)", borderRadius: 14, overflow: "hidden", background: "var(--lp-surface)" }}>
        {FAQS.map((faq, i) => (
          <div key={i} style={{ borderBottom: i < FAQS.length - 1 ? "1px solid var(--lp-border-2)" : "none" }}>
            <button
              type="button"
              onClick={() => setOpenIdx(openIdx === i ? null : i)}
              style={{
                width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "22px 28px", background: "transparent", border: "none", cursor: "pointer",
                textAlign: "left", gap: 20, fontFamily: "inherit",
              }}
            >
              <span style={{ fontSize: 15.5, fontWeight: 600, color: "var(--lp-text-2)", lineHeight: 1.35 }}>{faq.q}</span>
              <span style={{ width: 26, height: 26, borderRadius: "50%", border: "1px solid var(--lp-border-em)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, color: openIdx === i ? OG : "var(--lp-dim)", flexShrink: 0, transition: "all 0.15s" }}>
                {openIdx === i ? "−" : "+"}
              </span>
            </button>
            {openIdx === i && (
              <div style={{ padding: "0 28px 24px", fontSize: 14.5, color: "var(--lp-muted)", lineHeight: 1.7, maxWidth: 720 }}>
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
      style={{ position: "relative", minHeight: "100vh", width: "100%", background: dark ? BG : "#FAF9F7", color: dark ? "var(--lp-text)" : "#1A1A18", fontFamily: "'Geist',-apple-system,BlinkMacSystemFont,sans-serif", WebkitFontSmoothing: "antialiased", transition: "background 0.2s, color 0.2s" }}
    >
      <style>{PAGE_CSS}</style>
      {/* Grid overlay */}
      <div aria-hidden style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 0, backgroundImage: "linear-gradient(rgba(255,255,255,0.022) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.022) 1px,transparent 1px)", backgroundSize: "64px 64px", WebkitMaskImage: "radial-gradient(ellipse 90% 70% at 50% 0%,#000 35%,transparent 100%)", maskImage: "radial-gradient(ellipse 90% 70% at 50% 0%,#000 35%,transparent 100%)", opacity: dark ? 1 : 0.15 }} />
      {/* Radial glow */}
      <div aria-hidden style={{ position: "absolute", top: -280, left: "50%", transform: "translateX(-50%)", width: 900, height: 560, background: "radial-gradient(ellipse at center,rgba(239,104,26,0.16),transparent 68%)", pointerEvents: "none", zIndex: 0, filter: "blur(8px)", opacity: dark ? 1 : 0.35 }} />
      <Nav dark={dark} onToggleDark={toggleDark} />
      <HeroSection />
      <DemoPlayer />
      <CredentialStrip />
      <SurfaceMatrix />
      <LatencyBudget />
      <PricingSection />
      <FAQSection />
      <DeployCTA dark={dark} />
    </div>
  );
}

const PAGE_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Geist:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;600;700&display=swap');
  :root {
    --lp-text:#FAFAF9; --lp-text-2:#E7E2DF; --lp-text-3:#EDE8E5;
    --lp-text-code:#9C938F; --lp-text-max:#C9C2BE; --lp-rule-color:#C97B4A;
    --lp-muted:#A8A29E; --lp-muted-2:#8A7F7B;
    --lp-dim:#6E6360; --lp-faint:#52483F; --lp-inactive:#3A332F;
    --lp-border:#211C1A; --lp-border-em:#2A2422;
    --lp-border-2:#1C1715; --lp-border-3:#1E1917;
    --lp-border-4:#221D1B; --lp-border-5:#251F1D; --lp-border-6:#1A1513;
    --lp-border-strip:#1A1A1A;
    --lp-surface:#0A0706; --lp-surface-2:#0B0807; --lp-surface-3:#0E0A09;
    --lp-surface-4:#15110F; --lp-surface-5:#080605; --lp-surface-6:#141010;
    --lp-surface-strip:#050505; --lp-surface-dots:#241E1C;
  }
  [data-lp-theme="light"] {
    --lp-text:#1A1A18; --lp-text-2:#2C2C29; --lp-text-3:#3C3C38;
    --lp-text-code:#57534E; --lp-text-max:#6B6560; --lp-rule-color:#8C5E2A;
    --lp-muted:#6B6560; --lp-muted-2:#7C7873;
    --lp-dim:#8C8883; --lp-faint:#9C9893; --lp-inactive:#B8B2AC;
    --lp-border:#D4CEC8; --lp-border-em:#C8C2BB;
    --lp-border-2:#D8D3CD; --lp-border-3:#D0CBC4;
    --lp-border-4:#C8C2BB; --lp-border-5:#BDB7B0; --lp-border-6:#D4CEC8;
    --lp-border-strip:#DDD8D3;
    --lp-surface:#F0EDE9; --lp-surface-2:#EAE7E3; --lp-surface-3:#E5E1DC;
    --lp-surface-4:#DEDAD4; --lp-surface-5:#EDEBE7; --lp-surface-6:#F5F3F0;
    --lp-surface-strip:#F0EDE9; --lp-surface-dots:#D0CBC4;
  }
  *, *::before, *::after { box-sizing: border-box; }
  @keyframes ps-wave   { 0%{transform:translateX(0)} 100%{transform:translateX(-50%)} }
  @keyframes ps-pulse  { 0%,100%{opacity:0.35} 50%{opacity:1} }
  .ps-pricing-grid { grid-template-columns:1fr; }
  @media(min-width:900px) {
    .ps-pricing-grid { grid-template-columns:repeat(3,1fr); }
  }
  @media(max-width:640px) {
    nav > div:last-child > span { display:none; }
  }
`;
