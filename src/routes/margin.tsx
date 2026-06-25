import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  Upload,
  BarChart2,
  Layers,
  TrendingDown,
  CheckCircle2,
  ChevronRight,
} from "lucide-react";
import { MarketingShell } from "@/components/marketing/MarketingShell";

export const Route = createFileRoute("/margin")({
  head: () => ({
    meta: [
      { title: "PrizeSkout Margin — See What You Actually Keep" },
      {
        name: "description",
        content:
          "Stop guessing which channels and items are actually profitable. PrizeSkout Margin reveals your true net margin after Talabat, Snoonu, Noon, and Amazon.ae commissions.",
      },
      { property: "og:title", content: "PrizeSkout Margin — See What You Actually Keep" },
      {
        property: "og:description",
        content:
          "True per-channel net margin for GCC restaurants, cloud kitchens, and marketplace sellers.",
      },
    ],
  }),
  component: MarginLandingPage,
});

const BRAND = "#10B981";
const BRAND_DARK = "#059669";
const BRAND_BG = "rgba(16, 185, 129, 0.08)";

const PLATFORMS = [
  { name: "Talabat",    commission: "25–30%", flag: "🇶🇦" },
  { name: "Snoonu",     commission: "15–25%", flag: "🇶🇦" },
  { name: "Noon",       commission: "8–27%",  flag: "🇦🇪" },
  { name: "Amazon.ae",  commission: "5–15%",  flag: "🇦🇪" },
  { name: "Deliveroo",  commission: "20–30%", flag: "🌐" },
  { name: "Careem",     commission: "15–25%", flag: "🌐" },
];

const WHO_ITS_FOR = [
  {
    title: "Restaurants & Cafes",
    desc: "Multiple delivery apps, different commission rates, packaging costs, and prep time — all eating margin you can't see.",
  },
  {
    title: "Cloud & Ghost Kitchens",
    desc: "You exist only through aggregators. At 25–35% commission plus overheads, your net margin can slip below 7% without you knowing.",
  },
  {
    title: "Marketplace Sellers",
    desc: "Selling on Noon or Amazon.ae? Commission, FBN fees, and return costs stack up per SKU. Know which ones are worth it.",
  },
  {
    title: "Quick Commerce Shops",
    desc: "Convenience stores, pharmacies, and specialty shops on Talabat Mart or Noon Minutes — the same problem, different categories.",
  },
  {
    title: "Bakeries & Dessert Shops",
    desc: "High COGS, high packaging, and 20%+ aggregator commission. Margin collapses fast on lower-priced items.",
  },
  {
    title: "Laundry & Services",
    desc: "Snoonu runs laundry, car services, and more. Per-order profitability on service categories is just as opaque.",
  },
];

const STEPS = [
  {
    icon: Upload,
    n: "01",
    title: "Upload your payout CSV",
    body: "Download your payout statement from Talabat Partner, Snoonu, Noon Seller, or Amazon Seller Central and upload it. No integration required.",
  },
  {
    icon: Layers,
    n: "02",
    title: "Enter your costs",
    body: "Add your packaging cost, COGS per item, and average prep time. Takes two minutes. You can update it anytime as costs change.",
  },
  {
    icon: BarChart2,
    n: "03",
    title: "See your real margin",
    body: "Per-channel net margin, per-item profitability ranking, and the single action that recovers the most margin. No spreadsheets.",
  },
];

function MarginLandingPage() {
  return (
    <MarketingShell>
      <div style={{ backgroundColor: "#FAFAF9" }}>

        {/* ── HERO ────────────────────────────────────────────────────────────── */}
        <section
          style={{
            background: "linear-gradient(160deg, #0F1A15 0%, #0A1510 60%, #0F1A15 100%)",
            padding: "88px 24px 80px",
            textAlign: "center",
          }}
        >
          {/* Badge */}
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              background: BRAND_BG,
              border: `1px solid ${BRAND}33`,
              borderRadius: 20,
              padding: "5px 14px",
              marginBottom: 28,
            }}
          >
            <div
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                backgroundColor: BRAND,
                animation: "marginPulse 2s ease-in-out infinite",
              }}
            />
            <span style={{ fontSize: 12, fontWeight: 600, color: BRAND, letterSpacing: "0.06em" }}>
              PRIZESKOUT MARGIN
            </span>
          </div>

          <h1
            style={{
              fontSize: "clamp(36px, 6vw, 64px)",
              fontWeight: 800,
              letterSpacing: "-0.03em",
              color: "#FAFAF9",
              lineHeight: 1.1,
              maxWidth: 820,
              margin: "0 auto 20px",
            }}
          >
            See what you{" "}
            <span style={{ color: BRAND }}>actually keep</span>
          </h1>

          <p
            style={{
              fontSize: "clamp(16px, 2.5vw, 20px)",
              color: "#8AAF98",
              lineHeight: 1.65,
              maxWidth: 600,
              margin: "0 auto 40px",
            }}
          >
            GCC restaurants and marketplace sellers lose 15–35% of every order to
            aggregator commissions — and most don't know which channels, items, or
            dayparts are actually profitable after those fees are netted out.
          </p>

          <div style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap" }}>
            <Link
              to="/signup"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                background: `linear-gradient(135deg, ${BRAND}, ${BRAND_DARK})`,
                color: "#FAFAF9",
                fontSize: 15,
                fontWeight: 700,
                padding: "13px 24px",
                borderRadius: 10,
                textDecoration: "none",
                letterSpacing: "-0.01em",
              }}
            >
              Start for free <ArrowRight size={16} />
            </Link>
            <a
              href="#how-it-works"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                background: "transparent",
                color: "#8AAF98",
                fontSize: 15,
                fontWeight: 600,
                padding: "13px 24px",
                borderRadius: 10,
                textDecoration: "none",
                border: "1px solid #1A2D22",
              }}
            >
              See how it works
            </a>
          </div>

          {/* Platform strip */}
          <div
            style={{
              display: "flex",
              gap: 10,
              justifyContent: "center",
              flexWrap: "wrap",
              marginTop: 48,
            }}
          >
            {PLATFORMS.map((p) => (
              <div
                key={p.name}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 7,
                  background: "#1A2D22",
                  border: "1px solid #243D2C",
                  borderRadius: 8,
                  padding: "7px 12px",
                }}
              >
                <span style={{ fontSize: 14 }}>{p.flag}</span>
                <span style={{ fontSize: 12, fontWeight: 600, color: "#8AAF98" }}>{p.name}</span>
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    color: "#EF4444",
                    background: "rgba(239, 68, 68, 0.12)",
                    padding: "2px 6px",
                    borderRadius: 4,
                  }}
                >
                  {p.commission}
                </span>
              </div>
            ))}
          </div>

          <style>{`
            @keyframes marginPulse {
              0%, 100% { opacity: 1; }
              50% { opacity: 0.4; }
            }
          `}</style>
        </section>

        {/* ── PROBLEM ─────────────────────────────────────────────────────────── */}
        <section style={{ padding: "72px 24px", maxWidth: 1000, margin: "0 auto" }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: 20,
            }}
          >
            {[
              {
                stat: "15–35%",
                label: "of every order goes to aggregator commission",
                sub: "Before packaging, COGS, or labor.",
              },
              {
                stat: "3+ systems",
                label: "hold the data needed to compute real margin",
                sub: "Aggregator payouts, POS, and cost sheets — never reconciled.",
              },
              {
                stat: "0 alerts",
                label: "when a channel or item goes margin-negative",
                sub: "The bleed is silent. Operators scale what's destroying them.",
              },
            ].map((item) => (
              <div
                key={item.stat}
                style={{
                  background: "#FFFFFF",
                  border: "1px solid #E2EDE8",
                  borderRadius: 12,
                  padding: "28px 24px",
                  textAlign: "center",
                }}
              >
                <div
                  style={{
                    fontSize: 42,
                    fontWeight: 800,
                    letterSpacing: "-0.03em",
                    color: "#EF4444",
                    lineHeight: 1,
                    marginBottom: 10,
                  }}
                >
                  {item.stat}
                </div>
                <div style={{ fontSize: 15, fontWeight: 600, color: "#0F1A15", marginBottom: 6 }}>
                  {item.label}
                </div>
                <div style={{ fontSize: 13, color: "#5A7A68", lineHeight: 1.5 }}>{item.sub}</div>
              </div>
            ))}
          </div>
        </section>

        {/* ── HOW IT WORKS ────────────────────────────────────────────────────── */}
        <section
          id="how-it-works"
          style={{
            background: "#FFFFFF",
            padding: "72px 24px",
            borderTop: "1px solid #E8EDE8",
            borderBottom: "1px solid #E8EDE8",
          }}
        >
          <div style={{ maxWidth: 1000, margin: "0 auto" }}>
            <div style={{ textAlign: "center", marginBottom: 48 }}>
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: BRAND,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  marginBottom: 10,
                }}
              >
                How it works
              </div>
              <h2
                style={{
                  fontSize: "clamp(26px, 4vw, 36px)",
                  fontWeight: 700,
                  letterSpacing: "-0.02em",
                  color: "#0F1A15",
                  margin: 0,
                }}
              >
                From CSV to margin truth in minutes
              </h2>
              <p style={{ fontSize: 15, color: "#5A7A68", marginTop: 12, maxWidth: 520, margin: "12px auto 0" }}>
                No integrations to set up. No developer needed. Just upload your payout
                statement and enter your costs — the rest is automatic.
              </p>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                gap: 24,
              }}
            >
              {STEPS.map((step) => {
                const Icon = step.icon;
                return (
                  <div
                    key={step.n}
                    style={{
                      background: "#F7FAF8",
                      border: "1px solid #E2EDE8",
                      borderRadius: 12,
                      padding: 28,
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                      <div
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: 10,
                          background: BRAND_BG,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                        }}
                      >
                        <Icon size={17} color={BRAND} strokeWidth={2} />
                      </div>
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          color: BRAND,
                          letterSpacing: "0.1em",
                        }}
                      >
                        STEP {step.n}
                      </span>
                    </div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: "#0F1A15", marginBottom: 8 }}>
                      {step.title}
                    </div>
                    <div style={{ fontSize: 13, color: "#5A7A68", lineHeight: 1.65 }}>{step.body}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ── WHO IT'S FOR ─────────────────────────────────────────────────────── */}
        <section style={{ padding: "72px 24px" }}>
          <div style={{ maxWidth: 1000, margin: "0 auto" }}>
            <div style={{ textAlign: "center", marginBottom: 48 }}>
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: BRAND,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  marginBottom: 10,
                }}
              >
                Who it's for
              </div>
              <h2
                style={{
                  fontSize: "clamp(26px, 4vw, 36px)",
                  fontWeight: 700,
                  letterSpacing: "-0.02em",
                  color: "#0F1A15",
                  margin: 0,
                }}
              >
                Any business selling through a GCC aggregator
              </h2>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
                gap: 16,
              }}
            >
              {WHO_ITS_FOR.map((item) => (
                <div
                  key={item.title}
                  style={{
                    background: "#FFFFFF",
                    border: "1px solid #E2EDE8",
                    borderRadius: 10,
                    padding: "20px 22px",
                    display: "flex",
                    gap: 12,
                    alignItems: "flex-start",
                  }}
                >
                  <CheckCircle2 size={16} color={BRAND} style={{ flexShrink: 0, marginTop: 2 }} />
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: "#0F1A15", marginBottom: 4 }}>
                      {item.title}
                    </div>
                    <div style={{ fontSize: 13, color: "#5A7A68", lineHeight: 1.55 }}>{item.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── WHAT YOU SEE ─────────────────────────────────────────────────────── */}
        <section
          style={{
            background: "#FFFFFF",
            borderTop: "1px solid #E8EDE8",
            borderBottom: "1px solid #E8EDE8",
            padding: "72px 24px",
          }}
        >
          <div style={{ maxWidth: 1000, margin: "0 auto" }}>
            <div style={{ textAlign: "center", marginBottom: 48 }}>
              <h2
                style={{
                  fontSize: "clamp(26px, 4vw, 36px)",
                  fontWeight: 700,
                  letterSpacing: "-0.02em",
                  color: "#0F1A15",
                  margin: 0,
                }}
              >
                What Margin shows you
              </h2>
              <p style={{ fontSize: 15, color: "#5A7A68", marginTop: 12, maxWidth: 480, margin: "12px auto 0" }}>
                Not dashboards for dashboards' sake. Four views that answer the questions
                operators actually ask.
              </p>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                gap: 16,
              }}
            >
              {[
                {
                  icon: Layers,
                  title: "Channel breakdown",
                  desc: "Net margin per aggregator — after commission, packaging, and prep — ranked worst to best.",
                },
                {
                  icon: TrendingDown,
                  title: "Item profitability",
                  desc: "Which items make money and which don't. Sort by net margin, volume, or category.",
                },
                {
                  icon: BarChart2,
                  title: "Daypart analysis",
                  desc: "Is your dinner service on Talabat actually profitable? See margin by breakfast, lunch, dinner, and late night.",
                },
                {
                  icon: ArrowRight,
                  title: "One action",
                  desc: "The single price adjustment or channel decision that recovers the most margin, right now.",
                },
              ].map((card) => {
                const Icon = card.icon;
                return (
                  <div
                    key={card.title}
                    style={{
                      background: "#F7FAF8",
                      border: "1px solid #E2EDE8",
                      borderRadius: 10,
                      padding: "22px 20px",
                    }}
                  >
                    <div
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 8,
                        background: BRAND_BG,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        marginBottom: 14,
                      }}
                    >
                      <Icon size={16} color={BRAND} />
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "#0F1A15", marginBottom: 6 }}>
                      {card.title}
                    </div>
                    <div style={{ fontSize: 13, color: "#5A7A68", lineHeight: 1.55 }}>{card.desc}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ── CTA ─────────────────────────────────────────────────────────────── */}
        <section
          style={{
            background: "linear-gradient(160deg, #0F1A15, #0A1510)",
            padding: "80px 24px",
            textAlign: "center",
          }}
        >
          <div style={{ maxWidth: 600, margin: "0 auto" }}>
            <div
              style={{
                fontSize: 12,
                fontWeight: 700,
                color: BRAND,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                marginBottom: 16,
              }}
            >
              Start free — no card required
            </div>
            <h2
              style={{
                fontSize: "clamp(28px, 4vw, 40px)",
                fontWeight: 800,
                letterSpacing: "-0.03em",
                color: "#FAFAF9",
                lineHeight: 1.15,
                margin: "0 0 16px",
              }}
            >
              Find out what your business{" "}
              <span style={{ color: BRAND }}>actually keeps</span>
            </h2>
            <p style={{ fontSize: 15, color: "#8AAF98", lineHeight: 1.65, marginBottom: 36 }}>
              Upload your first payout CSV and see your real margin in under five
              minutes. Honest numbers, no promises we can't back.
            </p>
            <Link
              to="/signup"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                background: `linear-gradient(135deg, ${BRAND}, ${BRAND_DARK})`,
                color: "#FAFAF9",
                fontSize: 15,
                fontWeight: 700,
                padding: "14px 28px",
                borderRadius: 10,
                textDecoration: "none",
              }}
            >
              Get started free <ChevronRight size={16} />
            </Link>
            <div style={{ marginTop: 16, fontSize: 12, color: "#4A7A5A" }}>
              Already have a PrizeSkout account?{" "}
              <Link to="/login" style={{ color: BRAND, fontWeight: 600, textDecoration: "none" }}>
                Sign in →
              </Link>
            </div>
          </div>
        </section>

      </div>
    </MarketingShell>
  );
}
