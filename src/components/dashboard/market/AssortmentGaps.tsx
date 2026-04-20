import { Plus } from "lucide-react";
import type { AssortmentGapRow } from "@/lib/market-data";

function DemandBadge({ demand }: { demand: "High" | "Medium" }) {
  const isHigh = demand === "High";
  return (
    <span
      style={{
        fontSize: 11,
        fontWeight: 600,
        padding: "3px 10px",
        borderRadius: 20,
        backgroundColor: isHigh ? "rgba(34, 197, 94, 0.1)" : "rgba(245, 158, 11, 0.1)",
        color: isHigh ? "#16A34A" : "#D97706",
      }}
    >
      {demand}
    </span>
  );
}

export function AssortmentGaps({ gaps }: { gaps: AssortmentGapRow[] }) {
  return (
    <div
      style={{
        backgroundColor: "#FFFFFF",
        border: "1px solid #E5E2DB",
        borderRadius: 10,
        padding: "20px 24px",
      }}
    >
      <div style={{ fontSize: 15, fontWeight: 600, color: "#1A1A18" }}>Assortment gaps</div>
      <div style={{ fontSize: 12, color: "#6B6B6B", marginTop: 4 }}>
        Products your competitors sell successfully that are not in your catalog. This is revenue
        you are not capturing.
      </div>
      <div style={{ marginTop: 8 }}>
        {gaps.map((gap, i) => (
          <div
            key={gap.id}
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "14px 0",
              borderBottom: i < gaps.length - 1 ? "1px solid #E5E2DB" : "none",
              gap: 16,
              flexWrap: "wrap",
            }}
          >
            <div style={{ flex: 1, minWidth: 240 }}>
              <div style={{ fontSize: 14, fontWeight: 500, color: "#1A1A18" }}>{gap.product}</div>
              <div style={{ fontSize: 12, color: "#9A9A9A", marginTop: 4 }}>Sold by:</div>
              <div style={{ display: "flex", gap: 6, marginTop: 6, flexWrap: "wrap" }}>
                {gap.competitors.map((c) => (
                  <span
                    key={c}
                    style={{
                      fontSize: 10,
                      fontWeight: 500,
                      backgroundColor: "#F5F4F1",
                      border: "1px solid #E5E2DB",
                      borderRadius: 12,
                      padding: "2px 8px",
                      color: "#6B6B6B",
                    }}
                  >
                    {c}
                  </span>
                ))}
              </div>
            </div>
            <div style={{ display: "flex", gap: 20, alignItems: "center", flexWrap: "wrap" }}>
              <div>
                <div style={{ fontSize: 10, color: "#9A9A9A" }}>Market price</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: "#1A1A18", marginTop: 2 }}>
                  QAR {Number(gap.price).toLocaleString()}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 10, color: "#9A9A9A" }}>Monthly searches</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: "#1A1A18", marginTop: 2 }}>
                  {gap.searches}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 10, color: "#EF4444" }}>Est. missed revenue</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#EF4444", marginTop: 2 }}>
                  {gap.missed}/mo
                </div>
              </div>
              <DemandBadge demand={gap.demand} />
              <button
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                  background: "none",
                  border: "none",
                  fontSize: 12,
                  fontWeight: 500,
                  color: "#EA580C",
                  cursor: "pointer",
                  padding: 0,
                }}
              >
                <Plus size={14} />
                Add to catalog
              </button>
            </div>
          </div>
        ))}
      </div>
      <div
        style={{
          marginTop: 16,
          backgroundColor: "rgba(239, 68, 68, 0.04)",
          border: "1px solid rgba(239, 68, 68, 0.12)",
          borderRadius: 8,
          padding: "12px 18px",
          fontSize: 14,
          fontWeight: 600,
          color: "#EF4444",
        }}
      >
        Total estimated missed revenue from assortment gaps: QAR 358K per month
      </div>
    </div>
  );
}
