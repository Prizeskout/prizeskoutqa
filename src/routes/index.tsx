import { createFileRoute, Link } from "@tanstack/react-router";
import { Fragment, useEffect, useRef, useState } from "react";
import {
  Crosshair,
  TrendingUp,
  BarChart3,
  Megaphone,
  MapPin,
  Target,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  ArrowRight,
  Minus,
  Star,
} from "lucide-react";
import { MarketingShell } from "@/components/marketing/MarketingShell";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "PrizeSkout — Pricing intelligence for retail" },
      {
        name: "description",
        content:
          "PrizeSkout gives category teams a continuous read on competitor prices, promotions, and shelf moves — online and in-store — so every pricing decision is grounded in evidence.",
      },
      {
        property: "og:title",
        content: "PrizeSkout — Pricing intelligence for retail",
      },
      {
        property: "og:description",
        content:
          "A continuous read on competitor prices, promotions, and shelf moves — online and in-store. Built for category teams that need to defend margin without losing share.",
      },
    ],
  }),
  component: LandingPage,
});

/* ============================================================================
   Hooks & primitives
   ========================================================================= */

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return reduced;
}

function useInView<T extends Element>(rootMargin = "0px") {
  const ref = useRef<T | null>(null);
  const [inView, setInView] = useState(true);
  useEffect(() => {
    const node = ref.current;
    if (!node || typeof IntersectionObserver === "undefined") return;
    const obs = new IntersectionObserver(
      ([entry]) => setInView(entry.isIntersecting),
      { rootMargin, threshold: 0 },
    );
    obs.observe(node);
    return () => obs.disconnect();
  }, [rootMargin]);
  return [ref, inView] as const;
}

function useTicker(intervalMs: number, fn: () => void, enabled = true) {
  useEffect(() => {
    if (!enabled) return;
    const id = window.setInterval(fn, intervalMs);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [intervalMs, enabled]);
}

/* The signature radial-orange glow that sits behind feature mockups. */
function GlowBackdrop({
  intensity = 0.55,
  size = 720,
}: {
  intensity?: number;
  size?: number;
}) {
  return (
    <div
      aria-hidden
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        background: `radial-gradient(circle at 50% 50%, rgba(234,88,12,${intensity}) 0%, rgba(234,88,12,0.18) 28%, rgba(5,5,5,0) 65%)`,
        filter: "blur(20px)",
        zIndex: 0,
        maxWidth: size,
        maxHeight: size,
        margin: "auto",
      }}
    />
  );
}

/* ============================================================================
   HERO
   ========================================================================= */

const HERO_SIGNALS = [
  {
    head: "Carrefour Qatar · Galaxy Buds 2 Pro",
    eventTag: "PRICE DROP",
    eventColor: "#EF4444",
    lines: [
      { tag: "WAS", value: "QAR 469" },
      { tag: "NOW", value: "QAR 449", color: "#EF4444" },
      { tag: "VS YOU", value: "−QAR 20 below", color: "#EF4444" },
    ],
    action: "Hold price · margin protected",
    actionColor: "#22C55E",
  },
  {
    head: "Talabat · Nespresso Vertuo Plus",
    eventTag: "PROMO LIVE",
    eventColor: "#EA580C",
    lines: [
      { tag: "DEPTH", value: "−15% · 7 days" },
      { tag: "VS YOU", value: "−QAR 30 gap", color: "#EF4444" },
      { tag: "IMPACT", value: "−QAR 4,200 / mo" },
    ],
    action: "Match on Talabat only · skip Snoonu",
    actionColor: "#FAFAF9",
  },
  {
    head: "Small appliances · category view",
    eventTag: "OPPORTUNITY",
    eventColor: "#22C55E",
    lines: [
      { tag: "DEMAND", value: "+18% WoW", color: "#22C55E" },
      { tag: "MARKET GAP", value: "Under-promoted" },
      { tag: "EST. ROI", value: "1.9× · low cannib.", color: "#22C55E" },
    ],
    action: "Run a 5-day promo on top 12 SKUs",
    actionColor: "#FAFAF9",
  },
];

function HeroSignalsMockup() {
  const [idx, setIdx] = useState(0);
  const reducedMotion = usePrefersReducedMotion();
  const [containerRef, inView] = useInView<HTMLDivElement>("0px");
  const animate = inView && !reducedMotion;

  useTicker(4400, () => setIdx((i) => (i + 1) % HERO_SIGNALS.length), animate);

  const signal = HERO_SIGNALS[idx];

  return (
    <div
      ref={containerRef}
      style={{
        position: "relative",
        width: "100%",
        maxWidth: 520,
        margin: "0 auto",
      }}
    >
      {/* Glow */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: "-40% -20%",
          background:
            "radial-gradient(ellipse at center, rgba(234,88,12,0.55) 0%, rgba(234,88,12,0.18) 30%, rgba(5,5,5,0) 70%)",
          filter: "blur(30px)",
          zIndex: 0,
        }}
      />
      <div
        style={{
          position: "relative",
          zIndex: 1,
          background: "rgba(15,15,15,0.85)",
          border: "1px solid rgba(234,88,12,0.25)",
          borderRadius: 16,
          padding: 18,
          backdropFilter: "blur(8px)",
          WebkitBackdropFilter: "blur(8px)",
          boxShadow: "0 30px 80px rgba(234,88,12,0.18), 0 0 0 1px rgba(234,88,12,0.05) inset",
          animation: reducedMotion ? undefined : "ps-mockup-in 0.7s ease-out 0.2s both",
        }}
      >
        {/* Header chip */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span
              style={{
                width: 28,
                height: 28,
                borderRadius: 7,
                background: "linear-gradient(135deg, #EA580C, #C2410C)",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 6px 20px rgba(234,88,12,0.4)",
              }}
            >
              <Crosshair size={14} color="#FFF" />
            </span>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: "#FAFAF9" }}>
                Signal feed
              </span>
              <span style={{ fontSize: 10, color: "#22C55E", display: "inline-flex", alignItems: "center", gap: 5 }}>
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    background: "#22C55E",
                    boxShadow: "0 0 0 0 rgba(34,197,94,0.5)",
                    animation: "ps-pulse 1.6s ease-out infinite",
                  }}
                />
                Live · 1,428 SKUs · 6 channels
              </span>
            </div>
          </div>
          <span style={{ fontSize: 10, color: "#6B6B6B", fontVariantNumeric: "tabular-nums" }}>
            {String(idx + 1).padStart(2, "0")} / {String(HERO_SIGNALS.length).padStart(2, "0")}
          </span>
        </div>

        {/* Signal header row */}
        <div
          key={`h-${idx}`}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 10,
            marginBottom: 12,
            animation: reducedMotion ? undefined : "ps-slide-up 0.4s ease-out",
          }}
        >
          <span
            style={{
              fontSize: 11,
              color: "#9A9A9A",
              fontWeight: 500,
              letterSpacing: "0.02em",
            }}
          >
            {signal.head}
          </span>
          <span
            style={{
              fontSize: 9,
              fontWeight: 700,
              letterSpacing: "0.08em",
              color: signal.eventColor,
              background: `${signal.eventColor}1A`,
              border: `1px solid ${signal.eventColor}55`,
              padding: "3px 7px",
              borderRadius: 4,
              whiteSpace: "nowrap",
            }}
          >
            {signal.eventTag}
          </span>
        </div>

        {/* Signal detail card */}
        <div
          key={`d-${idx}`}
          style={{
            background: "rgba(0,0,0,0.45)",
            border: "1px solid rgba(255,255,255,0.06)",
            borderRadius: 12,
            padding: 14,
            animation: reducedMotion ? undefined : "ps-slide-up 0.5s 0.1s ease-out both",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {signal.lines.map((l: { tag: string; value: string; color?: string }) => (
              <div
                key={l.tag}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  fontSize: 12,
                }}
              >
                <span style={{ color: "#6B6B6B", fontWeight: 500, letterSpacing: "0.04em" }}>{l.tag}</span>
                <span style={{ color: l.color || "#FAFAF9", fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>
                  {l.value}
                </span>
              </div>
            ))}
          </div>
          <div
            style={{
              marginTop: 14,
              paddingTop: 12,
              borderTop: "1px solid rgba(255,255,255,0.05)",
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <span
              style={{
                width: 18,
                height: 18,
                borderRadius: 5,
                background: "rgba(234,88,12,0.15)",
                border: "1px solid rgba(234,88,12,0.4)",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <Sparkles size={10} color="#EA580C" />
            </span>
            <span style={{ fontSize: 11, color: "#8A8A8A" }}>Recommended move</span>
            <span style={{ fontSize: 12, color: signal.actionColor, fontWeight: 600, marginLeft: "auto", textAlign: "right" }}>
              {signal.action}
            </span>
          </div>
        </div>

        {/* Footer meta */}
        <div
          style={{
            marginTop: 14,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontSize: 10,
            color: "#5C5C5C",
          }}
        >
          <span>Sources: scrape + field team</span>
          <span style={{ color: "#8A8A8A" }}>Updated 12s ago</span>
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
        position: "relative",
        background: "#050505",
        paddingTop: 96,
        paddingBottom: 60,
        overflow: "hidden",
      }}
      className="px-5 md:px-10"
    >
      {/* Outer ambient glow */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          top: -200,
          left: "50%",
          transform: "translateX(-50%)",
          width: 1100,
          height: 700,
          background:
            "radial-gradient(ellipse at center, rgba(234,88,12,0.32) 0%, rgba(234,88,12,0.10) 30%, rgba(5,5,5,0) 65%)",
          filter: "blur(40px)",
          pointerEvents: "none",
          zIndex: 0,
        }}
      />
      <div
        style={{
          position: "relative",
          zIndex: 1,
          maxWidth: 1180,
          margin: "0 auto",
        }}
        className="ps-hero-grid"
      >
        {/* Left: copy */}
        <div className="ps-hero-copy">
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              background: "rgba(234,88,12,0.10)",
              border: "1px solid rgba(234,88,12,0.25)",
              borderRadius: 999,
              padding: "5px 14px",
              fontSize: 11,
              fontWeight: 600,
              color: "#EA580C",
              letterSpacing: "0.04em",
              textTransform: "uppercase",
            }}
          >
            <Crosshair size={11} />
            Pricing intelligence for retail
          </span>

          <h1
            className="ps-hero-title"
            style={{
              marginTop: 22,
              fontWeight: 700,
              color: "#FAFAF9",
              lineHeight: 1.05,
              letterSpacing: "-0.02em",
              margin: "22px 0 0",
            }}
          >
            Every move your competitors make.
            <br />
            <span
              style={{
                background: "linear-gradient(90deg, #EA580C, #FB923C)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              On the record.
            </span>
          </h1>

          <p
            className="ps-hero-sub"
            style={{
              marginTop: 18,
              color: "#9A9A9A",
              lineHeight: 1.6,
              maxWidth: 520,
            }}
          >
            PrizeSkout watches competitor prices, promotions, and shelf moves across every channel
            you sell on — online and in-store. Category teams use it to defend margin, time
            promotions, and stop losing share to moves they didn't see coming.
          </p>

          <div
            style={{
              marginTop: 28,
              display: "flex",
              gap: 12,
              flexWrap: "wrap",
            }}
            className="ps-hero-ctas"
          >
            <Link
              to="/signup"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                background: "linear-gradient(135deg, #EA580C, #C2410C)",
                color: "#FFFFFF",
                fontSize: 14,
                fontWeight: 600,
                padding: "13px 26px",
                borderRadius: 10,
                textDecoration: "none",
                transition: "transform 0.15s, box-shadow 0.15s",
                boxShadow: "0 12px 30px rgba(234,88,12,0.35)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-1px)";
                e.currentTarget.style.boxShadow = "0 16px 40px rgba(234,88,12,0.45)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "0 12px 30px rgba(234,88,12,0.35)";
              }}
            >
              Start tracking competitors
              <ArrowRight size={14} />
            </Link>
            <a
              href="#features"
              onClick={(e) => {
                e.preventDefault();
                document.querySelector("#features")?.scrollIntoView({ behavior: "smooth" });
              }}
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.10)",
                color: "#FAFAF9",
                fontSize: 14,
                fontWeight: 500,
                padding: "13px 26px",
                borderRadius: 10,
                textDecoration: "none",
                transition: "background 0.15s, border-color 0.15s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(255,255,255,0.07)";
                e.currentTarget.style.borderColor = "rgba(234,88,12,0.45)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "rgba(255,255,255,0.04)";
                e.currentTarget.style.borderColor = "rgba(255,255,255,0.10)";
              }}
            >
              Tour the platform
            </a>
          </div>

          <p style={{ marginTop: 18, fontSize: 12, color: "#6B6B6B" }}>
            14-day trial · No card required · Live data on day one
          </p>
        </div>

        {/* Right: hero mockup */}
        <div className="ps-hero-mock" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
          <HeroSignalsMockup />
        </div>
      </div>
    </section>
  );
}

/* ============================================================================
   LOGOS BAR
   ========================================================================= */

function LogosBar() {
  const logos = ["Snoonu", "Talabat", "Carrefour", "Lulu", "Amazon.ae", "Noon"];
  return (
    <section
      style={{
        background: "#050505",
        padding: "32px 20px",
      }}
    >
      <p
        style={{
          fontSize: 11,
          fontWeight: 500,
          color: "#5C5C5C",
          textAlign: "center",
          textTransform: "uppercase",
          letterSpacing: "0.12em",
          margin: 0,
        }}
      >
        Trusted in commerce by 200+ brands
      </p>
      <div
        style={{
          marginTop: 18,
          display: "flex",
          justifyContent: "center",
          flexWrap: "wrap",
          gap: 36,
          opacity: 0.55,
        }}
      >
        {logos.map((name) => (
          <span
            key={name}
            style={{
              fontSize: 14,
              fontWeight: 600,
              color: "#6B6B6B",
              letterSpacing: "-0.01em",
              transition: "color 0.2s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "#FAFAF9")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "#6B6B6B")}
          >
            {name}
          </span>
        ))}
      </div>
    </section>
  );
}

/* ============================================================================
   SPLIT FEATURE SECTIONS
   ========================================================================= */

type SplitProps = {
  eyebrow?: string;
  title: React.ReactNode;
  subtitle: string;
  bullets: { Icon: React.ComponentType<{ size?: number; color?: string }>; title: string; desc: string }[];
  mockup: React.ReactNode;
  reverse?: boolean;
};

function SplitSection({ eyebrow, title, subtitle, bullets, mockup, reverse }: SplitProps) {
  return (
    <section
      style={{
        position: "relative",
        background: "#050505",
        padding: "80px 20px",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          maxWidth: 1180,
          margin: "0 auto",
          display: "grid",
          gap: 40,
          alignItems: "center",
        }}
        className={`ps-split ${reverse ? "ps-split-reverse" : ""}`}
      >
        <div className="ps-split-mock" style={{ position: "relative", display: "flex", justifyContent: "center" }}>
          {mockup}
        </div>
        <div className="ps-split-copy">
          {eyebrow && (
            <p
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: "#EA580C",
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                margin: 0,
              }}
            >
              {eyebrow}
            </p>
          )}
          <h2
            style={{
              fontSize: "clamp(26px, 4vw, 38px)",
              fontWeight: 700,
              color: "#FAFAF9",
              margin: "12px 0 0",
              lineHeight: 1.15,
              letterSpacing: "-0.02em",
            }}
          >
            {title}
          </h2>
          <p style={{ fontSize: 15, color: "#8A8A8A", lineHeight: 1.6, marginTop: 14, maxWidth: 480 }}>
            {subtitle}
          </p>

          <div style={{ marginTop: 24, display: "flex", flexDirection: "column", gap: 10 }}>
            {bullets.map((b) => (
              <div
                key={b.title}
                style={{
                  background: "rgba(255,255,255,0.02)",
                  border: "1px solid rgba(255,255,255,0.06)",
                  borderRadius: 12,
                  padding: 14,
                  display: "flex",
                  gap: 12,
                  alignItems: "flex-start",
                  transition: "background 0.2s, border-color 0.2s, transform 0.2s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "rgba(234,88,12,0.35)";
                  e.currentTarget.style.background = "rgba(234,88,12,0.04)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)";
                  e.currentTarget.style.background = "rgba(255,255,255,0.02)";
                }}
              >
                <span
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 8,
                    background: "linear-gradient(135deg, #EA580C, #C2410C)",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                    boxShadow: "0 6px 16px rgba(234,88,12,0.3)",
                  }}
                >
                  <b.Icon size={16} color="#FFF" />
                </span>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "#FAFAF9" }}>{b.title}</div>
                  <div style={{ fontSize: 13, color: "#8A8A8A", marginTop: 4, lineHeight: 1.5 }}>{b.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* --- Mockup 1: Live competitor watch --- */

function CompetitorMockup() {
  const [tick, setTick] = useState(0);
  const reduced = usePrefersReducedMotion();
  const [ref, inView] = useInView<HTMLDivElement>("0px");
  useTicker(2000, () => setTick((t) => t + 1), inView && !reduced);

  const rows = [
    { p: "Galaxy Buds Pro", you: 469, comp: 449 + ((tick % 3) - 1) * 5 },
    { p: "Nespresso Vertuo", you: 729, comp: 699 + ((tick % 4) - 1) * 8 },
    { p: "Dyson V12", you: 2199, comp: 2249 + ((tick % 3) - 1) * 10 },
  ];

  return (
    <div ref={ref} style={{ position: "relative", width: "100%", maxWidth: 460 }}>
      <GlowBackdrop intensity={0.4} />
      <div
        style={{
          position: "relative",
          background: "rgba(15,15,15,0.85)",
          border: "1px solid rgba(234,88,12,0.2)",
          borderRadius: 14,
          padding: 16,
          backdropFilter: "blur(8px)",
          WebkitBackdropFilter: "blur(8px)",
          boxShadow: "0 30px 60px rgba(234,88,12,0.15)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <span style={{ fontSize: 11, color: "#9A9A9A", display: "inline-flex", alignItems: "center", gap: 6 }}>
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: "#22C55E",
                animation: "ps-pulse 1.6s ease-out infinite",
              }}
            />
            Live · Carrefour Qatar
          </span>
          <span
            style={{
              fontSize: 10,
              fontWeight: 700,
              color: "#EA580C",
              background: "rgba(234,88,12,0.12)",
              border: "1px solid rgba(234,88,12,0.3)",
              padding: "3px 8px",
              borderRadius: 4,
            }}
          >
            3 ALERTS
          </span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {rows.map((r) => {
            const diff = r.comp - r.you;
            const dColor = diff > 0 ? "#22C55E" : diff < 0 ? "#EF4444" : "#6B6B6B";
            return (
              <div
                key={r.p}
                style={{
                  background: "rgba(0,0,0,0.4)",
                  border: "1px solid rgba(255,255,255,0.04)",
                  borderRadius: 8,
                  padding: "10px 12px",
                  display: "grid",
                  gridTemplateColumns: "1.4fr 0.7fr 0.7fr",
                  gap: 8,
                  alignItems: "center",
                  fontSize: 12,
                }}
              >
                <span style={{ color: "#FAFAF9", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {r.p}
                </span>
                <span style={{ textAlign: "right", color: "#8A8A8A", fontVariantNumeric: "tabular-nums" }}>
                  {r.you}
                </span>
                <span
                  key={r.comp}
                  style={{
                    textAlign: "right",
                    color: dColor,
                    fontWeight: 700,
                    fontVariantNumeric: "tabular-nums",
                    animation: reduced ? undefined : "ps-flash 0.5s ease-out",
                  }}
                >
                  {r.comp}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* --- Mockup 2: AI recommendation --- */

function AIRecMockup() {
  const reduced = usePrefersReducedMotion();
  return (
    <div style={{ position: "relative", width: "100%", maxWidth: 460 }}>
      <GlowBackdrop intensity={0.45} />
      <div
        style={{
          position: "relative",
          background: "rgba(15,15,15,0.85)",
          border: "1px solid rgba(234,88,12,0.2)",
          borderRadius: 14,
          padding: 18,
          backdropFilter: "blur(8px)",
          WebkitBackdropFilter: "blur(8px)",
          boxShadow: "0 30px 60px rgba(234,88,12,0.15)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
          <span
            style={{
              width: 30,
              height: 30,
              borderRadius: 7,
              background: "linear-gradient(135deg, #EA580C, #C2410C)",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 6px 16px rgba(234,88,12,0.4)",
            }}
          >
            <Sparkles size={14} color="#FFF" />
          </span>
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: "#FAFAF9" }}>AI Recommendation</div>
            <div style={{ fontSize: 10, color: "#8A8A8A" }}>Confidence 92% · 24h window</div>
          </div>
        </div>

        <div style={{ fontSize: 13, color: "#FAFAF9", lineHeight: 1.5, marginBottom: 12 }}>
          Raise <strong style={{ color: "#EA580C" }}>Galaxy Buds Pro</strong> by{" "}
          <strong style={{ color: "#22C55E" }}>+QAR 20</strong>. You're under market by 4.3%.
        </div>

        {/* Sparkline */}
        <div
          style={{
            background: "rgba(0,0,0,0.4)",
            border: "1px solid rgba(255,255,255,0.04)",
            borderRadius: 8,
            padding: 10,
            marginBottom: 12,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
            <span style={{ fontSize: 10, color: "#8A8A8A" }}>Margin trend · 30d</span>
            <span style={{ fontSize: 11, color: "#22C55E", fontWeight: 600 }}>+2.4%</span>
          </div>
          <svg viewBox="0 0 240 50" width="100%" height="50" preserveAspectRatio="none">
            <defs>
              <linearGradient id="ai-rec-grad" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="#EA580C" stopOpacity="0.4" />
                <stop offset="100%" stopColor="#EA580C" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path
              d="M0,40 C30,38 60,30 90,28 C120,26 150,22 180,15 C200,11 220,8 240,6 L240,50 L0,50 Z"
              fill="url(#ai-rec-grad)"
            />
            <path
              d="M0,40 C30,38 60,30 90,28 C120,26 150,22 180,15 C200,11 220,8 240,6"
              fill="none"
              stroke="#EA580C"
              strokeWidth="1.5"
              style={{
                strokeDasharray: 600,
                strokeDashoffset: 600,
                animation: reduced ? undefined : "ps-spark-draw 1.5s ease-out 0.3s forwards",
              }}
            />
          </svg>
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <button
            type="button"
            style={{
              flex: 1,
              background: "linear-gradient(135deg, #EA580C, #C2410C)",
              color: "#FFF",
              border: "none",
              borderRadius: 8,
              padding: "9px 12px",
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
              boxShadow: "0 8px 20px rgba(234,88,12,0.3)",
            }}
          >
            Apply +QAR 20
          </button>
          <button
            type="button"
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.1)",
              color: "#FAFAF9",
              borderRadius: 8,
              padding: "9px 14px",
              fontSize: 12,
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            Snooze
          </button>
        </div>
      </div>
    </div>
  );
}

/* --- Mockup 3: ROI simulator --- */

function ROIMockup() {
  return (
    <div style={{ position: "relative", width: "100%", maxWidth: 460 }}>
      <GlowBackdrop intensity={0.4} />
      <div
        style={{
          position: "relative",
          background: "rgba(15,15,15,0.85)",
          border: "1px solid rgba(234,88,12,0.2)",
          borderRadius: 14,
          padding: 18,
          backdropFilter: "blur(8px)",
          WebkitBackdropFilter: "blur(8px)",
          boxShadow: "0 30px 60px rgba(234,88,12,0.15)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 14 }}>
          <div>
            <div style={{ fontSize: 11, color: "#8A8A8A", textTransform: "uppercase", letterSpacing: "0.06em" }}>
              Promo simulation
            </div>
            <div style={{ fontSize: 14, fontWeight: 600, color: "#FAFAF9", marginTop: 2 }}>Small appliances · 7d</div>
          </div>
          <div style={{ fontSize: 24, fontWeight: 700, color: "#EA580C" }}>1.9×</div>
        </div>

        {/* Discount slider */}
        <div style={{ marginBottom: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#8A8A8A", marginBottom: 6 }}>
            <span>Discount depth</span>
            <span style={{ color: "#FAFAF9", fontWeight: 600 }}>15%</span>
          </div>
          <div
            style={{
              height: 6,
              background: "rgba(255,255,255,0.06)",
              borderRadius: 999,
              position: "relative",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                position: "absolute",
                left: 0,
                top: 0,
                bottom: 0,
                width: "55%",
                background: "linear-gradient(90deg, #EA580C, #FB923C)",
                borderRadius: 999,
                boxShadow: "0 0 12px rgba(234,88,12,0.5)",
              }}
            />
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr",
            gap: 8,
            marginBottom: 12,
          }}
        >
          {[
            { l: "Incr. orders", v: "+412", c: "#22C55E" },
            { l: "Net ROI", v: "QAR 18.4k", c: "#FAFAF9" },
            { l: "Cannib.", v: "Low", c: "#22C55E" },
          ].map((s) => (
            <div
              key={s.l}
              style={{
                background: "rgba(0,0,0,0.4)",
                border: "1px solid rgba(255,255,255,0.04)",
                borderRadius: 8,
                padding: "8px 10px",
              }}
            >
              <div style={{ fontSize: 10, color: "#6B6B6B" }}>{s.l}</div>
              <div style={{ fontSize: 13, color: s.c, fontWeight: 700, marginTop: 2, fontVariantNumeric: "tabular-nums" }}>
                {s.v}
              </div>
            </div>
          ))}
        </div>

        <div
          style={{
            background: "rgba(34,197,94,0.08)",
            border: "1px solid rgba(34,197,94,0.25)",
            color: "#22C55E",
            borderRadius: 8,
            padding: "8px 12px",
            fontSize: 12,
            fontWeight: 500,
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <Check size={12} />
          Healthy promo · go ahead
        </div>
      </div>
    </div>
  );
}

/* ============================================================================
   "ULTIMATE INTELLIGENCE HUB" — overview grid
   ========================================================================= */

function HubSection() {
  return (
    <section
      style={{
        position: "relative",
        background: "#050505",
        padding: "80px 20px",
        overflow: "hidden",
      }}
    >
      <div style={{ maxWidth: 1180, margin: "0 auto", textAlign: "center" }}>
        <h2
          style={{
            fontSize: "clamp(26px, 4vw, 38px)",
            fontWeight: 700,
            color: "#FAFAF9",
            margin: 0,
            letterSpacing: "-0.02em",
          }}
        >
          The ultimate{" "}
          <span
            style={{
              background: "linear-gradient(90deg, #EA580C, #FB923C)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            commerce intelligence hub
          </span>
        </h2>
        <p style={{ fontSize: 15, color: "#8A8A8A", marginTop: 12 }}>
          Online. In-store. Cross-border. Every signal in one workspace.
        </p>

        <div
          style={{
            marginTop: 40,
            display: "grid",
            gap: 16,
          }}
          className="ps-hub-grid"
        >
          {/* Big card: market scan */}
          <div
            className="ps-hub-card-lg"
            style={{
              position: "relative",
              background:
                "linear-gradient(135deg, rgba(15,15,15,0.95) 0%, rgba(20,12,8,0.95) 100%)",
              border: "1px solid rgba(234,88,12,0.2)",
              borderRadius: 16,
              padding: 24,
              textAlign: "left",
              overflow: "hidden",
              minHeight: 260,
            }}
          >
            <div
              aria-hidden
              style={{
                position: "absolute",
                top: -50,
                right: -50,
                width: 220,
                height: 220,
                background:
                  "radial-gradient(circle, rgba(234,88,12,0.5) 0%, rgba(234,88,12,0) 70%)",
                filter: "blur(30px)",
              }}
            />
            <div style={{ position: "relative", zIndex: 1 }}>
              <p style={{ fontSize: 10, fontWeight: 700, color: "#EA580C", textTransform: "uppercase", letterSpacing: "0.1em", margin: 0 }}>
                Market scan
              </p>
              <h3 style={{ fontSize: 22, fontWeight: 700, color: "#FAFAF9", margin: "8px 0 0", lineHeight: 1.2 }}>
                See your category at a glance
              </h3>
              <p style={{ fontSize: 13, color: "#8A8A8A", marginTop: 8, lineHeight: 1.5 }}>
                Volatility, top movers, growth pockets, and assortment gaps — across every channel
                you operate in.
              </p>

              <div style={{ marginTop: 18, display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 8 }}>
                {[
                  { l: "Categories tracked", v: "42" },
                  { l: "Avg volatility", v: "Low" },
                  { l: "Assortment gaps", v: "11" },
                  { l: "Trending up", v: "+18%", c: "#22C55E" },
                ].map((c) => (
                  <div
                    key={c.l}
                    style={{
                      background: "rgba(0,0,0,0.4)",
                      border: "1px solid rgba(255,255,255,0.05)",
                      borderRadius: 8,
                      padding: 10,
                    }}
                  >
                    <div style={{ fontSize: 10, color: "#6B6B6B" }}>{c.l}</div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: c.c || "#FAFAF9", marginTop: 2, fontVariantNumeric: "tabular-nums" }}>
                      {c.v}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Side cards */}
          <div className="ps-hub-side" style={{ display: "grid", gap: 16 }}>
            {[
              {
                Icon: MapPin,
                title: "Field intelligence",
                desc: "Capture in-store competitor prices through your store teams.",
              },
              {
                Icon: Target,
                title: "Market benchmarks",
                desc: "See where you rank against the anonymized network.",
              },
              {
                Icon: Megaphone,
                title: "Promotion calendar",
                desc: "Who is running what — across Talabat, Snoonu, Carrefour.",
              },
            ].map((c) => (
              <div
                key={c.title}
                style={{
                  background: "rgba(15,15,15,0.7)",
                  border: "1px solid rgba(255,255,255,0.06)",
                  borderRadius: 14,
                  padding: 18,
                  display: "flex",
                  gap: 14,
                  alignItems: "flex-start",
                  textAlign: "left",
                  transition: "border-color 0.2s, transform 0.2s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "rgba(234,88,12,0.35)";
                  e.currentTarget.style.transform = "translateY(-2px)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)";
                  e.currentTarget.style.transform = "translateY(0)";
                }}
              >
                <span
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 9,
                    background: "linear-gradient(135deg, #EA580C, #C2410C)",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                    boxShadow: "0 6px 16px rgba(234,88,12,0.3)",
                  }}
                >
                  <c.Icon size={16} color="#FFF" />
                </span>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "#FAFAF9" }}>{c.title}</div>
                  <div style={{ fontSize: 12, color: "#8A8A8A", marginTop: 4, lineHeight: 1.5 }}>{c.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ============================================================================
   TESTIMONIALS
   ========================================================================= */

const TESTIMONIALS = [
  {
    quote:
      "We replaced three separate tools with PrizeSkout. Margin lift in the first month paid for the whole year. The AI recommendations actually understand our market.",
    name: "Layla Al-Mansoori",
    role: "Head of E-Commerce, Hypermarket Group",
  },
  {
    quote:
      "The field intelligence module is a game changer. We finally see what's happening on competitor shelves without hiring an army of mystery shoppers.",
    name: "Karim Saleh",
    role: "Director of Pricing, Regional Retail",
  },
  {
    quote:
      "Our team checks PrizeSkout before every category meeting. The promo simulator alone saved us from a campaign that would have eaten 14% of our margin.",
    name: "Noor Hadid",
    role: "Commercial Lead, Omnichannel Brand",
  },
];

function Testimonials() {
  const [idx, setIdx] = useState(0);
  const reduced = usePrefersReducedMotion();
  const [ref, inView] = useInView<HTMLDivElement>("0px");
  useTicker(6500, () => setIdx((i) => (i + 1) % TESTIMONIALS.length), inView && !reduced);

  const t = TESTIMONIALS[idx];

  return (
    <section
      ref={ref}
      style={{
        position: "relative",
        background: "#050505",
        padding: "80px 20px",
        overflow: "hidden",
      }}
    >
      <div style={{ maxWidth: 760, margin: "0 auto", textAlign: "center" }}>
        <h2
          style={{
            fontSize: "clamp(24px, 3.5vw, 32px)",
            fontWeight: 700,
            color: "#FAFAF9",
            margin: 0,
            letterSpacing: "-0.02em",
          }}
        >
          Loved by commerce leaders
        </h2>
        <p style={{ fontSize: 14, color: "#8A8A8A", marginTop: 10 }}>
          See what teams across the region are saying.
        </p>

        <div
          style={{
            marginTop: 36,
            position: "relative",
            background: "rgba(15,15,15,0.7)",
            border: "1px solid rgba(255,255,255,0.06)",
            borderRadius: 16,
            padding: "32px 28px",
          }}
        >
          <div style={{ display: "flex", justifyContent: "center", gap: 4, marginBottom: 18 }}>
            {[0, 1, 2, 3, 4].map((i) => (
              <Star key={i} size={14} color="#EA580C" fill="#EA580C" />
            ))}
          </div>
          <p
            key={idx}
            style={{
              fontSize: 16,
              color: "#FAFAF9",
              lineHeight: 1.65,
              fontStyle: "italic",
              margin: 0,
              animation: reduced ? undefined : "ps-fade-in 0.5s ease-out",
            }}
          >
            "{t.quote}"
          </p>
          <div style={{ marginTop: 22 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: "#FAFAF9" }}>{t.name}</div>
            <div style={{ fontSize: 12, color: "#8A8A8A", marginTop: 2 }}>{t.role}</div>
          </div>

          {/* Controls */}
          <div style={{ marginTop: 24, display: "flex", justifyContent: "center", alignItems: "center", gap: 14 }}>
            <button
              type="button"
              onClick={() => setIdx((i) => (i - 1 + TESTIMONIALS.length) % TESTIMONIALS.length)}
              aria-label="Previous testimonial"
              style={iconBtnStyle}
            >
              <ChevronLeft size={14} />
            </button>
            <div style={{ display: "flex", gap: 6 }}>
              {TESTIMONIALS.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setIdx(i)}
                  aria-label={`Show testimonial ${i + 1}`}
                  style={{
                    width: i === idx ? 18 : 6,
                    height: 6,
                    borderRadius: 999,
                    border: "none",
                    background: i === idx ? "#EA580C" : "rgba(255,255,255,0.15)",
                    cursor: "pointer",
                    transition: "all 0.2s",
                  }}
                />
              ))}
            </div>
            <button
              type="button"
              onClick={() => setIdx((i) => (i + 1) % TESTIMONIALS.length)}
              aria-label="Next testimonial"
              style={iconBtnStyle}
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

const iconBtnStyle: React.CSSProperties = {
  width: 30,
  height: 30,
  borderRadius: "50%",
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(255,255,255,0.1)",
  color: "#FAFAF9",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
  transition: "all 0.15s",
};

/* ============================================================================
   PRICING (kept, restyled)
   ========================================================================= */

const ANNUAL_DISCOUNT = 0.2;

type Plan = {
  name: string;
  monthly: number | null;
  sub: string;
  features: string[];
  cta: string;
  to: "/signup";
  featured: boolean;
};

const PLANS: Plan[] = [
  {
    name: "Scout",
    monthly: 299,
    sub: "per location",
    features: [
      "Up to 500 products tracked",
      "5 competitor monitors",
      "Price alerts and notifications",
      "Basic competitive dashboard",
      "Email support",
    ],
    cta: "Start free trial",
    to: "/signup",
    featured: false,
  },
  {
    name: "Pro",
    monthly: 799,
    sub: "per location",
    features: [
      "Up to 5,000 products tracked",
      "Unlimited competitor monitors",
      "AI pricing recommendations",
      "Promotion management & ROI simulator",
      "Field intelligence (in-store tracking)",
      "Market benchmarks",
      "API access",
      "Priority support",
    ],
    cta: "Start free trial",
    to: "/signup",
    featured: true,
  },
  {
    name: "Enterprise",
    monthly: null,
    sub: "tailored to your scale",
    features: [
      "Unlimited products",
      "Unlimited competitors",
      "Custom AI model training",
      "White-label option",
      "Dedicated account manager",
      "ERP & POS integration",
      "Custom reporting",
      "SLA guarantee",
    ],
    cta: "Contact sales",
    to: "/signup",
    featured: false,
  },
];

function Pricing() {
  const [billing, setBilling] = useState<"monthly" | "annual">("monthly");

  return (
    <section
      id="pricing"
      style={{ position: "relative", background: "#050505", overflow: "hidden" }}
      className="px-5 md:px-10 py-[80px]"
    >
      <div style={{ maxWidth: 1180, margin: "0 auto" }}>
        <div style={{ textAlign: "center" }}>
          <p
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: "#EA580C",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              margin: 0,
            }}
          >
            PRICING
          </p>
          <h2
            style={{
              fontSize: "clamp(26px, 4vw, 38px)",
              fontWeight: 700,
              color: "#FAFAF9",
              margin: "10px 0 0",
              letterSpacing: "-0.02em",
            }}
          >
            Plans that grow with your business
          </h2>
          <p style={{ fontSize: 15, color: "#8A8A8A", marginTop: 10 }}>
            Start free. Scale as you grow. No long-term contracts.
          </p>

          {/* Toggle */}
          <div style={{ display: "flex", justifyContent: "center", marginTop: 28 }}>
            <div
              role="tablist"
              aria-label="Billing period"
              style={{
                display: "inline-flex",
                padding: 4,
                background: "rgba(15,15,15,0.85)",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: 999,
                gap: 4,
              }}
            >
              {(["monthly", "annual"] as const).map((opt) => {
                const active = billing === opt;
                return (
                  <button
                    key={opt}
                    role="tab"
                    aria-selected={active}
                    onClick={() => setBilling(opt)}
                    style={{
                      appearance: "none",
                      border: "none",
                      cursor: "pointer",
                      background: active ? "linear-gradient(135deg, #EA580C, #C2410C)" : "transparent",
                      color: active ? "#FFFFFF" : "#8A8A8A",
                      fontSize: 13,
                      fontWeight: 600,
                      padding: "8px 18px",
                      borderRadius: 999,
                      transition: "all 0.15s",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 8,
                      boxShadow: active ? "0 6px 18px rgba(234,88,12,0.35)" : "none",
                    }}
                  >
                    {opt === "monthly" ? "Monthly" : "Annual"}
                    {opt === "annual" && (
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          letterSpacing: "0.04em",
                          background: active ? "rgba(255,255,255,0.2)" : "rgba(34, 197, 94, 0.15)",
                          color: active ? "#FFFFFF" : "#22C55E",
                          padding: "2px 6px",
                          borderRadius: 4,
                        }}
                      >
                        SAVE 20%
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div
          className="ps-pricing-grid"
          style={{
            maxWidth: 1000,
            margin: "32px auto 0",
            display: "grid",
            gap: 18,
          }}
        >
          {PLANS.map((p) => {
            const isCustom = p.monthly === null;
            const monthlyEffective = isCustom
              ? null
              : billing === "annual"
                ? Math.round(p.monthly! * (1 - ANNUAL_DISCOUNT))
                : p.monthly!;
            const priceLabel = isCustom ? "Custom" : `$${monthlyEffective}`;
            const perLabel = isCustom ? "" : "/month";
            const billedNote = isCustom
              ? null
              : billing === "annual"
                ? `Billed annually ($${monthlyEffective! * 12}/yr)`
                : "Billed monthly";

            return (
              <div
                key={p.name}
                style={{
                  position: "relative",
                  background: p.featured
                    ? "linear-gradient(135deg, rgba(20,12,8,0.95) 0%, rgba(15,15,15,0.95) 100%)"
                    : "rgba(15,15,15,0.7)",
                  border: p.featured
                    ? "1px solid rgba(234,88,12,0.45)"
                    : "1px solid rgba(255,255,255,0.06)",
                  borderRadius: 14,
                  padding: "32px 26px",
                  display: "flex",
                  flexDirection: "column",
                  boxShadow: p.featured ? "0 30px 60px rgba(234,88,12,0.18)" : "none",
                  overflow: "hidden",
                }}
              >
                {p.featured && (
                  <div
                    aria-hidden
                    style={{
                      position: "absolute",
                      top: -60,
                      right: -60,
                      width: 200,
                      height: 200,
                      background:
                        "radial-gradient(circle, rgba(234,88,12,0.4) 0%, rgba(234,88,12,0) 70%)",
                      filter: "blur(30px)",
                    }}
                  />
                )}
                {p.featured && (
                  <span
                    style={{
                      position: "absolute",
                      top: 14,
                      right: 14,
                      background: "linear-gradient(135deg, #EA580C, #C2410C)",
                      color: "#FFFFFF",
                      fontSize: 10,
                      fontWeight: 700,
                      padding: "4px 10px",
                      borderRadius: 999,
                      letterSpacing: "0.04em",
                      boxShadow: "0 6px 14px rgba(234,88,12,0.35)",
                    }}
                  >
                    MOST POPULAR
                  </span>
                )}

                <div style={{ position: "relative", zIndex: 1 }}>
                  <div style={{ fontSize: 16, fontWeight: 600, color: "#FAFAF9" }}>{p.name}</div>
                  <div style={{ marginTop: 12, display: "flex", alignItems: "baseline", gap: 4 }}>
                    <span style={{ fontSize: 38, fontWeight: 700, color: "#FAFAF9", lineHeight: 1 }}>
                      {priceLabel}
                    </span>
                    {perLabel && (
                      <span style={{ fontSize: 13, fontWeight: 400, color: "#6B6B6B" }}>{perLabel}</span>
                    )}
                  </div>
                  <div style={{ fontSize: 12, color: "#6B6B6B", marginTop: 4 }}>{p.sub}</div>
                  {billedNote && (
                    <div style={{ fontSize: 11, color: "#8A8A8A", marginTop: 6 }}>{billedNote}</div>
                  )}

                  <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", margin: "20px 0" }} />

                  <ul
                    style={{
                      listStyle: "none",
                      margin: 0,
                      padding: 0,
                      display: "flex",
                      flexDirection: "column",
                      gap: 10,
                    }}
                  >
                    {p.features.map((f) => (
                      <li key={f} style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                        <Check size={14} color="#22C55E" style={{ marginTop: 3, flexShrink: 0 }} />
                        <span style={{ fontSize: 13, color: "#9A9A9A", lineHeight: 1.5 }}>{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <Link
                  to={p.to}
                  style={{
                    marginTop: "auto",
                    paddingTop: 24,
                    textDecoration: "none",
                    position: "relative",
                    zIndex: 1,
                  }}
                >
                  <span
                    style={{
                      display: "block",
                      textAlign: "center",
                      background: p.featured ? "linear-gradient(135deg, #EA580C, #C2410C)" : "rgba(255,255,255,0.04)",
                      border: p.featured ? "none" : "1px solid rgba(255,255,255,0.12)",
                      color: "#FFFFFF",
                      fontSize: 14,
                      fontWeight: 600,
                      padding: "12px",
                      borderRadius: 10,
                      transition: "all 0.15s",
                      boxShadow: p.featured ? "0 8px 24px rgba(234,88,12,0.3)" : "none",
                    }}
                  >
                    {p.cta}
                  </span>
                </Link>
              </div>
            );
          })}
        </div>

        <ComparisonTable />
      </div>
    </section>
  );
}

const COMPARISON_GROUPS: {
  group: string;
  rows: { label: string; values: [boolean | string, boolean | string, boolean | string] }[];
}[] = [
  {
    group: "Catalog & monitoring",
    rows: [
      { label: "Products tracked", values: ["Up to 500", "Up to 5,000", "Unlimited"] },
      { label: "Competitor monitors", values: ["5", "Unlimited", "Unlimited"] },
      { label: "Price alerts and notifications", values: [true, true, true] },
      { label: "Competitive dashboard", values: ["Basic", "Advanced", "Advanced"] },
    ],
  },
  {
    group: "AI & automation",
    rows: [
      { label: "AI pricing recommendations", values: [false, true, true] },
      { label: "Custom AI model training", values: [false, false, true] },
      { label: "Promotion management & ROI simulator", values: [false, true, true] },
      { label: "Market benchmarks", values: [false, true, true] },
    ],
  },
  {
    group: "Omnichannel",
    rows: [
      { label: "Field intelligence (in-store)", values: [false, true, true] },
      { label: "ERP and POS integration", values: [false, false, true] },
      { label: "White-label option", values: [false, false, true] },
      { label: "Custom reporting", values: [false, false, true] },
    ],
  },
  {
    group: "Access & support",
    rows: [
      { label: "API access", values: [false, true, true] },
      { label: "Support", values: ["Email", "Priority", "Dedicated manager"] },
      { label: "SLA guarantee", values: [false, false, true] },
    ],
  },
];

function ComparisonCell({ value }: { value: boolean | string }) {
  if (value === true) return <Check size={16} color="#22C55E" aria-label="Included" />;
  if (value === false) return <Minus size={16} color="#3A3A3A" aria-label="Not included" />;
  return <span style={{ fontSize: 13, color: "#FAFAF9" }}>{value}</span>;
}

function ComparisonTable() {
  const headers = ["Scout", "Pro", "Enterprise"] as const;
  return (
    <div style={{ maxWidth: 960, margin: "64px auto 0" }}>
      <h3 style={{ fontSize: 20, fontWeight: 600, color: "#FAFAF9", textAlign: "center", margin: 0 }}>
        Compare every feature
      </h3>
      <p style={{ fontSize: 13, color: "#8A8A8A", textAlign: "center", marginTop: 8 }}>
        Full breakdown of what's included in each plan.
      </p>

      <style>{`
        .ps-compare-wrap { position: relative; margin-top: 28px; }
        .ps-compare-scroll {
          background: rgba(15,15,15,0.7);
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 14px;
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
        }
        .ps-compare-fade {
          pointer-events: none;
          position: absolute;
          top: 1px; right: 1px; bottom: 1px;
          width: 32px;
          border-top-right-radius: 14px;
          border-bottom-right-radius: 14px;
          background: linear-gradient(to right, rgba(15,15,15,0) 0%, rgba(15,15,15,0.95) 100%);
        }
        @media (min-width: 720px) { .ps-compare-fade { display: none; } }
        .ps-compare-table { width: 100%; min-width: 640px; border-collapse: separate; border-spacing: 0; font-size: 13px; }
        .ps-compare-table th, .ps-compare-table td { background: transparent; }
        .ps-compare-table tr.ps-group-row > th { background: rgba(0,0,0,0.4); }
        .ps-compare-table .ps-feat {
          position: sticky; left: 0; z-index: 2;
          background: rgba(15,15,15,0.95);
          box-shadow: 1px 0 0 0 rgba(255,255,255,0.06);
        }
      `}</style>
      <div className="ps-compare-wrap">
        <div className="ps-compare-scroll">
          <table className="ps-compare-table">
            <thead>
              <tr>
                <th
                  scope="col"
                  className="ps-feat"
                  style={{
                    textAlign: "left",
                    padding: "16px 20px",
                    fontWeight: 500,
                    color: "#6B6B6B",
                    fontSize: 11,
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                    width: "40%",
                  }}
                >
                  Feature
                </th>
                {headers.map((h) => (
                  <th
                    key={h}
                    scope="col"
                    style={{
                      textAlign: "center",
                      padding: "16px 20px",
                      fontWeight: 600,
                      color: h === "Pro" ? "#EA580C" : "#FAFAF9",
                      fontSize: 14,
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {COMPARISON_GROUPS.map((g) => (
                <Fragment key={g.group}>
                  <tr className="ps-group-row">
                    <th
                      scope="colgroup"
                      colSpan={4}
                      className="ps-feat"
                      style={{
                        textAlign: "left",
                        padding: "12px 20px",
                        fontSize: 11,
                        fontWeight: 600,
                        color: "#EA580C",
                        textTransform: "uppercase",
                        letterSpacing: "0.08em",
                        borderTop: "1px solid rgba(255,255,255,0.06)",
                        borderBottom: "1px solid rgba(255,255,255,0.06)",
                      }}
                    >
                      {g.group}
                    </th>
                  </tr>
                  {g.rows.map((row) => (
                    <tr key={row.label}>
                      <th
                        scope="row"
                        className="ps-feat"
                        style={{
                          textAlign: "left",
                          padding: "14px 20px",
                          fontWeight: 400,
                          color: "#C7C7C5",
                          fontSize: 13,
                          borderBottom: "1px solid rgba(255,255,255,0.04)",
                        }}
                      >
                        {row.label}
                      </th>
                      {row.values.map((v, i) => (
                        <td
                          key={i}
                          style={{
                            textAlign: "center",
                            padding: "14px 20px",
                            borderBottom: "1px solid rgba(255,255,255,0.04)",
                          }}
                        >
                          <ComparisonCell value={v} />
                        </td>
                      ))}
                    </tr>
                  ))}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
        <div className="ps-compare-fade" aria-hidden="true" />
      </div>
    </div>
  );
}

/* ============================================================================
   FAQ
   ========================================================================= */

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
    a: "Three things. First, we cover both online and physical retail, not just online. Second, our AI model is trained on your specific data and improves every month, meaning recommendations get more accurate over time. Third, we are built specifically for the Middle East market with local platform coverage that global tools do not offer.",
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
  const [openIdx, setOpenIdx] = useState<number | null>(0);
  return (
    <section id="faq" style={{ background: "#050505", padding: "80px 20px" }}>
      <div style={{ maxWidth: 760, margin: "0 auto" }}>
        <h2
          style={{
            fontSize: "clamp(24px, 3.5vw, 32px)",
            fontWeight: 700,
            color: "#FAFAF9",
            textAlign: "center",
            margin: 0,
            letterSpacing: "-0.02em",
          }}
        >
          Got any{" "}
          <span
            style={{
              background: "linear-gradient(90deg, #EA580C, #FB923C)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            Questions?
          </span>
        </h2>

        <div style={{ marginTop: 36, display: "flex", flexDirection: "column", gap: 10 }}>
          {FAQS.map((item, i) => {
            const isOpen = openIdx === i;
            return (
              <div
                key={i}
                style={{
                  background: "rgba(15,15,15,0.7)",
                  border: `1px solid ${isOpen ? "rgba(234,88,12,0.35)" : "rgba(255,255,255,0.06)"}`,
                  borderRadius: 12,
                  transition: "border-color 0.2s",
                }}
              >
                <button
                  onClick={() => setOpenIdx(isOpen ? null : i)}
                  style={{
                    width: "100%",
                    background: "none",
                    border: "none",
                    padding: "16px 20px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    cursor: "pointer",
                    textAlign: "left",
                  }}
                >
                  <span style={{ fontSize: 14, fontWeight: 500, color: "#FAFAF9" }}>{item.q}</span>
                  <span
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: "50%",
                      background: isOpen ? "rgba(234,88,12,0.15)" : "rgba(255,255,255,0.06)",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                      marginLeft: 12,
                      transition: "background 0.2s",
                    }}
                  >
                    <ChevronDown
                      size={14}
                      color={isOpen ? "#EA580C" : "#9A9A9A"}
                      style={{
                        transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
                        transition: "transform 0.2s",
                      }}
                    />
                  </span>
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
                        fontSize: 13,
                        fontWeight: 400,
                        color: "#9A9A9A",
                        lineHeight: 1.7,
                        padding: "0 20px 18px",
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
      </div>
    </section>
  );
}

/* ============================================================================
   FINAL CTA — heavy glow
   ========================================================================= */

function CTASection() {
  return (
    <section
      style={{
        position: "relative",
        background: "#050505",
        padding: "100px 20px",
        textAlign: "center",
        overflow: "hidden",
      }}
    >
      {/* Big radial glow */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: "-20% 0",
          background:
            "radial-gradient(ellipse at center, rgba(234,88,12,0.45) 0%, rgba(234,88,12,0.15) 30%, rgba(5,5,5,0) 70%)",
          filter: "blur(40px)",
          pointerEvents: "none",
        }}
      />
      <div style={{ position: "relative", zIndex: 1, maxWidth: 720, margin: "0 auto" }}>
        <p
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: "#EA580C",
            textTransform: "uppercase",
            letterSpacing: "0.12em",
            margin: 0,
          }}
        >
          Outsmart the market
        </p>
        <h2
          style={{
            fontSize: "clamp(32px, 5vw, 52px)",
            fontWeight: 700,
            color: "#FAFAF9",
            margin: "16px 0 0",
            lineHeight: 1.1,
            letterSpacing: "-0.02em",
          }}
        >
          Ready to price on{" "}
          <span
            style={{
              background: "linear-gradient(90deg, #EA580C, #FB923C)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            God Mode?
          </span>
        </h2>
        <p
          style={{
            fontSize: 15,
            color: "#9A9A9A",
            marginTop: 14,
            maxWidth: 480,
            marginLeft: "auto",
            marginRight: "auto",
            lineHeight: 1.6,
          }}
        >
          Join commerce brands using PrizeSkout to monitor every competitor and optimize every
          price across every channel.
        </p>
        <div style={{ marginTop: 32 }}>
          <Link
            to="/signup"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 10,
              background: "linear-gradient(135deg, #EA580C, #C2410C)",
              color: "#FFFFFF",
              fontSize: 15,
              fontWeight: 600,
              padding: "15px 36px",
              borderRadius: 12,
              textDecoration: "none",
              transition: "transform 0.15s, box-shadow 0.15s",
              boxShadow: "0 16px 40px rgba(234,88,12,0.45)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateY(-2px)";
              e.currentTarget.style.boxShadow = "0 22px 50px rgba(234,88,12,0.55)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = "0 16px 40px rgba(234,88,12,0.45)";
            }}
          >
            Start your free trial
            <ArrowRight size={15} />
          </Link>
        </div>
        <p style={{ marginTop: 14, fontSize: 12, color: "#6B6B6B" }}>
          14-day free trial · No credit card required
        </p>
      </div>
    </section>
  );
}

/* ============================================================================
   PAGE
   ========================================================================= */

function LandingPage() {
  return (
    <MarketingShell>
      <style>{`
        /* Hero grid */
        .ps-hero-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 48px;
          align-items: center;
          text-align: center;
        }
        .ps-hero-copy { display: flex; flex-direction: column; align-items: center; }
        .ps-hero-ctas { justify-content: center; }
        .ps-hero-title { font-size: clamp(40px, 7vw, 68px); }
        .ps-hero-sub { font-size: 15px; }

        /* Split sections */
        .ps-split { grid-template-columns: 1fr; }
        .ps-split-copy, .ps-split-mock { width: 100%; }

        /* Hub grid */
        .ps-hub-grid { grid-template-columns: 1fr; }

        /* Pricing */
        .ps-pricing-grid { grid-template-columns: 1fr; }

        @media (min-width: 768px) {
          .ps-hero-grid {
            grid-template-columns: 1.05fr 1fr;
            text-align: left;
          }
          .ps-hero-copy { align-items: flex-start; }
          .ps-hero-ctas { justify-content: flex-start; }

          .ps-split { grid-template-columns: 1fr 1fr; gap: 60px; }
          .ps-split-reverse .ps-split-mock { order: 2; }
          .ps-split-reverse .ps-split-copy { order: 1; }

          .ps-hub-grid { grid-template-columns: 1.4fr 1fr; }

          .ps-pricing-grid { grid-template-columns: repeat(3, 1fr); }
        }
      `}</style>
      <Hero />
      <LogosBar />

      <SplitSection
        eyebrow="Competitive intelligence"
        title={
          <>
            Skip the spreadsheets.{" "}
            <span style={{ background: "linear-gradient(90deg, #EA580C, #FB923C)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
              Just ask.
            </span>
          </>
        }
        subtitle="Stop pulling reports. PrizeSkout monitors competitors in real time across every channel — online and in-store — and answers questions in plain English."
        bullets={[
          { Icon: Crosshair, title: "Live price tracking", desc: "Every competitor SKU, every channel, refreshed continuously." },
          { Icon: BarChart3, title: "Promo & stock signals", desc: "Catch promotions, depletions, and reprice events the moment they happen." },
          { Icon: MapPin, title: "In-store coverage", desc: "Field intelligence captures what scrapers can't see." },
        ]}
        mockup={<CompetitorMockup />}
      />

      <SplitSection
        reverse
        eyebrow="AI Pricing"
        title={
          <>
            Data-driven{" "}
            <span style={{ background: "linear-gradient(90deg, #EA580C, #FB923C)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
              "price"
            </span>{" "}
            signals.
          </>
        }
        subtitle="The AI learns your margins, elasticity, and market context — then tells you exactly what to price, when, and why. Confidence-scored. Citation-backed."
        bullets={[
          { Icon: TrendingUp, title: "Specific recommendations", desc: "Not 'consider raising' — exact numbers with the rationale and risk." },
          { Icon: Sparkles, title: "Gets smarter weekly", desc: "Your private model improves every week with your data and outcomes." },
        ]}
        mockup={<AIRecMockup />}
      />

      <SplitSection
        eyebrow="Promotions"
        title={
          <>
            Set it. Forget it.{" "}
            <span style={{ background: "linear-gradient(90deg, #EA580C, #FB923C)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
              Save margin.
            </span>
          </>
        }
        subtitle="Simulate every campaign before it goes live. See ROI, cannibalization, and competitor response — and catch margin-eaters before they cost you."
        bullets={[
          { Icon: Megaphone, title: "ROI simulator", desc: "Model depth, duration, and channel mix to find the healthy promo window." },
          { Icon: Target, title: "Cannibalization alerts", desc: "Know when a promo is stealing from full-price units." },
        ]}
        mockup={<ROIMockup />}
      />

      <div id="features">
        <HubSection />
      </div>
      <div id="how-it-works" />
      <Testimonials />
      <Pricing />
      <FAQ />
      <CTASection />
    </MarketingShell>
  );
}
