import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect } from "react";
import { ArrowRight, Zap, ShieldCheck, TrendingUp, Globe, Award } from "lucide-react";
import { useTranslation } from "react-i18next";
import { MarketingShell } from "@/components/marketing/MarketingShell";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "PrizeSkout | The pricing brain behind retail" },
      {
        name: "description",
        content:
          "License the APIs that decide, sync, and defend prices across every channel, under your brand, inside your platform, without PrizeSkout ever appearing.",
      },
      {
        property: "og:title",
        content: "PrizeSkout | The pricing brain behind retail",
      },
      {
        property: "og:description",
        content:
          "License the APIs that decide, sync, and defend prices across every channel, under your brand, inside your platform, without PrizeSkout ever appearing.",
      },
    ],
  }),
  component: LandingPage,
});

const MONO_STACK =
  "'JetBrains Mono', 'SFMono-Regular', Menlo, Consolas, 'Liberation Mono', monospace";

const ORANGE = "#EA580C";
const ORANGE_LIGHT = "#FB923C";
const BG = "#050505";
const BG_RAISED = "#0A0A0A";
const BG_PANEL = "#0F0E14";
const BORDER = "#1A1A1A";
const TEXT = "#FAFAF9";
const TEXT_MUTED = "#9A9A9A";
const TEXT_DIM = "#6B6B6B";

/* ============================================================================
   Eyebrow label
   ========================================================================= */

function Eyebrow({ children, color = ORANGE_LIGHT }: { children: React.ReactNode; color?: string }) {
  return (
    <span
      style={{
        display: "inline-block",
        fontSize: 11,
        fontWeight: 600,
        letterSpacing: "0.12em",
        textTransform: "uppercase",
        color,
      }}
    >
      {children}
    </span>
  );
}

/* ============================================================================
   HERO
   ========================================================================= */

const HERO_CODE = `// A competitor just dropped their price.
// Your platform responds in under 2 seconds.

{
  "event": "rule.price_change_fired",
  "sku": "sku_galaxy_buds_2_pro",
  "new_price": 455.00,
  "trigger": "carrefour_price_drop",
  "channels": ["talabat", "website", "app"]
}`;

function Hero() {
  return (
    <section
      style={{
        position: "relative",
        background: BG,
        paddingTop: 96,
        paddingBottom: 72,
        overflow: "hidden",
      }}
      className="px-5 md:px-10"
    >
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
            "radial-gradient(ellipse at center, rgba(234,88,12,0.22) 0%, rgba(234,88,12,0.08) 30%, rgba(5,5,5,0) 65%)",
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
        <div className="ps-hero-copy">
          <Eyebrow>Pricing infrastructure · GCC-native · Global-ready</Eyebrow>
          <h1
            className="ps-hero-title"
            style={{
              fontWeight: 700,
              color: TEXT,
              lineHeight: 1.05,
              letterSpacing: "-0.02em",
              margin: "18px 0 0",
            }}
          >
            The pricing brain behind retail.{" "}
            <span
              style={{
                fontStyle: "normal",
                background: `linear-gradient(90deg, ${ORANGE}, ${ORANGE_LIGHT})`,
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              Invisible by design.
            </span>
          </h1>

          <p
            className="ps-hero-sub"
            style={{
              marginTop: 22,
              color: TEXT_MUTED,
              lineHeight: 1.6,
              maxWidth: 540,
              fontSize: 16,
            }}
          >
            License the APIs that decide, sync, and defend prices across every channel, under your brand, inside your platform, without PrizeSkout ever appearing.
          </p>

          <div
            style={{
              marginTop: 32,
              display: "flex",
              gap: 12,
              flexWrap: "wrap",
            }}
          >
            <Link
              to="/signup"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                background: `linear-gradient(135deg, ${ORANGE}, #C2410C)`,
                color: "#FFFFFF",
                fontSize: 14,
                fontWeight: 600,
                padding: "12px 22px",
                borderRadius: 8,
                textDecoration: "none",
                boxShadow: "0 10px 28px rgba(234,88,12,0.32)",
              }}
            >
              Get API keys, free
              <ArrowRight size={14} />
            </Link>
            <Link
              to="/contact"
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.10)",
                color: TEXT,
                fontSize: 14,
                fontWeight: 500,
                padding: "12px 22px",
                borderRadius: 8,
                textDecoration: "none",
              }}
            >
              Talk to partnerships
            </Link>
          </div>

          {/* QSTP trust badge */}
          <div
            style={{
              marginTop: 28,
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.10)",
              borderRadius: 999,
              padding: "7px 14px",
            }}
          >
            <Award size={13} color={ORANGE_LIGHT} strokeWidth={2} />
            <span style={{ fontSize: 12, fontWeight: 600, color: "rgba(250,250,249,0.75)", letterSpacing: "0.02em" }}>
              Backed by{" "}
              <span style={{ color: TEXT }}>Qatar Science &amp; Technology Park (QSTP)</span>
            </span>
          </div>
        </div>

        <div className="ps-hero-mock">
          <div
            style={{
              position: "relative",
              maxWidth: 600,
              margin: "0 auto",
            }}
          >
            <div
              aria-hidden
              style={{
                position: "absolute",
                inset: "-30% -15%",
                background:
                  "radial-gradient(ellipse at center, rgba(234,88,12,0.40) 0%, rgba(234,88,12,0.12) 35%, rgba(5,5,5,0) 70%)",
                filter: "blur(30px)",
                zIndex: 0,
              }}
            />
            <div
              style={{
                position: "relative",
                zIndex: 1,
                background: "rgba(10,10,10,0.92)",
                border: `1px solid ${BORDER}`,
                borderRadius: 14,
                overflow: "hidden",
                boxShadow:
                  "0 30px 80px rgba(0,0,0,0.5), 0 0 0 1px rgba(234,88,12,0.06) inset",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  borderBottom: `1px solid ${BORDER}`,
                  padding: "12px 16px",
                  fontFamily: MONO_STACK,
                  fontSize: 11.5,
                  color: TEXT_DIM,
                }}
              >
                <span>api.prizeskout.qa / v1 / rules</span>
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    background: "#22C55E",
                    boxShadow: "0 0 0 3px rgba(34,197,94,0.15)",
                  }}
                />
              </div>
              <pre
                style={{
                  margin: 0,
                  padding: "20px 22px",
                  fontSize: 12.5,
                  lineHeight: 1.7,
                  fontFamily: MONO_STACK,
                  color: "#D4D4D4",
                  background: "transparent",
                  overflow: "auto",
                }}
              >
                <code>{HERO_CODE}</code>
              </pre>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ============================================================================
   Trust strip — category pills
   ========================================================================= */

function TrustStrip() {
  const pills = [
    "Ecommerce platforms",
    "Mall operators",
    "Omnichannel retailers",
    "Consumer brands",
    "Delivery apps",
  ];
  return (
    <section
      style={{
        background: "#0A0913",
        borderTop: `1px solid ${BORDER}`,
        borderBottom: `1px solid ${BORDER}`,
        padding: "32px 0",
      }}
      className="px-5 md:px-10"
    >
      <div style={{ maxWidth: 1180, margin: "0 auto", textAlign: "center" }}>
        <div
          style={{
            fontSize: 10,
            fontWeight: 600,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: "rgba(250,250,249,0.45)",
            marginBottom: 18,
          }}
        >
          Built for platforms, malls, and retailers across GCC
        </div>
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "center",
            gap: 10,
          }}
        >
          {pills.map((p) => (
            <span
              key={p}
              style={{
                fontSize: 11.5,
                color: "rgba(250,250,249,0.7)",
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.09)",
                padding: "6px 12px",
                borderRadius: 999,
              }}
            >
              {p}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ============================================================================
   PARTNER BENEFITS — what brands and platforms unlock
   ========================================================================= */

const PARTNER_BENEFITS = [
  {
    Icon: Zap,
    title: "Launch pricing as a feature in days",
    desc: "19 production APIs, a sandbox, and full documentation on day one. No research sprint, no build-from-scratch. Your engineers integrate; we run the infrastructure.",
  },
  {
    Icon: ShieldCheck,
    title: "Your brand on every surface",
    desc: "Recommendations, widgets, and data carry your logo — not ours. Set powered_by_visible: false and PrizeSkout disappears completely. Merchants trust you more.",
  },
  {
    Icon: TrendingUp,
    title: "Win enterprise deals you couldn't close before",
    desc: "Procurement teams ask for audit trails, MAP monitoring, and compliance dashboards. We build that layer. You walk in with proof. You get the contract.",
  },
  {
    Icon: Globe,
    title: "GCC-native from the ground up",
    desc: "Arabic-first UI, QAR/SAR/AED pricing norms, and live data coverage across Qatar, UAE, and KSA. Not a Western product adapted for the region — built here.",
  },
];

function PartnerBenefits() {
  return (
    <section
      style={{
        background: "#0A0913",
        padding: "88px 0",
        borderTop: `1px solid ${BORDER}`,
        borderBottom: `1px solid ${BORDER}`,
      }}
      className="px-5 md:px-10"
    >
      <div style={{ maxWidth: 1180, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 52 }}>
          <Eyebrow>For brands and platforms</Eyebrow>
          <h2
            className="ps-section-title"
            style={{ color: TEXT, marginTop: 14 }}
          >
            One licence. Four things you unlock immediately.
          </h2>
        </div>

        <div className="ps-benefits-grid" style={{ display: "grid", gap: 16 }}>
          {PARTNER_BENEFITS.map(({ Icon, title, desc }) => (
            <div
              key={title}
              style={{
                background: BG_RAISED,
                border: `1px solid ${BORDER}`,
                borderRadius: 12,
                padding: "28px 24px",
              }}
            >
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 10,
                  background: "rgba(234,88,12,0.10)",
                  border: "1px solid rgba(234,88,12,0.22)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: 18,
                }}
              >
                <Icon size={18} color={ORANGE_LIGHT} strokeWidth={1.75} />
              </div>
              <div
                style={{
                  fontSize: 16,
                  fontWeight: 600,
                  color: TEXT,
                  lineHeight: 1.35,
                  marginBottom: 10,
                }}
              >
                {title}
              </div>
              <div
                style={{
                  fontSize: 13.5,
                  color: TEXT_MUTED,
                  lineHeight: 1.65,
                }}
              >
                {desc}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ============================================================================
   PROBLEM
   ========================================================================= */

function ProblemSection() {
  const pains = [
    {
      n: "Pain 01",
      title: "Your merchants lose sales to competitors who repriced six hours ago",
      desc: "Without real-time intelligence, every merchant on your platform is flying blind while their rivals react to market moves in minutes.",
    },
    {
      n: "Pain 02",
      title: "Prices are wrong on Talabat but right on the website. Again.",
      desc: "Omnichannel price inconsistency destroys trust and margin simultaneously. No platform has solved this natively. PrizeSkout does it in one API call.",
    },
    {
      n: "Pain 03",
      title: "Enterprise deals stall because you cannot show pricing governance",
      desc: "Large retailers and brands need audit trails, compliance reports, and MAP monitoring. Your platform has none of it. PrizeSkout builds it in.",
    },
  ];

  return (
    <section
      style={{
        background: "#FAFAF9",
        padding: "88px 0",
      }}
      className="px-5 md:px-10"
    >
      <div style={{ maxWidth: 1180, margin: "0 auto" }}>
        <div style={{ marginBottom: 48, maxWidth: 760 }}>
          <Eyebrow color={ORANGE}>The problem</Eyebrow>
          <h2
            className="ps-section-title"
            style={{
              color: "#1A1A18",
              marginTop: 14,
              fontWeight: 700,
              letterSpacing: "-0.02em",
            }}
          >
            Your platform is powerful. Pricing is still a spreadsheet.
          </h2>
          <p
            style={{
              color: "#4A4A48",
              fontSize: 16,
              lineHeight: 1.65,
              marginTop: 18,
            }}
          >
            Your merchants are competing against platforms that reprice automatically, respond to competitors in real time, and run intelligent promotions without a team. You can give them that. Without building it yourself.
          </p>
        </div>

        <div
          style={{
            display: "grid",
            gap: 20,
          }}
          className="ps-problem-grid"
        >
          {pains.map((p) => (
            <div
              key={p.n}
              style={{
                background: "#FFFFFF",
                borderTop: `3px solid ${ORANGE}`,
                border: "1px solid #E5E7EB",
                borderTopColor: ORANGE,
                borderTopWidth: 3,
                borderRadius: 8,
                padding: 28,
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  fontFamily: MONO_STACK,
                  fontWeight: 600,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  color: ORANGE,
                  marginBottom: 14,
                }}
              >
                {p.n}
              </div>
              <div
                style={{
                  fontSize: 17,
                  fontWeight: 700,
                  color: "#1A1A18",
                  lineHeight: 1.35,
                  marginBottom: 12,
                }}
              >
                {p.title}
              </div>
              <div
                style={{
                  fontSize: 14,
                  color: "#4A4A48",
                  lineHeight: 1.6,
                }}
              >
                {p.desc}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ============================================================================
   HOW IT WORKS
   ========================================================================= */

function HowItWorks() {
  const steps = [
    {
      n: "01",
      title: "License the infrastructure",
      desc: "One platform API key, scoped to your project. Access all 19 APIs in sandbox with no rate limits. Go live in an afternoon.",
    },
    {
      n: "02",
      title: "Embed under your brand",
      desc: "White-label widgets, enriched webhooks, and scoped keys, all branded to your platform. Set powered_by_visible: false and disappear.",
    },
    {
      n: "03",
      title: "Launch as your feature",
      desc: 'Your merchants see "Smart Pricing by [Your Platform]." They get the intelligence. You get the credit. We get the licence fee.',
    },
  ];

  return (
    <section
      style={{
        background: BG,
        padding: "88px 0",
        borderTop: `1px solid ${BORDER}`,
      }}
      className="px-5 md:px-10"
    >
      <div style={{ maxWidth: 1180, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 56 }}>
          <Eyebrow>How it works</Eyebrow>
          <h2
            className="ps-section-title"
            style={{ color: TEXT, marginTop: 14 }}
          >
            One licence. Three steps. Zero exposure.
          </h2>
          <p
            style={{
              color: TEXT_MUTED,
              fontSize: 15,
              lineHeight: 1.65,
              maxWidth: 640,
              margin: "16px auto 0",
            }}
          >
            PrizeSkout is infrastructure. Your merchants see your product. We stay in the background and keep it running.
          </p>
        </div>

        <div
          style={{
            display: "grid",
            gap: 18,
          }}
          className="ps-quickstart-grid"
        >
          {steps.map((s) => (
            <div
              key={s.n}
              style={{
                background: BG_RAISED,
                border: `1px solid ${BORDER}`,
                borderRadius: 12,
                padding: 28,
              }}
            >
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: "50%",
                  background: "rgba(234,88,12,0.12)",
                  border: "1px solid rgba(234,88,12,0.30)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontFamily: MONO_STACK,
                  fontSize: 14,
                  fontWeight: 700,
                  color: ORANGE_LIGHT,
                  marginBottom: 18,
                }}
              >
                {s.n}
              </div>
              <div
                style={{
                  fontSize: 17,
                  fontWeight: 600,
                  color: TEXT,
                  marginBottom: 10,
                }}
              >
                {s.title}
              </div>
              <div
                style={{
                  fontSize: 14,
                  color: TEXT_MUTED,
                  lineHeight: 1.6,
                }}
              >
                {s.desc}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ============================================================================
   PRODUCT PILLARS — 19 APIs / Four pillars
   ========================================================================= */

function ProductPillars() {
  const pillars = [
    {
      name: "Price operations",
      outcome: "Every price, every channel, always in sync.",
      apis: [
        { method: "POST", path: "/v1/sync", label: "Omnichannel Price Sync" },
        { method: "POST", path: "/v1/rules", label: "Price Rules Engine" },
        { method: "GET", path: "/v1/margin", label: "Margin Intelligence" },
        { method: "POST", path: "/v1/flash", label: "Flash Sale Orchestration" },
      ],
    },
    {
      name: "Commerce intelligence",
      outcome: "AI recommendations that protect margin and react to competitors.",
      apis: [
        { method: "POST", path: "/v1/dynprice", label: "Dynamic Pricing Engine" },
        { method: "GET", path: "/v1/audit", label: "Governance & Audit" },
        { method: "POST", path: "/v1/intent", label: "Shopper Intent" },
        { method: "POST", path: "/v1/embed", label: "White-Label Embed" },
      ],
    },
    {
      name: "Commerce events",
      outcome: "Real-time event stream your engineers can build anything on top of.",
      apis: [
        { method: "POST", path: "/v1/events", label: "Event Firehose" },
        { method: "POST", path: "/v1/webhooks", label: "Signed Webhooks" },
        { method: "GET", path: "/v1/replay", label: "Event Replay Log" },
        { method: "POST", path: "/v1/enrich", label: "Enrichment Pipeline" },
      ],
    },
    {
      name: "Platform infrastructure",
      outcome: "Multi-tenant, metered, and governed — built for platforms at scale.",
      apis: [
        { method: "POST", path: "/v1/keys", label: "Scoped API Keys" },
        { method: "GET", path: "/v1/usage", label: "Usage Metering" },
        { method: "POST", path: "/v1/tenants", label: "Multi-Tenant Ops" },
        { method: "GET", path: "/v1/health", label: "Status & Health" },
      ],
    },
  ];

  return (
    <section
      id="pillars"
      style={{
        background: BG,
        padding: "88px 0",
        borderTop: `1px solid ${BORDER}`,
      }}
      className="px-5 md:px-10"
    >
      <div style={{ maxWidth: 1180, margin: "0 auto" }}>
        <div style={{ marginBottom: 48, maxWidth: 760 }}>
          <Eyebrow>The product</Eyebrow>
          <h2
            className="ps-section-title"
            style={{ color: TEXT, marginTop: 14 }}
          >
            19 APIs. Four pillars. One clean surface.
          </h2>
          <p
            style={{
              color: TEXT_MUTED,
              fontSize: 15,
              lineHeight: 1.65,
              marginTop: 16,
            }}
          >
            Every API is designed to sit deep in your operational stack, not on the surface where it can be replaced.
          </p>
        </div>

        <div
          style={{
            display: "grid",
            gap: 14,
          }}
          className="ps-pillar-grid"
        >
          {pillars.map((p) => (
            <div
              key={p.name}
              style={{
                background: BG_RAISED,
                border: `1px solid ${BORDER}`,
                borderRadius: 12,
                padding: 22,
              }}
            >
              <div
                style={{
                  fontSize: 15,
                  fontWeight: 600,
                  color: TEXT,
                  marginBottom: 6,
                }}
              >
                {p.name}
              </div>
              <div
                style={{
                  fontSize: 12.5,
                  color: TEXT_MUTED,
                  lineHeight: 1.5,
                  marginBottom: 12,
                }}
              >
                {p.outcome}
              </div>
              <div
                style={{
                  fontSize: 11,
                  color: ORANGE_LIGHT,
                  fontFamily: MONO_STACK,
                  marginBottom: 14,
                  letterSpacing: "0.04em",
                }}
              >
                {p.apis.length} APIs
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {p.apis.map((a) => (
                  <div
                    key={a.path}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      fontSize: 12,
                      fontFamily: MONO_STACK,
                      color: "#C4C4C4",
                    }}
                  >
                    <span
                      style={{
                        fontSize: 9.5,
                        fontWeight: 700,
                        color: a.method === "GET" ? "#60A5FA" : ORANGE_LIGHT,
                        background:
                          a.method === "GET"
                            ? "rgba(96,165,250,0.10)"
                            : "rgba(234,88,12,0.10)",
                        padding: "2px 6px",
                        borderRadius: 3,
                        letterSpacing: "0.05em",
                      }}
                    >
                      {a.method}
                    </span>
                    <span style={{ color: TEXT, fontSize: 11.5 }}>{a.path}</span>
                    <span style={{ color: TEXT_DIM, fontSize: 11 }}>{a.label}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ============================================================================
   WHITE-LABEL split panel
   ========================================================================= */

function WhiteLabelSection() {
  return (
    <section
      style={{
        background: BG,
        padding: "88px 0",
        borderTop: `1px solid ${BORDER}`,
      }}
      className="px-5 md:px-10"
    >
      <div style={{ maxWidth: 1180, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 56, maxWidth: 760, marginLeft: "auto", marginRight: "auto" }}>
          <Eyebrow>White-label by default</Eyebrow>
          <h2
            className="ps-section-title"
            style={{ color: TEXT, marginTop: 14 }}
          >
            Your name on the intelligence. Our engine underneath.
          </h2>
          <p
            style={{
              color: TEXT_MUTED,
              fontSize: 15,
              lineHeight: 1.65,
              marginTop: 16,
            }}
          >
            Every surface PrizeSkout powers can carry your brand. Your merchants never see us. Your enterprise buyers never ask about us. We work best when we are invisible.
          </p>
        </div>

        <div className="ps-wl-grid" style={{ display: "grid", gap: 14 }}>
          {/* What the merchant sees */}
          <div
            style={{
              background: "#F9FAFB",
              borderRadius: 14,
              padding: 28,
              border: "1px solid #E5E7EB",
            }}
          >
            <div
              style={{
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                color: "#6B7280",
                marginBottom: 20,
              }}
            >
              What your merchant sees
            </div>
            <div
              style={{
                background: "#FFFFFF",
                border: "1px solid #E5E7EB",
                borderRadius: 10,
                padding: 22,
                marginBottom: 12,
              }}
            >
              <div style={{ fontSize: 11, color: "#6B7280", marginBottom: 6 }}>
                Smart Pricing
              </div>
              <div style={{ fontSize: 11, color: "#9CA3AF", marginBottom: 18 }}>
                Powered by Your Platform
              </div>
              <div style={{ fontSize: 13, color: "#1A1A18", marginBottom: 4 }}>
                Price recommendation:
              </div>
              <div
                style={{
                  fontSize: 32,
                  fontWeight: 700,
                  color: "#1A1A18",
                  letterSpacing: "-0.02em",
                  marginBottom: 6,
                }}
              >
                QAR 455
              </div>
              <div style={{ fontSize: 12, color: "#6B7280" }}>
                Competitor moved · confidence 91%
              </div>
            </div>
            <div
              style={{
                background: "#FFFFFF",
                border: "1px solid #E5E7EB",
                borderRadius: 10,
                padding: 22,
              }}
            >
              <div style={{ fontSize: 11, color: "#6B7280", marginBottom: 6 }}>
                Price competitiveness
              </div>
              <div style={{ fontSize: 22, fontWeight: 700, color: "#1A1A18" }}>
                Top 18%
              </div>
              <div style={{ fontSize: 12, color: "#6B7280", marginTop: 4 }}>
                Electronics · Qatar market
              </div>
            </div>
            <div
              style={{
                marginTop: 18,
                fontSize: 11,
                fontStyle: "italic",
                color: "#9CA3AF",
                textAlign: "center",
              }}
            >
              No mention of PrizeSkout anywhere
            </div>
          </div>

          {/* What is powering it */}
          <div
            style={{
              background: BG_PANEL,
              borderRadius: 14,
              padding: 28,
              border: `1px solid ${BORDER}`,
            }}
          >
            <div
              style={{
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                color: TEXT_DIM,
                marginBottom: 20,
              }}
            >
              What is powering it
            </div>
            <pre
              style={{
                margin: 0,
                padding: 18,
                background: "#000",
                border: `1px solid ${BORDER}`,
                borderRadius: 10,
                fontSize: 11.5,
                lineHeight: 1.7,
                fontFamily: MONO_STACK,
                color: "#D4D4D4",
                overflow: "auto",
              }}
            >
              <code>{`POST /v1/dynprice
{
  "sku": "sku_galaxy_buds_2_pro",
  "channel": "talabat",
  "objective": "protect_share",
  "powered_by_visible": false
}

→ 200 OK · 142ms
{
  "recommended_price": 455.00,
  "currency": "QAR",
  "confidence": 0.91,
  "reason": "carrefour_price_drop",
  "branding": "your_platform"
}`}</code>
            </pre>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ============================================================================
   ENTERPRISE GRADE stats
   ========================================================================= */

function EnterpriseStats() {
  const stats = [
    { value: "19", label: "Production APIs" },
    { value: "<2s", label: "Repricing response" },
    { value: "AR + EN", label: "Arabic-first" },
    { value: "GCC", label: "Built for the region" },
    { value: "QSTP", label: "Qatar Science & Technology Park" },
  ];

  return (
    <section
      style={{
        background: BG,
        padding: "88px 0",
        borderTop: `1px solid ${BORDER}`,
      }}
      className="px-5 md:px-10"
    >
      <div style={{ maxWidth: 1180, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 56 }}>
          <Eyebrow>Enterprise grade</Eyebrow>
          <h2
            className="ps-section-title"
            style={{ color: TEXT, marginTop: 14 }}
          >
            Infrastructure you can stake an enterprise deal on
          </h2>
        </div>

        <div className="ps-stats-grid" style={{ display: "grid", gap: 14 }}>
          {stats.map((s) => {
            const isQstp = s.value === "QSTP";
            return (
              <div
                key={s.label}
                style={{
                  background: isQstp ? "rgba(234,88,12,0.06)" : BG_RAISED,
                  border: isQstp ? `1px solid rgba(234,88,12,0.28)` : `1px solid ${BORDER}`,
                  borderRadius: 12,
                  padding: "26px 22px",
                  textAlign: "center",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                }}
              >
                {isQstp && (
                  <Award size={20} color={ORANGE_LIGHT} strokeWidth={1.75} />
                )}
                <div
                  style={{
                    fontSize: isQstp ? 22 : 32,
                    fontWeight: 700,
                    color: ORANGE_LIGHT,
                    letterSpacing: "-0.02em",
                    fontFamily: MONO_STACK,
                  }}
                >
                  {s.value}
                </div>
                <div
                  style={{
                    fontSize: 12,
                    color: isQstp ? "rgba(250,250,249,0.65)" : TEXT_MUTED,
                    letterSpacing: "0.02em",
                    lineHeight: 1.4,
                  }}
                >
                  {s.label}
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
   PRICING
   ========================================================================= */

type LandingTierKey = "starter" | "standard" | "enterprise";
const LANDING_TIERS: { key: LandingTierKey; ctaTo: string; highlight: boolean }[] = [
  { key: "starter",    ctaTo: "/signup",  highlight: false },
  { key: "standard",   ctaTo: "/signup",  highlight: true  },
  { key: "enterprise", ctaTo: "/contact", highlight: false },
];

function PricingSection() {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.language === "ar";

  return (
    <section
      id="pricing"
      dir={isRtl ? "rtl" : "ltr"}
      style={{
        background: BG,
        padding: "88px 0",
        borderTop: `1px solid ${BORDER}`,
      }}
      className="px-5 md:px-10"
    >
      <div style={{ maxWidth: 1180, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 56, maxWidth: 720, marginLeft: "auto", marginRight: "auto" }}>
          <Eyebrow>{t("landing.pricing.eyebrow")}</Eyebrow>
          <h2
            className="ps-section-title"
            style={{ color: TEXT, marginTop: 14 }}
          >
            {t("landing.pricing.title")}
          </h2>
          <p
            style={{
              color: TEXT_MUTED,
              fontSize: 15,
              lineHeight: 1.65,
              marginTop: 16,
            }}
          >
            {t("landing.pricing.subtitle")}
          </p>
        </div>

        <div style={{ display: "grid", gap: 16 }} className="ps-pricing-grid">
          {LANDING_TIERS.map(({ key, ctaTo, highlight }) => (
            <div
              key={key}
              style={{
                background: highlight ? "#0B0907" : BG_RAISED,
                border: highlight
                  ? `2px solid ${ORANGE}`
                  : `1px solid ${BORDER}`,
                borderRadius: 14,
                padding: 28,
                position: "relative",
                boxShadow: highlight
                  ? "0 20px 50px rgba(234,88,12,0.18)"
                  : "none",
              }}
            >
              {highlight && (
                <span
                  style={{
                    position: "absolute",
                    top: -12,
                    insetInlineStart: 24,
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                    color: ORANGE,
                    background: "rgba(234,88,12,0.15)",
                    border: `1px solid ${ORANGE}`,
                    padding: "4px 10px",
                    borderRadius: 4,
                  }}
                >
                  {t("landing.pricing.mostPopular")}
                </span>
              )}
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                  color: TEXT_DIM,
                  marginBottom: 14,
                }}
              >
                {t(`landing.pricing.${key}Name`)}
              </div>
              <div
                style={{
                  fontSize: 38,
                  fontWeight: 700,
                  color: TEXT,
                  letterSpacing: "-0.02em",
                  lineHeight: 1,
                }}
              >
                {t(`landing.pricing.${key}Price`)}
              </div>
              <div
                style={{
                  fontSize: 12,
                  color: TEXT_MUTED,
                  fontFamily: MONO_STACK,
                  marginTop: 8,
                  marginBottom: 18,
                }}
              >
                {t(`landing.pricing.${key}PriceSub`)}
              </div>
              <div
                style={{
                  fontSize: 13.5,
                  color: TEXT_MUTED,
                  lineHeight: 1.6,
                  marginBottom: 22,
                  minHeight: 60,
                }}
              >
                {t(`landing.pricing.${key}Desc`)}
              </div>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 12,
                  marginBottom: 28,
                }}
              >
                {(["F1", "F2", "F3", "F4", "F5"] as const).map((n) => (
                  <div
                    key={n}
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 10,
                      fontSize: 13.5,
                      color: "#C4C4C4",
                      lineHeight: 1.5,
                    }}
                  >
                    <span
                      style={{
                        width: 14,
                        height: 14,
                        borderRadius: "50%",
                        background: "rgba(234,88,12,0.18)",
                        border: `1px solid ${ORANGE}`,
                        flexShrink: 0,
                        marginTop: 3,
                      }}
                    />
                    <span>{t(`landing.pricing.${key}${n}`)}</span>
                  </div>
                ))}
              </div>
              <Link
                to={ctaTo as "/"}
                style={{
                  display: "block",
                  textAlign: "center",
                  padding: "12px 18px",
                  borderRadius: 8,
                  fontSize: 14,
                  fontWeight: 600,
                  textDecoration: "none",
                  background: highlight
                    ? `linear-gradient(135deg, ${ORANGE}, #C2410C)`
                    : "transparent",
                  color: highlight ? "#FFF" : TEXT,
                  border: highlight
                    ? "none"
                    : "1px solid rgba(255,255,255,0.14)",
                  boxShadow: highlight
                    ? "0 8px 22px rgba(234,88,12,0.30)"
                    : "none",
                }}
              >
                {t(`landing.pricing.${key}Cta`)}
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ============================================================================
   FINAL CTA
   ========================================================================= */

function FinalCTA() {
  return (
    <section
      style={{
        background: BG,
        padding: "96px 0 110px",
        borderTop: `1px solid ${BORDER}`,
        position: "relative",
        overflow: "hidden",
      }}
      className="px-5 md:px-10"
    >
      <div
        aria-hidden
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: 900,
          height: 500,
          background:
            "radial-gradient(ellipse at center, rgba(234,88,12,0.18) 0%, rgba(5,5,5,0) 65%)",
          filter: "blur(40px)",
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "relative",
          zIndex: 1,
          maxWidth: 760,
          margin: "0 auto",
          textAlign: "center",
        }}
      >
        <h2 className="ps-section-title" style={{ color: TEXT }}>
          Get the API keys. Disappear inside your platform.
        </h2>
        <p
          style={{
            color: TEXT_MUTED,
            fontSize: 16,
            lineHeight: 1.65,
            marginTop: 18,
          }}
        >
          Free in sandbox. No credit card. No sales call.
        </p>
        <div
          style={{
            marginTop: 32,
            display: "flex",
            gap: 12,
            justifyContent: "center",
            flexWrap: "wrap",
          }}
        >
          <Link
            to="/signup"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              background: `linear-gradient(135deg, ${ORANGE}, #C2410C)`,
              color: "#FFFFFF",
              fontSize: 14,
              fontWeight: 600,
              padding: "12px 24px",
              borderRadius: 8,
              textDecoration: "none",
              boxShadow: "0 10px 28px rgba(234,88,12,0.32)",
            }}
          >
            Get API keys
            <ArrowRight size={14} />
          </Link>
          <Link
            to="/contact"
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.10)",
              color: TEXT,
              fontSize: 14,
              fontWeight: 500,
              padding: "12px 24px",
              borderRadius: 8,
              textDecoration: "none",
            }}
          >
            Talk to partnerships
          </Link>
        </div>
      </div>
    </section>
  );
}

/* ============================================================================
   Page
   ========================================================================= */

function LandingPage() {
  useEffect(() => {
    if (typeof window !== "undefined" && !window.location.hash) {
      window.scrollTo(0, 0);
    }
  }, []);

  return (
    <MarketingShell>
      <style>{PAGE_STYLES}</style>
      <Hero />
      <TrustStrip />
      <PartnerBenefits />
      <ProblemSection />
      <HowItWorks />
      <WhiteLabelSection />
      <ProductPillars />
      <EnterpriseStats />
      <PricingSection />
      <FinalCTA />
    </MarketingShell>
  );
}

const PAGE_STYLES = `
  .ps-hero-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 48px;
    align-items: center;
  }
  .ps-hero-copy { order: 1; min-width: 0; }
  .ps-hero-mock { order: 2; min-width: 0; }
  .ps-hero-mock pre { font-size: clamp(10.5px, 2.6vw, 12.5px) !important; }
  .ps-problem-grid { grid-template-columns: 1fr; }
  .ps-pillar-grid { grid-template-columns: 1fr; }
  .ps-quickstart-grid { grid-template-columns: 1fr; }
  .ps-stats-grid { grid-template-columns: repeat(2, 1fr); }
  /* 5th card: span 2 cols on mobile/tablet so it doesn't sit alone */
  .ps-stats-grid > *:last-child:nth-child(odd) { grid-column: span 2; }
  .ps-benefits-grid { grid-template-columns: 1fr; }
  .ps-pricing-grid { grid-template-columns: 1fr; }
  .ps-wl-grid { grid-template-columns: 1fr; }

  /* Fluid type — caps at the original desktop sizes */
  .ps-hero-title { font-size: clamp(34px, 8vw, 60px); }
  .ps-hero-sub { font-size: clamp(15px, 3.6vw, 16px) !important; }
  .ps-section-title { font-size: clamp(26px, 5.5vw, 40px); line-height: 1.15; letter-spacing: -0.02em; }

  /* Inline shorthand "padding: 88px 0" zeros out horizontal padding and beats
     Tailwind's px-5/md:px-10 classes — restore horizontal breathing room. */
  section.px-5 { padding-left: 20px !important; padding-right: 20px !important; }
  @media (min-width: 768px) {
    section.md\\:px-10 { padding-left: 40px !important; padding-right: 40px !important; }
  }
  @media (max-width: 640px) {
    .ps-hero-mock pre { padding: 14px !important; font-size: 11px !important; }
  }

  @media (min-width: 640px) {
    .ps-pillar-grid { grid-template-columns: repeat(2, 1fr); }
    .ps-benefits-grid { grid-template-columns: repeat(2, 1fr); }
  }
  @media (min-width: 900px) {
    .ps-hero-grid { grid-template-columns: 1.05fr 1fr; gap: 56px; }
    .ps-problem-grid { grid-template-columns: repeat(3, 1fr); }
    .ps-quickstart-grid { grid-template-columns: repeat(3, 1fr); }
    .ps-pricing-grid { grid-template-columns: repeat(3, 1fr); }
    .ps-wl-grid { grid-template-columns: 1fr 1fr; }
    .ps-stats-grid { grid-template-columns: repeat(5, 1fr); }
    .ps-stats-grid > *:last-child:nth-child(odd) { grid-column: span 1; }
    .ps-benefits-grid { grid-template-columns: repeat(4, 1fr); }
  }
  @media (min-width: 1180px) {
    .ps-pillar-grid { grid-template-columns: repeat(4, 1fr); }
  }
`;
