/**
 * PsShell — new dark-theme dashboard shell.
 * Wraps: Revenue Protection Hub, Margin Policy Engine, Integration Vault.
 * Preserves: existing auth, i18n (useTranslation + applyLocale), ModeProvider, PlanGateModal.
 */
import { useState, useEffect, createContext, useContext, type ReactNode } from "react";
import { Link, useNavigate, useRouter } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { ModeProvider } from "@/lib/mode-context";
import { SidebarCollapseProvider } from "./SidebarCollapseContext";
import { PlanGateModal } from "./PlanGateModal";
import { i18n as i18nInstance, getStoredLocale, applyLocale, type Locale } from "@/lib/i18n";
import logoDark from "@/assets/logo-dark.svg";
import logoLight from "@/assets/logo-light.svg";

// Ensure i18n module initialises.
void i18nInstance;

export type PsScreen = "revenue-hub" | "policy-engine" | "integration-vault";
export type PsRegion = "Qatar" | "KSA" | "UAE";

const CURRENCY: Record<PsRegion, string> = { Qatar: "QAR", KSA: "SAR", UAE: "AED" };

const PsRegionContext = createContext<{ region: PsRegion; currency: string }>({ region: "Qatar", currency: "QAR" });
export function usePsRegion() { return useContext(PsRegionContext); }

const PS_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600;700&display=swap');
[data-ps-theme="dark"] {
  --ps-page:#080809; --ps-surface-2:#0B0C0E; --ps-surface-3:#0e0f12; --ps-card:#101116;
  --ps-card-veil:rgba(18,19,26,0.4); --ps-veil-strong:rgba(18,19,26,0.6);
  --ps-chip:#16171c; --ps-chip-2:#2a2c31; --ps-inactive:#3a3d46;
  --ps-border:rgba(255,255,255,0.07); --ps-border-2:rgba(255,255,255,0.06); --ps-border-3:rgba(255,255,255,0.10);
  --ps-hover:rgba(255,255,255,0.03); --ps-track-off:rgba(255,255,255,0.08); --ps-pill:rgba(255,255,255,0.10);
  --ps-text:#ffffff; --ps-text-2:#E7E8EA; --ps-text-3:#cfd2d6;
  --ps-soft:#9aa0a8; --ps-muted:#6B7280; --ps-faint:#52555c; --ps-faint-2:#5b5e66;
  --ps-scroll:rgba(255,255,255,0.08); --ps-scroll-h:rgba(255,255,255,0.16);
  --ps-slider-track:rgba(255,255,255,0.10); --ps-header-bg:rgba(8,8,9,0.82);
  --ps-thumb-border:#1a1b1f;
}
[data-ps-theme="light"] {
  --ps-page:#F4F5F6; --ps-surface-2:#FFFFFF; --ps-surface-3:#F0F1F3; --ps-card:#FFFFFF;
  --ps-card-veil:rgba(255,255,255,0.5); --ps-veil-strong:rgba(255,255,255,0.7);
  --ps-chip:#F1F2F4; --ps-chip-2:#E5E7EB; --ps-inactive:#C7CAD0;
  --ps-border:#E5E7EB; --ps-border-2:#EBEDF0; --ps-border-3:#DDE0E4;
  --ps-hover:rgba(0,0,0,0.04); --ps-track-off:#E5E7EB; --ps-pill:#EDEEF1;
  --ps-text:#111827; --ps-text-2:#1F2937; --ps-text-3:#374151;
  --ps-soft:#6B7280; --ps-muted:#9CA3AF; --ps-faint:#9CA3AF; --ps-faint-2:#9CA3AF;
  --ps-scroll:rgba(0,0,0,0.14); --ps-scroll-h:rgba(0,0,0,0.24);
  --ps-slider-track:#E5E7EB; --ps-header-bg:rgba(244,245,246,0.85);
  --ps-thumb-border:#ffffff;
}
.ps-root { font-family:'Manrope',system-ui,sans-serif; font-size:14px; -webkit-font-smoothing:antialiased; }
.ps-root ::-webkit-scrollbar { width:8px; height:8px; }
.ps-root ::-webkit-scrollbar-track { background:transparent; }
.ps-root ::-webkit-scrollbar-thumb { background:var(--ps-scroll); border-radius:8px; }
.ps-root ::-webkit-scrollbar-thumb:hover { background:var(--ps-scroll-h); }
.ps-root input[type=range] { -webkit-appearance:none; appearance:none; accent-color:#EF681A; background:transparent; width:100%; }
.ps-root input[type=range]::-webkit-slider-runnable-track { height:4px; border-radius:999px; background:var(--ps-slider-track); }
.ps-root input[type=range]::-webkit-slider-thumb { -webkit-appearance:none; appearance:none; width:18px; height:18px; margin-top:-7px; border-radius:999px; background:#EF681A; border:2px solid var(--ps-thumb-border); box-shadow:0 2px 6px rgba(0,0,0,0.25); cursor:pointer; transition:box-shadow .15s ease; }
.ps-root input[type=range]::-webkit-slider-thumb:hover { box-shadow:0 2px 8px rgba(0,0,0,0.35); }
@keyframes psPulse { 0%,100%{opacity:1} 50%{opacity:.35} }
@keyframes psSpin { to{transform:rotate(360deg)} }
@keyframes psIn { from{opacity:0;transform:translateY(-4px)} to{opacity:1;transform:translateY(0)} }
@keyframes psFlash { 0%{color:#ffb27a} 100%{color:#EF681A} }
@keyframes psBar { from{opacity:.4} to{opacity:1} }
`;

const NAV_ITEMS: { screen: PsScreen; titleKey: string; descKey: string }[] = [
  { screen: "revenue-hub", titleKey: "psShell.nav.revenueHubTitle", descKey: "psShell.nav.revenueHubDesc" },
  { screen: "policy-engine", titleKey: "psShell.nav.policyEngineTitle", descKey: "psShell.nav.policyEngineDesc" },
  { screen: "integration-vault", titleKey: "psShell.nav.integrationVaultTitle", descKey: "psShell.nav.integrationVaultDesc" },
];

const SETTINGS_PATH = "/dashboard/settings";

const SCREEN_TO_PATH: Record<PsScreen, string> = {
  "revenue-hub": "/dashboard/revenue-hub",
  "policy-engine": "/dashboard/policy-engine",
  "integration-vault": "/dashboard/integration-vault",
};

function getInitials(name: string | null | undefined, email: string | null | undefined) {
  const src = (name || email || "").trim();
  if (!src) return "U";
  const parts = src.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return src.slice(0, 2).toUpperCase();
}

function PsSidebar({ screen, theme, onToggleTheme, region, onRegionChange }: {
  screen: PsScreen;
  theme: "dark" | "light";
  onToggleTheme: () => void;
  region: PsRegion;
  onRegionChange: (r: PsRegion) => void;
}) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const router = useRouter();
  const navigate = useNavigate();
  const displayName = (user?.user_metadata?.display_name as string | undefined) || user?.email?.split("@")[0] || "Demo User";
  const company = (user?.user_metadata?.company as string | undefined) || "";

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    await router.invalidate();
    navigate({ to: "/login" });
  };

  return (
    <aside style={{
      width: 264, flexShrink: 0, background: "var(--ps-surface-2)",
      borderRight: "1px solid var(--ps-border)", display: "flex", flexDirection: "column",
      padding: "22px 16px", position: "sticky", top: 0, height: "100vh", overflowY: "auto",
    }}>
      {/* Logo */}
      <div style={{ padding: "4px 6px 22px 6px" }}>
        <a href="/" style={{ display: "inline-block", lineHeight: 0 }}>
          <img
            src={theme === "light" ? logoLight : logoDark}
            alt="PrizeSkout"
            style={{ height: 28, width: "auto", display: "block" }}
          />
        </a>
      </div>

      {/* Nav label */}
      <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: "1.2px", color: "var(--ps-faint)", padding: "6px 8px 8px 8px" }}>
        {t("psShell.controlPlane").toUpperCase()}
      </div>

      {/* Nav items */}
      <nav style={{ display: "flex", flexDirection: "column", gap: 5 }}>
        {NAV_ITEMS.map((item) => {
          const active = screen === item.screen;
          return (
            <Link
              key={item.screen}
              to={SCREEN_TO_PATH[item.screen]}
              style={{
                display: "flex", alignItems: "center", gap: 12, width: "100%",
                padding: "11px 12px", borderRadius: 10, cursor: "pointer", textDecoration: "none",
                transition: "background .15s ease, color .15s ease",
                background: active ? "rgba(239,104,26,0.10)" : "transparent",
                border: `1px solid ${active ? "rgba(239,104,26,0.28)" : "transparent"}`,
                color: active ? "var(--ps-text)" : "var(--ps-soft)",
              }}
            >
              <span style={{
                flexShrink: 0, width: 7, height: 7, borderRadius: 2,
                transform: "rotate(45deg)", transition: "all .15s ease",
                background: active ? "#EF681A" : "var(--ps-inactive)",
              }} />
              <span style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", lineHeight: 1.25 }}>
                <span style={{ fontSize: 13.5, fontWeight: 600 }}>{t(item.titleKey)}</span>
                <span style={{ fontSize: 11, fontWeight: 500, marginTop: 1, color: active ? "#c98f64" : "var(--ps-faint-2)" }}>{t(item.descKey)}</span>
              </span>
            </Link>
          );
        })}
      </nav>

      {/* Settings link */}
      <div style={{ marginTop: "auto", marginBottom: 4 }}>
        <Link
          to={SETTINGS_PATH}
          style={{
            display: "flex", alignItems: "center", gap: 10, width: "100%",
            padding: "10px 12px", borderRadius: 10, cursor: "pointer", textDecoration: "none",
            color: "var(--ps-soft)", transition: "background .15s ease, color .15s ease",
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = "var(--ps-text)"; (e.currentTarget as HTMLAnchorElement).style.background = "var(--ps-hover)"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = "var(--ps-soft)"; (e.currentTarget as HTMLAnchorElement).style.background = "transparent"; }}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
          </svg>
          <span style={{ fontSize: 13, fontWeight: 500 }}>Settings</span>
        </Link>

        {/* Back to landing page */}
        <a
          href="/"
          style={{
            display: "flex", alignItems: "center", gap: 10, width: "100%",
            padding: "10px 12px", borderRadius: 10, cursor: "pointer", textDecoration: "none",
            color: "var(--ps-faint)", transition: "background .15s ease, color .15s ease",
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = "var(--ps-soft)"; (e.currentTarget as HTMLAnchorElement).style.background = "var(--ps-hover)"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = "var(--ps-faint)"; (e.currentTarget as HTMLAnchorElement).style.background = "transparent"; }}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
          <span style={{ fontSize: 13, fontWeight: 500 }}>Back to site</span>
        </a>
      </div>

      <div style={{ margin: "0 4px 8px", height: 1, background: "var(--ps-border)" }} />

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {/* DEMO: Defend Loop status — static, not live infrastructure data */}
        <div style={{
          border: "1px solid rgba(16,185,129,0.18)", background: "rgba(16,185,129,0.06)",
          borderRadius: 11, padding: "13px 14px", display: "flex", alignItems: "center", gap: 10,
        }}>
          <span style={{ width: 8, height: 8, borderRadius: 999, background: "#10B981", animation: "psPulse 2.4s infinite", flexShrink: 0 }} />
          <div style={{ lineHeight: 1.3 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: "#10B981" }}>{t("psShell.defendLoopOnline")}</div>
            <div style={{ fontSize: 10.5, color: "var(--ps-muted)", fontFamily: "'JetBrains Mono',monospace" }}>{t("psShell.edgeNodesHealthy")}</div>
          </div>
        </div>

        {/* User */}
        <div style={{ display: "flex", alignItems: "center", gap: 11, padding: "8px 6px" }}>
          <div style={{
            width: 34, height: 34, borderRadius: 999, flexShrink: 0,
            background: "var(--ps-chip-2)",
            border: "1px solid var(--ps-border)", display: "flex", alignItems: "center",
            justifyContent: "center", fontSize: 12, fontWeight: 700,
            color: "var(--ps-text-3)", fontFamily: "'JetBrains Mono',monospace",
          }}>
            {getInitials(displayName, user?.email)}
          </div>
          <div style={{ lineHeight: 1.3, flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12.5, fontWeight: 600, color: "var(--ps-text-2)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {displayName}
            </div>
            <div style={{ fontSize: 10.5, color: "var(--ps-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {company || user?.email || ""}
            </div>
          </div>
          {user && (
            <button
              type="button"
              onClick={handleSignOut}
              title="Sign out"
              style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--ps-faint)", padding: 4, borderRadius: 6, flexShrink: 0 }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
            </button>
          )}
        </div>
      </div>
    </aside>
  );
}

function PsHeader({ title, subtitle, theme, onToggleTheme, region, onRegionChange, lang, onLangChange }: {
  title: string; subtitle: string;
  theme: "dark" | "light"; onToggleTheme: () => void;
  region: PsRegion; onRegionChange: (r: PsRegion) => void;
  lang: string; onLangChange: (l: string) => void;
}) {
  const { t } = useTranslation();
  const dark = theme === "dark";
  const segBtn = (active: boolean): React.CSSProperties => ({
    padding: "8px 13px", fontSize: 12, fontWeight: 600, cursor: "pointer",
    border: "none", fontFamily: "inherit", transition: "all .15s ease",
    background: active ? "var(--ps-pill)" : "transparent",
    color: active ? "var(--ps-text)" : "var(--ps-soft)",
  });
  const regions: PsRegion[] = ["Qatar", "KSA", "UAE"];

  return (
    <header style={{
      padding: "20px 32px", display: "flex", alignItems: "center",
      justifyContent: "space-between", gap: 14, flexWrap: "wrap",
      position: "sticky", top: 0, zIndex: 5,
      background: "var(--ps-header-bg)", backdropFilter: "blur(14px)",
      borderBottom: "1px solid var(--ps-border-2)",
    }}>
      <div style={{ minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
          <h1 style={{ margin: 0, fontSize: 19, fontWeight: 700, letterSpacing: "-0.4px", color: "var(--ps-text)" }}>{title}</h1>
          <span style={{
            fontSize: 10, fontWeight: 600, color: "#10B981", fontFamily: "'JetBrains Mono',monospace",
            border: "1px solid rgba(16,185,129,0.28)", background: "rgba(16,185,129,0.10)",
            padding: "2px 7px", borderRadius: 6,
          }}>{t("psShell.liveBadge")}</span>
        </div>
        <div style={{ fontSize: 12.5, color: "var(--ps-muted)", marginTop: 3 }}>{subtitle}</div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        {/* Theme toggle */}
        <div
          onClick={onToggleTheme}
          style={{
            position: "relative", width: 60, height: 30, borderRadius: 999, cursor: "pointer",
            background: "var(--ps-pill)", border: "1px solid var(--ps-border-3)",
            display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 8px", flexShrink: 0,
          }}
          role="button" tabIndex={0} aria-label={t("psShell.toggleTheme")}
          onKeyDown={(e) => e.key === "Enter" && onToggleTheme()}
        >
          <span style={{ fontSize: 12, lineHeight: 1, color: dark ? "var(--ps-text)" : "var(--ps-faint)" }}>☾</span>
          <span style={{ fontSize: 12, lineHeight: 1, color: dark ? "var(--ps-faint)" : "#EF681A" }}>☀</span>
          <div style={{
            position: "absolute", top: 3, width: 22, height: 22, borderRadius: 999,
            background: "var(--ps-card)", boxShadow: "0 2px 5px rgba(0,0,0,0.3)",
            transition: "left .22s cubic-bezier(.4,0,.2,1)",
            left: dark ? 3 : 33,
          }} />
        </div>
        {/* Region */}
        <div style={{ display: "flex", alignItems: "center", border: "1px solid var(--ps-border-3)", borderRadius: 9, overflow: "hidden" }}>
          {regions.map((r) => (
            <button key={r} onClick={() => onRegionChange(r)} style={{
              ...segBtn(region === r),
              ...(region === r ? { background: "#EF681A", color: "#fff" } : {}),
              fontFamily: "'JetBrains Mono',monospace",
            }}>
              {CURRENCY[r]}
            </button>
          ))}
        </div>
        {/* Language */}
        <div style={{ display: "flex", alignItems: "center", border: "1px solid var(--ps-border-3)", borderRadius: 9, overflow: "hidden" }}>
          <button onClick={() => onLangChange("en")} style={segBtn(lang === "en")}>EN</button>
          <button onClick={() => onLangChange("ar")} style={segBtn(lang === "ar")}>عربية</button>
        </div>
      </div>
    </header>
  );
}

interface PsShellProps {
  screen: PsScreen;
  title: string;
  subtitle: string;
  children: ReactNode;
}

function PsShellInner({ screen, title, subtitle, children }: PsShellProps) {
  const { i18n: i18nHook } = useTranslation();
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [region, setRegion] = useState<PsRegion>("Qatar");
  const [isMobile, setIsMobile] = useState(false);

  // Restore stored locale on mount
  useEffect(() => {
    const lng = getStoredLocale();
    i18nInstance.changeLanguage(lng);
    applyLocale(lng as Locale);
  }, []);

  // Restore stored theme
  useEffect(() => {
    const stored = localStorage.getItem("ps-new-theme");
    if (stored === "light" || stored === "dark") setTheme(stored);
  }, []);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const toggleTheme = () => {
    setTheme((t) => {
      const next = t === "dark" ? "light" : "dark";
      localStorage.setItem("ps-new-theme", next);
      return next;
    });
  };

  const handleLangChange = (lng: string) => {
    i18nInstance.changeLanguage(lng);
    applyLocale(lng as Locale);
  };

  return (
    <div
      data-ps-theme={theme}
      className="ps-root"
      style={{
        display: "flex", minHeight: "100vh", width: "100%",
        background: "var(--ps-page)", color: "var(--ps-text-2)",
        transition: "background .25s ease, color .25s ease",
      }}
    >
      <style dangerouslySetInnerHTML={{ __html: PS_CSS }} />
      {!isMobile && (
        <PsSidebar
          screen={screen} theme={theme} onToggleTheme={toggleTheme}
          region={region} onRegionChange={setRegion}
        />
      )}
      <main style={{
        flex: 1, minWidth: 0, display: "flex", flexDirection: "column",
        background: "var(--ps-page)",
      }}>
        <PsHeader
          title={title} subtitle={subtitle} theme={theme} onToggleTheme={toggleTheme}
          region={region} onRegionChange={setRegion}
          lang={i18nHook.language?.slice(0, 2) || "en"} onLangChange={handleLangChange}
        />
        <PsRegionContext.Provider value={{ region, currency: CURRENCY[region] }}>
          <div style={{ flex: 1, padding: isMobile ? "16px 16px 96px" : "28px 32px 40px" }}>
            {children}
          </div>
        </PsRegionContext.Provider>
      </main>
      <PlanGateModal />
    </div>
  );
}

export function PsShell(props: PsShellProps) {
  return (
    <ModeProvider>
      <SidebarCollapseProvider>
        <PsShellInner {...props} />
      </SidebarCollapseProvider>
    </ModeProvider>
  );
}
