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

type Metric = { label: string; value: number; delta: number; color: string; prefix?: string; suffix?: string; decimals?: number };

const INITIAL_METRICS: Metric[] = [
  { label: "Avg margin", value: 24.8, delta: 0.4, color: "#EA580C", suffix: "%", decimals: 1 },
  { label: "Price index", value: 102.3, delta: 0.2, color: "#22C55E", decimals: 1 },
  { label: "Competitors", value: 1428, delta: 6, color: "#3B82F6" },
  { label: "Alerts today", value: 37, delta: 1, color: "#F59E0B" },
];

type Row = { sku: string; product: string; you: number; competitor: number; trend: "up" | "down" | "flat" };

const INITIAL_ROWS: Row[] = [
  { sku: "SN-1042", product: "Galaxy Buds Pro", you: 449, competitor: 469, trend: "up" },
  { sku: "SN-2918", product: "Nespresso Vertuo", you: 729, competitor: 699, trend: "down" },
  { sku: "SN-3377", product: "Dyson V12 Detect", you: 2199, competitor: 2249, trend: "up" },
  { sku: "SN-4521", product: "iPad Air 11\"", you: 2399, competitor: 2399, trend: "flat" },
];

const ALERTS = [
  { tag: "PRICE DROP", color: "#EF4444", text: "Carrefour cut Nespresso Vertuo by QAR 30" },
  { tag: "STOCK OUT", color: "#F59E0B", text: "Lulu out of stock on Dyson V12 Detect" },
  { tag: "OPPORTUNITY", color: "#22C55E", text: "Raise Galaxy Buds Pro by QAR 20, still under market" },
  { tag: "PROMO LIVE", color: "#3B82F6", text: "Talabat launched 15% off small appliances" },
];

function useTicker(intervalMs: number, fn: () => void) {
  useEffect(() => {
    const id = window.setInterval(fn, intervalMs);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [intervalMs]);
}

function Sparkline({ color = "#EA580C", seed = 0 }: { color?: string; seed?: number }) {
  // Generate a smooth-ish wavy line — animated by re-mounting via key
  const points = Array.from({ length: 24 }, (_, i) => {
    const t = i / 23;
    const wave =
      Math.sin(t * Math.PI * 2 + seed * 0.7) * 10 +
      Math.cos(t * Math.PI * 3 + seed * 1.3) * 6 +
      (Math.sin(seed + i) * 3);
    const y = 30 - wave;
    return `${i * (240 / 23)},${Math.max(4, Math.min(56, y))}`;
  });
  const path = `M ${points.join(" L ")}`;
  const areaPath = `${path} L 240,60 L 0,60 Z`;
  return (
    <svg viewBox="0 0 240 60" width="100%" height="60" preserveAspectRatio="none" style={{ display: "block" }}>
      <defs>
        <linearGradient id={`spark-grad-${seed}`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.35" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill={`url(#spark-grad-${seed})`} />
      <path
        d={path}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ strokeDasharray: 600, strokeDashoffset: 600, animation: "ps-spark-draw 1.2s ease-out 0.5s forwards" }}
      />
    </svg>
  );
}

function HeroMockup() {
  const [metrics, setMetrics] = useState<Metric[]>(INITIAL_METRICS);
  const [rows, setRows] = useState<Row[]>(INITIAL_ROWS);
  const [alertIdx, setAlertIdx] = useState(0);
  const [sparkSeed, setSparkSeed] = useState(0);

  useTicker(2200, () => {
    setMetrics((prev) =>
      prev.map((m) => {
        const drift = (Math.random() - 0.5) * (m.decimals ? 0.6 : 3);
        const next = Math.max(0, m.value + drift);
        return { ...m, value: next, delta: drift };
      }),
    );
  });

  useTicker(1800, () => {
    setRows((prev) =>
      prev.map((r) => {
        const change = Math.round((Math.random() - 0.5) * 6);
        const competitor = Math.max(10, r.competitor + change);
        const trend: Row["trend"] = change > 0 ? "up" : change < 0 ? "down" : "flat";
        return { ...r, competitor, trend };
      }),
    );
  });

  useTicker(3000, () => setAlertIdx((i) => (i + 1) % ALERTS.length));
  useTicker(4500, () => setSparkSeed((s) => s + 1));

  const fmt = (m: Metric) => {
    const v = m.decimals ? m.value.toFixed(m.decimals) : Math.round(m.value).toLocaleString();
    return `${m.prefix ?? ""}${v}${m.suffix ?? ""}`;
  };

  const alert = ALERTS[alertIdx];

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
      {/* Window chrome */}
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

      <div style={{ display: "flex", minHeight: 320 }}>
        {/* Sidebar strip */}
        <div
          style={{
            width: 44,
            background: "#050505",
            borderRight: "1px solid #1A1A1A",
            padding: "14px 0",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 14,
          }}
        >
          <span style={{ width: 20, height: 20, background: "#EA580C", borderRadius: 5 }} />
          {[BarChart3, Crosshair, TrendingUp, MapPin, Target].map((Icon, i) => (
            <span
              key={i}
              style={{
                width: 24,
                height: 24,
                borderRadius: 5,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: i === 0 ? "#EA580C" : "#3A3A3A",
                background: i === 0 ? "rgba(234,88,12,0.1)" : "transparent",
              }}
            >
              <Icon size={13} />
            </span>
          ))}
        </div>

        {/* Content */}
        <div style={{ flex: 1, background: "#0F0F0F", padding: 14, minWidth: 0 }}>
          {/* Live status row */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 12,
              gap: 12,
              flexWrap: "wrap",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: "50%",
                  background: "#22C55E",
                  boxShadow: "0 0 0 0 rgba(34,197,94,0.5)",
                  animation: "ps-pulse 1.6s ease-out infinite",
                }}
              />
              <span style={{ fontSize: 11, color: "#9A9A9A", fontWeight: 500 }}>
                Live · monitoring 1,428 SKUs
              </span>
            </div>
            <span style={{ fontSize: 10, color: "#6B6B6B" }}>Updated just now</span>
          </div>

          {/* Metric cards */}
          <div className="ps-mock-metrics" style={{ display: "grid", gap: 8 }}>
            {metrics.map((m) => {
              const isUp = m.delta >= 0;
              return (
                <div
                  key={m.label}
                  style={{
                    background: "#161616",
                    border: "1px solid #1F1F1F",
                    borderRadius: 8,
                    padding: "10px 12px",
                    minWidth: 0,
                  }}
                >
                  <div style={{ height: 2, background: m.color, borderRadius: 2, marginBottom: 8, opacity: 0.8 }} />
                  <div style={{ fontSize: 10, color: "#6B6B6B", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                    {m.label}
                  </div>
                  <div
                    key={fmt(m)}
                    style={{
                      fontSize: 17,
                      fontWeight: 700,
                      color: "#FAFAF9",
                      marginTop: 2,
                      animation: "ps-flash 0.5s ease-out",
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {fmt(m)}
                  </div>
                  <div
                    style={{
                      fontSize: 10,
                      color: isUp ? "#22C55E" : "#EF4444",
                      marginTop: 2,
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {isUp ? "▲" : "▼"} {Math.abs(m.delta).toFixed(m.decimals ? 2 : 0)}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Chart + alert */}
          <div className="ps-mock-bottom" style={{ display: "grid", gap: 10, marginTop: 12 }}>
            <div
              style={{
                background: "#161616",
                border: "1px solid #1F1F1F",
                borderRadius: 8,
                padding: 12,
                minWidth: 0,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                <span style={{ fontSize: 11, color: "#9A9A9A", fontWeight: 500 }}>Margin trend · 30d</span>
                <span style={{ fontSize: 10, color: "#22C55E", fontWeight: 600 }}>+2.4%</span>
              </div>
              <Sparkline key={sparkSeed} color="#EA580C" seed={sparkSeed} />
            </div>

            <div
              style={{
                background: "#161616",
                border: "1px solid #1F1F1F",
                borderRadius: 8,
                padding: 12,
                minWidth: 0,
                overflow: "hidden",
              }}
            >
              <div style={{ fontSize: 11, color: "#9A9A9A", fontWeight: 500, marginBottom: 8 }}>Live alerts</div>
              <div
                key={alertIdx}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  animation: "ps-slide-up 0.4s ease-out",
                }}
              >
                <span
                  style={{
                    fontSize: 9,
                    fontWeight: 700,
                    color: alert.color,
                    background: `${alert.color}1A`,
                    border: `1px solid ${alert.color}40`,
                    padding: "2px 6px",
                    borderRadius: 4,
                    letterSpacing: "0.04em",
                    flexShrink: 0,
                  }}
                >
                  {alert.tag}
                </span>
                <span
                  style={{
                    fontSize: 11,
                    color: "#C9C9C9",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {alert.text}
                </span>
              </div>
            </div>
          </div>

          {/* Price table */}
          <div
            className="ps-mock-table"
            style={{
              background: "#161616",
              border: "1px solid #1F1F1F",
              borderRadius: 8,
              marginTop: 10,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1.6fr 0.7fr 0.7fr 0.4fr",
                padding: "8px 12px",
                borderBottom: "1px solid #1F1F1F",
                fontSize: 10,
                color: "#6B6B6B",
                textTransform: "uppercase",
                letterSpacing: "0.04em",
              }}
            >
              <span>Product</span>
              <span style={{ textAlign: "right" }}>You</span>
              <span style={{ textAlign: "right" }}>Market</span>
              <span style={{ textAlign: "right" }}>Δ</span>
            </div>
            {rows.map((r) => {
              const diff = r.competitor - r.you;
              const diffColor = diff > 0 ? "#22C55E" : diff < 0 ? "#EF4444" : "#6B6B6B";
              return (
                <div
                  key={r.sku}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1.6fr 0.7fr 0.7fr 0.4fr",
                    padding: "8px 12px",
                    fontSize: 11,
                    borderBottom: "1px solid #1A1A1A",
                    alignItems: "center",
                  }}
                >
                  <span style={{ color: "#FAFAF9", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {r.product}
                  </span>
                  <span style={{ textAlign: "right", color: "#9A9A9A", fontVariantNumeric: "tabular-nums" }}>
                    {r.you}
                  </span>
                  <span
                    key={r.competitor}
                    style={{
                      textAlign: "right",
                      color: "#FAFAF9",
                      fontVariantNumeric: "tabular-nums",
                      fontWeight: 600,
                      animation: "ps-flash 0.5s ease-out",
                    }}
                  >
                    {r.competitor}
                  </span>
                  <span style={{ textAlign: "right", color: diffColor, fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>
                    {r.trend === "up" ? "▲" : r.trend === "down" ? "▼" : "—"}
                  </span>
                </div>
              );
            })}
          </div>
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
