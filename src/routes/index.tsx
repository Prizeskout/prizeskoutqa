import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect } from "react";
import { ArrowRight, Zap, ShieldCheck, TrendingUp, Globe, Award } from "lucide-react";
import { useTranslation } from "react-i18next";
import { MarketingShell } from "@/components/marketing/MarketingShell";

// Shorthand used throughout this file
function useT() { return useTranslation().t; }

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
  const t = useT();
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
          <Eyebrow>{t("landing.home.hero.eyebrow")}</Eyebrow>
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
            {t("landing.home.hero.title1")}{" "}
            <span
              style={{
                fontStyle: "normal",
                background: `linear-gradient(90deg, ${ORANGE}, ${ORANGE_LIGHT})`,
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              {t("landing.home.hero.title2")}
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
            {t("landing.home.hero.subtitle")}
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
              {t("landing.home.hero.cta1")}
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
              {t("landing.home.hero.cta2")}
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
              {t("landing.home.hero.backedBy")}{" "}
              <span style={{ color: TEXT }}>{t("landing.home.hero.qstp")}</span>
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
  const t = useT();
  const pills = [
    t("landing.home.trust.pill1"),
    t("landing.home.trust.pill2"),
    t("landing.home.trust.pill3"),
    t("landing.home.trust.pill4"),
    t("landing.home.trust.pill5"),
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
          {t("landing.home.trust.label")}
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

const PARTNER_BENEFIT_ICONS = [Zap, ShieldCheck, TrendingUp, Globe];

function PartnerBenefits() {
  const t = useT();
  const benefits = [1, 2, 3, 4].map((n) => ({
    Icon: PARTNER_BENEFIT_ICONS[n - 1],
    title: t(`landing.home.benefits.b${n}Title`),
    desc: t(`landing.home.benefits.b${n}Desc`),
  }));
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
          <Eyebrow>{t("landing.home.benefits.eyebrow")}</Eyebrow>
          <h2
            className="ps-section-title"
            style={{ color: TEXT, marginTop: 14 }}
          >
            {t("landing.home.benefits.title")}
          </h2>
        </div>

        <div className="ps-benefits-grid" style={{ display: "grid", gap: 16 }}>
          {benefits.map(({ Icon, title, desc }) => (
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
  const t = useT();
  const pains = [1, 2, 3].map((n) => ({
    n: t(`landing.home.problem.p${n}n`),
    title: t(`landing.home.problem.p${n}Title`),
    desc: t(`landing.home.problem.p${n}Desc`),
  }));

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
          <Eyebrow color={ORANGE}>{t("landing.home.problem.eyebrow")}</Eyebrow>
          <h2
            className="ps-section-title"
            style={{
              color: "#1A1A18",
              marginTop: 14,
              fontWeight: 700,
              letterSpacing: "-0.02em",
            }}
          >
            {t("landing.home.problem.title")}
          </h2>
          <p
            style={{
              color: "#4A4A48",
              fontSize: 16,
              lineHeight: 1.65,
              marginTop: 18,
            }}
          >
            {t("landing.home.problem.subtitle")}
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
  const t = useT();
  const steps = [
    { n: "01", title: t("landing.home.howItWorks.s1Title"), desc: t("landing.home.howItWorks.s1Desc") },
    { n: "02", title: t("landing.home.howItWorks.s2Title"), desc: t("landing.home.howItWorks.s2Desc") },
    { n: "03", title: t("landing.home.howItWorks.s3Title"), desc: t("landing.home.howItWorks.s3Desc") },
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
          <Eyebrow>{t("landing.home.howItWorks.eyebrow")}</Eyebrow>
          <h2
            className="ps-section-title"
            style={{ color: TEXT, marginTop: 14 }}
          >
            {t("landing.home.howItWorks.title")}
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
            {t("landing.home.howItWorks.subtitle")}
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
  const t = useT();
  const pillars = [
    {
      name: t("landing.home.pillars.p1Name"),
      outcome: t("landing.home.pillars.p1Outcome"),
      apis: [
        { method: "POST", path: "/v1/sync", label: t("landing.home.pillars.l1") },
        { method: "POST", path: "/v1/rules", label: t("landing.home.pillars.l2") },
        { method: "GET", path: "/v1/margin", label: t("landing.home.pillars.l3") },
        { method: "POST", path: "/v1/flash", label: t("landing.home.pillars.l4") },
      ],
    },
    {
      name: t("landing.home.pillars.p2Name"),
      outcome: t("landing.home.pillars.p2Outcome"),
      apis: [
        { method: "POST", path: "/v1/dynprice", label: t("landing.home.pillars.l5") },
        { method: "GET", path: "/v1/audit", label: t("landing.home.pillars.l6") },
        { method: "POST", path: "/v1/intent", label: t("landing.home.pillars.l7") },
        { method: "POST", path: "/v1/embed", label: t("landing.home.pillars.l8") },
      ],
    },
    {
      name: t("landing.home.pillars.p3Name"),
      outcome: t("landing.home.pillars.p3Outcome"),
      apis: [
        { method: "POST", path: "/v1/events", label: t("landing.home.pillars.l9") },
        { method: "POST", path: "/v1/webhooks", label: t("landing.home.pillars.l10") },
        { method: "GET", path: "/v1/replay", label: t("landing.home.pillars.l11") },
        { method: "POST", path: "/v1/enrich", label: t("landing.home.pillars.l12") },
      ],
    },
    {
      name: t("landing.home.pillars.p4Name"),
      outcome: t("landing.home.pillars.p4Outcome"),
      apis: [
        { method: "POST", path: "/v1/keys", label: t("landing.home.pillars.l13") },
        { method: "GET", path: "/v1/usage", label: t("landing.home.pillars.l14") },
        { method: "POST", path: "/v1/tenants", label: t("landing.home.pillars.l15") },
        { method: "GET", path: "/v1/health", label: t("landing.home.pillars.l16") },
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
          <Eyebrow>{t("landing.home.pillars.eyebrow")}</Eyebrow>
          <h2
            className="ps-section-title"
            style={{ color: TEXT, marginTop: 14 }}
          >
            {t("landing.home.pillars.title")}
          </h2>
          <p
            style={{
              color: TEXT_MUTED,
              fontSize: 15,
              lineHeight: 1.65,
              marginTop: 16,
            }}
          >
            {t("landing.home.pillars.subtitle")}
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
  const t = useT();
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
          <Eyebrow>{t("landing.home.whiteLabel.eyebrow")}</Eyebrow>
          <h2
            className="ps-section-title"
            style={{ color: TEXT, marginTop: 14 }}
          >
            {t("landing.home.whiteLabel.title")}
          </h2>
          <p
            style={{
              color: TEXT_MUTED,
              fontSize: 15,
              lineHeight: 1.65,
              marginTop: 16,
            }}
          >
            {t("landing.home.whiteLabel.subtitle")}
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
              {t("landing.home.whiteLabel.merchantSees")}
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
                {t("landing.home.whiteLabel.smartPricing")}
              </div>
              <div style={{ fontSize: 11, color: "#9CA3AF", marginBottom: 18 }}>
                {t("landing.home.whiteLabel.poweredBy")}
              </div>
              <div style={{ fontSize: 13, color: "#1A1A18", marginBottom: 4 }}>
                {t("landing.home.whiteLabel.priceRec")}
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
                {t("landing.home.whiteLabel.competitorMoved")}
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
                {t("landing.home.whiteLabel.priceComp")}
              </div>
              <div style={{ fontSize: 22, fontWeight: 700, color: "#1A1A18" }}>
                Top 18%
              </div>
              <div style={{ fontSize: 12, color: "#6B7280", marginTop: 4 }}>
                {t("landing.home.whiteLabel.electronics")}
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
              {t("landing.home.whiteLabel.noMention")}
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
              {t("landing.home.whiteLabel.whatPowers")}
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
  const t = useT();
  const stats = [
    { value: "19", label: t("landing.home.enterprise.stat1Label") },
    { value: "<2s", label: t("landing.home.enterprise.stat2Label") },
    { value: "AR + EN", label: t("landing.home.enterprise.stat3Label") },
    { value: "GCC", label: t("landing.home.enterprise.stat4Label") },
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
          <Eyebrow>{t("landing.home.enterprise.eyebrow")}</Eyebrow>
          <h2
            className="ps-section-title"
            style={{ color: TEXT, marginTop: 14 }}
          >
            {t("landing.home.enterprise.title")}
          </h2>
        </div>

        <div className="ps-stats-grid" style={{ display: "grid", gap: 14 }}>
          {stats.map((s) => (
            <div
              key={s.label}
              style={{
                background: BG_RAISED,
                border: `1px solid ${BORDER}`,
                borderRadius: 12,
                padding: "26px 22px",
                textAlign: "center",
              }}
            >
              <div
                style={{
                  fontSize: 32,
                  fontWeight: 700,
                  color: ORANGE_LIGHT,
                  letterSpacing: "-0.02em",
                  fontFamily: MONO_STACK,
                  marginBottom: 8,
                }}
              >
                {s.value}
              </div>
              <div
                style={{
                  fontSize: 12.5,
                  color: TEXT_MUTED,
                  letterSpacing: "0.02em",
                }}
              >
                {s.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ============================================================================
   QSTP — standalone credential band
   ========================================================================= */

function QSTPSection() {
  const t = useT();
  return (
    <section
      style={{
        background: "#07060D",
        borderTop: "1px solid rgba(234,88,12,0.20)",
        borderBottom: "1px solid rgba(234,88,12,0.20)",
        padding: "56px 0",
        position: "relative",
        overflow: "hidden",
      }}
      className="px-5 md:px-10"
    >
      {/* Subtle radial glow */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: 800,
          height: 300,
          background:
            "radial-gradient(ellipse at center, rgba(234,88,12,0.12) 0%, rgba(7,6,13,0) 70%)",
          pointerEvents: "none",
        }}
      />

      <div
        style={{
          position: "relative",
          maxWidth: 760,
          margin: "0 auto",
          textAlign: "center",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 0,
        }}
      >
        {/* Icon */}
        <div
          style={{
            width: 52,
            height: 52,
            borderRadius: 14,
            background: "rgba(234,88,12,0.10)",
            border: "1px solid rgba(234,88,12,0.30)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 20,
          }}
        >
          <Award size={24} color={ORANGE_LIGHT} strokeWidth={1.75} />
        </div>

        {/* Eyebrow */}
        <div
          style={{
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: ORANGE_LIGHT,
            marginBottom: 14,
          }}
        >
          {t("landing.home.qstp.backedBy")}
        </div>

        {/* Name */}
        <h2
          style={{
            fontSize: "clamp(22px, 4vw, 34px)",
            fontWeight: 700,
            color: TEXT,
            letterSpacing: "-0.02em",
            lineHeight: 1.2,
            margin: "0 0 16px",
          }}
        >
          {t("landing.home.qstp.name")}
        </h2>

        {/* Description */}
        <p
          style={{
            fontSize: 15,
            color: TEXT_MUTED,
            lineHeight: 1.65,
            maxWidth: 560,
            margin: 0,
          }}
        >
          {t("landing.home.qstp.desc")}
        </p>
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
  const t = useT();
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
          {t("landing.home.cta.title")}
        </h2>
        <p
          style={{
            color: TEXT_MUTED,
            fontSize: 16,
            lineHeight: 1.65,
            marginTop: 18,
          }}
        >
          {t("landing.home.cta.subtitle")}
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
            {t("landing.home.cta.cta1")}
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
            {t("landing.home.cta.cta2")}
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
      <QSTPSection />
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
    .ps-stats-grid { grid-template-columns: repeat(4, 1fr); }
    .ps-benefits-grid { grid-template-columns: repeat(4, 1fr); }
  }
  @media (min-width: 1180px) {
    .ps-pillar-grid { grid-template-columns: repeat(4, 1fr); }
  }
`;
