// Quickstart guide. First stop for new users and developers.
// Walks through: store connect → API key → first request → competitor tracking → recommendations.

import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Copy, Check, KeyRound, Zap, BarChart2, Globe, ArrowRight, Lightbulb } from "lucide-react";
import { MarketingShell } from "@/components/marketing/MarketingShell";
import { DocsSubNav } from "@/components/docs/DocsSubNav";

export const Route = createFileRoute("/docs/guides/quickstart")({
  head: () => ({
    meta: [
      { title: "Quickstart | PrizeSkout" },
      {
        name: "description",
        content:
          "Get up and running with PrizeSkout in 5 minutes. Connect your store, mint a test key, track your first competitor, and pull your first pricing recommendation.",
      },
      { property: "og:title", content: "Quickstart | PrizeSkout" },
      {
        property: "og:description",
        content:
          "From zero to your first price recommendation in 5 minutes.",
      },
    ],
  }),
  component: QuickstartPage,
});

const FONT_MONO =
  "ui-monospace, 'SFMono-Regular', Menlo, Consolas, monospace";

// ── Code block ─────────────────────────────────────────────────────────────────

function CodeBlock({ code, language = "bash" }: { code: string; language?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div
      style={{
        position: "relative",
        background: "#0F1419",
        borderRadius: 8,
        padding: "16px 18px",
        marginTop: 12,
        overflow: "auto",
      }}
    >
      <div style={{ position: "absolute", top: 8, right: 10, display: "flex", alignItems: "center", gap: 8 }}>
        <span
          style={{
            fontFamily: FONT_MONO,
            fontSize: 10,
            color: "#6A6A6A",
            textTransform: "uppercase",
            letterSpacing: "0.06em",
          }}
        >
          {language}
        </span>
        <button
          type="button"
          onClick={() => {
            navigator.clipboard.writeText(code);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
            background: "transparent",
            border: "1px solid #2A2A2A",
            color: "#9A9A9A",
            padding: "3px 8px",
            borderRadius: 4,
            fontSize: 11,
            cursor: "pointer",
            fontFamily: "inherit",
          }}
        >
          {copied ? <Check size={11} /> : <Copy size={11} />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre
        style={{
          margin: 0,
          fontSize: 12.5,
          lineHeight: 1.65,
          color: "#E5E2DB",
          fontFamily: FONT_MONO,
          whiteSpace: "pre",
        }}
      >
        {code}
      </pre>
    </div>
  );
}

// ── Step card ──────────────────────────────────────────────────────────────────

function Step({
  n,
  icon: Icon,
  title,
  body,
  children,
}: {
  n: number;
  icon: typeof Zap;
  title: string;
  body: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <div
      style={{
        background: "#FFF",
        border: "1px solid #E8E8E5",
        borderRadius: 10,
        padding: 24,
        marginBottom: 16,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: "50%",
            backgroundColor: "#EA580C",
            color: "#FFF",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 13,
            fontWeight: 700,
            flexShrink: 0,
          }}
        >
          {n}
        </div>
        <Icon size={16} color="#EA580C" />
        <div style={{ fontSize: 17, fontWeight: 600, color: "#1A1A18" }}>{title}</div>
      </div>
      <div
        style={{
          fontSize: 14,
          color: "#5A5A58",
          lineHeight: 1.65,
          marginBottom: children ? 14 : 0,
        }}
      >
        {body}
      </div>
      {children}
    </div>
  );
}

// ── Callout ────────────────────────────────────────────────────────────────────

function Callout({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        background: "rgba(234, 88, 12, 0.05)",
        border: "1px solid rgba(234, 88, 12, 0.2)",
        borderRadius: 8,
        padding: "12px 16px",
        marginTop: 12,
        fontSize: 13,
        color: "#5A3A1A",
        lineHeight: 1.6,
        display: "flex",
        gap: 10,
        alignItems: "flex-start",
      }}
    >
      <Lightbulb size={14} color="#EA580C" style={{ marginTop: 2, flexShrink: 0 }} />
      <div>{children}</div>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

const FIRST_REQUEST = `curl -G 'https://prizeskout.qa/api/public/v1/competitors/prices' \\
  -H 'Authorization: Bearer sk_test_YOUR_KEY' \\
  --data-urlencode 'category=Electronics'`;

const RECOMMENDATIONS_REQUEST = `curl 'https://prizeskout.qa/api/public/v1/pricing/recommendations' \\
  -H 'Authorization: Bearer sk_test_YOUR_KEY'`;

const RESPONSE_EXAMPLE = `{
  "data": [
    {
      "id": "rec_abc123",
      "product": "Sony WH-1000XM5",
      "current_price": 1299,
      "recommended_price": 1249,
      "confidence": 0.91,
      "reason": "Carrefour dropped to QAR 1,149 — hold within 5% ceiling",
      "signals": { "competitor_min": 1149, "rule_effects": [...] }
    }
  ]
}`;

function QuickstartPage() {
  return (
    <MarketingShell>
      <DocsSubNav />
      <section
        style={{
          background: "#FAFAFA",
          minHeight: "calc(100vh - 64px)",
          padding: "56px 24px 96px",
        }}
      >
        <div style={{ maxWidth: 880, margin: "0 auto" }}>
          {/* Header */}
          <div
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: "#EA580C",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              marginBottom: 8,
            }}
          >
            Guide · 5 min
          </div>
          <h1
            style={{
              fontSize: 36,
              fontWeight: 700,
              letterSpacing: "-0.02em",
              color: "#1A1A18",
              marginBottom: 12,
            }}
          >
            Quickstart
          </h1>
          <p
            style={{
              fontSize: 16,
              color: "#5A5A58",
              lineHeight: 1.65,
              marginBottom: 40,
              maxWidth: 660,
            }}
          >
            From store connection to your first real price recommendation in under five minutes. No SDK
            required — every step works with cURL, any HTTP client, or the in-dashboard API
            Explorer.
          </p>

          {/* Steps */}

          <Step
            n={1}
            icon={Zap}
            title="Connect your store"
            body={
              <>
                Head to{" "}
                <Link to="/onboarding" style={{ color: "#EA580C", fontWeight: 600 }}>
                  prizeskout.qa
                </Link>{" "}
                and click <strong>Connect a Store</strong>. Complete the three-step setup — store config,
                channel connect, and margin floors. At the end you'll receive a short access code
                (e.g. <code style={{ fontFamily: FONT_MONO, fontSize: 12, background: "#F5F4F1", padding: "1px 5px", borderRadius: 3 }}>PSK-QA-8842</code>).
                Save it — it's your key to the dashboard on any device. No email or password needed.
              </>
            }
          >
            <Callout>
              The dashboard comes pre-loaded with a sample dataset so you can explore every
              feature before connecting real data. Everything labelled <strong>seed</strong> in
              the API is demo data — your live data appears once you complete steps 3–5 below.
            </Callout>
          </Step>

          <Step
            n={2}
            icon={KeyRound}
            title="Mint a test API key"
            body={
              <>
                In the dashboard, go to{" "}
                <Link to="/dashboard/api-keys" style={{ color: "#EA580C", fontWeight: 600 }}>
                  Settings → API Keys
                </Link>{" "}
                and click <strong>Create test key</strong>. Give it a name (e.g.{" "}
                <code style={{ fontFamily: FONT_MONO, fontSize: 12, background: "#F5F4F1", padding: "1px 5px", borderRadius: 3 }}>
                  local-dev
                </code>
                ) and copy the secret immediately — it's shown once.
              </>
            }
          >
            <Callout>
              Test-mode keys are safe to use in local scripts and CI. They read real data from
              your account but cannot trigger live pricing actions. Switch to a live key only
              when you're ready to push approved recommendations to your storefront.
            </Callout>
          </Step>

          <Step
            n={3}
            icon={Globe}
            title="Make your first request"
            body="Pull the latest competitor prices across your tracked SKUs. Replace sk_test_YOUR_KEY with the key you just copied."
          >
            <CodeBlock code={FIRST_REQUEST} language="bash" />
            <div style={{ marginTop: 14, fontSize: 13, color: "#5A5A58", lineHeight: 1.55 }}>
              You'll get back a JSON array of competitor prices with the freshest scraped values.
              If your account is new, the response includes{" "}
              <code style={{ fontFamily: FONT_MONO, fontSize: 12, background: "#F5F4F1", padding: "1px 5px", borderRadius: 3 }}>
                "_fallback": "sample"
              </code>{" "}
              — that means the engine returned demo data while your competitors are being
              scraped for the first time.
            </div>
          </Step>

          <Step
            n={4}
            icon={Globe}
            title="Track your first competitor URL"
            body={
              <>
                Go to{" "}
                <Link to="/dashboard/competitors" style={{ color: "#EA580C", fontWeight: 600 }}>
                  Competitors
                </Link>{" "}
                in the dashboard, click <strong>Add competitor</strong>, and paste any product
                URL from Carrefour Qatar, Lulu Hypermarket, Amazon.ae, or Noon. PrizeSkout
                will scrape the price and add it to your tracked dataset within minutes.
              </>
            }
          >
            <Callout>
              To get your own product into the pricing engine, add a URL with competitor set to{" "}
              <code style={{ fontFamily: FONT_MONO, fontSize: 12, background: "#F5F4F1", padding: "1px 5px", borderRadius: 3 }}>
                self
              </code>
              . This tells the engine which price is yours versus competitors'. Without a self
              URL, recommendations default to the catalog price you push via{" "}
              <code style={{ fontFamily: FONT_MONO, fontSize: 12, background: "#F5F4F1", padding: "1px 5px", borderRadius: 3 }}>
                POST /v1/sync
              </code>
              .
            </Callout>
          </Step>

          <Step
            n={5}
            icon={BarChart2}
            title="Pull your first recommendation"
            body="Ask the pricing engine for a recommendation on your tracked products. The engine applies your active pricing rules and returns a confidence-weighted suggested price."
          >
            <CodeBlock code={RECOMMENDATIONS_REQUEST} language="bash" />
            <div style={{ marginTop: 14, fontSize: 13, color: "#5A5A58", lineHeight: 1.55 }}>
              A successful response looks like this:
            </div>
            <CodeBlock code={RESPONSE_EXAMPLE} language="json" />
            <div style={{ marginTop: 14, fontSize: 13, color: "#5A5A58", lineHeight: 1.55 }}>
              The <code style={{ fontFamily: FONT_MONO, fontSize: 12, background: "#F5F4F1", padding: "1px 5px", borderRadius: 3 }}>rule_effects</code> array
              in <code style={{ fontFamily: FONT_MONO, fontSize: 12, background: "#F5F4F1", padding: "1px 5px", borderRadius: 3 }}>signals</code> shows
              exactly which pricing rules fired, which passed, and which were overridden — so
              you can audit every decision.
            </div>
          </Step>

          {/* Next steps */}
          <div
            style={{
              marginTop: 8,
              padding: 24,
              background: "#FFF",
              border: "1px solid #E8E8E5",
              borderRadius: 10,
            }}
          >
            <div style={{ fontSize: 16, fontWeight: 700, color: "#1A1A18", marginBottom: 16 }}>
              What to do next
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {[
                {
                  to: "/docs/guides/authentication" as const,
                  title: "Authentication & scopes",
                  desc: "Understand test vs live mode, per-scope keys, and key rotation.",
                },
                {
                  to: "/docs/guides/webhooks" as const,
                  title: "Webhooks",
                  desc: "Subscribe to price.changed and recommendation.ready events with HMAC verification.",
                },
                {
                  to: "/docs/guides/sdk-quickstart" as const,
                  title: "SDK Quickstart",
                  desc: "Drop in a zero-dependency TypeScript fetch client and make typed calls in minutes.",
                },
                {
                  to: "/docs" as const,
                  title: "Full API Reference",
                  desc: "Browse all 24 endpoints, try them live, and copy cURL examples.",
                },
              ].map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 14,
                    padding: "12px 14px",
                    border: "1px solid #E8E8E5",
                    borderRadius: 8,
                    textDecoration: "none",
                  }}
                >
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: "#1A1A18" }}>{item.title}</div>
                    <div style={{ fontSize: 12, color: "#6B6B6B", marginTop: 2 }}>{item.desc}</div>
                  </div>
                  <ArrowRight size={14} color="#EA580C" style={{ flexShrink: 0 }} />
                </Link>
              ))}
            </div>
          </div>

          {/* CTA */}
          <div
            style={{
              marginTop: 16,
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
                Stuck or want a live walkthrough?
              </div>
              <div style={{ fontSize: 13, color: "#5A5A58" }}>
                Our team will pair with you on your first integration, live.
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
