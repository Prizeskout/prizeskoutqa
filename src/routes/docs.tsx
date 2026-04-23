import { createFileRoute, Link } from "@tanstack/react-router";
import { BookOpen, Terminal, Webhook, KeyRound, Zap, GitBranch, ArrowRight } from "lucide-react";
import { MarketingShell } from "@/components/marketing/MarketingShell";

export const Route = createFileRoute("/docs")({
  head: () => ({
    meta: [
      { title: "Documentation | PrizeSkout" },
      {
        name: "description",
        content:
          "Guides, SDK references, and integration walkthroughs for the PrizeSkout developer platform.",
      },
      { property: "og:title", content: "Documentation | PrizeSkout" },
      {
        property: "og:description",
        content: "Guides, SDK references, and integration walkthroughs.",
      },
    ],
  }),
  component: DocsPage,
});

const SECTIONS = [
  {
    icon: Zap,
    title: "Getting started",
    desc: "Create a project, mint a key, and make your first call in under 5 minutes.",
  },
  {
    icon: KeyRound,
    title: "Authentication",
    desc: "API keys, scopes, environment separation (test vs live), and rotation.",
  },
  {
    icon: Terminal,
    title: "SDKs",
    desc: "Node, Python, and Go SDKs. Install, configure, and typed client examples.",
  },
  {
    icon: Webhook,
    title: "Webhooks",
    desc: "Subscribe to price drops, promo events, and recommendation changes. Signatures and retries.",
  },
  {
    icon: GitBranch,
    title: "Versioning",
    desc: "How we ship breaking changes, pin versions at key creation, and deprecation policy.",
  },
  {
    icon: BookOpen,
    title: "Guides",
    desc: "End-to-end integrations: dynamic pricing, promo simulation, field intel ingestion.",
  },
];

function DocsPage() {
  return (
    <MarketingShell>
      <section
        style={{
          background: "#050505",
          padding: "96px 0 64px",
          position: "relative",
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
            width: 900,
            height: 500,
            background:
              "radial-gradient(ellipse at center, rgba(234,88,12,0.18) 0%, rgba(5,5,5,0) 65%)",
            filter: "blur(40px)",
            pointerEvents: "none",
            zIndex: 0,
          }}
        />
        <div style={{ position: "relative", zIndex: 1, maxWidth: 1000, margin: "0 auto", textAlign: "center" }}>
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
            <BookOpen size={11} strokeWidth={2.4} /> Documentation
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
            Everything you need to ship.
          </h1>
          <p
            style={{
              marginTop: 18,
              color: "#9A9A9A",
              fontSize: 16,
              lineHeight: 1.6,
              maxWidth: 600,
              margin: "18px auto 0",
            }}
          >
            Full documentation is rolling out alongside public beta. Below is the
            table of contents. If you need early access to a specific guide,
            reach out.
          </p>
        </div>
      </section>

      <section style={{ background: "#050505", padding: "32px 0 96px" }} className="px-5 md:px-10">
        <div style={{ maxWidth: 1180, margin: "0 auto" }}>
          <div
            style={{ display: "grid", gap: 14, gridTemplateColumns: "1fr" }}
            className="docs-grid"
          >
            <style>{`
              @media (min-width: 640px) { .docs-grid { grid-template-columns: repeat(2, 1fr) !important; } }
              @media (min-width: 900px) { .docs-grid { grid-template-columns: repeat(3, 1fr) !important; } }
            `}</style>
            {SECTIONS.map((s) => {
              const Icon = s.icon;
              return (
                <div
                  key={s.title}
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
                  <div style={{ fontSize: 15, fontWeight: 600, color: "#FAFAF9", marginBottom: 6 }}>
                    {s.title}
                  </div>
                  <div style={{ fontSize: 13.5, color: "#8A8A8A", lineHeight: 1.55 }}>{s.desc}</div>
                  <div
                    style={{
                      marginTop: 14,
                      fontSize: 11,
                      fontWeight: 600,
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                      color: "#6B6B6B",
                    }}
                  >
                    Coming soon
                  </div>
                </div>
              );
            })}
          </div>

          <div
            style={{
              marginTop: 40,
              padding: 28,
              background: "#0A0A0A",
              border: "1px solid #1A1A1A",
              borderRadius: 12,
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: 16, fontWeight: 600, color: "#FAFAF9", marginBottom: 8 }}>
              Need something specific before we publish it?
            </div>
            <div style={{ fontSize: 13.5, color: "#8A8A8A", lineHeight: 1.55, marginBottom: 20 }}>
              Our team can walk you through any integration one-on-one.
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
                padding: "11px 22px",
                borderRadius: 8,
                textDecoration: "none",
              }}
            >
              Talk to an engineer <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </section>
    </MarketingShell>
  );
}
