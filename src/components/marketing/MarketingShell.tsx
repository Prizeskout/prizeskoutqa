import { useEffect, useState, type ReactNode } from "react";
import { Link, useRouter, useLocation } from "@tanstack/react-router";
import { Menu, X } from "lucide-react";
import logoDark from "@/assets/logo-dark.svg";

type SimpleNavItem = {
  label: string;
  to?: "/docs" | "/changelog";
  hash?: string;
};

const NAV_ITEMS: SimpleNavItem[] = [
  { label: "Docs", to: "/docs" },
  { label: "Pricing", hash: "pricing" },
  { label: "Changelog", to: "/changelog" },
];

function NavLink({
  item,
  onHashItem,
}: {
  item: SimpleNavItem;
  onHashItem: (hash: string) => void;
}) {
  const baseStyle: React.CSSProperties = {
    padding: "8px 14px",
    fontSize: 14,
    fontWeight: 500,
    color: "#A8A8A8",
    textDecoration: "none",
    transition: "color 0.15s",
    fontFamily: "inherit",
    background: "transparent",
    border: "none",
    cursor: "pointer",
  };
  if (item.to) {
    return (
      <Link
        to={item.to}
        style={baseStyle}
        onMouseEnter={(e) => (e.currentTarget.style.color = "#FAFAF9")}
        onMouseLeave={(e) => (e.currentTarget.style.color = "#A8A8A8")}
      >
        {item.label}
      </Link>
    );
  }
  return (
    <a
      href={`/#${item.hash ?? ""}`}
      onClick={(e) => {
        e.preventDefault();
        if (item.hash) onHashItem(item.hash);
      }}
      style={baseStyle}
      onMouseEnter={(e) => (e.currentTarget.style.color = "#FAFAF9")}
      onMouseLeave={(e) => (e.currentTarget.style.color = "#A8A8A8")}
    >
      {item.label}
    </a>
  );
}

function smoothScrollToHash(hash: string) {
  if (!hash) {
    window.scrollTo({ top: 0, behavior: "smooth" });
    return;
  }
  const el = document.querySelector(`#${hash}`);
  if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
}


function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const router = useRouter();
  const location = useLocation();
  const onLanding = location.pathname === "/";

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 80);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  const handleNavClick = async (e: React.MouseEvent, hash: string) => {
    e.preventDefault();
    setMobileOpen(false);
    if (onLanding) {
      setTimeout(() => smoothScrollToHash(hash), mobileOpen ? 100 : 0);
    } else {
      await router.navigate({ to: "/", hash });
      setTimeout(() => smoothScrollToHash(hash), 100);
    }
  };

  const handleLogoClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    setMobileOpen(false);
    if (onLanding) {
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      await router.navigate({ to: "/" });
    }
  };

  return (
    <>
      <header
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          height: 64,
          zIndex: 50,
          background: scrolled ? "rgba(5,5,5,0.85)" : "#050505",
          borderBottom: "1px solid #1A1A1A",
          backdropFilter: scrolled ? "blur(12px)" : "none",
          WebkitBackdropFilter: scrolled ? "blur(12px)" : "none",
          transition: "background 0.2s ease",
        }}
      >
        <div
          style={{
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
          className="px-5 md:px-10"
        >
          <a
            href="/"
            onClick={handleLogoClick}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              textDecoration: "none",
            }}
          >
            <img
              src={logoDark}
              alt="PrizeSkout"
              style={{ height: 28, width: "auto", display: "block" }}
            />
          </a>

          <nav className="hidden md:flex" style={{ gap: 4, alignItems: "center" }}>
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.label}
                item={item}
                onHashItem={(hash) =>
                  handleNavClick({ preventDefault: () => {} } as React.MouseEvent, hash)
                }
              />
            ))}
          </nav>

          <div className="hidden md:flex" style={{ alignItems: "center", gap: 18 }}>
            <Link
              to="/login"
              style={{
                fontSize: 14,
                fontWeight: 500,
                color: "#8A8A8A",
                textDecoration: "none",
                transition: "color 0.15s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "#FAFAF9")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "#8A8A8A")}
            >
              Sign in
            </Link>
            <div className="ps-tip-wrap" style={{ position: "relative" }}>
              <Link
                to="/signup"
                aria-label="Get API keys — create a free account, no credit card"
                title="Free account · no credit card · test keys instantly"
                style={{
                  background: "#EA580C",
                  color: "#FFFFFF",
                  fontSize: 14,
                  fontWeight: 600,
                  padding: "9px 20px",
                  borderRadius: 8,
                  textDecoration: "none",
                  transition: "background 0.15s",
                  display: "inline-block",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "#C2410C")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "#EA580C")}
              >
                Get keys
              </Link>
              <span className="ps-tip" role="tooltip">
                Free account · no card · test keys instantly
                <span className="ps-tip-arrow" aria-hidden />
              </span>
            </div>
          </div>

          <button
            className="md:hidden"
            onClick={() => setMobileOpen(true)}
            aria-label="Open menu"
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: 4,
              color: "#FAFAF9",
            }}
          >
            <Menu size={22} />
          </button>
        </div>
      </header>

      {mobileOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 100,
            background: "#050505",
            padding: 24,
            animation: "ps-fade-in 0.2s ease",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <a
              href="/"
              onClick={handleLogoClick}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                textDecoration: "none",
              }}
            >
              <img src={logoDark} alt="PrizeSkout" style={{ height: 28, width: "auto", display: "block" }} />
            </a>
            <button
              onClick={() => setMobileOpen(false)}
              aria-label="Close menu"
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                color: "#FAFAF9",
                padding: 4,
              }}
            >
              <X size={22} />
            </button>
          </div>

          <nav style={{ marginTop: 32, display: "flex", flexDirection: "column", gap: 4 }}>
            {NAV_ITEMS.map((item) => {
              if (item.to) {
                return (
                  <Link
                    key={item.label}
                    to={item.to}
                    onClick={() => setMobileOpen(false)}
                    style={{
                      fontSize: 16,
                      fontWeight: 500,
                      color: "#FAFAF9",
                      textDecoration: "none",
                      padding: "16px 4px",
                      borderBottom: "1px solid #141414",
                    }}
                  >
                    {item.label}
                  </Link>
                );
              }
              return (
                <a
                  key={item.label}
                  href={`/#${item.hash ?? ""}`}
                  onClick={(e) => {
                    e.preventDefault();
                    setMobileOpen(false);
                    if (item.hash) {
                      const hash = item.hash;
                      setTimeout(() => {
                        if (onLanding) {
                          smoothScrollToHash(hash);
                        } else {
                          router.navigate({ to: "/", hash }).then(() => {
                            setTimeout(() => smoothScrollToHash(hash), 100);
                          });
                        }
                      }, 50);
                    }
                  }}
                  style={{
                    fontSize: 16,
                    fontWeight: 500,
                    color: "#FAFAF9",
                    textDecoration: "none",
                    padding: "16px 4px",
                    borderBottom: "1px solid #141414",
                  }}
                >
                  {item.label}
                </a>
              );
            })}
            <div style={{ height: 1, background: "#1A1A1A", margin: "16px 0" }} />
            <Link
              to="/login"
              onClick={() => setMobileOpen(false)}
              style={{ fontSize: 16, fontWeight: 500, color: "#FAFAF9", textDecoration: "none", padding: "12px 4px" }}
            >
              Sign in
            </Link>
            <Link
              to="/signup"
              onClick={() => setMobileOpen(false)}
              style={{
                background: "#EA580C",
                color: "#FFFFFF",
                fontSize: 15,
                fontWeight: 600,
                padding: "13px 22px",
                borderRadius: 8,
                textDecoration: "none",
                textAlign: "center",
                marginTop: 8,
              }}
            >
              Get API keys
            </Link>
          </nav>
        </div>
      )}
    </>
  );
}

const FOOTER_LINK_STYLE: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 400,
  color: "#6B6B6B",
  textDecoration: "none",
  transition: "color 0.15s",
};

function FooterAnchor({ label }: { label: string }) {
  return (
    <a
      href="#"
      onClick={(e) => e.preventDefault()}
      style={FOOTER_LINK_STYLE}
      onMouseEnter={(e) => (e.currentTarget.style.color = "#FAFAF9")}
      onMouseLeave={(e) => (e.currentTarget.style.color = "#6B6B6B")}
    >
      {label}
    </a>
  );
}

type FooterTo =
  | "/contact"
  | "/privacy"
  | "/terms"
  | "/changelog"
  | "/roi-calculator"
  | "/docs"
  | "/api-reference"
  | "/products/pricing"
  | "/products/competitors"
  | "/products/promotions"
  | "/products/market"
  | "/products/field-intel";

function FooterRouteLink({ label, to }: { label: string; to: FooterTo }) {
  return (
    <Link
      to={to}
      style={FOOTER_LINK_STYLE}
      onMouseEnter={(e) => (e.currentTarget.style.color = "#FAFAF9")}
      onMouseLeave={(e) => (e.currentTarget.style.color = "#6B6B6B")}
    >
      {label}
    </Link>
  );
}

function FooterHashLink({ label, hash }: { label: string; hash: string }) {
  const router = useRouter();
  const location = useLocation();
  const onLanding = location.pathname === "/";
  return (
    <a
      href={`/#${hash}`}
      onClick={async (e) => {
        e.preventDefault();
        if (onLanding) {
          smoothScrollToHash(hash);
        } else {
          await router.navigate({ to: "/", hash });
          setTimeout(() => smoothScrollToHash(hash), 100);
        }
      }}
      style={FOOTER_LINK_STYLE}
      onMouseEnter={(e) => (e.currentTarget.style.color = "#FAFAF9")}
      onMouseLeave={(e) => (e.currentTarget.style.color = "#6B6B6B")}
    >
      {label}
    </a>
  );
}

function Footer() {
  const router = useRouter();
  const handleLogoClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    await router.navigate({ to: "/" });
    setTimeout(() => window.scrollTo({ top: 0, behavior: "smooth" }), 50);
  };

  return (
    <footer
      style={{
        background: "#050505",
        borderTop: "1px solid #1A1A1A",
        padding: "60px 40px 30px",
      }}
    >
      <div style={{ maxWidth: 1000, margin: "0 auto" }}>
        <div className="ps-footer-grid">
          <div>
            <a
              href="/"
              onClick={handleLogoClick}
              style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}
            >
              <img src={logoDark} alt="PrizeSkout" style={{ height: 28, width: "auto", display: "block" }} />
            </a>
            <p
              style={{
                marginTop: 12,
                fontSize: 13,
                color: "#6B6B6B",
                lineHeight: 1.6,
                maxWidth: 280,
              }}
            >
              Pricing intelligence APIs for retail teams. A clean REST surface
              for competitor data, recommendations, ROI, and field intel.
            </p>
            <div style={{ marginTop: 20, display: "flex", gap: 12 }}>
              {[
                { label: "X", node: <span style={{ fontSize: 13, fontWeight: 600, color: "#8A8A8A" }}>X</span> },
                { label: "LinkedIn", node: <span style={{ fontSize: 13, fontWeight: 600, color: "#8A8A8A" }}>in</span> },
              ].map((s) => (
                <a
                  key={s.label}
                  href="#"
                  onClick={(e) => e.preventDefault()}
                  aria-label={s.label}
                  style={{
                    width: 32,
                    height: 32,
                    background: "#0A0A0A",
                    border: "1px solid #1A1A1A",
                    borderRadius: 6,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    transition: "border-color 0.15s",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.borderColor = "#EA580C")}
                  onMouseLeave={(e) => (e.currentTarget.style.borderColor = "#1A1A1A")}
                >
                  {s.node}
                </a>
              ))}
            </div>
          </div>

          <div>
            <h4 style={{ fontSize: 13, fontWeight: 600, color: "#FAFAF9", margin: "0 0 16px" }}>
              Products
            </h4>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <FooterRouteLink label="Pricing Recommendations" to="/products/pricing" />
              <FooterRouteLink label="Competitor Intelligence" to="/products/competitors" />
              <FooterRouteLink label="Promotions & ROI" to="/products/promotions" />
              <FooterRouteLink label="Market Signals" to="/products/market" />
              <FooterRouteLink label="Field Intel" to="/products/field-intel" />
            </div>
          </div>

          <div>
            <h4 style={{ fontSize: 13, fontWeight: 600, color: "#FAFAF9", margin: "0 0 16px" }}>
              Developers
            </h4>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <FooterRouteLink label="Documentation" to="/docs" />
              <FooterRouteLink label="API Reference" to="/api-reference" />
              <FooterRouteLink label="Changelog" to="/changelog" />
              <FooterHashLink label="Pricing" hash="pricing" />
              <FooterRouteLink label="ROI calculator" to="/roi-calculator" />
            </div>
          </div>

          <div>
            <h4 style={{ fontSize: 13, fontWeight: 600, color: "#FAFAF9", margin: "0 0 16px" }}>
              Legal
            </h4>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <FooterRouteLink label="Privacy policy" to="/privacy" />
              <FooterRouteLink label="Terms of service" to="/terms" />
              <FooterAnchor label="Cookie policy" />
            </div>
          </div>
        </div>

        <div
          style={{
            marginTop: 40,
            paddingTop: 20,
            borderTop: "1px solid #1A1A1A",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 12,
          }}
        >
          <span style={{ fontSize: 12, color: "#6B6B6B" }}>
            © {new Date().getFullYear()} PrizeSkout. All rights reserved.
          </span>
          <span
            style={{
              fontSize: 12,
              color: "#6B6B6B",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            Qatar
          </span>
        </div>
      </div>
    </footer>
  );
}

const SHELL_STYLES = `
  @keyframes ps-fade-in { from { opacity: 0 } to { opacity: 1 } }
  @keyframes ps-dropdown-in {
    from { opacity: 0; transform: translateY(-4px) scale(0.98); }
    to { opacity: 1; transform: translateY(0) scale(1); }
  }
  @keyframes ps-mockup-in {
    from { opacity: 0; transform: translateY(20px); }
    to { opacity: 1; transform: translateY(0); }
  }
  @keyframes ps-flash {
    0% { color: #EA580C; }
    100% { color: inherit; }
  }
  @keyframes ps-pulse {
    0% { box-shadow: 0 0 0 0 rgba(34,197,94,0.55); }
    70% { box-shadow: 0 0 0 8px rgba(34,197,94,0); }
    100% { box-shadow: 0 0 0 0 rgba(34,197,94,0); }
  }
  @keyframes ps-spark-draw { to { stroke-dashoffset: 0; } }
  @keyframes ps-slide-up {
    from { opacity: 0; transform: translateY(8px); }
    to { opacity: 1; transform: translateY(0); }
  }
  html { scroll-behavior: smooth; }
  .ps-tip-wrap .ps-tip {
    position: absolute;
    top: calc(100% + 10px);
    right: 0;
    white-space: nowrap;
    background: #0A0A0A;
    color: #FAFAF9;
    border: 1px solid #1F1F1F;
    border-radius: 8px;
    padding: 8px 12px;
    font-size: 12px;
    font-weight: 500;
    box-shadow: 0 12px 28px rgba(0,0,0,0.45);
    opacity: 0;
    transform: translateY(-4px);
    pointer-events: none;
    transition: opacity 0.15s ease, transform 0.15s ease;
    z-index: 60;
  }
  .ps-tip-wrap:hover .ps-tip,
  .ps-tip-wrap:focus-within .ps-tip {
    opacity: 1;
    transform: translateY(0);
  }
  .ps-tip-arrow {
    position: absolute;
    top: -5px;
    right: 22px;
    width: 8px;
    height: 8px;
    background: #0A0A0A;
    border-left: 1px solid #1F1F1F;
    border-top: 1px solid #1F1F1F;
    transform: rotate(45deg);
  }
  .ps-hero-title { font-size: 32px; }
  .ps-hero-sub { font-size: 15px; }
  .ps-section-title { font-size: 26px; font-weight: 700; line-height: 1.2; margin: 0; }
  .ps-feature-grid { grid-template-columns: 1fr; }
  .ps-steps { display: flex; flex-direction: column; gap: 32px; }
  .ps-step-line { display: none; }
  .ps-pricing-grid { grid-template-columns: 1fr; }
  .ps-footer-grid { display: flex; flex-direction: column; gap: 32px; }
  .ps-faq-q:hover span { color: #EA580C !important; }
  .ps-feature-card:hover { border-color: rgba(234, 88, 12, 0.3) !important; transform: translateY(-2px); }
  .ps-mock-metrics { grid-template-columns: repeat(2, 1fr); }
  .ps-mock-bottom { grid-template-columns: 1fr; }
  @media (min-width: 560px) {
    .ps-mock-metrics { grid-template-columns: repeat(4, 1fr); }
    .ps-mock-bottom { grid-template-columns: 1.4fr 1fr; }
  }
  @media (min-width: 640px) {
    .ps-feature-grid { grid-template-columns: repeat(2, 1fr); }
    .ps-footer-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 32px; }
  }
  @media (min-width: 768px) {
    .ps-hero-title { font-size: 48px; }
    .ps-hero-sub { font-size: 17px; }
    .ps-section-title { font-size: 36px; }
    .ps-pricing-grid { grid-template-columns: repeat(3, 1fr); }
    .ps-steps {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 32px;
      position: relative;
    }
    .ps-step-line {
      display: block;
      position: absolute;
      top: 20px;
      left: calc(50% + 24px);
      right: calc(-50% + 24px);
      height: 0;
      border-top: 1px dashed #E5E2DB;
      z-index: 0;
    }
    .ps-footer-grid { grid-template-columns: 1.5fr 1fr 1fr 1fr; gap: 40px; }
  }
  @media (min-width: 900px) {
    .ps-feature-grid { grid-template-columns: repeat(3, 1fr); }
  }
`;

export function MarketingShell({ children }: { children: ReactNode }) {
  return (
    <div style={{ background: "#050505", minHeight: "100vh", overflowX: "hidden" }}>
      <style>{SHELL_STYLES}</style>
      <Header />
      <main id="main-content" tabIndex={-1} style={{ paddingTop: 64, outline: "none" }}>{children}</main>
      <Footer />
    </div>
  );
}
