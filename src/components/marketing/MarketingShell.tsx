import { type ReactNode, useState } from "react";
import { Link, useLocation } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { LandingNav } from "@/components/landing/LandingNav";
import { ContactSupportModal } from "@/components/ContactSupportModal";
import logoDark from "@/assets/logo-dark.svg";

function smoothScrollToHash(hash: string) {
  if (!hash) { window.scrollTo({ top: 0, behavior: "smooth" }); return; }
  const el = document.querySelector(`#${hash}`);
  if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
}

const FL: React.CSSProperties = {
  fontSize: 14.5,
  fontWeight: 400,
  color: "#9BA1B0",
  textDecoration: "none",
  transition: "color 0.15s",
  display: "block",
};

const LAYER_TAG: React.CSSProperties = {
  display: "block",
  fontFamily: "ui-monospace, 'SFMono-Regular', Menlo, Monaco, monospace",
  fontSize: 10,
  letterSpacing: "0.14em",
  color: "#6B7180",
  marginBottom: 16,
};

function FA({ label, children }: { label: string; children?: React.ReactNode }) {
  return (
    <a
      href="#"
      onClick={(e) => e.preventDefault()}
      style={FL}
      onMouseEnter={(e) => (e.currentTarget.style.color = "#F5F6FA")}
      onMouseLeave={(e) => (e.currentTarget.style.color = "#9BA1B0")}
    >
      {label}{children}
    </a>
  );
}

type FooterTo =
  | "/contact"
  | "/legal"
  | "/roi-calculator"
  | "/products/pricing"
  | "/products/competitors"
  | "/products/promotions"
  | "/products/market"
  | "/products/field-intel";

function FL_Link({ label, to }: { label: string; to: FooterTo }) {
  return (
    <Link
      to={to}
      style={FL}
      onMouseEnter={(e) => (e.currentTarget.style.color = "#F5F6FA")}
      onMouseLeave={(e) => (e.currentTarget.style.color = "#9BA1B0")}
    >
      {label}
    </Link>
  );
}

function FooterHashLink({ label, hash }: { label: string; hash: string }) {
  const location = useLocation();
  const onLanding = location.pathname === "/";
  return (
    <a
      href={`/#${hash}`}
      onClick={(e) => {
        if (!onLanding) return;
        e.preventDefault();
        smoothScrollToHash(hash);
      }}
      style={FL}
      onMouseEnter={(e) => (e.currentTarget.style.color = "#F5F6FA")}
      onMouseLeave={(e) => (e.currentTarget.style.color = "#9BA1B0")}
    >
      {label}
    </a>
  );
}

const COL_HEAD: React.CSSProperties = {
  fontWeight: 600,
  fontSize: 15,
  color: "#F5F6FA",
  margin: "0 0 6px",
  display: "flex",
  alignItems: "center",
  gap: 7,
};

function Footer() {
  const { t } = useTranslation();
  const [supportOpen, setSupportOpen] = useState(false);

  return (
    <footer style={{ background: "#000", color: "#F5F6FA", padding: "72px 24px 32px" }}>
      <div style={{ maxWidth: 1180, margin: "0 auto" }}>
        <div className="ps-footer-grid">

          {/* Brand */}
          <div>
            <a href="/" style={{ textDecoration: "none" }}>
              <img src={logoDark} alt="PrizeSkout" style={{ height: 28, width: "auto", display: "block" }} />
            </a>
            <p style={{ marginTop: 18, fontSize: 14.5, lineHeight: 1.7, color: "#9BA1B0", maxWidth: 320 }}>
              {t("footer.tagline")}
            </p>
            <div style={{ marginTop: 24, display: "flex", gap: 10 }}>
              {(["X", "in"] as const).map((lbl) => (
                <a
                  key={lbl}
                  href="#"
                  onClick={(e) => e.preventDefault()}
                  aria-label={lbl === "X" ? t("footer.social.x") : t("footer.social.linkedin")}
                  className="ps-social-btn"
                  style={{
                    width: 38, height: 38, borderRadius: 9,
                    border: "1px solid rgba(255,255,255,0.08)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    color: "#9BA1B0", textDecoration: "none",
                    fontSize: 14, fontWeight: 700, transition: "border-color 0.15s, color 0.15s",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.3)"; e.currentTarget.style.color = "#F5F6FA"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"; e.currentTarget.style.color = "#9BA1B0"; }}
                >
                  {lbl}
                </a>
              ))}
            </div>
          </div>

          {/* Platform */}
          <div>
            <h4 style={COL_HEAD}>{t("footer.columns.platform")}</h4>
            <span style={LAYER_TAG}>{t("footer.layerTags.infrastructure")}</span>
            <div style={{ display: "flex", flexDirection: "column", gap: 13 }}>
              <FA label={t("footer.links.sync")} />
              <FA label={t("footer.links.decide")} />
              <FA label={t("footer.links.defend")} />
              <FA label={t("footer.links.govern")} />
              <FA label={t("footer.links.marginByPrizeskout")} />
            </div>
          </div>

          {/* Agents */}
          <div>
            <h4 style={COL_HEAD}>
              {t("footer.columns.agents")}
              <span aria-hidden="true" style={{
                width: 6, height: 6, borderRadius: "50%",
                background: "#FF5A1F",
                boxShadow: "0 0 8px rgba(255,90,31,0.7)",
                display: "inline-block", flexShrink: 0,
              }} />
            </h4>
            <span style={LAYER_TAG}>{t("footer.layerTags.intelligence")}</span>
            <div style={{ display: "flex", flexDirection: "column", gap: 13 }}>
              <FA label={t("footer.links.agentCfo")} />
              <FA label={t("footer.links.disputeAuditAgent")}>
                <span style={{
                  fontFamily: "ui-monospace, 'SFMono-Regular', Menlo, Monaco, monospace",
                  fontSize: 9.5, letterSpacing: "0.1em",
                  color: "#FF5A1F",
                  border: "1px solid rgba(255,90,31,0.35)",
                  borderRadius: 4, padding: "2px 6px", marginLeft: 8,
                  verticalAlign: "middle",
                }}>{t("footer.links.new")}</span>
              </FA>
            </div>
          </div>

          {/* Developers */}
          <div>
            <h4 style={COL_HEAD}>{t("footer.columns.developers")}</h4>
            <span style={{ ...LAYER_TAG, visibility: "hidden" }}>_</span>
            <div style={{ display: "flex", flexDirection: "column", gap: 13 }}>
              <FL_Link label={t("footer.links.support")} to="/contact" />
              <FA label={t("footer.links.status")} />
              <FL_Link label={t("footer.links.marginCalculator")} to="/roi-calculator" />
            </div>
          </div>

          {/* Company */}
          <div>
            <h4 style={COL_HEAD}>{t("footer.columns.company")}</h4>
            <span style={{ ...LAYER_TAG, visibility: "hidden" }}>_</span>
            <div style={{ display: "flex", flexDirection: "column", gap: 13 }}>
              <FA label={t("footer.links.about")} />
              <FA label={t("footer.links.enterprise")} />
              <FL_Link label={t("footer.links.contactSales")} to="/contact" />
              <a
                href="#"
                onClick={(e) => { e.preventDefault(); setSupportOpen(true); }}
                style={FL}
                onMouseEnter={(e) => (e.currentTarget.style.color = "#F5F6FA")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "#9BA1B0")}
              >
                {t("footer.links.support")}
              </a>
              <FL_Link label={t("footer.links.privacyTerms")} to="/legal" />
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div style={{
          marginTop: 64, paddingTop: 28,
          borderTop: "1px solid rgba(255,255,255,0.08)",
          display: "flex", alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap", gap: 20,
        }}>
          <div style={{ color: "#6B7180", fontSize: 13.5 }}>
            {t("footer.bottomBar.copyright")}
            <span style={{ fontFamily: "ui-monospace, 'SFMono-Regular', Menlo, Monaco, monospace", fontSize: 11.5, color: "#6B7180" }}>
              {" "}· {t("footer.bottomBar.qfcNumber")}
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <a
              href="#"
              onClick={(e) => e.preventDefault()}
              className="ps-bottom-pill ps-status-pill"
              style={{
                display: "inline-flex", alignItems: "center", gap: 8,
                border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8,
                padding: "8px 14px", fontSize: 13, color: "#9BA1B0",
                textDecoration: "none", transition: "border-color 0.15s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.borderColor = "rgba(16,185,129,0.5)")}
              onMouseLeave={(e) => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)")}
            >
              <span className="ps-status-dot" style={{
                width: 7, height: 7, borderRadius: "50%",
                background: "#10B981",
                boxShadow: "0 0 8px rgba(16,185,129,0.8)",
                flexShrink: 0,
              }} />
              {t("footer.bottomBar.allSystemsOperational")}
            </a>
            {[t("footer.bottomBar.uptime"), t("footer.bottomBar.dataResidency")].map((pill) => (
              <span key={pill} style={{
                display: "inline-flex", alignItems: "center",
                border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8,
                padding: "8px 14px", fontSize: 13, color: "#9BA1B0",
              }}>{pill}</span>
            ))}
          </div>
        </div>
      </div>
      <ContactSupportModal open={supportOpen} onClose={() => setSupportOpen(false)} />
    </footer>
  );
}

const SHELL_STYLES = `
  body, button, input, select, textarea { font-family: 'Chillax', system-ui, -apple-system, sans-serif; }
  h1, h2, h3, h4 { font-family: 'Chillax', system-ui, -apple-system, sans-serif; }
  @keyframes ps-fade-in { from { opacity: 0 } to { opacity: 1 } }
  @keyframes ps-dropdown-in {
    from { opacity: 0; transform: translateY(-4px) scale(0.98); }
    to { opacity: 1; transform: translateY(0) scale(1); }
  }
  @keyframes ps-mockup-in {
    from { opacity: 0; transform: translateY(20px); }
    to { opacity: 1; transform: translateY(0); }
  }
  @keyframes ps-status-pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.45; }
  }
  html { scroll-behavior: smooth; }
  .ps-section-title { font-size: 26px; font-weight: 700; line-height: 1.2; margin: 0; }
  .ps-status-dot { animation: ps-status-pulse 2.4s ease-in-out infinite; }
  @media (prefers-reduced-motion: reduce) { .ps-status-dot { animation: none; } }
  .ps-footer-grid { display: flex; flex-direction: column; gap: 40px; }
  @media (min-width: 640px) {
    .ps-footer-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; }
  }
  @media (min-width: 768px) {
    .ps-section-title { font-size: 36px; }
    .ps-footer-grid { grid-template-columns: 1.5fr 1fr 1fr 1fr 1fr; gap: 48px; }
  }
  @media (max-width: 980px) {
    .ps-footer-grid { grid-template-columns: 1fr 1fr; }
    .ps-footer-grid > div:first-child { grid-column: 1 / -1; }
  }
  @media (max-width: 560px) {
    .ps-footer-grid { grid-template-columns: 1fr; }
    main section { scroll-margin-top: 72px; }
    main h1 { overflow-wrap: anywhere; }
    main input, main select, main textarea { font-size: 16px !important; }
  }
`;

export function MarketingShell({ children }: { children: ReactNode }) {
  return (
    <div style={{ background: "#050505", minHeight: "100vh", overflowX: "hidden" }}>
      <style>{SHELL_STYLES}</style>
      <LandingNav />
      <main id="main-content" tabIndex={-1} style={{ outline: "none" }}>{children}</main>
      <Footer />
    </div>
  );
}
