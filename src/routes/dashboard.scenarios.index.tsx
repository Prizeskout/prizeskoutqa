import { createFileRoute, Link } from "@tanstack/react-router";
import { DEMO_SCENARIOS } from "@/lib/demo-scenarios";

export const Route = createFileRoute("/dashboard/scenarios/")({
  component: ScenariosPage,
});

function ScenariosPage() {
  return (
    <div style={{ padding: "32px 40px", maxWidth: 1100, margin: "0 auto" }}>
      <div style={{ marginBottom: 40 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
          <span style={{ fontSize: 22, fontWeight: 700, color: "#FAFAF9" }}>Demo Scenarios</span>
        </div>
        <p style={{ color: "#A8A29E", fontSize: 14, margin: 0, maxWidth: 560 }}>
          Live pricing intelligence for five real store scenarios. Apply recommendations and see prices update
          instantly in the storefront. No mock data.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(310px, 1fr))", gap: 20 }}>
        {DEMO_SCENARIOS.map((scenario) => (
          <ScenarioCard key={scenario.id} scenario={scenario} />
        ))}
      </div>

      <div style={{
        marginTop: 40,
        padding: "16px 20px",
        background: "rgba(124,58,237,0.06)",
        border: "1px solid rgba(124,58,237,0.18)",
        borderRadius: 12,
        display: "flex",
        alignItems: "flex-start",
        gap: 14,
      }}>
        <span style={{ fontSize: 18, flexShrink: 0 }}>💡</span>
        <div>
          <div style={{ fontWeight: 600, color: "#FAFAF9", fontSize: 13, marginBottom: 4 }}>How to demo</div>
          <div style={{ color: "#A8A29E", fontSize: 13, lineHeight: 1.6 }}>
            Open a scenario, then open its storefront in a second browser tab. Apply a recommendation in the
            dashboard. Prices update in the storefront in real time. Reject to revert. Works across
            tabs without any page refresh.
          </div>
        </div>
      </div>
    </div>
  );
}

function ScenarioCard({ scenario }: { scenario: (typeof DEMO_SCENARIOS)[0] }) {
  const lowerCount = scenario.recommendations.filter((r) => r.direction === "lower").length;
  const raiseCount = scenario.recommendations.filter((r) => r.direction === "raise").length;
  const netMonthly = scenario.recommendations.reduce((acc, r) => {
    const n = parseFloat(r.netMonthly.replace(/[^0-9.]/g, "")) || 0;
    return acc + n;
  }, 0);

  return (
    <Link
      to="/dashboard/scenarios/$slug"
      params={{ slug: scenario.id } as { slug: string }}
      style={{ textDecoration: "none" }}
    >
      <div style={{
        background: "#1C1917",
        border: "1px solid #292524",
        borderRadius: 16,
        overflow: "hidden",
        cursor: "pointer",
        transition: "border-color 0.15s, box-shadow 0.15s",
      }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLDivElement).style.borderColor = scenario.primaryColor + "60";
          (e.currentTarget as HTMLDivElement).style.boxShadow = `0 0 0 1px ${scenario.primaryColor}30, 0 8px 32px rgba(0,0,0,0.3)`;
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLDivElement).style.borderColor = "#292524";
          (e.currentTarget as HTMLDivElement).style.boxShadow = "none";
        }}
      >
        <div style={{ background: scenario.headerBg, padding: "20px 22px 18px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
            <span style={{
              background: "rgba(255,255,255,0.12)",
              color: "#fff",
              fontSize: 11,
              fontWeight: 600,
              padding: "3px 10px",
              borderRadius: 999,
            }}>{scenario.platform}</span>
            <span style={{
              background: "rgba(255,255,255,0.08)",
              color: "rgba(255,255,255,0.7)",
              fontSize: 11,
              padding: "3px 10px",
              borderRadius: 999,
            }}>{scenario.category}</span>
          </div>
          <div style={{ fontSize: 19, fontWeight: 700, color: "#fff", marginBottom: 4 }}>{scenario.name}</div>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.65)" }}>{scenario.tagline}</div>
        </div>

        <div style={{ padding: "18px 22px" }}>
          <div style={{
            fontSize: 12.5,
            color: "#D6D3D1",
            lineHeight: 1.55,
            marginBottom: 16,
            minHeight: 56,
          }}>
            {scenario.insight.headline}
          </div>

          <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
            <StatPill label="Recs" value={String(scenario.recommendations.length)} color="#A8A29E" />
            {lowerCount > 0 && <StatPill label="Lower" value={String(lowerCount)} color="#34D399" />}
            {raiseCount > 0 && <StatPill label="Raise" value={String(raiseCount)} color="#FB923C" />}
            <StatPill label="Monthly upside" value={`QAR ${(netMonthly / 1000).toFixed(0)}K`} color="#FBBF24" />
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{
              flex: 1,
              background: `${scenario.primaryColor}15`,
              border: `1px solid ${scenario.primaryColor}40`,
              color: scenario.primaryColor,
              fontSize: 12,
              fontWeight: 600,
              textAlign: "center",
              padding: "8px 0",
              borderRadius: 8,
              display: "block",
            }}>
              Open Dashboard →
            </span>
            <a
              href={`/store/${scenario.id}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid #3C3835",
                color: "#A8A29E",
                fontSize: 12,
                padding: "8px 14px",
                borderRadius: 8,
                textDecoration: "none",
                whiteSpace: "nowrap",
              }}
            >
              🏪 Storefront
            </a>
          </div>
        </div>
      </div>
    </Link>
  );
}

function StatPill({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{
      background: "#292524",
      borderRadius: 8,
      padding: "5px 10px",
      display: "flex",
      flexDirection: "column",
      gap: 1,
    }}>
      <div style={{ fontSize: 11.5, fontWeight: 700, color }}>{value}</div>
      <div style={{ fontSize: 10, color: "#78716C" }}>{label}</div>
    </div>
  );
}
