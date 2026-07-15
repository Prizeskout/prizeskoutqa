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
const MONO = "'IBM Plex Mono',ui-monospace,'SFMono-Regular',Menlo,Monaco,monospace";
const DISPLAY = "'IBM Plex Sans',system-ui,-apple-system,sans-serif";
const BODY = "'IBM Plex Sans',system-ui,-apple-system,sans-serif";

// ── Market data ───────────────────────────────────────────────────────────────
const MARKETS = [
  { code: "QA", currency: "QAR", country: "Qatar",                rate: 1.000 },
  { code: "SA", currency: "SAR", country: "Saudi Arabia",         rate: 1.030 },
  { code: "AE", currency: "AED", country: "United Arab Emirates", rate: 1.002 },
  { code: "OM", currency: "OMR", country: "Oman",                 rate: 0.106 },
  { code: "KW", currency: "KWD", country: "Kuwait",               rate: 0.085 },
  { code: "BH", currency: "BHD", country: "Bahrain",              rate: 0.104 },
] as const;
type Market = typeof MARKETS[number];

function NavMarketSwitcher({ market, onChange }: { market: Market; onChange: (m: Market) => void }) {
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

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "7px 13px", borderRadius: 8, border: "1px solid #2A2422", background: "#0E0A09", color: "#C4BAB5", fontSize: 13, cursor: "pointer", fontFamily: "inherit", transition: "border-color 0.15s" }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = "#3D2E27"; }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = "#2A2422"; }}
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={OG} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
        </svg>
        <span style={{ fontFamily: MONO, fontSize: 12 }}>{market.code}</span>
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}>
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </button>
      {open && (
        <div style={{ position: "absolute", top: "calc(100% + 8px)", right: 0, background: "#0C0908", border: "1px solid #2A2422", borderRadius: 10, padding: "10px 6px", zIndex: 300, minWidth: 224, boxShadow: "0 12px 40px rgba(0,0,0,0.65)", animation: "ps-menu 0.14s ease" }}>
          <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: "0.12em", color: "#52463F", padding: "2px 10px 9px" }}>MARKET / CURRENCY</div>
          {MARKETS.map(m => {
            const active = m.code === market.code;
            return (
              <button
                key={m.code}
                type="button"
                onClick={() => { onChange(m); setOpen(false); }}
                style={{ display: "flex", alignItems: "center", gap: 9, width: "100%", padding: "9px 10px", borderRadius: 7, border: "none", background: "transparent", color: active ? "#FAFAF9" : "#A09690", fontSize: 13.5, fontWeight: active ? 600 : 400, cursor: "pointer", fontFamily: "inherit", transition: "background 0.1s" }}
                onMouseEnter={e => { e.currentTarget.style.background = "#15110F"; }}
                onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
              >
                <span style={{ fontFamily: MONO, fontSize: 10, border: `1px solid ${active ? "#4A3228" : "#2A2422"}`, borderRadius: 4, padding: "1px 5px", color: active ? OG : "#52463F", flexShrink: 0 }}>{m.currency}</span>
                {m.country}
                {active && (
                  <svg style={{ marginLeft: "auto" }} width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={OG} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12l4 4L19 7"/>
                  </svg>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
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
        style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "7px 13px", borderRadius: 8, border: "1px solid #2A2422", background: "#0E0A09", color: "#C4BAB5", fontSize: 13, cursor: "pointer", fontFamily: "inherit", transition: "border-color 0.15s" }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = "#3D2E27"; }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = "#2A2422"; }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={OG} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/>
          <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
        </svg>
        {LANG_DISPLAY[current]?.full ?? "English"}
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}>
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </button>
      {open && (
        <div style={{ position: "absolute", top: "calc(100% + 8px)", right: 0, background: "#0C0908", border: "1px solid #2A2422", borderRadius: 10, padding: "10px 6px", zIndex: 300, minWidth: 180, boxShadow: "0 12px 40px rgba(0,0,0,0.65)", animation: "ps-menu 0.14s ease" }}>
          <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: "0.12em", color: "#52463F", padding: "2px 10px 9px" }}>LANGUAGE</div>
          {["en", "ar", "fr"].map(lng => {
            const active = current === lng;
            const d = LANG_DISPLAY[lng];
            return (
              <button
                key={lng}
                type="button"
                onClick={() => handleChange(lng)}
                style={{ display: "flex", alignItems: "center", gap: 9, width: "100%", padding: "9px 10px", borderRadius: 7, border: "none", background: "transparent", color: active ? "#FAFAF9" : "#A09690", fontSize: 13.5, fontWeight: active ? 600 : 400, cursor: "pointer", fontFamily: "inherit", transition: "background 0.1s" }}
                onMouseEnter={e => { e.currentTarget.style.background = "#15110F"; }}
                onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
              >
                <span style={{ fontFamily: MONO, fontSize: 10, border: `1px solid ${active ? "#4A3228" : "#2A2422"}`, borderRadius: 4, padding: "1px 5px", color: active ? OG : "#52463F", flexShrink: 0, transition: "border-color 0.1s, color 0.1s" }}>{d.short}</span>
                {d.full}
                {active && (
                  <svg style={{ marginLeft: "auto" }} width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={OG} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12l4 4L19 7"/>
                  </svg>
                )}
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

function Nav({ dark, onToggleDark, market, onMarketChange }: { dark: boolean; onToggleDark: () => void; market: Market; onMarketChange: (m: Market) => void }) {
  const { t } = useTranslation();
  const [isMobile, setIsMobile] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(max-width:768px)");
    setIsMobile(mq.matches);
    const h = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener("change", h);
    return () => mq.removeEventListener("change", h);
  }, []);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  const navItems = [
    t("landing.infra.nav.infrastructure"),
    t("landing.infra.nav.loop"),
    t("landing.infra.nav.latency"),
    t("landing.infra.nav.docs"),
  ];

  return (
    <>
      <nav style={{ position: "relative", zIndex: 5, maxWidth: 1440, margin: "0 auto", padding: "22px clamp(24px,5vw,72px)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
          <img src={dark ? logoDark : logoLight} alt="PrizeSkout" style={{ height: 28, width: "auto", display: "block" }} />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          {navItems.map(item => (
            <span key={item} className="ps-nav-link" style={{ fontSize: 13.5, color: "var(--lp-muted)", cursor: "pointer" }}>{item}</span>
          ))}
          <div className="ps-nav-utils">
            <NavMarketSwitcher market={market} onChange={onMarketChange} />
            <NavLangSwitcher />
            <ThemeToggle dark={dark} onToggle={onToggleDark} />
          </div>
          <a href="/access" style={{ display: isMobile ? "none" : "inline-block", fontFamily: MONO, fontSize: 12, color: "var(--lp-muted)", border: "1px solid var(--lp-border)", background: "transparent", borderRadius: 6, padding: "7px 13px", textDecoration: "none" }}>Dashboard</a>
          <a href="/onboarding" style={{ display: isMobile ? "none" : "inline-block", fontFamily: MONO, fontSize: 12, color: OG, border: "1px solid #3A2418", background: "rgba(239,104,26,0.06)", borderRadius: 6, padding: "7px 13px", textDecoration: "none" }}>Connect a Store</a>
          <button
            onClick={() => setMobileOpen(true)}
            aria-label="Open menu"
            style={{ display: isMobile ? "flex" : "none", alignItems: "center", justifyContent: "center", width: 40, height: 40, borderRadius: 8, border: "1px solid #2A2422", background: "transparent", cursor: "pointer", color: "#C4BAB5", flexShrink: 0 }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
            </svg>
          </button>
        </div>
      </nav>

      {mobileOpen && (
        <>
          <div onClick={() => setMobileOpen(false)}
            style={{ position: "fixed", inset: 0, zIndex: 190, background: "rgba(0,0,0,0.65)", backdropFilter: "blur(4px)" }} />
          <div style={{ position: "fixed", top: 0, right: 0, bottom: 0, width: "min(320px,90vw)",
            zIndex: 200, background: "#0C0908", borderLeft: "1px solid #2A2422",
            display: "flex", flexDirection: "column", overflowY: "auto",
            animation: "ps-drawer .22s ease" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "20px 24px", borderBottom: "1px solid #211C1A" }}>
              <img src={dark ? logoDark : logoLight} alt="PrizeSkout" style={{ height: 24, width: "auto" }} />
              <button onClick={() => setMobileOpen(false)} aria-label="Close menu"
                style={{ background: "transparent", border: "none", cursor: "pointer", color: "#A8A29E", padding: 8, lineHeight: 0 }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
            <div style={{ padding: "16px 24px", display: "flex", flexDirection: "column", gap: 4 }}>
              {navItems.map(item => (
                <button key={item} type="button" onClick={() => setMobileOpen(false)}
                  style={{ display: "flex", alignItems: "center", width: "100%", padding: "14px 0", background: "transparent", border: "none", borderBottom: "1px solid #1A1513", cursor: "pointer", color: "#C4BAB5", fontSize: 14, fontFamily: "inherit", textAlign: "left" }}>
                  {item}
                </button>
              ))}
            </div>
            <div style={{ padding: "16px 24px", borderTop: "1px solid #211C1A", display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <NavMarketSwitcher market={market} onChange={onMarketChange} />
              <NavLangSwitcher />
              <ThemeToggle dark={dark} onToggle={onToggleDark} />
            </div>
            <div style={{ padding: "16px 24px 32px", marginTop: "auto", display: "flex", flexDirection: "column", gap: 10 }}>
              <a href="/onboarding" onClick={() => setMobileOpen(false)}
                style={{ display: "block", textAlign: "center", fontFamily: MONO, fontSize: 13, fontWeight: 600, color: "#080505", background: OG, borderRadius: 9, padding: "13px", textDecoration: "none" }}>
                Connect a Store
              </a>
              <a href="/access" onClick={() => setMobileOpen(false)}
                style={{ display: "block", textAlign: "center", fontFamily: MONO, fontSize: 13, color: "#A8A29E", border: "1px solid #2A2422", borderRadius: 9, padding: "12px", textDecoration: "none" }}>
                Dashboard
              </a>
            </div>
          </div>
        </>
      )}
    </>
  );
}

// ── HeroSection ───────────────────────────────────────────────────────────────
function HeroSection({ dark }: { dark: boolean }) {
  return (
    <section style={{ position: "relative", zIndex: 2, maxWidth: 1440, margin: "0 auto", padding: "72px clamp(24px,5vw,72px) 84px" }}>
      {/* H1 */}
      <h1 style={{ fontSize: "clamp(44px,5.6vw,82px)", lineHeight: 1.05, letterSpacing: "-0.025em", fontWeight: 700, margin: "0 0 24px", color: "var(--lp-text)", maxWidth: "20ch", fontFamily: DISPLAY }}>
        Every aggregator order.{" "}
        <span style={{ color: OG }}>Your margin, defended.</span>
      </h1>

      {/* Subtitle */}
      <p style={{ fontSize: 18, lineHeight: 1.6, color: "var(--lp-muted)", margin: "0 0 28px", maxWidth: 640 }}>
        PrizeSkout recalculates <strong style={{ color: "var(--lp-text-2)", fontWeight: 600 }}>margin-safe prices</strong> and pushes them live across Talabat, Jahez, Noon and Careem and others, in under two seconds, on every menu, automatically.
      </p>

      {/* CTAs */}
      <div style={{ display: "flex", alignItems: "center", gap: 13, flexWrap: "wrap" }}>
        <a href="/onboarding" style={{ fontFamily: "inherit", fontSize: 14, fontWeight: 600, color: BG, background: OG, border: "none", borderRadius: 9, padding: "13px 22px", cursor: "pointer", textDecoration: "none", display: "inline-block" }}>
          Get Access
        </a>
        <a href="/api-docs.html" style={{ fontFamily: "inherit", fontSize: 14, fontWeight: 500, color: "var(--lp-text-2)", background: "transparent", border: "1px solid var(--lp-border-em)", borderRadius: 9, padding: "13px 22px", cursor: "pointer", textDecoration: "none", display: "inline-block" }}>
          Read SDK Docs
        </a>
        <span style={{ fontSize: 12.5, color: "var(--lp-muted-2)", marginLeft: 6 }}>QFC-licensed · Qatar</span>
      </div>

      {/* DATA FLOW diagram */}
      <div style={{ position: "relative", marginTop: 58, border: "1px solid var(--lp-border-4)", borderRadius: 18, background: "var(--lp-surface-2)", padding: "24px 30px 30px", overflow: "hidden" }}>
        {/* Header row */}
        <div className="ps-flow-header" style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
          <div className="ps-flow-header-label" style={{ fontFamily: MONO, fontSize: 10.5, letterSpacing: "0.12em", color: "var(--lp-dim)" }}>DATA FLOW · POS → LAYER → AGGREGATORS</div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontFamily: MONO, fontSize: 11, color: GN }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: GN, animation: "ps-pulse 1.4s infinite", display: "inline-block" }} />
            pushing live
          </div>
        </div>

        {/* Three-card flow row — horizontally scrollable on narrow screens */}
        <div className="ps-flow-scroll">
        <div className="ps-flow-row" style={{ position: "relative", display: "flex", alignItems: "stretch", gap: 0 }}>

          {/* POS source card */}
          <div className="ps-flow-card" style={{ flex: "0 0 220px", background: "var(--lp-surface)", border: "1px solid var(--lp-border-3)", borderRadius: 13, padding: "18px 17px" }}>
            <div style={{ fontFamily: MONO, fontSize: 9.5, letterSpacing: "0.1em", color: "var(--lp-dim)", marginBottom: 14 }}>SOURCE · YOUR POS</div>
            <div style={{ display: "flex", gap: 7, marginBottom: 16 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: "var(--lp-text-2)", background: "var(--lp-surface-4)", border: "1px solid var(--lp-border-em)", borderRadius: 6, padding: "5px 10px" }}>Foodics</span>
              <span style={{ fontSize: 12, fontWeight: 600, color: "var(--lp-text-2)", background: "var(--lp-surface-4)", border: "1px solid var(--lp-border-em)", borderRadius: 6, padding: "5px 10px" }}>Salla</span>
              <span style={{ fontSize: 12, fontWeight: 600, color: "var(--lp-text-2)", background: "var(--lp-surface-4)", border: "1px solid var(--lp-border-em)", borderRadius: 6, padding: "5px 10px" }}>Zid</span>
            </div>
            <div style={{ fontFamily: MONO, fontSize: 11, lineHeight: 1.7, background: "var(--lp-surface-5)", border: "1px solid var(--lp-border-3)", borderRadius: 8, padding: "11px 12px" }}>
              <div style={{ color: "var(--lp-faint)" }}># base price</div>
              <div style={{ color: "var(--lp-text-code)" }}>SKU <span style={{ color: GN }}>QA-8842</span></div>
              <div style={{ color: "var(--lp-text-2)", fontSize: 13 }}>41.00 <span style={{ color: "var(--lp-dim)", fontSize: 11 }}>SAR</span></div>
            </div>
          </div>

          {/* Connector: POS → Layer */}
          <div className="ps-flow-connector" style={{ flex: 1, minWidth: 36, alignSelf: "center", position: "relative", height: 48 }}>
            <div style={{ position: "absolute", top: "50%", left: 0, right: 0, height: 1, background: "var(--lp-border-em)" }} />
            <div style={{ position: "absolute", top: "calc(50% - 17px)", left: 4, fontFamily: MONO, fontSize: 9, color: "var(--lp-faint)" }}>ingest</div>
            {([0, 0.8, 1.6] as number[]).map((delay, i) => (
              <span key={i} style={{ position: "absolute", top: "50%", marginTop: -3, width: 6, height: 6, borderRadius: "50%", background: OG, animation: `ps-packet 2.4s linear ${delay}s infinite`, display: "inline-block" }} />
            ))}
          </div>

          {/* PrizeSkout Layer card */}
          <div className="ps-flow-card" style={{ flex: "0 0 360px", position: "relative", background: "var(--lp-surface)", border: "1px solid rgba(239,104,26,0.3)", borderLeft: "3px solid " + OG, borderRadius: 14, padding: "17px 20px 16px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 13 }}>
              <img src={dark ? logoDark : logoLight} alt="PrizeSkout" style={{ height: 14, width: "auto", display: "block", flexShrink: 0 }} />
              <span style={{ fontSize: 14, fontWeight: 600, color: "var(--lp-text)" }}>Pricing Layer</span>
            </div>
            <div style={{ fontFamily: MONO, fontSize: 11.5, lineHeight: 1.75, background: "var(--lp-surface-5)", border: "1px solid var(--lp-border-3)", borderRadius: 9, padding: "12px 14px" }}>
              <div style={{ color: "var(--lp-faint)" }}># margin-safe repricer</div>
              <div style={{ color: "var(--lp-text-code)" }}>net = sell − <span style={{ color: "var(--lp-rule-color)" }}>comm</span> − vat − logistics</div>
              <div style={{ display: "flex", gap: 13, marginTop: 6, color: "var(--lp-dim)" }}>
                <span>QA <span style={{ color: OG }}>22%</span></span>
                <span>AE <span style={{ color: OG }}>25%</span></span>
                <span>SA <span style={{ color: OG }}>21%</span></span>
              </div>
              <div style={{ marginTop: 8, color: GN }}>→ margin <span style={{ fontWeight: 600 }}>+18.4%</span> ✓ above floor</div>
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 12, fontFamily: MONO, fontSize: 11 }}>
              <span style={{ color: "var(--lp-muted-2)" }}>⟳ recalculated <span style={{ color: "var(--lp-text)", fontWeight: 600 }}>1,842ms</span></span>
              <span style={{ color: OG, fontWeight: 600, fontSize: 13 }}>&lt;2s</span>
            </div>
          </div>

          {/* Connector: Layer → Aggregators */}
          <div className="ps-flow-connector" style={{ flex: 1, minWidth: 36, alignSelf: "center", position: "relative", height: 48 }}>
            <div style={{ position: "absolute", top: "50%", left: 0, right: 0, height: 1, background: "var(--lp-border-em)" }} />
            <div style={{ position: "absolute", top: "calc(50% - 17px)", right: 4, fontFamily: MONO, fontSize: 9, color: "var(--lp-faint)" }}>push live</div>
            {([0.4, 1.2, 2.0] as number[]).map((delay, i) => (
              <span key={i} style={{ position: "absolute", top: "50%", marginTop: -3, width: 6, height: 6, borderRadius: "50%", background: OG, animation: `ps-packet 2.4s linear ${delay}s infinite`, display: "inline-block" }} />
            ))}
          </div>

          {/* Aggregators card */}
          <div className="ps-flow-card" style={{ flex: "0 0 220px", background: "var(--lp-surface)", border: "1px solid var(--lp-border-3)", borderRadius: 13, padding: "15px 14px" }}>
            <div style={{ fontFamily: MONO, fontSize: 9.5, letterSpacing: "0.1em", color: "var(--lp-dim)", marginBottom: 12 }}>LIVE · EVERY AGGREGATOR</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
              {([ ["Talabat","44.90"], ["Jahez","45.10"], ["Noon","44.50"], ["Careem","45.00"] ] as [string,string][]).map(([name, price]) => (
                <div key={name} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "var(--lp-surface-5)", border: "1px solid var(--lp-border-3)", borderRadius: 8, padding: "8px 11px" }}>
                  <span style={{ fontSize: 12.5, fontWeight: 600, color: "var(--lp-text-2)" }}>{name}</span>
                  <span style={{ display: "flex", alignItems: "center", gap: 7, fontFamily: MONO, fontSize: 11 }}>
                    <span style={{ color: "var(--lp-text)" }}>{price}</span>
                    <span style={{ color: GN }}>✓</span>
                  </span>
                </div>
              ))}
            </div>
          </div>

        </div>
        </div>{/* end ps-flow-scroll */}
      </div>
    </section>
  );
}

// ── CredentialStrip ───────────────────────────────────────────────────────────
function CredentialStrip() {
  const { t } = useTranslation();
  return (
    <div style={{ position: "relative", zIndex: 3, borderTop: "1px solid var(--lp-border-strip)", borderBottom: "1px solid var(--lp-border-strip)", background: "var(--lp-surface-strip)", padding: "32px clamp(24px,5vw,72px)" }}>
      <div className="ps-credential-row" style={{ maxWidth: 1440, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "center", gap: 28, flexWrap: "wrap", rowGap: 16 }}>
        <span style={{ fontFamily: MONO, fontSize: 11, letterSpacing: "0.12em", color: "var(--lp-fg)", textTransform: "uppercase", whiteSpace: "nowrap", fontWeight: 700 }}>{t("landing.infra.backedBy")}</span>
        <div className="ps-credential-sep" style={{ width: 1, height: 28, background: "#2A2422" }} />
        <div style={{ background: "rgba(255,255,255,0.97)", borderRadius: 10, padding: "12px 28px", display: "inline-flex", alignItems: "center", justifyContent: "center", boxShadow: "0 2px 16px rgba(0,0,0,0.3)" }}>
          <img src={qstpLogoColored} alt="Qatar Science & Technology Park" style={{ height: 44, width: "auto", display: "block" }} />
        </div>
        <div className="ps-credential-sep" style={{ width: 1, height: 28, background: "#2A2422" }} />
        <div style={{ background: "rgba(255,255,255,0.97)", borderRadius: 10, padding: "12px 28px", display: "inline-flex", alignItems: "center", justifyContent: "center", boxShadow: "0 2px 16px rgba(0,0,0,0.3)" }}>
          <img src={qatarFoundationLogo} alt="Qatar Foundation" style={{ height: 44, width: "auto", display: "block" }} />
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
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 52, flexWrap: "wrap", gap: 16 }}>
        <div>
          <div style={{ fontFamily: MONO, fontSize: 11, letterSpacing: "0.1em", color: OG, marginBottom: 12 }}>{t("landing.infra.surface.sectionLabel")}</div>
          <h2 style={{ fontSize: "clamp(28px,3.2vw,40px)", lineHeight: 1.05, letterSpacing: "-0.03em", fontWeight: 600, margin: 0, color: "var(--lp-text)" }}>{t("landing.infra.surface.title")}</h2>
        </div>
        <p style={{ fontSize: 14, color: "var(--lp-muted-2)", maxWidth: 300, textAlign: "right", lineHeight: 1.55, margin: 0 }}>{t("landing.infra.surface.subtitle")}</p>
      </div>

      <div className="ps-surface-grid" style={{ border: "1px solid var(--lp-border-4)", borderRadius: 14, overflow: "hidden", background: "var(--lp-surface)" }}>
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

// ── Deploy CTA + Footer ───────────────────────────────────────────────────────
function DeployCTA({ dark }: { dark: boolean }) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);
  function handleCopy() {
    try { navigator.clipboard.writeText("https://api.prizeskout.qa/v1/connect"); } catch {}
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  }

  return (
    <section style={{ position: "relative", zIndex: 2, maxWidth: 1440, margin: "0 auto", padding: "80px clamp(24px,5vw,72px) 0" }}>
      <div style={{ paddingTop: 60, textAlign: "center" }}>
        <div style={{ fontFamily: MONO, fontSize: 11, letterSpacing: "0.1em", color: OG, marginBottom: 18 }}>{t("landing.infra.deploy.sectionLabel")}</div>
        <h2 style={{ fontSize: "clamp(30px,3.6vw,46px)", lineHeight: 1.04, letterSpacing: "-0.03em", fontWeight: 600, margin: "0 0 16px", color: "var(--lp-text)" }}>
          {t("landing.infra.deploy.title")}
        </h2>
        <p style={{ fontSize: 16, color: "var(--lp-muted)", margin: "0 auto 36px", maxWidth: 460, lineHeight: 1.6 }}>
          {t("landing.infra.deploy.subtitle")}
        </p>
        <div style={{ maxWidth: 560, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 9, marginTop: 0 }}>
            <a href="/onboarding" style={{ fontFamily: "inherit", fontSize: 14, fontWeight: 600, color: BG, background: OG, border: "none", borderRadius: 9, padding: "13px 24px", cursor: "pointer", textDecoration: "none", display: "inline-block" }}>{t("landing.infra.deploy.cta1")}</a>
            <a href="/docs" style={{ fontFamily: "inherit", fontSize: 14, fontWeight: 500, color: "var(--lp-text-2)", background: "transparent", border: "1px solid var(--lp-border-em)", borderRadius: 9, padding: "13px 24px", cursor: "pointer", textDecoration: "none", display: "inline-block" }}>{t("landing.infra.deploy.cta2")}</a>
          </div>
        </div>
      </div>
    </section>
  );
}

function LandingFooter() {
  return (
    <footer style={{ background: "#000", color: "#F5F6FA", padding: "72px 24px 32px", marginTop: 90 }}>
      <div style={{ maxWidth: 1180, margin: "0 auto" }}>
        <div className="ps-lp-footer">
          {/* Brand */}
          <div>
            <img src={logoDark} alt="PrizeSkout" style={{ height: 26, width: "auto", display: "block", marginBottom: 18 }} />
            <p style={{ fontSize: 14.5, color: "#9BA1B0", lineHeight: 1.7, margin: "0 0 24px", maxWidth: 300 }}>
              Real time margin infrastructure for GCC commerce. Autonomous agents that defend, audit, and recover your margin while you run the business.
            </p>
            <div style={{ display: "flex", gap: 10 }}>
              {(["X", "in"] as const).map(lbl => (
                <a key={lbl} href="#" onClick={(e) => e.preventDefault()}
                  aria-label={lbl === "X" ? "X (Twitter)" : "LinkedIn"}
                  style={{ width: 38, height: 38, borderRadius: 9, border: "1px solid rgba(255,255,255,0.08)", display: "flex", alignItems: "center", justifyContent: "center", color: "#9BA1B0", textDecoration: "none", fontSize: 14, fontWeight: 700, transition: "border-color 0.15s, color 0.15s" }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.3)"; e.currentTarget.style.color = "#F5F6FA"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"; e.currentTarget.style.color = "#9BA1B0"; }}
                >{lbl}</a>
              ))}
            </div>
          </div>

          {/* Platform */}
          <div>
            <div style={{ fontWeight: 600, fontSize: 15, color: "#F5F6FA", marginBottom: 6 }}>Platform</div>
            <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: "0.14em", color: "#6B7180", marginBottom: 16 }}>INFRASTRUCTURE LAYER</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 13 }}>
              {["Sync","Decide","Defend","Govern","Margin by PrizeSkout"].map(l => (
                <a key={l} href="#" onClick={(e) => e.preventDefault()} style={{ fontSize: 14.5, color: "#9BA1B0", textDecoration: "none", transition: "color 0.15s" }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = "#F5F6FA")}
                  onMouseLeave={(e) => (e.currentTarget.style.color = "#9BA1B0")}>{l}</a>
              ))}
            </div>
          </div>

          {/* Agents */}
          <div>
            <div style={{ fontWeight: 600, fontSize: 15, color: "#F5F6FA", marginBottom: 6, display: "flex", alignItems: "center", gap: 7 }}>
              Agents
              <span aria-hidden="true" style={{ width: 6, height: 6, borderRadius: "50%", background: "#FF5A1F", boxShadow: "0 0 8px rgba(255,90,31,0.7)", display: "inline-block" }} />
            </div>
            <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: "0.14em", color: "#6B7180", marginBottom: 16 }}>INTELLIGENCE LAYER</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 13 }}>
              <a href="#" onClick={(e) => e.preventDefault()} style={{ fontSize: 14.5, color: "#9BA1B0", textDecoration: "none", transition: "color 0.15s" }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "#F5F6FA")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "#9BA1B0")}>Agent CFO</a>
              <a href="#" onClick={(e) => e.preventDefault()} style={{ fontSize: 14.5, color: "#9BA1B0", textDecoration: "none", transition: "color 0.15s" }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "#F5F6FA")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "#9BA1B0")}>
                Dispute Audit Agent
                <span style={{ fontFamily: MONO, fontSize: 9.5, letterSpacing: "0.1em", color: "#FF5A1F", border: "1px solid rgba(255,90,31,0.35)", borderRadius: 4, padding: "2px 6px", marginLeft: 8, verticalAlign: "middle" }}>NEW</span>
              </a>
            </div>
          </div>

          {/* Developers */}
          <div>
            <div style={{ fontWeight: 600, fontSize: 15, color: "#F5F6FA", marginBottom: 6 }}>Developers</div>
            <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: "0.14em", color: "transparent", marginBottom: 16, userSelect: "none" }}>_</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 13 }}>
              {[
                { label: "SDK Docs", href: "/api-docs.html" },
                { label: "Authentication", href: "/api-docs.html#auth" },
                { label: "Webhooks", href: "/api-docs.html#webhooks" },
                { label: "Status", href: null },
                { label: "Margin Calculator", href: "/roi-calculator" },
              ].map(({ label, href }) => (
                <a key={label} href={href ?? "#"} onClick={!href ? (e) => e.preventDefault() : undefined}
                  style={{ fontSize: 14.5, color: "#9BA1B0", textDecoration: "none", transition: "color 0.15s" }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = "#F5F6FA")}
                  onMouseLeave={(e) => (e.currentTarget.style.color = "#9BA1B0")}>{label}</a>
              ))}
            </div>
          </div>

          {/* Company */}
          <div>
            <div style={{ fontWeight: 600, fontSize: 15, color: "#F5F6FA", marginBottom: 6 }}>Company</div>
            <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: "0.14em", color: "transparent", marginBottom: 16, userSelect: "none" }}>_</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 13 }}>
              {[
                { label: "About", href: null },
                { label: "Enterprise", href: null },
                { label: "Contact sales", href: "/contact" },
                { label: "Privacy Policy & Terms", href: "/legal" },
              ].map(({ label, href }) => (
                <a key={label} href={href ?? "#"} onClick={!href ? (e) => e.preventDefault() : undefined}
                  style={{ fontSize: 14.5, color: "#9BA1B0", textDecoration: "none", transition: "color 0.15s" }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = "#F5F6FA")}
                  onMouseLeave={(e) => (e.currentTarget.style.color = "#9BA1B0")}>{label}</a>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div style={{ marginTop: 64, paddingTop: 28, borderTop: "1px solid rgba(255,255,255,0.08)", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 20 }}>
          <div style={{ color: "#6B7180", fontSize: 13.5 }}>
            © 2026 PrizeSkout · QFC-licensed, Doha, Qatar
            <span style={{ fontFamily: MONO, fontSize: 11.5, color: "#6B7180" }}> · QFC No. 04412</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <a href="#" onClick={(e) => e.preventDefault()}
              style={{ display: "inline-flex", alignItems: "center", gap: 8, border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, padding: "8px 14px", fontSize: 13, color: "#9BA1B0", textDecoration: "none", transition: "border-color 0.15s" }}
              onMouseEnter={(e) => (e.currentTarget.style.borderColor = "rgba(16,185,129,0.5)")}
              onMouseLeave={(e) => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)")}>
              <span className="ps-status-dot" style={{ width: 7, height: 7, borderRadius: "50%", background: "#10B981", boxShadow: "0 0 8px rgba(16,185,129,0.8)", flexShrink: 0 }} />
              All systems operational
            </a>
            {["99.95% uptime", "GCC data residency"].map(t2 => (
              <span key={t2} style={{ display: "inline-flex", alignItems: "center", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, padding: "8px 14px", fontSize: 13, color: "#9BA1B0" }}>{t2}</span>
            ))}
          </div>
        </div>
      </div>
    </footer>
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
    name: "Growth", badge: null, featured: true,
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

function PricingSection({ market }: { market: Market }) {
  const [annual, setAnnual] = useState(false);
  return (
    <section style={{ position: "relative", zIndex: 2, maxWidth: 1440, margin: "0 auto", padding: "80px clamp(24px,5vw,72px) 100px" }}>
      <div style={{ paddingTop: 40, marginBottom: 18, display: "flex", alignItems: "flex-end", justifyContent: "space-between", flexWrap: "wrap", gap: 20 }}>
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
                    {market.currency} {Math.round(((annual ? tier.annual : tier.monthly) as number) * market.rate)}
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
    q: "What is PrizeSkout?",
    a: "PrizeSkout is real time pricing infrastructure for restaurants selling on GCC delivery aggregators. We monitor your prices, fees, and commissions across every channel including Talabat, Snoonu, Jahez, Noon Food, and Careem, and defend your margin automatically so every order stays profitable.",
  },
  {
    q: "Who is PrizeSkout for?",
    a: "Restaurant operators, cloud kitchens, and F&B groups running on one or more delivery aggregators in the GCC. Whether you run a single outlet in Doha or fifty across Qatar, Saudi Arabia, and the UAE, if aggregator commissions are eating your margin, PrizeSkout is built for you.",
  },
  {
    q: "What problem does it actually solve?",
    a: "Most restaurants price their aggregator menus once, then never touch them while commissions, delivery fees, promotions, and platform charges quietly erode margin on every order. PrizeSkout gives you a live view of your true per channel margin and adjusts channel prices within rules you set, so you stop discovering losses at the end of the month.",
  },
  {
    q: "How does it work?",
    a: "Four steps, running continuously. Sync connects to your aggregator channels and POS, pulling live menus, prices, fees, and commission structures. Decide calculates your true margin per item and per channel, factoring in commissions, packaging, and delivery costs. Defend recommends or applies price adjustments within guardrails you control whenever margin drops below your threshold. Govern logs every change so it is auditable and reversible. You stay in control and nothing moves without your rules approving it.",
  },
  {
    q: "Will PrizeSkout change my prices without asking me?",
    a: "Only if you tell it to. You choose the mode: Review mode, where every recommendation waits for your approval, or Autopilot, where changes execute automatically inside the min and max guardrails you define. Most operators start in Review mode and switch on Autopilot once they trust the engine.",
  },
  {
    q: "What is Margin by PrizeSkout?",
    a: "Margin is our channel margin recovery tool and the fastest way to see exactly what each aggregator is costing you, outlet by outlet, item by item. It is mobile first, takes minutes to set up, and is priced as one subscription so it scales with you.",
  },
  {
    q: "Which delivery aggregators do you support?",
    a: "Talabat, Snoonu, Jahez, Noon Food, and Careem, with more GCC platforms on the roadmap.",
  },
  {
    q: "Does it work with my POS?",
    a: "PrizeSkout integrates with leading GCC POS and restaurant management platforms, including Foodics, Salla, and Zid.",
  },
  {
    q: "I run a marketplace, aggregator, or POS platform. Can I offer this under my own brand?",
    a: "Yes. PrizeSkout is built to be white labelled. Platforms can embed our pricing and margin infrastructure under their own brand via API. Talk to us about partnership terms.",
  },
  {
    q: "Is my data safe?",
    a: "Yes. Your menu, pricing, and sales data are encrypted in transit and at rest, and are never shared with other restaurants or third parties. We operate under the Qatar Financial Centre (QFC No. 04412) and comply with Qatar's Personal Data Privacy Protection Law (Law No. 13 of 2016), Saudi Arabia's PDPL, and UAE Federal Decree-Law No. 45 of 2021.",
  },
  {
    q: "Can my competitors see my prices or margins?",
    a: "No. Your data is yours. PrizeSkout never exposes one customer's pricing, costs, or margin data to another.",
  },
  {
    q: "Where is PrizeSkout based?",
    a: "We are headquartered in Doha, Qatar, incorporated under the Qatar Financial Centre, and backed by Qatar Science and Technology Park (QSTP). We are GCC native, built for this market's aggregators, currencies, and regulations from day one.",
  },
  {
    q: "Do I need a developer to use it?",
    a: "No. Margin and the PrizeSkout dashboard are built for operators, not engineers. The API and SDK exist for platforms and teams who want deeper integration, but you will never need to touch them to defend your margin.",
  },
];

function FAQSection() {
  const [activeIdx, setActiveIdx] = useState(0);
  const active = FAQS[activeIdx];
  return (
    <section style={{ position: "relative", zIndex: 2, maxWidth: 1440, margin: "0 auto", padding: "80px clamp(24px,5vw,72px) 100px" }}>
      <style>{`
        @keyframes ps-faq-in { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }
        .ps-faq-answer { animation: ps-faq-in 0.28s cubic-bezier(.22,.68,0,1.2) both; }
        .ps-faq-q-btn { transition: color 0.15s, background 0.15s; }
        .ps-faq-q-btn:hover { background: var(--lp-surface-3) !important; }
        @media(max-width:768px) { .ps-faq-layout { flex-direction:column !important; } .ps-faq-list { border-right:none !important; border-bottom:1px solid var(--lp-border-2) !important; } }
      `}</style>
      <div style={{ marginBottom: 48 }}>
        <div style={{ fontFamily: MONO, fontSize: 11, letterSpacing: "0.1em", color: OG, marginBottom: 12 }}>FAQs</div>
        <h2 style={{ fontSize: "clamp(28px,3.2vw,40px)", lineHeight: 1.05, letterSpacing: "-0.03em", fontWeight: 600, margin: 0, color: "var(--lp-text)" }}>Everything you need to know</h2>
      </div>

      <div className="ps-faq-layout" style={{ display: "flex", border: "1px solid var(--lp-border-4)", borderRadius: 14, overflow: "hidden", background: "var(--lp-surface)", minHeight: 420 }}>
        {/* Left: question list */}
        <div className="ps-faq-list" style={{ width: "38%", flexShrink: 0, borderRight: "1px solid var(--lp-border-2)", overflowY: "auto" }}>
          {FAQS.map((faq, i) => (
            <button
              key={i}
              type="button"
              className="ps-faq-q-btn"
              onClick={() => setActiveIdx(i)}
              style={{
                display: "flex", alignItems: "flex-start", gap: 12, width: "100%",
                padding: "14px 20px", background: activeIdx === i ? "var(--lp-surface-3)" : "transparent",
                border: "none", borderBottom: "1px solid var(--lp-border-2)", cursor: "pointer",
                textAlign: "left", fontFamily: "inherit",
              }}
            >
              <span style={{ fontFamily: MONO, fontSize: 10, color: activeIdx === i ? OG : "var(--lp-faint)", flexShrink: 0, paddingTop: 2 }}>
                {String(i + 1).padStart(2, "0")}
              </span>
              <span style={{ fontSize: 13, fontWeight: activeIdx === i ? 600 : 400, color: activeIdx === i ? "var(--lp-text)" : "var(--lp-muted)", lineHeight: 1.45 }}>
                {faq.q}
              </span>
              {activeIdx === i && (
                <span style={{ marginLeft: "auto", flexShrink: 0, width: 3, alignSelf: "stretch", background: OG, borderRadius: 2 }} />
              )}
            </button>
          ))}
        </div>

        {/* Right: answer */}
        <div style={{ flex: 1, padding: "36px 40px", display: "flex", flexDirection: "column", justifyContent: "center" }}>
          <div key={activeIdx} className="ps-faq-answer">
            <div style={{ fontFamily: MONO, fontSize: 10.5, color: OG, letterSpacing: "0.08em", marginBottom: 14 }}>
              {String(activeIdx + 1).padStart(2, "0")} / {FAQS.length}
            </div>
            <h3 style={{ fontSize: "clamp(17px,1.6vw,22px)", fontWeight: 600, color: "var(--lp-text)", margin: "0 0 18px", lineHeight: 1.3 }}>
              {active.q}
            </h3>
            <p style={{ fontSize: 15, color: "var(--lp-muted)", lineHeight: 1.75, margin: 0, maxWidth: 560 }}>
              {active.a}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

// ── Page root ─────────────────────────────────────────────────────────────────
function LandingPage() {
  const [dark, setDark] = useState(true);
  const [market, setMarket] = useState<Market>(MARKETS[0]);

  function toggleDark() {
    setDark(v => !v);
  }

  return (
    <div
      data-lp-theme={dark ? "dark" : "light"}
      style={{ position: "relative", minHeight: "100vh", width: "100%", background: dark ? BG : "#FAF9F7", color: dark ? "var(--lp-text)" : "#1A1A18", fontFamily: BODY, WebkitFontSmoothing: "antialiased", transition: "background 0.2s, color 0.2s" }}
    >
      <style>{PAGE_CSS}</style>
      <Nav dark={dark} onToggleDark={toggleDark} market={market} onMarketChange={setMarket} />
      <HeroSection dark={dark} />
      <DemoPlayer currency={market.currency} dark={dark} />
      <SurfaceMatrix />
      <PricingSection market={market} />
      <FAQSection />
      <CredentialStrip />
      <DeployCTA dark={dark} />
      <LandingFooter />
    </div>
  );
}

const PAGE_CSS = `
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
  h1, h2, h3 { font-family: 'IBM Plex Sans', system-ui, -apple-system, sans-serif; }
  @keyframes ps-wave   { 0%{transform:translateX(0)} 100%{transform:translateX(-50%)} }
  @keyframes ps-pulse  { 0%,100%{opacity:0.3} 50%{opacity:1} }
  @keyframes ps-packet  { 0%{left:0%;opacity:0} 12%{opacity:0.7} 88%{opacity:0.7} 100%{left:100%;opacity:0} }
  @keyframes ps-packet-v{ 0%{top:0%;opacity:0}  12%{opacity:0.7} 88%{opacity:0.7} 100%{top:100%;opacity:0} }
  @keyframes ps-menu   { 0%{opacity:0;transform:translateY(-5px)} 100%{opacity:1;transform:translateY(0)} }
  @keyframes ps-drawer { from{opacity:0;transform:translateX(20px)} to{opacity:1;transform:translateX(0)} }
  /* nav link hover */
  .ps-nav-link { transition: color 0.15s; }
  .ps-nav-link:hover { color: var(--lp-text-2) !important; }
  /* layout helpers */
  .ps-nav-utils  { display:flex; align-items:center; gap:10px; }
  .ps-flow-scroll { overflow-x:auto; -webkit-overflow-scrolling:touch; }
  .ps-surface-grid { display:grid; grid-template-columns:1fr 1fr; }
.ps-lp-footer { display:grid; grid-template-columns:1.5fr 1fr 1fr 1fr 1fr; gap:48px; }
  .ps-status-dot { animation: ps-status-pulse 2.4s ease-in-out infinite; }
  @keyframes ps-status-pulse { 0%,100%{opacity:1} 50%{opacity:0.45} }
  @media(prefers-reduced-motion:reduce){.ps-status-dot{animation:none}}
  .ps-pricing-grid { grid-template-columns:1fr; }

  /* tablet ≤ 1024px */
  @media(max-width:1024px) {
    .ps-lp-footer { grid-template-columns:1fr 1fr; gap:32px; }
    .ps-lp-footer > div:first-child { grid-column:1/-1; }
  }
  /* desktop pricing */
  @media(min-width:900px) {
    .ps-pricing-grid { grid-template-columns:repeat(3,1fr); }
  }
  /* mobile ≤ 768px */
  @media(max-width:768px) {
    .ps-nav-link  { display:none !important; }
    .ps-nav-utils { display:none !important; }
    /* DATA FLOW — stack cards vertically */
    .ps-flow-row  { flex-direction:column !important; min-width:0 !important; gap:10px; }
    .ps-flow-card { flex:none !important; width:100% !important; }
    .ps-flow-connector { flex:none !important; width:100% !important; height:36px !important; }
    .ps-flow-connector > div { display:none !important; }
    .ps-flow-connector::before { content:''; position:absolute; top:0; bottom:0; left:50%; width:1px; background:linear-gradient(180deg,transparent,#3A2A22 25%,#3A2A22 75%,transparent); }
    .ps-flow-connector span { animation-name:ps-packet-v !important; left:calc(50% - 3px) !important; top:0 !important; margin-top:0 !important; }
    .ps-flow-header { flex-direction:column; align-items:flex-start !important; gap:6px; }
    .ps-flow-header-label { white-space:normal; font-size:9.5px !important; }
    .ps-surface-grid { grid-template-columns:1fr; }
    .ps-surface-grid > div { border-right:none !important; border-bottom:1px solid var(--lp-border-2) !important; }
    .ps-surface-grid > div:last-child { border-bottom:none !important; }
.ps-lp-footer { grid-template-columns:1fr 1fr; gap:20px; }
    .ps-lp-footer > div:first-child { grid-column:1/-1; }
  }
  /* small mobile ≤ 480px */
  @media(max-width:480px) {
    .ps-lp-footer { grid-template-columns:1fr; }
    .ps-credential-row { flex-direction:column; align-items:center; gap:14px; }
    .ps-credential-sep { display:none; }
  }
`;
