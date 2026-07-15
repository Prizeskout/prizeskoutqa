import { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { LifeBuoy } from "lucide-react";
import { applyLocale, type Locale } from "@/lib/i18n";
import { ContactSupportModal } from "@/components/ContactSupportModal";
import logoDark from "@/assets/logo-dark.svg";
import logoLight from "@/assets/logo-light.svg";

const OG = "#EF681A";
const MONO = "ui-monospace,'SFMono-Regular',Menlo,Monaco,monospace";

const MARKETS = [
  { code: "QA", currency: "QAR", country: "Qatar",                rate: 1.000 },
  { code: "SA", currency: "SAR", country: "Saudi Arabia",         rate: 1.030 },
  { code: "AE", currency: "AED", country: "United Arab Emirates", rate: 1.002 },
  { code: "OM", currency: "OMR", country: "Oman",                 rate: 0.106 },
  { code: "KW", currency: "KWD", country: "Kuwait",               rate: 0.085 },
  { code: "BH", currency: "BHD", country: "Bahrain",              rate: 0.104 },
] as const;
type Market = typeof MARKETS[number];

const LANG_DISPLAY: Record<string, { short: string; full: string }> = {
  en: { short: "EN", full: "English" },
  ar: { short: "AR", full: "Arabic" },
  fr: { short: "FR", full: "Français" },
};

const NAV_CSS = `
  @keyframes ps-menu { from { opacity:0; transform:translateY(-4px) } to { opacity:1; transform:translateY(0) } }
  @keyframes ps-drawer { from { opacity:0; transform:translateX(20px) } to { opacity:1; transform:translateX(0) } }
  .lp-nav-link { font-size:13.5px; color:#A8A29E; cursor:pointer; }
  .lp-nav-link:hover { color:#FAFAF9; }
`;

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

export function LandingNav() {
  const { t } = useTranslation();
  const [dark, setDark] = useState(true);
  const [market, setMarket] = useState<Market>(MARKETS[0]);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [supportOpen, setSupportOpen] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(max-width:860px)");
    setIsMobile(mq.matches);
    const h = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener("change", h);
    return () => mq.removeEventListener("change", h);
  }, []);

  useEffect(() => {
    if (mobileOpen) { document.body.style.overflow = "hidden"; }
    else { document.body.style.overflow = ""; }
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
      <style>{NAV_CSS}</style>
      <nav style={{
        position: "relative", zIndex: 5,
        maxWidth: 1440, margin: "0 auto",
        padding: "22px clamp(24px,5vw,72px)",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        borderBottom: "1px solid #211C1A",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
          <a href="/" style={{ display: "inline-block", lineHeight: 0 }}>
            <img src={dark ? logoDark : logoLight} alt="PrizeSkout" style={{ height: 28, width: "auto", display: "block" }} />
          </a>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          <div style={{ display: isMobile ? "none" : "flex", alignItems: "center", gap: 24 }}>
            {navItems.map(item => (
              <a key={item} href="/" className="lp-nav-link" style={{ fontSize: 13.5, color: "#A8A29E", textDecoration: "none" }}>{item}</a>
            ))}
          </div>
          <div style={{ display: isMobile ? "none" : "flex", alignItems: "center", gap: 10 }}>
            <NavMarketSwitcher market={market} onChange={setMarket} />
            <NavLangSwitcher />
            <ThemeToggle dark={dark} onToggle={() => setDark(v => !v)} />
          </div>
          <button
            type="button"
            onClick={() => setSupportOpen(true)}
            style={{
              display: isMobile ? "none" : "flex", alignItems: "center", gap: 6,
              fontFamily: "inherit", fontSize: 13, color: "#A8A29E", border: "none",
              background: "transparent", cursor: "pointer", padding: "7px 4px",
            }}
          >
            <LifeBuoy size={15} strokeWidth={1.75} />
            {t("landing.infra.nav.support")}
          </button>
          <a
            href="/onboarding"
            style={{ display: isMobile ? "none" : "inline-block", fontFamily: MONO, fontSize: 12, color: "#A8A29E", border: "1px solid #211C1A", background: "transparent", borderRadius: 6, padding: "7px 13px", textDecoration: "none" }}
          >Dashboard</a>
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

      {/* Mobile drawer */}
      {mobileOpen && (
        <>
          <div onClick={() => setMobileOpen(false)}
            style={{ position:"fixed", inset:0, zIndex:190, background:"rgba(0,0,0,0.65)", backdropFilter:"blur(4px)" }} />
          <div style={{ position:"fixed", top:0, right:0, bottom:0, width:"min(320px,90vw)",
            zIndex:200, background:"#0C0908", borderLeft:"1px solid #2A2422",
            display:"flex", flexDirection:"column", overflowY:"auto",
            animation:"ps-drawer .22s ease" }}>
            {/* Header */}
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between",
              padding:"20px 24px", borderBottom:"1px solid #211C1A" }}>
              <img src={logoDark} alt="PrizeSkout" style={{ height:24, width:"auto", display:"block" }} />
              <button onClick={() => setMobileOpen(false)} aria-label="Close menu"
                style={{ cursor:"pointer", width:36, height:36, borderRadius:8, border:"1px solid #2A2422",
                  background:"transparent", color:"#A8A29E", fontSize:18, display:"grid", placeItems:"center", lineHeight:1 }}>
                ✕
              </button>
            </div>
            {/* Nav items */}
            <div style={{ flex:1 }}>
              {navItems.map(item => (
                <a key={item} href="/" onClick={() => setMobileOpen(false)}
                  style={{ display:"block", padding:"17px 24px", fontSize:16, color:"#FAFAF9",
                    textDecoration:"none", borderBottom:"1px solid #15110F", transition:"background 0.1s" }}
                  onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.background = "#15110F"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.background = "transparent"; }}
                >{item}</a>
              ))}
              <button
                type="button"
                onClick={() => { setMobileOpen(false); setSupportOpen(true); }}
                style={{ display:"flex", alignItems:"center", gap:10, width:"100%", padding:"17px 24px",
                  fontSize:16, color:"#FAFAF9", background:"transparent", border:"none",
                  borderBottom:"1px solid #15110F", textAlign:"start", cursor:"pointer", fontFamily:"inherit" }}
              >
                <LifeBuoy size={17} strokeWidth={1.75} />
                {t("landing.infra.nav.support")}
              </button>
            </div>
            {/* Utils */}
            <div style={{ padding:"16px 24px", display:"flex", gap:10, flexWrap:"wrap", borderTop:"1px solid #211C1A" }}>
              <NavMarketSwitcher market={market} onChange={setMarket} />
              <NavLangSwitcher />
              <ThemeToggle dark={dark} onToggle={() => setDark(v => !v)} />
            </div>
            {/* CTAs */}
            <div style={{ padding:"16px 24px 32px", display:"flex", flexDirection:"column", gap:10 }}>
              <a href="/onboarding"
                style={{ display:"block", padding:"14px 20px", textAlign:"center", fontFamily:MONO, fontSize:13,
                  color:"#A8A29E", border:"1px solid #211C1A", borderRadius:8, textDecoration:"none" }}>
                Dashboard
              </a>
              <a href="/onboarding"
                style={{ display:"block", padding:"14px 20px", textAlign:"center", fontFamily:MONO, fontSize:13,
                  color:OG, border:"1px solid #3A2418", background:"rgba(239,104,26,0.06)", borderRadius:8, textDecoration:"none" }}>
                Connect a Store →
              </a>
            </div>
          </div>
        </>
      )}
      <ContactSupportModal open={supportOpen} onClose={() => setSupportOpen(false)} />
    </>
  );
}
