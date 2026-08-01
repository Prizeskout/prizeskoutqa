import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  type DemoScenario,
  getScenario,
  getScenarioDecisions,
  getScenarioOverrides,
} from "@/lib/demo-scenarios";
import { ScenarioPricingCard } from "@/components/dashboard/pricing/ScenarioPricingCard";

export const Route = createFileRoute("/dashboard/scenarios/$slug")({
  component: ScenarioDashboard,
  loader: ({ params }: { params: { slug: string } }): { scenario: DemoScenario | null } => {
    return { scenario: getScenario(params.slug) ?? null };
  },
});

function ScenarioDashboard() {
  const { scenario } = Route.useLoaderData() as { scenario: DemoScenario | null };
  const [decisions, setDecisions] = useState(() =>
    scenario ? getScenarioDecisions(scenario.id) : {},
  );
  const overrides = scenario ? getScenarioOverrides(scenario.id) : {};

  function handleDecisionChange(id: string, decision: "applied" | "dismissed" | "snoozed" | null) {
    setDecisions((prev) => {
      const next = { ...prev };
      if (decision === null) delete next[id];
      else next[id] = decision;
      return next;
    });
  }

  if (!scenario) {
    return (
      <div style={{ padding: 40, color: "#A8A29E", textAlign: "center" }}>
        Scenario not found.{" "}
        <a href="/dashboard/scenarios" style={{ color: "#7C3AED" }}>Back to Demo Stores</a>
      </div>
    );
  }

  const appliedCount = Object.values(decisions).filter((d) => d === "applied").length;
  const appliedRecs = scenario.recommendations.filter((r: { id: string }) => decisions[r.id] === "applied");
  const netMonthlyApplied = appliedRecs.reduce((acc, r) => {
    const n = parseFloat(r.netMonthly.replace(/[^0-9.]/g, "")) || 0;
    return acc + n;
  }, 0);

  return (
    <div style={{ padding: "28px 36px", maxWidth: 1100, margin: "0 auto" }}>
      {/* Breadcrumb */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 22, fontSize: 13, color: "#78716C" }}>
        <Link to="/dashboard/revenue-hub" style={{ color: "#78716C", textDecoration: "none" }}>
          Demo Scenarios
        </Link>
        <span>›</span>
        <span style={{ color: "#A8A29E" }}>{scenario.name}</span>
      </div>

      {/* Header */}
      <div style={{
        borderRadius: 16,
        overflow: "hidden",
        marginBottom: 28,
        position: "relative",
      }}>
        <div style={{ background: scenario.headerBg, padding: "28px 32px" }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 20, flexWrap: "wrap" }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                <span style={{
                  background: scenario.platformColor + "20",
                  border: `1px solid ${scenario.platformColor}40`,
                  color: "#fff",
                  fontSize: 11,
                  fontWeight: 600,
                  padding: "3px 10px",
                  borderRadius: 999,
                }}>{scenario.platform}</span>
                <span style={{ color: "rgba(255,255,255,0.5)", fontSize: 11 }}>{scenario.category}</span>
              </div>
              <h1 style={{ fontSize: 24, fontWeight: 700, color: "#fff", margin: 0, marginBottom: 4 }}>
                {scenario.name}
              </h1>
              <p style={{ fontSize: 14, color: "rgba(255,255,255,0.65)", margin: 0 }}>{scenario.tagline}</p>
            </div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <a
                href={`/store/${scenario.id}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  background: "rgba(255,255,255,0.10)",
                  border: "1px solid rgba(255,255,255,0.18)",
                  color: "#fff",
                  fontSize: 13,
                  fontWeight: 600,
                  padding: "10px 18px",
                  borderRadius: 10,
                  textDecoration: "none",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 7,
                }}
              >
                🏪 Open Storefront
                <span style={{ fontSize: 10, color: "rgba(255,255,255,0.5)" }}>(new tab)</span>
              </a>
            </div>
          </div>

          {/* Applied summary bar */}
          {appliedCount > 0 && (
            <div style={{
              marginTop: 18,
              background: "rgba(22,163,74,0.15)",
              border: "1px solid rgba(22,163,74,0.3)",
              borderRadius: 10,
              padding: "10px 16px",
              display: "flex",
              alignItems: "center",
              gap: 10,
            }}>
              <span style={{ fontSize: 16 }}>✓</span>
              <span style={{ fontSize: 13, color: "#4ADE80", fontWeight: 600 }}>
                {appliedCount} recommendation{appliedCount !== 1 ? "s" : ""} applied
              </span>
              <span style={{ fontSize: 12, color: "rgba(74,222,128,0.7)" }}>
                · Storefront prices updated · Net monthly upside: QAR {netMonthlyApplied.toLocaleString()}
              </span>
            </div>
          )}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 28, alignItems: "start" }}>
        {/* Main — recommendations */}
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
            <span style={{ fontSize: 15, fontWeight: 700, color: "#FAFAF9" }}>
              Pricing Recommendations
            </span>
            <span style={{
              background: "#292524",
              color: "#A8A29E",
              fontSize: 11.5,
              padding: "2px 8px",
              borderRadius: 999,
            }}>{scenario.recommendations.length}</span>
          </div>

          {scenario.recommendations.map((rec) => (
            <ScenarioPricingCard
              key={rec.id}
              rec={rec}
              scenarioId={scenario.id}
              initialDecision={decisions[rec.id]}
              onDecisionChange={handleDecisionChange}
            />
          ))}

          {/* Product grid */}
          <div style={{ marginTop: 32 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: "#FAFAF9", marginBottom: 14 }}>
              Live Product Prices
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 12 }}>
              {scenario.products.map((p) => {
                const override = overrides[p.sku];
                const hasOverride = override !== undefined;
                const rec = scenario.recommendations.find((r) => r.productSku === p.sku);
                return (
                  <div
                    key={p.sku}
                    style={{
                      background: "#1C1917",
                      border: hasOverride ? "1px solid rgba(22,163,74,0.35)" : "1px solid #292524",
                      borderRadius: 12,
                      padding: "14px 14px",
                    }}
                  >
                    <div style={{ fontSize: 28, marginBottom: 8 }}>{p.imageEmoji}</div>
                    <div style={{ fontSize: 12, color: "#78716C", marginBottom: 3 }}>{p.category}</div>
                    <div style={{ fontSize: 12.5, fontWeight: 600, color: "#D6D3D1", marginBottom: 8, lineHeight: 1.3 }}>
                      {p.name}
                    </div>
                    <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
                      <span style={{
                        fontSize: 14,
                        fontWeight: 700,
                        color: hasOverride ? "#4ADE80" : "#FAFAF9",
                      }}>
                        QAR {(hasOverride ? override : p.basePrice).toFixed(
                          (hasOverride ? override : p.basePrice) < 100 ? 2 : 0,
                        )}
                      </span>
                      {hasOverride && (
                        <span style={{ fontSize: 11, color: "#78716C", textDecoration: "line-through" }}>
                          {p.basePrice.toFixed(p.basePrice < 100 ? 2 : 0)}
                        </span>
                      )}
                    </div>
                    {hasOverride && (
                      <div style={{ fontSize: 10.5, color: "#4ADE80", marginTop: 4 }}>
                        🤖 Updated by PrizeSkout
                      </div>
                    )}
                    {!hasOverride && rec && (
                      <div style={{ fontSize: 10.5, color: "#78716C", marginTop: 4 }}>
                        Recommendation pending
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Sidebar — AI insights */}
        <div style={{ position: "sticky", top: 24 }}>
          <AIInsightsPanel scenario={scenario} />
        </div>
      </div>
    </div>
  );
}

function AIInsightsPanel({ scenario }: { scenario: ReturnType<typeof getScenario> }) {
  if (!scenario) return null;
  const { insight } = scenario;

  return (
    <div style={{
      background: "#1C1917",
      border: "1px solid #292524",
      borderRadius: 16,
      overflow: "hidden",
    }}>
      {/* Header */}
      <div style={{
        background: "linear-gradient(135deg, #1A0A2E 0%, #0D1B2A 100%)",
        padding: "16px 18px",
        borderBottom: "1px solid #292524",
        display: "flex",
        alignItems: "center",
        gap: 8,
      }}>
        <div style={{
          width: 28,
          height: 28,
          background: "linear-gradient(135deg, #7C3AED, #4F46E5)",
          borderRadius: 8,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 14,
          flexShrink: 0,
        }}>✦</div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#FAFAF9" }}>AI Insights</div>
          <div style={{ fontSize: 10.5, color: "#78716C" }}>Powered by Claude Opus</div>
        </div>
      </div>

      <div style={{ padding: "16px 18px" }}>
        {/* Headline */}
        <div style={{
          fontSize: 13.5,
          fontWeight: 600,
          color: "#E7E5E4",
          lineHeight: 1.5,
          marginBottom: 16,
          padding: "10px 12px",
          background: "rgba(124,58,237,0.06)",
          borderRadius: 8,
          borderLeft: "3px solid #7C3AED",
        }}>
          {insight.headline}
        </div>

        {/* Bullets */}
        <div style={{ marginBottom: 18 }}>
          {insight.bullets.map((bullet, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                gap: 10,
                marginBottom: 10,
                padding: "8px 10px",
                background: "#231F1E",
                borderRadius: 8,
              }}
            >
              <span style={{ color: "#7C3AED", fontSize: 14, flexShrink: 0, marginTop: 1 }}>•</span>
              <span style={{ fontSize: 12.5, color: "#A8A29E", lineHeight: 1.55 }}>{bullet}</span>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div style={{ borderTop: "1px solid #292524", paddingTop: 14 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: "#78716C", letterSpacing: "0.04em", marginBottom: 10 }}>
            RECOMMENDED ACTIONS
          </div>
          {insight.actions.map((action, i) => (
            <div
              key={i}
              style={{
                marginBottom: i < insight.actions.length - 1 ? 10 : 0,
                padding: "10px 12px",
                background: "#231F1E",
                borderRadius: 8,
                border: "1px solid #292524",
              }}
            >
              <div style={{ fontSize: 12.5, fontWeight: 600, color: "#FAFAF9", marginBottom: 4 }}>
                {action.title}
              </div>
              <div style={{ fontSize: 12, color: "#78716C", lineHeight: 1.5 }}>{action.detail}</div>
            </div>
          ))}
        </div>

        {/* Storefront shortcut */}
        <a
          href={`/store/${scenario.id}`}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 7,
            marginTop: 16,
            padding: "10px 0",
            background: "rgba(255,255,255,0.03)",
            border: "1px solid #3C3835",
            borderRadius: 8,
            color: "#A8A29E",
            textDecoration: "none",
            fontSize: 12.5,
            fontWeight: 500,
          }}
        >
          🏪 View Live Storefront
        </a>
      </div>
    </div>
  );
}
