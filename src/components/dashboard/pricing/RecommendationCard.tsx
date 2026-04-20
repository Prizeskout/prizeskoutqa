import { useState } from "react";
import { ArrowRight, Check } from "lucide-react";

export type Recommendation = {
  id: string;
  product: string;
  category: string;
  channel: "Online" | "In-Store";
  current: number;
  recommended: number;
  reason: string;
  unitImpact: string;
  marginImpact: string;
  netMonthly: string;
  confidence: number;
};

function confidenceColor(score: number) {
  if (score > 85) return "#22C55E";
  if (score >= 70) return "#F59E0B";
  return "#EF4444";
}

function impactColor(value: string) {
  if (value.startsWith("+")) return "#22C55E";
  if (value.startsWith("-")) return "#EF4444";
  return "#6B6B6B";
}

function formatPrice(n: number) {
  return `QAR ${n.toLocaleString("en-US", { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 })}`;
}

function ChannelPill({ channel }: { channel: "Online" | "In-Store" }) {
  const isOnline = channel === "Online";
  return (
    <span
      style={{
        fontSize: 10,
        fontWeight: 500,
        padding: "2px 10px",
        borderRadius: 20,
        backgroundColor: isOnline ? "rgba(59, 130, 246, 0.08)" : "rgba(168, 85, 247, 0.08)",
        color: isOnline ? "#3B82F6" : "#7C3AED",
      }}
    >
      {channel}
    </span>
  );
}

export function RecommendationCard({ rec }: { rec: Recommendation }) {
  const [status, setStatus] = useState<"pending" | "applied" | "dismissed">("pending");

  if (status === "dismissed") return null;

  const applied = status === "applied";
  const cColor = confidenceColor(rec.confidence);

  return (
    <div
      style={{
        backgroundColor: "#FFFFFF",
        border: applied ? "1px solid #22C55E" : "1px solid #E5E2DB",
        borderRadius: 10,
        padding: "22px 26px",
        transition: "opacity 200ms ease, border-color 200ms ease",
      }}
    >
      {/* TOP ROW */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 16, fontWeight: 600, color: "#1A1A18" }}>{rec.product}</div>
          <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
            <span
              style={{
                fontSize: 10,
                fontWeight: 500,
                padding: "2px 10px",
                borderRadius: 20,
                backgroundColor: "#F5F4F1",
                color: "#6B6B6B",
              }}
            >
              {rec.category}
            </span>
            <ChannelPill channel={rec.channel} />
            <span
              style={{
                fontSize: 10,
                fontWeight: 500,
                padding: "2px 10px",
                borderRadius: 20,
                backgroundColor: "rgba(59, 130, 246, 0.08)",
                color: "#3B82F6",
              }}
            >
              11 months trained
            </span>
          </div>
        </div>
        <div style={{ textAlign: "center", flexShrink: 0 }}>
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: "50%",
              border: `3px solid ${cColor}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 14,
              fontWeight: 700,
              color: cColor,
            }}
          >
            {rec.confidence}
          </div>
          <div style={{ fontSize: 10, color: "#9A9A9A", marginTop: 4 }}>confidence</div>
        </div>
      </div>

      {/* MIDDLE ROW */}
      <div
        style={{
          marginTop: 14,
          fontSize: 13,
          fontWeight: 400,
          color: "#6B6B6B",
          lineHeight: 1.65,
        }}
      >
        {rec.reason}
      </div>

      {/* BOTTOM ROW */}
      <div
        style={{
          marginTop: 16,
          backgroundColor: "#FAFAF9",
          borderRadius: 8,
          padding: "16px 20px",
          display: "flex",
          alignItems: "center",
          gap: 20,
          flexWrap: "wrap",
        }}
      >
        <div>
          <div style={{ fontSize: 10, fontWeight: 500, color: "#9A9A9A", textTransform: "uppercase" }}>
            Current price
          </div>
          <div
            style={{
              fontSize: 18,
              fontWeight: 500,
              color: "#9A9A9A",
              textDecoration: "line-through",
              marginTop: 2,
            }}
          >
            {formatPrice(rec.current)}
          </div>
        </div>
        <ArrowRight size={18} color="#9A9A9A" />
        <div>
          <div style={{ fontSize: 10, fontWeight: 500, color: "#22C55E", textTransform: "uppercase" }}>
            Recommended
          </div>
          <div style={{ fontSize: 18, fontWeight: 700, color: "#22C55E", marginTop: 2 }}>
            {formatPrice(rec.recommended)}
          </div>
        </div>
        <div style={{ width: 1, height: 40, backgroundColor: "#E5E2DB" }} />
        <div>
          <div style={{ fontSize: 10, fontWeight: 500, color: "#9A9A9A", textTransform: "uppercase" }}>
            Unit impact
          </div>
          <div
            style={{
              fontSize: 14,
              fontWeight: 600,
              color: impactColor(rec.unitImpact),
              marginTop: 2,
            }}
          >
            {rec.unitImpact} units
          </div>
        </div>
        <div>
          <div style={{ fontSize: 10, fontWeight: 500, color: "#9A9A9A", textTransform: "uppercase" }}>
            Margin impact
          </div>
          <div
            style={{
              fontSize: 14,
              fontWeight: 600,
              color: impactColor(rec.marginImpact),
              marginTop: 2,
            }}
          >
            {rec.marginImpact}
          </div>
        </div>
        <div>
          <div style={{ fontSize: 10, fontWeight: 500, color: "#22C55E", textTransform: "uppercase" }}>
            Net monthly
          </div>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#22C55E", marginTop: 2 }}>
            {rec.netMonthly}
          </div>
        </div>
        <div style={{ marginLeft: "auto", display: "flex", gap: 8, alignItems: "center" }}>
          {applied ? (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                fontSize: 12,
                fontWeight: 600,
                color: "#22C55E",
                padding: "8px 14px",
              }}
            >
              <Check size={14} />
              Applied
            </div>
          ) : (
            <>
              <button
                onClick={() => setStatus("applied")}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#C2410C")}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#EA580C")}
                style={{
                  backgroundColor: "#EA580C",
                  color: "#FFFFFF",
                  fontSize: 12,
                  fontWeight: 600,
                  padding: "8px 18px",
                  borderRadius: 8,
                  border: "none",
                  cursor: "pointer",
                  transition: "background-color 150ms ease",
                }}
              >
                Apply
              </button>
              <button
                onClick={() => setStatus("dismissed")}
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = "#EA580C")}
                onMouseLeave={(e) => (e.currentTarget.style.borderColor = "#E5E2DB")}
                style={{
                  backgroundColor: "transparent",
                  border: "1px solid #E5E2DB",
                  color: "#6B6B6B",
                  fontSize: 12,
                  fontWeight: 500,
                  padding: "8px 14px",
                  borderRadius: 8,
                  cursor: "pointer",
                  transition: "border-color 150ms ease",
                }}
              >
                Dismiss
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
