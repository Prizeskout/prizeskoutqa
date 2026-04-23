import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  ArrowRight,
  Check,
  Code2,
  Terminal,
  Zap,
  Shield,
  GitBranch,
  Package,
  Webhook,
  KeyRound,
  Activity,
  LineChart,
  Tags,
  Megaphone,
  Map as MapIcon,
  ClipboardList,
  ChevronRight,
  FileCode,
} from "lucide-react";
import { MarketingShell } from "@/components/marketing/MarketingShell";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "PrizeSkout | Pricing intelligence APIs for retail developers" },
      {
        name: "description",
        content:
          "A developer-first platform of APIs for competitor pricing, promotions ROI, market signals, and field intel. Built for engineering teams integrating pricing intelligence into commerce systems.",
      },
      {
        property: "og:title",
        content: "PrizeSkout | Pricing intelligence APIs for retail developers",
      },
      {
        property: "og:description",
        content:
          "REST APIs, SDKs, and webhooks for pricing intelligence. Integrate competitor data, recommendations, and ROI models into any commerce stack.",
      },
    ],
  }),
  component: LandingPage,
});

/* ============================================================================
   Shared primitives
   ========================================================================= */

const MONO_STACK =
  "'JetBrains Mono', 'SFMono-Regular', Menlo, Consolas, 'Liberation Mono', monospace";

function SectionEyebrow({ children }: { children: React.ReactNode }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "5px 10px",
        fontSize: 11,
        fontWeight: 600,
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        color: "#FB923C",
        background: "rgba(234,88,12,0.08)",
        border: "1px solid rgba(234,88,12,0.22)",
        borderRadius: 999,
      }}
    >
      {children}
    </span>
  );
}

/* ============================================================================
   HERO with code tabs
   ========================================================================= */

type Lang = "curl" | "node" | "python";

const CODE_SAMPLES: Record<Lang, string> = {
  curl: `curl https://api.prizeskout.com/v1/pricing/recommendations \\
  -H "Authorization: Bearer sk_live_••••" \\
  -H "Content-Type: application/json" \\
  -d '{
    "product_id": "sku_galaxy_buds_2_pro",
    "channels": ["talabat", "carrefour", "amazon"],
    "objective": "protect_margin"
  }'`,
  node: `import { PrizeSkout } from "@prizeskout/node";

const ps = new PrizeSkout(process.env.PRIZESKOUT_API_KEY);

const rec = await ps.pricing.recommendations.create({
  product_id: "sku_galaxy_buds_2_pro",
  channels: ["talabat", "carrefour", "amazon"],
  objective: "protect_margin",
});

console.log(rec.recommended_price, rec.confidence);`,
  python: `from prizeskout import PrizeSkout

ps = PrizeSkout(api_key=os.environ["PRIZESKOUT_API_KEY"])

rec = ps.pricing.recommendations.create(
    product_id="sku_galaxy_buds_2_pro",
    channels=["talabat", "carrefour", "amazon"],
    objective="protect_margin",
)

print(rec.recommended_price, rec.confidence)`,
};

const SAMPLE_RESPONSE = `{
  "id": "rec_01HX9P2K3M7QZ8Y4N6W5B1E2F0",
  "product_id": "sku_galaxy_buds_2_pro",
  "current_price": 469.00,
  "recommended_price": 449.00,
  "currency": "QAR",
  "confidence": 0.91,
  "reason": "carrefour_price_drop · protect_share",
  "expected_impact": {
    "margin_delta_pct": -0.8,
    "units_delta_pct": 6.4,
    "net_monthly": 3820
  },
  "signals": [
    { "source": "carrefour.qa", "event": "price_drop", "delta": -20.00 },
    { "source": "talabat.qa", "event": "promo_live", "depth_pct": 15 }
  ],
  "generated_at": "2025-01-14T09:42:11Z"
}`;

function CodeTabs() {
  const [lang, setLang] = useState<Lang>("curl");
  const tabs: { key: Lang; label: string }[] = [
    { key: "curl", label: "cURL" },
    { key: "node", label: "Node.js" },
    { key: "python", label: "Python" },
  ];

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        maxWidth: 600,
        margin: "0 auto",
      }}
    >
      {/* ambient glow */}
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
          border: "1px solid #1F1F1F",
          borderRadius: 14,
          overflow: "hidden",
          boxShadow: "0 30px 80px rgba(0,0,0,0.5), 0 0 0 1px rgba(234,88,12,0.06) inset",
        }}
      >
        {/* tab bar */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderBottom: "1px solid #1A1A1A",
            padding: "0 4px",
          }}
        >
          <div style={{ display: "flex" }}>
            {tabs.map((t) => {
              const active = lang === t.key;
              return (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setLang(t.key)}
                  style={{
                    background: "transparent",
                    border: "none",
                    padding: "12px 16px",
                    fontSize: 12,
                    fontFamily: MONO_STACK,
                    fontWeight: active ? 600 : 500,
                    color: active ? "#FB923C" : "#8A8A8A",
                    borderBottom: active ? "2px solid #EA580C" : "2px solid transparent",
                    cursor: "pointer",
                    transition: "color 0.15s, border-color 0.15s",
                  }}
                >
                  {t.label}
                </button>
              );
            })}
          </div>
          <span
            style={{
              fontSize: 11,
              color: "#6B6B6B",
              fontFamily: MONO_STACK,
              paddingRight: 14,
            }}
          >
            POST /v1/pricing/recommendations
          </span>
        </div>

        {/* code body */}
        <pre
          style={{
            margin: 0,
            padding: "18px 20px",
            fontSize: 12.5,
            lineHeight: 1.65,
            fontFamily: MONO_STACK,
            color: "#D4D4D4",
            background: "transparent",
            overflow: "auto",
            maxHeight: 260,
          }}
        >
          <code>{CODE_SAMPLES[lang]}</code>
        </pre>

        {/* response preview */}
        <div
          style={{
            borderTop: "1px solid #1A1A1A",
            background: "rgba(0,0,0,0.35)",
          }}
        >
          <div
            style={{
              padding: "8px 16px",
              fontSize: 10.5,
              fontFamily: MONO_STACK,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              color: "#6B6B6B",
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: "#22C55E",
                boxShadow: "0 0 0 3px rgba(34,197,94,0.15)",
              }}
            />
            200 OK · 142ms · application/json
          </div>
          <pre
            style={{
              margin: 0,
              padding: "0 20px 18px",
              fontSize: 11.5,
              lineHeight: 1.6,
              fontFamily: MONO_STACK,
              color: "#9CA3AF",
              background: "transparent",
              overflow: "auto",
              maxHeight: 200,
            }}
          >
            <code>{SAMPLE_RESPONSE}</code>
          </pre>
        </div>
      </div>
    </div>
  );
}

function Hero() {
  return (
    <section
      style={{
        position: "relative",
        background: "#050505",
        paddingTop: 96,
        paddingBottom: 80,
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
          <SectionEyebrow>
            <Code2 size={11} strokeWidth={2.4} />
            Developer platform
          </SectionEyebrow>

          <h1
            className="ps-hero-title"
            style={{
              marginTop: 18,
              fontWeight: 700,
              color: "#FAFAF9",
              lineHeight: 1.05,
              letterSpacing: "-0.02em",
              margin: "18px 0 0",
            }}
          >
            Pricing intelligence,{" "}
            <span
              style={{
                background: "linear-gradient(90deg, #EA580C, #FB923C)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              as an API.
            </span>
          </h1>

          <p
            className="ps-hero-sub"
            style={{
              marginTop: 18,
              color: "#9A9A9A",
              lineHeight: 1.6,
              maxWidth: 540,
            }}
          >
            REST APIs, typed SDKs, and webhooks for competitor prices, pricing
            recommendations, promotion ROI, and field observations. Ship
            margin-aware pricing logic into your commerce stack without building
            the data plane yourself.
          </p>

          <div
            style={{
              marginTop: 28,
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
                background: "linear-gradient(135deg, #EA580C, #C2410C)",
                color: "#FFFFFF",
                fontSize: 14,
                fontWeight: 600,
                padding: "12px 22px",
                borderRadius: 8,
                textDecoration: "none",
                boxShadow: "0 10px 28px rgba(234,88,12,0.32)",
              }}
            >
              Get API keys
              <ArrowRight size={14} />
            </Link>
            <Link
              to="/docs"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.10)",
                color: "#FAFAF9",
                fontSize: 14,
                fontWeight: 500,
                padding: "12px 22px",
                borderRadius: 8,
                textDecoration: "none",
              }}
            >
              <FileCode size={14} />
              Read the docs
            </Link>
          </div>

          <div
            style={{
              marginTop: 24,
              display: "flex",
              gap: 18,
              flexWrap: "wrap",
              fontSize: 12,
              color: "#6B6B6B",
              fontFamily: MONO_STACK,
            }}
          >
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              <Check size={12} color="#22C55E" /> 99.95% uptime SLA
            </span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              <Check size={12} color="#22C55E" /> Idempotent writes
            </span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              <Check size={12} color="#22C55E" /> Webhook retries
            </span>
          </div>
        </div>

        <div className="ps-hero-mock">
          <CodeTabs />
        </div>
      </div>
    </section>
  );
}

/* ============================================================================
   Trust strip
   ========================================================================= */

function TrustStrip() {
  const badges = [
    { icon: Shield, label: "SOC 2 Type II" },
    { icon: KeyRound, label: "Scoped API keys" },
    { icon: Activity, label: "99.95% uptime" },
    { icon: Webhook, label: "Signed webhooks" },
    { icon: GitBranch, label: "Versioned API" },
  ];
  return (
    <section
      style={{
        background: "#050505",
        borderTop: "1px solid #141414",
        borderBottom: "1px solid #141414",
        padding: "24px 0",
      }}
      className="px-5 md:px-10"
    >
      <div
        style={{
          maxWidth: 1180,
          margin: "0 auto",
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "center",
          gap: 32,
          rowGap: 14,
        }}
      >
        {badges.map((b) => {
          const Icon = b.icon;
          return (
            <div
              key={b.label}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                fontSize: 12,
                color: "#8A8A8A",
                fontFamily: MONO_STACK,
                letterSpacing: "0.02em",
              }}
            >
              <Icon size={13} color="#6B6B6B" strokeWidth={1.8} />
              {b.label}
            </div>
          );
        })}
      </div>
    </section>
  );
}

/* ============================================================================
   API Catalog
   ========================================================================= */

type ApiEntry = {
  name: string;
  endpoint: string;
  desc: string;
  icon: React.ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;
  to: "/products/pricing" | "/products/competitors" | "/products/promotions" | "/products/market" | "/products/field-intel";
  methods: string[];
};

const API_CATALOG: ApiEntry[] = [
  {
    name: "Pricing Recommendations API",
    endpoint: "/v1/pricing/recommendations",
    desc: "AI-driven price decisions with expected P&L impact, confidence, and signal attribution per SKU and channel.",
    icon: Tags,
    to: "/products/pricing",
    methods: ["GET", "POST"],
  },
  {
    name: "Competitor Intelligence API",
    endpoint: "/v1/competitors/prices",
    desc: "Live competitor prices, promo depth, and behavior patterns across marketplaces and delivery apps.",
    icon: LineChart,
    to: "/products/competitors",
    methods: ["GET"],
  },
  {
    name: "Promotions & ROI API",
    endpoint: "/v1/promotions/simulate",
    desc: "Simulate campaign ROI with elasticity and cannibalization. Read the live promo calendar for competitors.",
    icon: Megaphone,
    to: "/products/promotions",
    methods: ["GET", "POST"],
  },
  {
    name: "Market Signals API",
    endpoint: "/v1/market/trends",
    desc: "Category growth, assortment gaps, cross-border price radar. Feed merchandising and planning systems.",
    icon: MapIcon,
    to: "/products/market",
    methods: ["GET"],
  },
  {
    name: "Field Intel API",
    endpoint: "/v1/field-intel/observations",
    desc: "Ingest in-store observations from field reps. Reconcile online vs in-store prices programmatically.",
    icon: ClipboardList,
    to: "/products/field-intel",
    methods: ["GET", "POST"],
  },
];

function ApiCatalog() {
  return (
    <section
      id="products"
      style={{
        background: "#050505",
        padding: "88px 0",
      }}
      className="px-5 md:px-10"
    >
      <div style={{ maxWidth: 1180, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 48 }}>
          <SectionEyebrow>API catalog</SectionEyebrow>
          <h2
            className="ps-section-title"
            style={{ color: "#FAFAF9", marginTop: 14 }}
          >
            Five APIs. One consistent surface.
          </h2>
          <p
            style={{
              marginTop: 14,
              color: "#9A9A9A",
              maxWidth: 600,
              margin: "14px auto 0",
              fontSize: 15,
              lineHeight: 1.6,
            }}
          >
            Every endpoint returns typed, versioned JSON. Pagination, idempotency
            keys, and webhook delivery follow the same rules across the platform.
          </p>
        </div>

        <div
          style={{
            display: "grid",
            gap: 14,
          }}
          className="ps-api-grid"
        >
          {API_CATALOG.map((api) => {
            const Icon = api.icon;
            return (
              <Link
                key={api.name}
                to={api.to}
                className="ps-api-card"
                style={{
                  display: "block",
                  textDecoration: "none",
                  background: "#0A0A0A",
                  border: "1px solid #1A1A1A",
                  borderRadius: 12,
                  padding: 22,
                  transition: "border-color 0.15s, transform 0.15s",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
                  <div
                    style={{
                      width: 38,
                      height: 38,
                      borderRadius: 9,
                      background: "rgba(234,88,12,0.12)",
                      border: "1px solid rgba(234,88,12,0.28)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Icon size={18} color="#FB923C" strokeWidth={2} />
                  </div>
                  <div style={{ display: "flex", gap: 5 }}>
                    {api.methods.map((m) => (
                      <span
                        key={m}
                        style={{
                          fontSize: 9.5,
                          fontFamily: MONO_STACK,
                          fontWeight: 600,
                          letterSpacing: "0.06em",
                          color: m === "GET" ? "#22C55E" : "#FB923C",
                          background:
                            m === "GET" ? "rgba(34,197,94,0.08)" : "rgba(234,88,12,0.10)",
                          border:
                            m === "GET"
                              ? "1px solid rgba(34,197,94,0.25)"
                              : "1px solid rgba(234,88,12,0.28)",
                          padding: "2px 6px",
                          borderRadius: 4,
                        }}
                      >
                        {m}
                      </span>
                    ))}
                  </div>
                </div>
                <div
                  style={{
                    fontSize: 15,
                    fontWeight: 600,
                    color: "#FAFAF9",
                    marginBottom: 6,
                  }}
                >
                  {api.name}
                </div>
                <div
                  style={{
                    fontFamily: MONO_STACK,
                    fontSize: 11.5,
                    color: "#FB923C",
                    marginBottom: 12,
                  }}
                >
                  {api.endpoint}
                </div>
                <div
                  style={{
                    fontSize: 13.5,
                    color: "#8A8A8A",
                    lineHeight: 1.55,
                  }}
                >
                  {api.desc}
                </div>
                <div
                  style={{
                    marginTop: 16,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 5,
                    fontSize: 12,
                    fontWeight: 600,
                    color: "#FB923C",
                  }}
                >
                  Reference
                  <ChevronRight size={12} />
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ============================================================================
   Quickstart
   ========================================================================= */

function Quickstart() {
  const steps = [
    {
      n: "01",
      title: "Create an API key",
      desc: "Sign up and mint a scoped key from the dashboard. Test-mode keys give you sandbox data with no rate limits.",
      code: `# Your test key\nsk_test_4eC39HqLyjWDarjtT1zdp7dc`,
    },
    {
      n: "02",
      title: "Install the SDK",
      desc: "Official SDKs for Node, Python, and Go. Or call the REST API directly from any language.",
      code: `npm install @prizeskout/node\n# or\npip install prizeskout`,
    },
    {
      n: "03",
      title: "Make your first call",
      desc: "Fetch a pricing recommendation for a SKU. Responses are deterministic, typed, and audit-logged.",
      code: `const rec = await ps.pricing\n  .recommendations\n  .retrieve("sku_123");`,
    },
  ];

  return (
    <section
      id="quickstart"
      style={{
        background: "#050505",
        padding: "88px 0",
        borderTop: "1px solid #141414",
      }}
      className="px-5 md:px-10"
    >
      <div style={{ maxWidth: 1180, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 48 }}>
          <SectionEyebrow>
            <Terminal size={11} strokeWidth={2.4} />
            Quickstart
          </SectionEyebrow>
          <h2
            className="ps-section-title"
            style={{ color: "#FAFAF9", marginTop: 14 }}
          >
            From zero to first call in 3 minutes.
          </h2>
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
                background: "#0A0A0A",
                border: "1px solid #1A1A1A",
                borderRadius: 12,
                padding: 22,
                display: "flex",
                flexDirection: "column",
              }}
            >
              <div
                style={{
                  fontFamily: MONO_STACK,
                  fontSize: 11,
                  fontWeight: 700,
                  color: "#FB923C",
                  letterSpacing: "0.1em",
                  marginBottom: 12,
                }}
              >
                STEP {s.n}
              </div>
              <div
                style={{
                  fontSize: 17,
                  fontWeight: 600,
                  color: "#FAFAF9",
                  marginBottom: 8,
                }}
              >
                {s.title}
              </div>
              <div
                style={{
                  fontSize: 13.5,
                  color: "#8A8A8A",
                  lineHeight: 1.55,
                  marginBottom: 16,
                  flex: 1,
                }}
              >
                {s.desc}
              </div>
              <pre
                style={{
                  margin: 0,
                  padding: 14,
                  background: "#000",
                  border: "1px solid #1A1A1A",
                  borderRadius: 8,
                  fontSize: 11.5,
                  lineHeight: 1.55,
                  fontFamily: MONO_STACK,
                  color: "#D4D4D4",
                  overflow: "auto",
                }}
              >
                <code>{s.code}</code>
              </pre>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ============================================================================
   Built for developers
   ========================================================================= */

function BuiltForDevs() {
  const items = [
    {
      icon: Package,
      title: "Typed SDKs",
      desc: "First-class TypeScript, Python, and Go SDKs. Every request and response is fully typed against the OpenAPI spec.",
    },
    {
      icon: Webhook,
      title: "Reliable webhooks",
      desc: "Signed payloads, exponential backoff retries, and a replay log. Subscribe to price drops, promo events, and recommendation changes.",
    },
    {
      icon: Zap,
      title: "Low-latency reads",
      desc: "p95 under 150ms on recommendation reads. Regional caches in EMEA and APAC keep hot paths fast.",
    },
    {
      icon: Shield,
      title: "Scoped keys & audit logs",
      desc: "Restrict keys per environment, per API, per IP. Every call is audit-logged with request IDs you can cite in support.",
    },
    {
      icon: GitBranch,
      title: "Versioned, forever",
      desc: "Breaking changes ship under new API versions. Pin a version at key creation and upgrade on your schedule.",
    },
    {
      icon: Activity,
      title: "Observable by default",
      desc: "Per-endpoint latency, error rates, and usage broken down by API key. Stream events to Datadog or your SIEM.",
    },
  ];

  return (
    <section
      style={{
        background: "#050505",
        padding: "88px 0",
        borderTop: "1px solid #141414",
      }}
      className="px-5 md:px-10"
    >
      <div style={{ maxWidth: 1180, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 48 }}>
          <SectionEyebrow>Built for developers</SectionEyebrow>
          <h2
            className="ps-section-title"
            style={{ color: "#FAFAF9", marginTop: 14 }}
          >
            A platform your team will actually want to integrate against.
          </h2>
        </div>

        <div
          style={{
            display: "grid",
            gap: 14,
          }}
          className="ps-devs-grid"
        >
          {items.map((i) => {
            const Icon = i.icon;
            return (
              <div
                key={i.title}
                style={{
                  background: "#0A0A0A",
                  border: "1px solid #1A1A1A",
                  borderRadius: 12,
                  padding: 22,
                }}
              >
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 9,
                    background: "rgba(234,88,12,0.10)",
                    border: "1px solid rgba(234,88,12,0.22)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: 14,
                  }}
                >
                  <Icon size={17} color="#FB923C" strokeWidth={2} />
                </div>
                <div
                  style={{
                    fontSize: 15,
                    fontWeight: 600,
                    color: "#FAFAF9",
                    marginBottom: 6,
                  }}
                >
                  {i.title}
                </div>
                <div
                  style={{
                    fontSize: 13.5,
                    color: "#8A8A8A",
                    lineHeight: 1.55,
                  }}
                >
                  {i.desc}
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
   Pricing (usage-based)
   ========================================================================= */

function PricingSection() {
  const tiers = [
    {
      name: "Developer",
      price: "Free",
      priceSub: "Test mode",
      desc: "Everything you need to prototype an integration end-to-end.",
      features: [
        "Unlimited test-mode requests",
        "All APIs in sandbox",
        "1 project · 2 API keys",
        "Community support",
      ],
      cta: "Start building",
      highlight: false,
    },
    {
      name: "Growth",
      price: "$0.004",
      priceSub: "per API call",
      desc: "Usage-based pricing for teams going live. Pay only for what you call.",
      features: [
        "All production APIs",
        "Signed webhooks, unlimited",
        "Up to 100 req/s sustained",
        "Email support · 24h response",
        "99.9% uptime SLA",
      ],
      cta: "Activate live mode",
      highlight: true,
    },
    {
      name: "Enterprise",
      price: "Custom",
      priceSub: "Volume contracts",
      desc: "For teams with compliance, residency, or dedicated capacity needs.",
      features: [
        "Committed-use discounts",
        "Data residency · on-prem option",
        "99.95% uptime SLA",
        "Dedicated support engineer",
        "Security review · DPA · MSA",
      ],
      cta: "Contact sales",
      highlight: false,
    },
  ];

  return (
    <section
      id="pricing"
      style={{
        background: "#050505",
        padding: "88px 0",
        borderTop: "1px solid #141414",
      }}
      className="px-5 md:px-10"
    >
      <div style={{ maxWidth: 1180, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 48 }}>
          <SectionEyebrow>Pricing</SectionEyebrow>
          <h2 className="ps-section-title" style={{ color: "#FAFAF9", marginTop: 14 }}>
            Usage-based. No seats. No surprises.
          </h2>
          <p
            style={{
              marginTop: 14,
              color: "#9A9A9A",
              maxWidth: 560,
              margin: "14px auto 0",
              fontSize: 15,
              lineHeight: 1.6,
            }}
          >
            Test mode is free forever. In production, you pay per API call.
            Volume discounts kick in automatically.
          </p>
        </div>

        <div
          style={{
            display: "grid",
            gap: 16,
          }}
          className="ps-pricing-grid"
        >
          {tiers.map((t) => (
            <div
              key={t.name}
              style={{
                background: t.highlight ? "#0B0907" : "#0A0A0A",
                border: t.highlight ? "1px solid rgba(234,88,12,0.45)" : "1px solid #1A1A1A",
                borderRadius: 14,
                padding: 28,
                position: "relative",
                boxShadow: t.highlight ? "0 20px 50px rgba(234,88,12,0.15)" : "none",
              }}
            >
              {t.highlight && (
                <span
                  style={{
                    position: "absolute",
                    top: -10,
                    left: 24,
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                    color: "#FFF",
                    background: "linear-gradient(135deg, #EA580C, #C2410C)",
                    padding: "4px 10px",
                    borderRadius: 4,
                  }}
                >
                  Most popular
                </span>
              )}
              <div style={{ fontSize: 14, fontWeight: 600, color: "#FAFAF9", marginBottom: 8 }}>
                {t.name}
              </div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 4 }}>
                <span style={{ fontSize: 34, fontWeight: 700, color: "#FAFAF9", letterSpacing: "-0.02em" }}>
                  {t.price}
                </span>
                <span style={{ fontSize: 12, color: "#8A8A8A", fontFamily: MONO_STACK }}>
                  {t.priceSub}
                </span>
              </div>
              <div style={{ fontSize: 13, color: "#8A8A8A", lineHeight: 1.55, marginBottom: 20, minHeight: 40 }}>
                {t.desc}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 24 }}>
                {t.features.map((f) => (
                  <div key={f} style={{ display: "flex", gap: 8, fontSize: 13, color: "#C4C4C4" }}>
                    <Check size={13} color="#22C55E" style={{ marginTop: 3, flexShrink: 0 }} />
                    <span>{f}</span>
                  </div>
                ))}
              </div>
              <Link
                to={t.name === "Enterprise" ? "/contact" : "/signup"}
                style={{
                  display: "block",
                  textAlign: "center",
                  padding: "11px 18px",
                  borderRadius: 8,
                  fontSize: 13.5,
                  fontWeight: 600,
                  textDecoration: "none",
                  background: t.highlight ? "linear-gradient(135deg, #EA580C, #C2410C)" : "rgba(255,255,255,0.04)",
                  color: t.highlight ? "#FFF" : "#FAFAF9",
                  border: t.highlight ? "none" : "1px solid rgba(255,255,255,0.10)",
                  boxShadow: t.highlight ? "0 8px 22px rgba(234,88,12,0.30)" : "none",
                }}
              >
                {t.cta}
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ============================================================================
   Final CTA
   ========================================================================= */

function FinalCTA() {
  return (
    <section
      style={{
        background: "#050505",
        padding: "88px 0 100px",
        borderTop: "1px solid #141414",
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
        <h2
          className="ps-section-title"
          style={{ color: "#FAFAF9" }}
        >
          Start with a key, ship with an SDK.
        </h2>
        <p
          style={{
            marginTop: 16,
            fontSize: 15,
            color: "#9A9A9A",
            lineHeight: 1.6,
            maxWidth: 560,
            margin: "16px auto 0",
          }}
        >
          Test mode is free. Live mode is pay-as-you-go. Your first production
          call can ship this afternoon.
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
              background: "linear-gradient(135deg, #EA580C, #C2410C)",
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
              color: "#FAFAF9",
              fontSize: 14,
              fontWeight: 500,
              padding: "12px 24px",
              borderRadius: 8,
              textDecoration: "none",
            }}
          >
            Talk to an engineer
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
    // reset scroll on mount
    if (typeof window !== "undefined" && !window.location.hash) {
      window.scrollTo(0, 0);
    }
  }, []);

  return (
    <MarketingShell>
      <style>{PAGE_STYLES}</style>
      <Hero />
      <TrustStrip />
      <ApiCatalog />
      <Quickstart />
      <BuiltForDevs />
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
  .ps-hero-copy { order: 1; }
  .ps-hero-mock { order: 2; }
  .ps-api-grid { grid-template-columns: 1fr; }
  .ps-quickstart-grid { grid-template-columns: 1fr; }
  .ps-devs-grid { grid-template-columns: 1fr; }
  .ps-api-card:hover {
    border-color: rgba(234,88,12,0.40) !important;
    transform: translateY(-2px);
  }
  @media (min-width: 640px) {
    .ps-api-grid { grid-template-columns: repeat(2, 1fr); }
    .ps-devs-grid { grid-template-columns: repeat(2, 1fr); }
  }
  @media (min-width: 900px) {
    .ps-hero-grid { grid-template-columns: 1.05fr 1fr; gap: 56px; }
    .ps-api-grid { grid-template-columns: repeat(3, 1fr); }
    .ps-quickstart-grid { grid-template-columns: repeat(3, 1fr); }
    .ps-devs-grid { grid-template-columns: repeat(3, 1fr); }
  }
`;
