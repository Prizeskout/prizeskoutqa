// Authentication guide. Single source of truth for how PrizeSkout API keys work.
// Linked from every endpoint in the API reference via the scope chip row.

import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, KeyRound, Shield, RefreshCw, AlertTriangle } from "lucide-react";
import { MarketingShell } from "@/components/marketing/MarketingShell";
import { DocsSubNav } from "@/components/docs/DocsSubNav";

export const Route = createFileRoute("/docs/guides/authentication")({
  head: () => ({
    meta: [
      { title: "Authentication | PrizeSkout API" },
      {
        name: "description",
        content:
          "How to authenticate to the PrizeSkout API. Bearer tokens, test vs live mode, scopes, and key rotation.",
      },
      { property: "og:title", content: "Authentication | PrizeSkout API" },
      {
        property: "og:description",
        content: "Bearer tokens, test vs live mode, scopes, and key rotation for the PrizeSkout API.",
      },
    ],
  }),
  component: AuthenticationGuide,
});

const FONT_MONO =
  "'JetBrains Mono', 'SFMono-Regular', Menlo, Consolas, 'Liberation Mono', monospace";

const SCOPES: { scope: string; desc: string }[] = [
  { scope: "competitors.read", desc: "Read competitor prices, history, and detected patterns." },
  { scope: "competitors.write", desc: "Trigger out-of-band scrapes." },
  { scope: "pricing.read", desc: "Read pricing recommendations and active rules." },
  { scope: "pricing.write", desc: "Log accept / override / snooze decisions on recommendations." },
  { scope: "promotions.read", desc: "Read the promotion calendar and past campaigns." },
  { scope: "promotions.write", desc: "Run ROI simulations." },
  { scope: "field_intel.read", desc: "Read field observations and price gap reports." },
  { scope: "field_intel.write", desc: "Submit new field observations." },
  { scope: "webhooks.read", desc: "List webhook endpoints and recent deliveries." },
  { scope: "webhooks.write", desc: "Create, update, disable, or replay webhook endpoints." },
];

function CodeBlock({ children }: { children: string }) {
  return (
    <pre
      style={{
        margin: "0 0 20px",
        padding: "16px 18px",
        background: "#0A0A0A",
        color: "#E5E5E2",
        fontFamily: FONT_MONO,
        fontSize: 12.5,
        lineHeight: 1.65,
        borderRadius: 8,
        overflow: "auto",
      }}
    >
      {children}
    </pre>
  );
}

function H2({ children, id }: { children: React.ReactNode; id: string }) {
  return (
    <h2
      id={id}
      style={{
        fontSize: 22,
        fontWeight: 700,
        color: "#1A1A18",
        letterSpacing: "-0.01em",
        marginTop: 44,
        marginBottom: 14,
        scrollMarginTop: 80,
      }}
    >
      {children}
    </h2>
  );
}

function P({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ fontSize: 15, lineHeight: 1.7, color: "#3A3A38", marginBottom: 16 }}>{children}</p>
  );
}

function Callout({
  tone,
  icon,
  title,
  children,
}: {
  tone: "info" | "warning";
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  const colors =
    tone === "warning"
      ? { bg: "rgba(234, 179, 8, 0.06)", border: "rgba(234, 179, 8, 0.25)", fg: "#854D0E" }
      : { bg: "rgba(59, 130, 246, 0.05)", border: "rgba(59, 130, 246, 0.18)", fg: "#1E3A8A" };
  return (
    <div
      style={{
        padding: "14px 16px",
        background: colors.bg,
        border: `1px solid ${colors.border}`,
        borderRadius: 8,
        marginBottom: 20,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, color: colors.fg }}>
        {icon}
        <span style={{ fontWeight: 600, fontSize: 13.5 }}>{title}</span>
      </div>
      <div style={{ fontSize: 13.5, lineHeight: 1.6, color: "#3A3A38" }}>{children}</div>
    </div>
  );
}

function AuthenticationGuide() {
  return (
    <MarketingShell>
      <DocsSubNav />
      <section style={{ background: "#FAFAFA", minHeight: "calc(100vh - 64px)", padding: "40px 24px 96px" }}>
        <div style={{ maxWidth: 760, margin: "0 auto" }}>
          <Link
            to="/docs/guides"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              fontSize: 12.5,
              color: "#5A5A58",
              textDecoration: "none",
              marginBottom: 18,
            }}
          >
            <ArrowLeft size={13} /> All guides
          </Link>

          <h1
            style={{
              fontSize: 36,
              fontWeight: 700,
              letterSpacing: "-0.02em",
              color: "#1A1A18",
              marginBottom: 12,
            }}
          >
            Authentication
          </h1>
          <p style={{ fontSize: 16, color: "#5A5A58", lineHeight: 1.65, marginBottom: 32 }}>
            Every PrizeSkout API request is authenticated with an API key sent as a Bearer token. This
            page covers how keys work, the difference between test and live mode, the scope system, and
            how to rotate keys safely.
          </p>

          <H2 id="bearer">Bearer token format</H2>
          <P>
            Send your API key in the <code style={{ fontFamily: FONT_MONO, background: "#F4F4F2", padding: "1px 5px", borderRadius: 3 }}>Authorization</code> header,
            prefixed with <code style={{ fontFamily: FONT_MONO, background: "#F4F4F2", padding: "1px 5px", borderRadius: 3 }}>Bearer</code>.
            All endpoints under <code style={{ fontFamily: FONT_MONO, background: "#F4F4F2", padding: "1px 5px", borderRadius: 3 }}>/v1/</code> use the same scheme.
          </P>
          <CodeBlock>{`curl https://api.prizeskout.qa/v1/competitors/prices \\
  -H "Authorization: Bearer sk_test_abc123..."`}</CodeBlock>
          <P>
            Keys are passed as request headers only. PrizeSkout never accepts keys via query string,
            cookies, or request body — both because it leaks them into server logs and because none of
            our SDKs support it.
          </P>

          <H2 id="modes">Test mode vs live mode</H2>
          <P>
            Every account has two parallel sets of keys, each with its own prefix:
          </P>
          <ul style={{ paddingLeft: 22, marginBottom: 20, fontSize: 14.5, color: "#3A3A38", lineHeight: 1.7 }}>
            <li style={{ marginBottom: 6 }}>
              <code style={{ fontFamily: FONT_MONO, background: "#F4F4F2", padding: "1px 5px", borderRadius: 3 }}>sk_test_…</code>{" "}
              — test mode. Returns realistic but synthetic data, never affects your real account, and is
              rate-limited generously so you can iterate fast. The "Try it out" button on every endpoint
              uses test mode.
            </li>
            <li>
              <code style={{ fontFamily: FONT_MONO, background: "#F4F4F2", padding: "1px 5px", borderRadius: 3 }}>sk_live_…</code>{" "}
              — live mode. Reads and writes against your real tracked SKUs, recommendations, and webhooks.
              Counts against your usage quota.
            </li>
          </ul>
          <Callout
            tone="info"
            icon={<KeyRound size={14} />}
            title="Where to mint keys"
          >
            Keys are created in <strong>Dashboard → API Keys</strong>. The full secret is shown exactly once
            at creation time — store it in your secret manager immediately. PrizeSkout only keeps a hash
            and the last four characters for the UI.
          </Callout>

          <H2 id="scopes">Scopes</H2>
          <P>
            Each key carries an explicit list of scopes. A request to an endpoint that requires a scope
            your key does not have returns <code style={{ fontFamily: FONT_MONO, background: "#F4F4F2", padding: "1px 5px", borderRadius: 3 }}>403 forbidden</code>.
            Grant only the scopes the integration actually needs — a webhook receiver that just needs to
            list deliveries should not have <code style={{ fontFamily: FONT_MONO, background: "#F4F4F2", padding: "1px 5px", borderRadius: 3 }}>pricing.write</code>.
          </P>
          <div style={{ border: "1px solid #E8E8E5", borderRadius: 8, overflow: "hidden", background: "#FFF", marginBottom: 24 }}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "200px 1fr",
                padding: "9px 14px",
                background: "#F8F8F6",
                borderBottom: "1px solid #E8E8E5",
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: "#6B6B6B",
              }}
            >
              <div>Scope</div>
              <div>Grants</div>
            </div>
            {SCOPES.map((s, i) => (
              <div
                key={s.scope}
                style={{
                  display: "grid",
                  gridTemplateColumns: "200px 1fr",
                  padding: "10px 14px",
                  borderBottom: i === SCOPES.length - 1 ? "none" : "1px solid #F0F0EE",
                  fontSize: 13,
                }}
              >
                <code style={{ fontFamily: FONT_MONO, fontSize: 12, color: "#1A1A18", fontWeight: 600 }}>
                  {s.scope}
                </code>
                <span style={{ color: "#3A3A38", lineHeight: 1.55 }}>{s.desc}</span>
              </div>
            ))}
          </div>

          <H2 id="errors">Failure modes</H2>
          <P>You will see one of these responses if authentication fails:</P>
          <div style={{ border: "1px solid #E8E8E5", borderRadius: 8, overflow: "hidden", background: "#FFF", marginBottom: 24 }}>
            {[
              { code: 401, name: "unauthorized", desc: "No Authorization header, malformed header, or the key has been revoked." },
              { code: 403, name: "forbidden", desc: "Key is valid but missing the scope this endpoint requires." },
              { code: 429, name: "rate_limited", desc: "You exceeded the per-minute quota for this key. Wait for the duration in the Retry-After header." },
            ].map((e, i, arr) => (
              <div
                key={e.code}
                style={{
                  display: "grid",
                  gridTemplateColumns: "70px 160px 1fr",
                  padding: "10px 14px",
                  borderBottom: i === arr.length - 1 ? "none" : "1px solid #F0F0EE",
                  fontSize: 13,
                  alignItems: "center",
                }}
              >
                <span style={{ fontFamily: FONT_MONO, fontSize: 12, fontWeight: 700, color: "#DC2626" }}>
                  {e.code}
                </span>
                <code style={{ fontFamily: FONT_MONO, fontSize: 12, color: "#1A1A18" }}>{e.name}</code>
                <span style={{ color: "#3A3A38" }}>{e.desc}</span>
              </div>
            ))}
          </div>

          <H2 id="rotation">Rotating keys</H2>
          <P>
            Rotate any time a key may have been exposed (committed to a public repo, shared in a screen
            share, leaked via a third-party tool). The rotation flow is designed to avoid downtime:
          </P>
          <ol style={{ paddingLeft: 22, marginBottom: 20, fontSize: 14.5, color: "#3A3A38", lineHeight: 1.75 }}>
            <li style={{ marginBottom: 6 }}>
              In Dashboard → API Keys, mint a <strong>new</strong> key with the same scopes.
            </li>
            <li style={{ marginBottom: 6 }}>
              Roll the new key out to your services and verify traffic is flowing under it (the dashboard
              shows last-used timestamps).
            </li>
            <li style={{ marginBottom: 6 }}>
              Revoke the old key. Revoked keys return <code style={{ fontFamily: FONT_MONO, background: "#F4F4F2", padding: "1px 5px", borderRadius: 3 }}>401 unauthorized</code> immediately —
              there is no grace period.
            </li>
          </ol>
          <Callout
            tone="warning"
            icon={<AlertTriangle size={14} />}
            title="If a live key was committed to a public repo"
          >
            Revoke it immediately, even before rolling out the replacement. A few minutes of failing
            requests is far cheaper than an attacker with read/write access to your pricing data.
          </Callout>

          <H2 id="best-practices">Best practices</H2>
          <ul style={{ paddingLeft: 22, marginBottom: 20, fontSize: 14.5, color: "#3A3A38", lineHeight: 1.75 }}>
            <li style={{ marginBottom: 6 }}>
              Use <strong>one key per integration</strong>. If your CI, your dashboard, and your webhook
              receiver all share a key, revoking one breaks all three.
            </li>
            <li style={{ marginBottom: 6 }}>
              Store keys in a secret manager (Vault, Doppler, AWS/GCP Secrets Manager, your hosting
              platform's secret store). Never commit them to git, even in <code style={{ fontFamily: FONT_MONO, background: "#F4F4F2", padding: "1px 5px", borderRadius: 3 }}>.env.example</code>.
            </li>
            <li style={{ marginBottom: 6 }}>
              Pin every key to the smallest scope set that works. Read-only integrations should never
              hold a <code style={{ fontFamily: FONT_MONO, background: "#F4F4F2", padding: "1px 5px", borderRadius: 3 }}>.write</code> scope.
            </li>
            <li>
              Prefer test mode (<code style={{ fontFamily: FONT_MONO, background: "#F4F4F2", padding: "1px 5px", borderRadius: 3 }}>sk_test_…</code>) for local dev, CI, and staging. Only
              promote to live keys once the integration is verified.
            </li>
          </ul>

          <div
            style={{
              marginTop: 40,
              padding: 20,
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
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <Shield size={20} color="#EA580C" />
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: "#1A1A18" }}>Ready to make a request?</div>
                <div style={{ fontSize: 13, color: "#5A5A58" }}>
                  Jump into the API reference and try any endpoint live.
                </div>
              </div>
            </div>
            <Link
              to="/docs"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                background: "#1A1A18",
                color: "#FFF",
                fontSize: 13,
                fontWeight: 600,
                padding: "9px 16px",
                borderRadius: 8,
                textDecoration: "none",
              }}
            >
              <RefreshCw size={13} /> Open API reference
            </Link>
          </div>
        </div>
      </section>
    </MarketingShell>
  );
}
