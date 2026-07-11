import { useState } from "react";
import {
  type ScenarioRecommendation,
  setScenarioOverride,
  clearScenarioOverride,
  setScenarioDecision,
  clearScenarioDecision,
} from "@/lib/demo-scenarios";

interface Props {
  rec: ScenarioRecommendation;
  scenarioId: string;
  initialDecision?: "applied" | "dismissed" | "snoozed";
  onDecisionChange?: (id: string, decision: "applied" | "dismissed" | "snoozed" | null) => void;
}

const CARD = {
  background: "#1C1917",
  border: "1px solid #292524",
  borderRadius: 14,
  padding: "20px 22px",
  marginBottom: 14,
};

export function ScenarioPricingCard({ rec, scenarioId, initialDecision, onDecisionChange }: Props) {
  const [decision, setDecision] = useState<"applied" | "dismissed" | "snoozed" | null>(
    initialDecision ?? null,
  );
  const [expanded, setExpanded] = useState(false);

  const priceChange = rec.recommendedPrice - rec.currentPrice;
  const pctChange = ((priceChange / rec.currentPrice) * 100).toFixed(1);
  const isRaise = rec.direction === "raise";

  function applyRec() {
    setScenarioOverride(scenarioId, rec.productSku, rec.recommendedPrice);
    setScenarioDecision(scenarioId, rec.id, "applied");
    setDecision("applied");
    onDecisionChange?.(rec.id, "applied");
  }

  function dismissRec() {
    clearScenarioOverride(scenarioId, rec.productSku);
    setScenarioDecision(scenarioId, rec.id, "dismissed");
    setDecision("dismissed");
    onDecisionChange?.(rec.id, "dismissed");
  }

  function undoRec() {
    clearScenarioOverride(scenarioId, rec.productSku);
    clearScenarioDecision(scenarioId, rec.id);
    setDecision(null);
    onDecisionChange?.(rec.id, null);
  }

  const isApplied = decision === "applied";
  const isDismissed = decision === "dismissed";
  const hasDecision = decision !== null;

  return (
    <div style={{
      ...CARD,
      borderColor: isApplied ? "#16A34A40" : isDismissed ? "#78716C40" : "#292524",
      opacity: isDismissed ? 0.7 : 1,
    }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 14, marginBottom: 14 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5, flexWrap: "wrap" }}>
            <span style={{
              fontSize: 11,
              fontWeight: 600,
              padding: "2px 8px",
              borderRadius: 999,
              background: isRaise ? "rgba(251,146,60,0.12)" : "rgba(52,211,153,0.12)",
              color: isRaise ? "#FB923C" : "#34D399",
              border: `1px solid ${isRaise ? "rgba(251,146,60,0.25)" : "rgba(52,211,153,0.25)"}`,
              letterSpacing: "0.03em",
            }}>
              {isRaise ? "▲ RAISE" : "▼ LOWER"}
            </span>
            <span style={{ fontSize: 11.5, color: "#78716C" }}>{rec.category}</span>
            {isApplied && (
              <span style={{
                fontSize: 11,
                fontWeight: 600,
                padding: "2px 8px",
                borderRadius: 999,
                background: "rgba(22,163,74,0.12)",
                color: "#4ADE80",
                border: "1px solid rgba(22,163,74,0.25)",
              }}>✓ Applied</span>
            )}
            {isDismissed && (
              <span style={{
                fontSize: 11,
                padding: "2px 8px",
                borderRadius: 999,
                background: "rgba(120,113,108,0.12)",
                color: "#A8A29E",
                border: "1px solid rgba(120,113,108,0.25)",
              }}>Rejected</span>
            )}
          </div>
          <div style={{ fontSize: 14.5, fontWeight: 600, color: "#FAFAF9", marginBottom: 4, lineHeight: 1.4 }}>
            {rec.headline}
          </div>
          <div style={{ fontSize: 12, color: "#78716C" }}>{rec.product}</div>
        </div>

        {/* Price block */}
        <div style={{ flexShrink: 0, textAlign: "right" }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 6, justifyContent: "flex-end" }}>
            <span style={{
              fontSize: 13,
              fontWeight: 700,
              color: isRaise ? "#FB923C" : "#34D399",
            }}>
              QAR {rec.recommendedPrice.toFixed(rec.recommendedPrice < 100 ? 2 : 0)}
            </span>
            <span style={{ fontSize: 11, color: "#78716C", textDecoration: "line-through" }}>
              {rec.currentPrice.toFixed(rec.currentPrice < 100 ? 2 : 0)}
            </span>
          </div>
          <div style={{ fontSize: 11, color: isRaise ? "#FB923C" : "#34D399", marginTop: 2 }}>
            {isRaise ? "+" : ""}{pctChange}%
          </div>
          <div style={{ fontSize: 10.5, color: "#57534E", marginTop: 2 }}>
            {rec.confidence}% confidence
          </div>
        </div>
      </div>

      {/* Reason */}
      <div style={{
        fontSize: 12.5,
        color: "#A8A29E",
        lineHeight: 1.6,
        marginBottom: 14,
        padding: "10px 12px",
        background: "#231F1E",
        borderRadius: 8,
      }}>
        {rec.reason}
      </div>

      {/* Impact row */}
      <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
        <ImpactPill label="Unit impact" value={rec.unitImpact} positive={!isRaise} />
        <ImpactPill label="Margin Δ" value={rec.marginImpact} positive={isRaise} />
        <ImpactPill label="Net monthly" value={rec.netMonthly} positive />
      </div>

      {/* Expand button */}
      <button
        onClick={() => setExpanded(!expanded)}
        style={{
          background: "transparent",
          border: "none",
          color: "#78716C",
          fontSize: 12,
          cursor: "pointer",
          padding: 0,
          marginBottom: expanded ? 14 : 0,
          display: "flex",
          alignItems: "center",
          gap: 5,
        }}
      >
        <span style={{ transform: expanded ? "rotate(90deg)" : "none", display: "inline-block", transition: "transform 0.15s" }}>▶</span>
        {expanded ? "Hide" : "Show"} competitor analysis
      </button>

      {/* Expanded panel */}
      {expanded && (
        <div style={{ marginBottom: 14 }}>
          {/* Competitor table */}
          <div style={{
            border: "1px solid #292524",
            borderRadius: 10,
            overflow: "hidden",
            marginBottom: 12,
          }}>
            <div style={{
              display: "grid",
              gridTemplateColumns: "1fr auto auto",
              padding: "8px 14px",
              background: "#231F1E",
              borderBottom: "1px solid #292524",
            }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: "#78716C", letterSpacing: "0.04em" }}>COMPETITOR</div>
              <div style={{ fontSize: 11, fontWeight: 600, color: "#78716C", letterSpacing: "0.04em" }}>PRICE</div>
              <div style={{ fontSize: 11, fontWeight: 600, color: "#78716C", letterSpacing: "0.04em", marginLeft: 16 }}>VS YOU</div>
            </div>
            {rec.competitorPrices.map((c, i) => {
              const youVsThem = c.price !== null ? rec.currentPrice - c.price : null;
              const youVsThemsign = youVsThem !== null ? (youVsThem > 0 ? "+" : "") : null;
              return (
                <div
                  key={i}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr auto auto",
                    padding: "9px 14px",
                    borderBottom: i < rec.competitorPrices.length - 1 ? "1px solid #1C1917" : "none",
                    background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.012)",
                    alignItems: "center",
                  }}
                >
                  <div style={{ fontSize: 12.5, color: "#D6D3D1" }}>{c.name}</div>
                  <div style={{ fontSize: 12.5, color: c.outOfStock ? "#78716C" : "#FAFAF9", fontWeight: c.outOfStock ? 400 : 500 }}>
                    {c.outOfStock ? "Out of stock" : `QAR ${c.price?.toFixed(c.price! < 100 ? 2 : 0)}`}
                  </div>
                  <div style={{
                    fontSize: 11.5,
                    fontWeight: 600,
                    marginLeft: 16,
                    color: c.outOfStock ? "#78716C" : (youVsThem! > 0 ? "#F87171" : youVsThem! < 0 ? "#34D399" : "#A8A29E"),
                  }}>
                    {c.outOfStock ? "—" : `${youVsThemsign}${youVsThem?.toFixed(youVsThem! < 100 && youVsThem! > -100 ? 2 : 0)}`}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Detailed analysis */}
          <div style={{
            padding: "12px 14px",
            background: "#231F1E",
            borderRadius: 10,
            border: "1px solid #292524",
          }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: "#78716C", letterSpacing: "0.04em", marginBottom: 8 }}>
              FULL ANALYSIS
            </div>
            <div style={{ fontSize: 12.5, color: "#A8A29E", lineHeight: 1.7 }}>
              {rec.detailedAnalysis}
            </div>
          </div>
        </div>
      )}

      {/* Action buttons */}
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        {!hasDecision ? (
          <>
            <button
              onClick={applyRec}
              style={{
                flex: 1,
                background: isRaise ? "rgba(251,146,60,0.12)" : "rgba(52,211,153,0.12)",
                border: `1px solid ${isRaise ? "rgba(251,146,60,0.3)" : "rgba(52,211,153,0.3)"}`,
                color: isRaise ? "#FB923C" : "#34D399",
                fontSize: 12.5,
                fontWeight: 600,
                padding: "9px 0",
                borderRadius: 8,
                cursor: "pointer",
              }}
            >
              ✓ Apply — {isRaise ? "Raise to" : "Lower to"} QAR {rec.recommendedPrice.toFixed(rec.recommendedPrice < 100 ? 2 : 0)}
            </button>
            <button
              onClick={dismissRec}
              style={{
                background: "transparent",
                border: "1px solid #3C3835",
                color: "#78716C",
                fontSize: 12,
                padding: "9px 16px",
                borderRadius: 8,
                cursor: "pointer",
              }}
            >
              Reject
            </button>
          </>
        ) : (
          <div style={{ display: "flex", gap: 8, width: "100%", alignItems: "center" }}>
            <div style={{ fontSize: 12.5, color: isApplied ? "#4ADE80" : "#A8A29E", flex: 1 }}>
              {isApplied
                ? `✓ Applied — storefront now shows QAR ${rec.recommendedPrice.toFixed(rec.recommendedPrice < 100 ? 2 : 0)}`
                : "Rejected — original price kept"}
            </div>
            <button
              onClick={undoRec}
              style={{
                background: "transparent",
                border: "1px solid #3C3835",
                color: "#A8A29E",
                fontSize: 11.5,
                padding: "6px 12px",
                borderRadius: 8,
                cursor: "pointer",
              }}
            >
              Undo
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function ImpactPill({ label, value, positive }: { label: string; value: string; positive: boolean }) {
  return (
    <div style={{
      background: "#231F1E",
      border: "1px solid #292524",
      borderRadius: 8,
      padding: "5px 10px",
      display: "flex",
      flexDirection: "column",
      gap: 1,
    }}>
      <div style={{ fontSize: 11, color: "#57534E" }}>{label}</div>
      <div style={{ fontSize: 12, fontWeight: 600, color: positive ? "#4ADE80" : "#F87171" }}>{value}</div>
    </div>
  );
}
