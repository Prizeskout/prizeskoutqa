import { createFileRoute, Link } from "@tanstack/react-router";
import { Code2, ArrowRight } from "lucide-react";
import { MarketingShell } from "@/components/marketing/MarketingShell";

export const Route = createFileRoute("/api-reference")({
  head: () => ({
    meta: [
      { title: "API Reference | PrizeSkout" },
      {
        name: "description",
        content:
          "REST API reference for PrizeSkout: pricing recommendations, competitor intelligence, promotions ROI, market signals, and field intel.",
      },
      { property: "og:title", content: "API Reference | PrizeSkout" },
      {
        property: "og:description",
        content:
          "Endpoints, request and response schemas, error codes, and rate limits for every PrizeSkout API.",
      },
    ],
  }),
  component: ApiReferencePage,
});

const MONO =
  "'JetBrains Mono', 'SFMono-Regular', Menlo, Consolas, 'Liberation Mono', monospace";

type Endpoint = { method: "GET" | "POST" | "PATCH" | "DELETE"; path: string; desc: string };
type Group = { name: string; endpoints: Endpoint[] };

const GROUPS: Group[] = [
  {
    name: "Pricing",
    endpoints: [
      { method: "POST", path: "/v1/pricing/recommendations", desc: "Create a pricing recommendation for a SKU and channel set" },
      { method: "GET", path: "/v1/pricing/recommendations/:id", desc: "Retrieve a recommendation" },
      { method: "GET", path: "/v1/pricing/recommendations", desc: "List recommendations with filters" },
      { method: "POST", path: "/v1/pricing/decisions", desc: "Log an accept or override decision for audit trails" },
    ],
  },
  {
    name: "Competitors",
    endpoints: [
      { method: "GET", path: "/v1/competitors/prices", desc: "Live competitor prices across channels" },
      { method: "GET", path: "/v1/competitors/prices/history", desc: "Historical price series by SKU and channel" },
      { method: "GET", path: "/v1/competitors/patterns", desc: "Detected behavior patterns and confidence" },
    ],
  },
  {
    name: "Promotions",
    endpoints: [
      { method: "GET", path: "/v1/promotions/calendar", desc: "Live competitor promo calendar" },
      { method: "POST", path: "/v1/promotions/simulate", desc: "Simulate ROI for a candidate campaign" },
      { method: "GET", path: "/v1/promotions/campaigns", desc: "Your past campaigns and measured outcomes" },
    ],
  },
  {
    name: "Market",
    endpoints: [
      { method: "GET", path: "/v1/market/trends", desc: "Category growth, volatility, top movers" },
      { method: "GET", path: "/v1/market/assortment-gaps", desc: "SKUs competitors carry that you do not" },
      { method: "GET", path: "/v1/market/cross-border", desc: "International price radar for import risk" },
    ],
  },
  {
    name: "Field Intel",
    endpoints: [
      { method: "POST", path: "/v1/field-intel/observations", desc: "Ingest in-store observations from field reps" },
      { method: "GET", path: "/v1/field-intel/observations", desc: "List observations with filters" },
      { method: "GET", path: "/v1/field-intel/price-gaps", desc: "Online vs in-store discrepancies" },
    ],
  },
  {
    name: "Webhooks",
    endpoints: [
      { method: "POST", path: "/v1/webhooks/endpoints", desc: "Register a webhook endpoint" },
      { method: "GET", path: "/v1/webhooks/events", desc: "List delivered and pending events" },
      { method: "POST", path: "/v1/webhooks/events/:id/replay", desc: "Manually replay a webhook delivery" },
    ],
  },
];

function MethodPill({ method }: { method: Endpoint["method"] }) {
  const colors: Record<string, { fg: string; bg: string; border: string }> = {
    GET: { fg: "#22C55E", bg: "rgba(34,197,94,0.08)", border: "rgba(34,197,94,0.25)" },
    POST: { fg: "#FB923C", bg: "rgba(234,88,12,0.10)", border: "rgba(234,88,12,0.28)" },
    PATCH: { fg: "#60A5FA", bg: "rgba(96,165,250,0.10)", border: "rgba(96,165,250,0.28)" },
    DELETE: { fg: "#F87171", bg: "rgba(239,68,68,0.10)", border: "rgba(239,68,68,0.28)" },
  };
  const c = colors[method];
  return (
    <span
      style={{
        fontSize: 10,
        fontFamily: MONO,
        fontWeight: 700,
        letterSpacing: "0.06em",
        color: c.fg,
        background: c.bg,
        border: `1px solid ${c.border}`,
        padding: "3px 7px",
        borderRadius: 4,
        minWidth: 52,
        textAlign: "center",
        display: "inline-block",
      }}
    >
      {method}
    </span>
  );
}

function ApiReferencePage() {
  return (
    <MarketingShell>
      <section
        style={{ background: "#050505", padding: "96px 0 40px" }}
        className="px-5 md:px-10"
      >
        <div style={{ maxWidth: 1000, margin: "0 auto", textAlign: "center" }}>
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
            <Code2 size={11} strokeWidth={2.4} /> API Reference
          </span>
          <h1
            style={{
              marginTop: 18,
              fontSize: 44,
              fontWeight: 700,
              color: "#FAFAF9",
              letterSpacing: "-0.02em",
              lineHeight: 1.1,
            }}
          >
            Every endpoint, every field.
          </h1>
          <p
            style={{
              marginTop: 18,
              color: "#9A9A9A",
              fontSize: 16,
              lineHeight: 1.6,
              maxWidth: 620,
              margin: "18px auto 0",
            }}
          >
            The PrizeSkout API is organized around REST. We use standard HTTP
            methods, return JSON-encoded responses, and use conventional HTTP
            status codes.
          </p>
          <div
            style={{
              marginTop: 20,
              fontFamily: MONO,
              fontSize: 12,
              color: "#6B6B6B",
            }}
          >
            Base URL · <span style={{ color: "#FB923C" }}>https://api.prizeskout.qa</span>
          </div>
        </div>
      </section>

      <section
        style={{ background: "#050505", padding: "32px 0 96px" }}
        className="px-5 md:px-10"
      >
        <div style={{ maxWidth: 980, margin: "0 auto", display: "flex", flexDirection: "column", gap: 28 }}>
          {GROUPS.map((g) => (
            <div
              key={g.name}
              style={{
                background: "#0A0A0A",
                border: "1px solid #1A1A1A",
                borderRadius: 12,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  padding: "16px 22px",
                  borderBottom: "1px solid #1A1A1A",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <div style={{ fontSize: 15, fontWeight: 600, color: "#FAFAF9" }}>{g.name}</div>
                <div
                  style={{
                    fontSize: 11,
                    fontFamily: MONO,
                    color: "#6B6B6B",
                    letterSpacing: "0.06em",
                  }}
                >
                  {g.endpoints.length} endpoints
                </div>
              </div>
              <div>
                {g.endpoints.map((e) => (
                  <div
                    key={e.path + e.method}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "auto 1fr",
                      gap: 14,
                      padding: "14px 22px",
                      borderBottom: "1px solid #141414",
                      alignItems: "start",
                    }}
                  >
                    <MethodPill method={e.method} />
                    <div>
                      <div style={{ fontFamily: MONO, fontSize: 12.5, color: "#FAFAF9" }}>
                        {e.path}
                      </div>
                      <div style={{ fontSize: 12.5, color: "#8A8A8A", marginTop: 3, lineHeight: 1.5 }}>
                        {e.desc}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}

          <div
            style={{
              padding: 28,
              background: "#0A0A0A",
              border: "1px solid #1A1A1A",
              borderRadius: 12,
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: 15, fontWeight: 600, color: "#FAFAF9", marginBottom: 8 }}>
              Full interactive reference is in private beta.
            </div>
            <div style={{ fontSize: 13, color: "#8A8A8A", lineHeight: 1.55, marginBottom: 20 }}>
              Sign up and we'll grant you early access to the request explorer and OpenAPI spec.
            </div>
            <Link
              to="/signup"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                background: "linear-gradient(135deg, #EA580C, #C2410C)",
                color: "#FFF",
                fontSize: 13.5,
                fontWeight: 600,
                padding: "11px 22px",
                borderRadius: 8,
                textDecoration: "none",
              }}
            >
              Request API access <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </section>
    </MarketingShell>
  );
}
