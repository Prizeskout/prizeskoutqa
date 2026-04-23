// Guides hub page. Lists written walkthroughs and conceptual docs.
// Phase 2 will expand each guide into its own /docs/guides/<slug> route.

import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Zap,
  KeyRound,
  Webhook,
  Terminal,
  GitBranch,
  AlertTriangle,
  Gauge,
  ArrowRight,
} from "lucide-react";
import { MarketingShell } from "@/components/marketing/MarketingShell";
import { DocsSubNav } from "@/components/docs/DocsSubNav";

export const Route = createFileRoute("/docs/guides")({
  head: () => ({
    meta: [
      { title: "Guides | PrizeSkout" },
      {
        name: "description",
        content:
          "Quickstart, authentication, webhooks, SDKs, error handling, rate limits, and versioning guides for the PrizeSkout API.",
      },
      { property: "og:title", content: "Guides | PrizeSkout" },
      {
        property: "og:description",
        content: "Walkthroughs and conceptual docs for the PrizeSkout API.",
      },
    ],
  }),
  component: GuidesPage,
});

const GUIDES: {
  icon: typeof Zap;
  title: string;
  desc: string;
  eta: string;
  to?: "/docs/guides/authentication";
}[] = [
  {
    icon: Zap,
    title: "Quickstart",
    desc: "Mint a test key and make your first request in under 5 minutes.",
    eta: "5 min read",
  },
  {
    icon: KeyRound,
    title: "Authentication",
    desc: "API keys, scopes, test vs live mode, and rotation.",
    eta: "4 min read",
    to: "/docs/guides/authentication",
  },
  {
    icon: Webhook,
    title: "Webhooks",
    desc: "Subscribe to events, verify signatures, handle retries.",
    eta: "8 min read",
  },
  {
    icon: Terminal,
    title: "SDKs",
    desc: "Node, Python, and Go client libraries with typed responses.",
    eta: "Coming soon",
  },
  {
    icon: AlertTriangle,
    title: "Error handling",
    desc: "Error response shape, codes, and retry semantics.",
    eta: "3 min read",
  },
  {
    icon: Gauge,
    title: "Rate limits",
    desc: "Per-minute quotas, burst behavior, and Retry-After headers.",
    eta: "2 min read",
  },
  {
    icon: GitBranch,
    title: "Versioning",
    desc: "How we ship breaking changes, version pinning, deprecation policy.",
    eta: "3 min read",
  },
];

function GuidesPage() {
  return (
    <MarketingShell>
      <DocsSubNav />
      <section style={{ background: "#FAFAFA", minHeight: "calc(100vh - 64px)", padding: "56px 24px 96px" }}>
        <div style={{ maxWidth: 980, margin: "0 auto" }}>
          <h1
            style={{
              fontSize: 36,
              fontWeight: 700,
              letterSpacing: "-0.02em",
              color: "#1A1A18",
              marginBottom: 12,
            }}
          >
            Guides
          </h1>
          <p style={{ fontSize: 16, color: "#5A5A58", lineHeight: 1.65, marginBottom: 40, maxWidth: 640 }}>
            Conceptual walkthroughs to complement the endpoint reference. Start with the Quickstart, then dig
            into the topic you need.
          </p>

          <div
            style={{
              display: "grid",
              gap: 14,
              gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
            }}
          >
            {GUIDES.map((g) => {
              const Icon = g.icon;
              const cardInner = (
                <>
                  <div
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: 8,
                      background: "rgba(234,88,12,0.08)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      marginBottom: 12,
                    }}
                  >
                    <Icon size={16} color="#EA580C" strokeWidth={2} />
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 600, color: "#1A1A18", marginBottom: 6 }}>
                    {g.title}
                  </div>
                  <div style={{ fontSize: 13, color: "#5A5A58", lineHeight: 1.55, marginBottom: 12 }}>
                    {g.desc}
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                      color: g.to ? "#EA580C" : "#8A8A8A",
                    }}
                  >
                    {g.to ? "Read guide →" : g.eta}
                  </div>
                </>
              );
              const cardStyle: React.CSSProperties = {
                background: "#FFF",
                border: "1px solid #E8E8E5",
                borderRadius: 10,
                padding: 20,
                transition: "border-color 0.15s",
                textDecoration: "none",
                display: "block",
                cursor: g.to ? "pointer" : "default",
              };
              return g.to ? (
                <Link key={g.title} to={g.to} style={cardStyle}>
                  {cardInner}
                </Link>
              ) : (
                <div key={g.title} style={cardStyle}>
                  {cardInner}
                </div>
              );
            })}
          </div>

          <div
            style={{
              marginTop: 40,
              padding: 24,
              background: "#FFF",
              border: "1px solid #E8E8E5",
              borderRadius: 10,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 16,
              flexWrap: "wrap",
            }}
          >
            <div>
              <div style={{ fontSize: 15, fontWeight: 600, color: "#1A1A18", marginBottom: 4 }}>
                Need help integrating?
              </div>
              <div style={{ fontSize: 13, color: "#5A5A58" }}>
                Our team will walk you through your first request live.
              </div>
            </div>
            <Link
              to="/contact"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                background: "linear-gradient(135deg, #EA580C, #C2410C)",
                color: "#FFF",
                fontSize: 13.5,
                fontWeight: 600,
                padding: "10px 18px",
                borderRadius: 8,
                textDecoration: "none",
              }}
            >
              Talk to us <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </section>
    </MarketingShell>
  );
}
