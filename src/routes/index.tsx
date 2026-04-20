import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Menu,
  X,
  Zap,
  Crosshair,
  TrendingUp,
  BarChart3,
  Megaphone,
  MapPin,
  Target,
  Check,
  ChevronDown,
  Camera,
  Play,
  Globe,
} from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "PrizeSkout Commerce Intelligence — AI Pricing for Retail" },
      {
        name: "description",
        content:
          "AI-powered pricing intelligence for e-commerce platforms, physical retailers, and omnichannel brands. Monitor competitors and optimize prices across every channel.",
      },
      {
        property: "og:title",
        content: "PrizeSkout Commerce Intelligence — AI Pricing for Retail",
      },
      {
        property: "og:description",
        content:
          "Monitor competitors, optimize prices, and outsmart the market across every channel.",
      },
    ],
  }),
  component: LandingPage,
});

const NAV_LINKS = [
  { label: "Features", href: "#features" },
  { label: "How it works", href: "#how-it-works" },
  { label: "Pricing", href: "#pricing" },
  { label: "FAQ", href: "#faq" },
];

function smoothScrollTo(href: string) {
  if (href === "#top") {
    window.scrollTo({ top: 0, behavior: "smooth" });
    return;
  }
  const el = document.querySelector(href);
  if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
}

function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

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

  const handleNavClick = (e: React.MouseEvent, href: string) => {
    e.preventDefault();
    setMobileOpen(false);
    setTimeout(() => smoothScrollTo(href), mobileOpen ? 100 : 0);
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
          <button
            onClick={() => smoothScrollTo("#top")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: 0,
            }}
          >
            <span
              style={{
                width: 24,
                height: 24,
                background: "#EA580C",
                borderRadius: 6,
                display: "inline-block",
              }}
            />
            <span style={{ fontSize: 17, fontWeight: 700, color: "#FAFAF9" }}>
              PrizeSkout
            </span>
          </button>

          <nav className="hidden md:flex" style={{ gap: 32 }}>
            {NAV_LINKS.map((l) => (
              <a
                key={l.href}
                href={l.href}
                onClick={(e) => handleNavClick(e, l.href)}
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
                {l.label}
              </a>
            ))}
          </nav>

          <div className="hidden md:flex" style={{ alignItems: "center", gap: 20 }}>
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
            <Link
              to="/signup"
              style={{
                background: "#EA580C",
                color: "#FFFFFF",
                fontSize: 14,
                fontWeight: 600,
                padding: "9px 22px",
                borderRadius: 8,
                textDecoration: "none",
                transition: "background 0.15s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "#C2410C")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "#EA580C")}
            >
              Get started
            </Link>
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
            <button
              onClick={() => smoothScrollTo("#top")}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: 0,
              }}
            >
              <span style={{ width: 24, height: 24, background: "#EA580C", borderRadius: 6 }} />
              <span style={{ fontSize: 17, fontWeight: 700, color: "#FAFAF9" }}>PrizeSkout</span>
            </button>
            <button
              onClick={() => setMobileOpen(false)}
              aria-label="Close menu"
              style={{ background: "none", border: "none", cursor: "pointer", color: "#FAFAF9", padding: 4 }}
            >
              <X size={22} />
            </button>
          </div>

          <nav style={{ marginTop: 48, display: "flex", flexDirection: "column", gap: 24 }}>
            {NAV_LINKS.map((l) => (
              <a
                key={l.href}
                href={l.href}
                onClick={(e) => handleNavClick(e, l.href)}
                style={{ fontSize: 18, fontWeight: 500, color: "#FAFAF9", textDecoration: "none" }}
              >
                {l.label}
              </a>
            ))}
            <Link
              to="/login"
              onClick={() => setMobileOpen(false)}
              style={{ fontSize: 18, fontWeight: 500, color: "#FAFAF9", textDecoration: "none" }}
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
              Get started
            </Link>
          </nav>
        </div>
      )}
    </>
  );
}

function HeroMockup() {
  return (
    <div
      style={{
        maxWidth: 900,
        margin: "48px auto 0",
        background: "#0A0A0A",
        border: "1px solid #1A1A1A",
        borderRadius: 12,
        overflow: "hidden",
        boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
        animation: "ps-mockup-in 0.6s ease-out 0.3s both",
      }}
    >
      <div
        style={{
          height: 36,
          background: "#0A0A0A",
          borderBottom: "1px solid #1A1A1A",
          display: "flex",
          alignItems: "center",
          padding: "0 14px",
          position: "relative",
        }}
      >
        <div style={{ display: "flex", gap: 6 }}>
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#EF4444" }} />
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#F59E0B" }} />
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#22C55E" }} />
        </div>
        <span
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            textAlign: "center",
            fontSize: 11,
            color: "#6B6B6B",
            pointerEvents: "none",
          }}
        >
          PrizeSkout Commerce Intelligence
        </span>
      </div>

      <div style={{ display: "flex", minHeight: 220 }}>
        <div style={{ width: 40, background: "#050505" }} />
        <div style={{ flex: 1, background: "#111111" }}>
          <div style={{ display: "flex", gap: 8, padding: 12 }}>
            {[
              { color: "#EA580C" },
              { color: "#22C55E" },
              { color: "#3B82F6" },
              { color: "#F59E0B" },
            ].map((c, i) => (
              <div
                key={i}
                style={{
                  flex: 1,
                  background: "#1A1A1A",
                  borderRadius: 6,
                  height: 48,
                  padding: 6,
                }}
              >
                <div style={{ height: 3, background: c.color, borderRadius: 2 }} />
              </div>
            ))}
          </div>
          <div style={{ background: "#1A1A1A", borderRadius: 6, height: 120, margin: "8px 12px 12px" }} />
        </div>
      </div>
    </div>
  );
}

function Hero() {
  return (
    <section
      id="hero"
      style={{
        background: "#050505",
        textAlign: "center",
        paddingTop: 120,
        paddingBottom: 100,
      }}
      className="px-5 md:px-10"
    >
      <div style={{ paddingTop: 0 }} className="ps-hero-wrap">
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            background: "rgba(234, 88, 12, 0.12)",
            border: "1px solid rgba(234, 88, 12, 0.25)",
            borderRadius: 20,
            padding: "5px 16px",
            fontSize: 12,
            fontWeight: 500,
            color: "#EA580C",
          }}
        >
          <Zap size={12} />
          Now available in Qatar
        </span>

        <h1
          className="ps-hero-title"
          style={{
            marginTop: 24,
            fontWeight: 700,
            color: "#FAFAF9",
            lineHeight: 1.15,
            maxWidth: 700,
            marginLeft: "auto",
            marginRight: "auto",
          }}
        >
          The pricing brain behind <span style={{ color: "#EA580C" }}>commerce</span>.
        </h1>

        <p
          className="ps-hero-sub"
          style={{
            marginTop: 18,
            fontWeight: 400,
            color: "#8A8A8A",
            lineHeight: 1.65,
            maxWidth: 600,
            marginLeft: "auto",
            marginRight: "auto",
          }}
        >
          AI-powered pricing intelligence for e-commerce platforms, physical retailers, and
          omnichannel brands. Monitor competitors, optimize prices, and outsmart the market across
          every channel.
        </p>

        <div
          style={{
            marginTop: 32,
            display: "flex",
            gap: 14,
            justifyContent: "center",
            flexWrap: "wrap",
          }}
        >
          <Link
            to="/signup"
            style={{
              background: "#EA580C",
              color: "#FFFFFF",
              fontSize: 15,
              fontWeight: 600,
              padding: "13px 32px",
              borderRadius: 8,
              textDecoration: "none",
              transition: "background 0.15s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "#C2410C")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "#EA580C")}
          >
            Start free trial
          </Link>
          <button
            onClick={() => smoothScrollTo("#features")}
            style={{
              background: "transparent",
              border: "1px solid #3A3A3A",
              color: "#FAFAF9",
              fontSize: 15,
              fontWeight: 500,
              padding: "13px 32px",
              borderRadius: 8,
              cursor: "pointer",
              transition: "border-color 0.15s, color 0.15s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "#EA580C";
              e.currentTarget.style.color = "#EA580C";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "#3A3A3A";
              e.currentTarget.style.color = "#FAFAF9";
            }}
          >
            See it in action
          </button>
        </div>

        <p style={{ marginTop: 20, fontSize: 13, color: "#6B6B6B" }}>
          No credit card required. 14-day free trial.
        </p>

        <HeroMockup />
      </div>
    </section>
  );
}

function LogosBar() {
  const logos = ["Snoonu", "Talabat", "Carrefour Qatar", "Lulu Hypermarket", "Amazon.ae", "Noon"];
  return (
    <section
      style={{
        background: "#050505",
        borderTop: "1px solid #1A1A1A",
        padding: 40,
      }}
    >
      <p
        style={{
          fontSize: 12,
          fontWeight: 500,
          color: "#6B6B6B",
          textAlign: "center",
          textTransform: "uppercase",
          letterSpacing: "0.05em",
          margin: 0,
        }}
      >
        Trusted by commerce brands across the Middle East
      </p>
      <div
        style={{
          marginTop: 24,
          display: "flex",
          justifyContent: "center",
          flexWrap: "wrap",
          gap: 40,
        }}
      >
        {logos.map((name) => (
          <span
            key={name}
            style={{
              fontSize: 15,
              fontWeight: 600,
              color: "#3A3A3A",
              transition: "color 0.15s",
              cursor: "default",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "#6B6B6B")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "#3A3A3A")}
          >
            {name}
          </span>
        ))}
      </div>
    </section>
  );
}

const FEATURES = [
  {
    Icon: Crosshair,
    title: "Competitive price tracking",
    desc: "Monitor prices, stock levels, and promotions across every competitor in real time. Online and in-store. Know exactly where you stand.",
  },
  {
    Icon: TrendingUp,
    title: "AI pricing optimizer",
    desc: "Get specific pricing recommendations built on your sales data, margin targets, and competitor behavior. The model gets smarter every month.",
  },
  {
    Icon: BarChart3,
    title: "Market intelligence",
    desc: "See category trends, assortment gaps, and market share estimates. Find the products you should be selling but are not.",
  },
  {
    Icon: Megaphone,
    title: "Promotion management",
    desc: "Plan campaigns with ROI predictions. Track competitor promotions. Catch cannibalization before it eats your margins.",
  },
  {
    Icon: MapPin,
    title: "Field intelligence",
    desc: "Capture in-store competitor pricing through your field teams. See price gaps between online and physical channels that scrapers cannot detect.",
  },
  {
    Icon: Target,
    title: "Market benchmarks",
    desc: "See where you rank against the anonymized market. Your data stays private. The benchmarks get more accurate as the network grows.",
  },
];

function Features() {
  return (
    <section
      id="features"
      style={{ background: "#FAFAF9" }}
      className="px-5 md:px-10 py-[60px] md:py-[100px]"
    >
      <p
        style={{
          fontSize: 11,
          fontWeight: 600,
          color: "#EA580C",
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          textAlign: "center",
          margin: 0,
        }}
      >
        FEATURES
      </p>
      <h2 className="ps-section-title" style={{ color: "#1A1A18", textAlign: "center", marginTop: 10 }}>
        Everything you need to price smarter
      </h2>
      <p
        style={{
          fontSize: 15,
          color: "#6B6B6B",
          textAlign: "center",
          maxWidth: 600,
          margin: "14px auto 0",
          lineHeight: 1.6,
        }}
      >
        One platform for competitive intelligence, AI pricing, promotion management, and market
        insights across online and physical retail.
      </p>

      <div
        className="ps-feature-grid"
        style={{
          marginTop: 48,
          display: "grid",
          gap: 20,
          maxWidth: 1000,
          marginLeft: "auto",
          marginRight: "auto",
        }}
      >
        {FEATURES.map(({ Icon, title, desc }) => (
          <div
            key={title}
            className="ps-feature-card"
            style={{
              background: "#FFFFFF",
              border: "1px solid #E5E2DB",
              borderRadius: 10,
              padding: 28,
              transition: "border-color 0.2s, transform 0.2s",
            }}
          >
            <div
              style={{
                width: 44,
                height: 44,
                background: "rgba(234, 88, 12, 0.08)",
                borderRadius: 10,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Icon size={22} color="#EA580C" />
            </div>
            <h3 style={{ fontSize: 15, fontWeight: 600, color: "#1A1A18", marginTop: 16, margin: "16px 0 0" }}>
              {title}
            </h3>
            <p style={{ fontSize: 13, color: "#6B6B6B", lineHeight: 1.6, marginTop: 8 }}>{desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

const STEPS = [
  {
    n: "1",
    title: "Connect your catalog",
    desc: "Import your product catalog via API, CSV upload, or direct platform integration. We match your products against competitors automatically.",
  },
  {
    n: "2",
    title: "We start monitoring",
    desc: "Our engine begins tracking competitor prices, stock levels, and promotions across online platforms and physical stores in your market.",
  },
  {
    n: "3",
    title: "Get intelligence daily",
    desc: "Receive pricing recommendations, competitive alerts, and market insights from day one. The AI model improves every week with your data.",
  },
];

function HowItWorks() {
  return (
    <section
      id="how-it-works"
      style={{ background: "#FAFAF9", borderTop: "1px solid #E5E2DB" }}
      className="px-5 md:px-10 py-[60px] md:py-[80px]"
    >
      <p
        style={{
          fontSize: 11,
          fontWeight: 600,
          color: "#EA580C",
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          textAlign: "center",
          margin: 0,
        }}
      >
        HOW IT WORKS
      </p>
      <h2 className="ps-section-title" style={{ color: "#1A1A18", textAlign: "center", marginTop: 10 }}>
        From setup to savings in under a week
      </h2>

      <div
        className="ps-steps"
        style={{
          maxWidth: 900,
          margin: "48px auto 0",
        }}
      >
        {STEPS.map((s, i) => (
          <div key={s.n} className="ps-step" style={{ position: "relative", textAlign: "center" }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: "50%",
                background: "#EA580C",
                color: "#FFFFFF",
                fontSize: 16,
                fontWeight: 700,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto",
                position: "relative",
                zIndex: 1,
              }}
            >
              {s.n}
            </div>
            <h3 style={{ fontSize: 16, fontWeight: 600, color: "#1A1A18", margin: "14px 0 0" }}>
              {s.title}
            </h3>
            <p
              style={{
                fontSize: 13,
                color: "#6B6B6B",
                lineHeight: 1.6,
                marginTop: 6,
                maxWidth: 260,
                marginLeft: "auto",
                marginRight: "auto",
              }}
            >
              {s.desc}
            </p>
            {i < STEPS.length - 1 && <span className="ps-step-line" aria-hidden />}
          </div>
        ))}
      </div>
    </section>
  );
}

const PLANS = [
  {
    name: "Scout",
    price: "$299",
    per: "/month",
    sub: "per location",
    features: [
      "Up to 500 products tracked",
      "5 competitor monitors",
      "Price alerts and notifications",
      "Basic competitive dashboard",
      "Email support",
    ],
    cta: "Start free trial",
    to: "/signup" as const,
    featured: false,
  },
  {
    name: "Pro",
    price: "$799",
    per: "/month",
    sub: "per location",
    features: [
      "Up to 5,000 products tracked",
      "Unlimited competitor monitors",
      "AI pricing recommendations",
      "Promotion management and ROI simulator",
      "Field intelligence (in-store tracking)",
      "Market benchmarks",
      "API access",
      "Priority support",
    ],
    cta: "Start free trial",
    to: "/signup" as const,
    featured: true,
  },
  {
    name: "Enterprise",
    price: "Custom",
    per: "",
    sub: "tailored to your scale",
    features: [
      "Unlimited products",
      "Unlimited competitors",
      "Custom AI model training",
      "White-label option",
      "Dedicated account manager",
      "ERP and POS integration",
      "Custom reporting",
      "SLA guarantee",
    ],
    cta: "Contact sales",
    to: "/signup" as const,
    featured: false,
  },
];

function Pricing() {
  return (
    <section
      id="pricing"
      style={{ background: "#050505" }}
      className="px-5 md:px-10 py-[60px] md:py-[100px]"
    >
      <p
        style={{
          fontSize: 11,
          fontWeight: 600,
          color: "#EA580C",
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          textAlign: "center",
          margin: 0,
        }}
      >
        PRICING
      </p>
      <h2 className="ps-section-title" style={{ color: "#FAFAF9", textAlign: "center", marginTop: 10 }}>
        Plans that grow with your business
      </h2>
      <p style={{ fontSize: 15, color: "#8A8A8A", textAlign: "center", marginTop: 10 }}>
        Start free. Scale as you grow. No long-term contracts.
      </p>

      <div
        className="ps-pricing-grid"
        style={{
          maxWidth: 960,
          margin: "48px auto 0",
          display: "grid",
          gap: 20,
        }}
      >
        {PLANS.map((p) => (
          <div
            key={p.name}
            style={{
              position: "relative",
              background: "#0A0A0A",
              border: p.featured ? "1px solid rgba(234, 88, 12, 0.4)" : "1px solid #1A1A1A",
              borderRadius: 12,
              padding: "32px 28px",
              display: "flex",
              flexDirection: "column",
            }}
          >
            {p.featured && (
              <span
                style={{
                  position: "absolute",
                  top: -12,
                  left: "50%",
                  transform: "translateX(-50%)",
                  background: "#EA580C",
                  color: "#FFFFFF",
                  fontSize: 10,
                  fontWeight: 600,
                  padding: "4px 12px",
                  borderRadius: 12,
                  letterSpacing: "0.02em",
                }}
              >
                Most popular
              </span>
            )}

            <div style={{ fontSize: 18, fontWeight: 600, color: "#FAFAF9" }}>{p.name}</div>
            <div style={{ marginTop: 12, display: "flex", alignItems: "baseline", gap: 4 }}>
              <span style={{ fontSize: 40, fontWeight: 700, color: "#FAFAF9", lineHeight: 1 }}>
                {p.price}
              </span>
              {p.per && (
                <span style={{ fontSize: 14, fontWeight: 400, color: "#6B6B6B" }}>{p.per}</span>
              )}
            </div>
            <div style={{ fontSize: 12, color: "#6B6B6B", marginTop: 4 }}>{p.sub}</div>

            <div style={{ borderTop: "1px solid #1A1A1A", margin: "20px 0" }} />

            <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 10 }}>
              {p.features.map((f) => (
                <li key={f} style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                  <Check size={14} color="#22C55E" style={{ marginTop: 3, flexShrink: 0 }} />
                  <span style={{ fontSize: 13, color: "#8A8A8A", lineHeight: 1.5 }}>{f}</span>
                </li>
              ))}
            </ul>

            <Link
              to={p.to}
              style={{
                marginTop: "auto",
                paddingTop: 24,
                textDecoration: "none",
              }}
            >
              <span
                style={{
                  display: "block",
                  textAlign: "center",
                  background: p.featured ? "#EA580C" : "transparent",
                  border: p.featured ? "1px solid #EA580C" : "1px solid #3A3A3A",
                  color: "#FFFFFF",
                  fontSize: 14,
                  fontWeight: p.featured ? 600 : 500,
                  padding: "12px",
                  borderRadius: 8,
                  transition: "background 0.15s, border-color 0.15s, color 0.15s",
                }}
                onMouseEnter={(e) => {
                  if (p.featured) {
                    e.currentTarget.style.background = "#C2410C";
                    e.currentTarget.style.borderColor = "#C2410C";
                  } else {
                    e.currentTarget.style.borderColor = "#EA580C";
                    e.currentTarget.style.color = "#EA580C";
                  }
                }}
                onMouseLeave={(e) => {
                  if (p.featured) {
                    e.currentTarget.style.background = "#EA580C";
                    e.currentTarget.style.borderColor = "#EA580C";
                  } else {
                    e.currentTarget.style.borderColor = "#3A3A3A";
                    e.currentTarget.style.color = "#FAFAF9";
                  }
                }}
              >
                {p.cta}
              </span>
            </Link>
          </div>
        ))}
      </div>
    </section>
  );
}

const FAQS = [
  {
    q: "What types of businesses is PrizeSkout built for?",
    a: "PrizeSkout serves e-commerce platforms, physical retail stores, hypermarkets, malls, and omnichannel brands. Whether you sell online, in-store, or both, our platform tracks competitors and optimizes pricing across every channel you operate in.",
  },
  {
    q: "How does PrizeSkout track in-store competitor prices?",
    a: "Through our Field Intelligence module. Your store teams use a simple web-based form to submit price observations from competitor locations. They record the product, price, store location, and any promotional details. This data feeds into the same AI engine as our online tracking, giving you a complete omnichannel view.",
  },
  {
    q: "Do my competitors see my data?",
    a: "Never. Your internal data (sales, margins, inventory) is strictly walled off. No client can see another client's proprietary information. The benchmarking module uses only anonymized, aggregated data. You see where you rank, but nobody sees your numbers.",
  },
  {
    q: "What makes PrizeSkout different from tools like Prisync or Competera?",
    a: "Three things. First, we cover both online and physical retail, not just online. Second, our AI model is trained on your specific data and improves every month, meaning recommendations get more accurate over time. Third, we are built specifically for the Qatar and Middle East market with local platform coverage that global tools do not offer.",
  },
  {
    q: "How long before I see results?",
    a: "You get competitive intelligence from day one. Price alerts and competitor monitoring start immediately after setup. AI pricing recommendations begin within the first week and improve as the model learns your data. Most clients see measurable margin improvements within the first 30 days.",
  },
  {
    q: "Can I integrate PrizeSkout with my existing systems?",
    a: "Yes. We offer a REST API, webhook integrations, and connectors for common ERP and POS systems. Enterprise clients can also use our white-label SDK to embed PrizeSkout intelligence directly into their own merchant dashboards.",
  },
];

function FAQ() {
  const [openIdx, setOpenIdx] = useState<number | null>(null);
  return (
    <section
      id="faq"
      style={{ background: "#FAFAF9" }}
      className="px-5 md:px-10 py-[60px] md:py-[80px]"
    >
      <p
        style={{
          fontSize: 11,
          fontWeight: 600,
          color: "#EA580C",
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          textAlign: "center",
          margin: 0,
        }}
      >
        FAQ
      </p>
      <h2 className="ps-section-title" style={{ color: "#1A1A18", textAlign: "center", marginTop: 10 }}>
        Common questions
      </h2>

      <div style={{ maxWidth: 700, margin: "40px auto 0" }}>
        {FAQS.map((item, i) => {
          const isOpen = openIdx === i;
          return (
            <div key={i} style={{ borderBottom: "1px solid #E5E2DB" }}>
              <button
                onClick={() => setOpenIdx(isOpen ? null : i)}
                style={{
                  width: "100%",
                  background: "none",
                  border: "none",
                  padding: "18px 0",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  cursor: "pointer",
                  textAlign: "left",
                }}
                className="ps-faq-q"
              >
                <span style={{ fontSize: 15, fontWeight: 500, color: "#1A1A18", transition: "color 0.15s" }}>
                  {item.q}
                </span>
                <ChevronDown
                  size={16}
                  color="#9A9A9A"
                  style={{
                    transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
                    transition: "transform 0.2s",
                    flexShrink: 0,
                    marginLeft: 16,
                  }}
                />
              </button>
              <div
                style={{
                  display: "grid",
                  gridTemplateRows: isOpen ? "1fr" : "0fr",
                  transition: "grid-template-rows 0.25s ease",
                }}
              >
                <div style={{ overflow: "hidden" }}>
                  <p
                    style={{
                      fontSize: 14,
                      fontWeight: 400,
                      color: "#6B6B6B",
                      lineHeight: 1.65,
                      paddingTop: 0,
                      paddingBottom: 18,
                      margin: 0,
                    }}
                  >
                    {item.a}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function CTASection() {
  return (
    <section
      style={{ background: "#050505", textAlign: "center" }}
      className="px-5 md:px-10 py-[60px] md:py-[80px]"
    >
      <h2 className="ps-section-title" style={{ color: "#FAFAF9" }}>
        Ready to price smarter?
      </h2>
      <p
        style={{
          fontSize: 15,
          color: "#8A8A8A",
          marginTop: 12,
          maxWidth: 500,
          marginLeft: "auto",
          marginRight: "auto",
          lineHeight: 1.6,
        }}
      >
        Join commerce brands across Qatar and the Middle East using PrizeSkout to outsmart their
        competition.
      </p>
      <div style={{ marginTop: 28 }}>
        <Link
          to="/signup"
          style={{
            display: "inline-block",
            background: "#EA580C",
            color: "#FFFFFF",
            fontSize: 16,
            fontWeight: 600,
            padding: "14px 36px",
            borderRadius: 8,
            textDecoration: "none",
            transition: "background 0.15s",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "#C2410C")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "#EA580C")}
        >
          Start your free trial
        </Link>
      </div>
      <p style={{ marginTop: 12, fontSize: 13, color: "#6B6B6B" }}>
        No credit card required. Cancel anytime.
      </p>
    </section>
  );
}

function FooterLink({ label }: { label: string }) {
  return (
    <a
      href="#"
      onClick={(e) => e.preventDefault()}
      style={{
        fontSize: 13,
        fontWeight: 400,
        color: "#6B6B6B",
        textDecoration: "none",
        transition: "color 0.15s",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.color = "#FAFAF9")}
      onMouseLeave={(e) => (e.currentTarget.style.color = "#6B6B6B")}
    >
      {label}
    </a>
  );
}

function Footer() {
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
            <button
              onClick={() => smoothScrollTo("#top")}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: 0,
              }}
            >
              <span style={{ width: 24, height: 24, background: "#EA580C", borderRadius: 6 }} />
              <span style={{ fontSize: 17, fontWeight: 700, color: "#FAFAF9" }}>PrizeSkout</span>
            </button>
            <p
              style={{
                marginTop: 12,
                fontSize: 13,
                color: "#6B6B6B",
                lineHeight: 1.6,
                maxWidth: 280,
              }}
            >
              AI-powered pricing intelligence for commerce brands. Monitor, optimize, and outsmart
              your competition across every channel.
            </p>
            <div style={{ marginTop: 20, display: "flex", gap: 12 }}>
              {[
                { label: "X", node: <span style={{ fontSize: 13, fontWeight: 600, color: "#8A8A8A" }}>X</span> },
                { label: "in", node: <span style={{ fontSize: 13, fontWeight: 600, color: "#8A8A8A" }}>in</span> },
                { label: "Instagram", node: <Camera size={14} color="#8A8A8A" /> },
                { label: "YouTube", node: <Play size={14} color="#8A8A8A" /> },
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
              Product
            </h4>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <FooterLink label="Features" />
              <FooterLink label="Pricing" />
              <FooterLink label="API docs" />
              <FooterLink label="Changelog" />
            </div>
          </div>

          <div>
            <h4 style={{ fontSize: 13, fontWeight: 600, color: "#FAFAF9", margin: "0 0 16px" }}>
              Company
            </h4>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <FooterLink label="About" />
              <FooterLink label="Blog" />
              <FooterLink label="Careers" />
              <FooterLink label="Contact" />
            </div>
          </div>

          <div>
            <h4 style={{ fontSize: 13, fontWeight: 600, color: "#FAFAF9", margin: "0 0 16px" }}>
              Legal
            </h4>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <FooterLink label="Privacy policy" />
              <FooterLink label="Terms of service" />
              <FooterLink label="Cookie policy" />
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
          <span style={{ fontSize: 12, color: "#6B6B6B", display: "inline-flex", alignItems: "center", gap: 6 }}>
            <Globe size={12} />
            Qatar
          </span>
        </div>
      </div>
    </footer>
  );
}

function LandingPage() {
  return (
    <div style={{ background: "#050505", minHeight: "100vh", overflowX: "hidden" }}>
      <style>{`
        @keyframes ps-fade-in { from { opacity: 0 } to { opacity: 1 } }
        @keyframes ps-mockup-in {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        html { scroll-behavior: smooth; }
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
        }
        @media (min-width: 900px) {
          .ps-feature-grid { grid-template-columns: repeat(3, 1fr); }
        }
        @media (min-width: 768px) {
          .ps-footer-grid { grid-template-columns: 1.5fr 1fr 1fr 1fr; gap: 40px; }
        }
      `}</style>
      <Header />
      <main style={{ paddingTop: 64 }}>
        <Hero />
        <LogosBar />
        <Features />
        <HowItWorks />
        <Pricing />
        <FAQ />
        <CTASection />
      </main>
      <Footer />
    </div>
  );
}
