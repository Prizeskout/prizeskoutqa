import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import type { CategoryPerformanceRow } from "@/lib/market-data";

function volColor(v: "Low" | "Medium" | "High") {
  if (v === "Low") return "#22C55E";
  if (v === "Medium") return "#F59E0B";
  return "#EF4444";
}

function PositionBadge({ position }: { position: string }) {
  const isFirst = position.startsWith("1st");
  return (
    <span
      style={{
        fontSize: 11,
        fontWeight: 600,
        padding: "3px 12px",
        borderRadius: 20,
        backgroundColor: isFirst ? "rgba(34, 197, 94, 0.08)" : "#FAFAF9",
        border: `1px solid ${isFirst ? "rgba(34, 197, 94, 0.2)" : "#E5E2DB"}`,
        color: isFirst ? "#16A34A" : "#1A1A18",
      }}
    >
      {position}
    </span>
  );
}

function DirectionIcon({ direction }: { direction: "up" | "down" | "flat" }) {
  if (direction === "up") return <TrendingUp size={16} color="#22C55E" />;
  if (direction === "down") return <TrendingDown size={16} color="#EF4444" />;
  return <Minus size={16} color="#9A9A9A" />;
}

const th: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 600,
  textTransform: "uppercase",
  letterSpacing: "0.03em",
  color: "#9A9A9A",
  padding: "12px 10px",
};

export function CategoryPerformance({ rows }: { rows: CategoryPerformanceRow[] }) {
  return (
    <div
      style={{
        backgroundColor: "#FFFFFF",
        border: "1px solid #E5E2DB",
        borderRadius: 10,
        padding: "20px 24px",
      }}
    >
      <div style={{ fontSize: 15, fontWeight: 600, color: "#1A1A18" }}>Category performance</div>
      <div style={{ fontSize: 12, color: "#6B6B6B", marginTop: 4 }}>
        Qatar market trends over the last 30 days, based on pricing and availability signals
      </div>
      <div className="table-scroll" style={{ marginTop: 14 }}>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 820 }}>
          <thead>
            <tr style={{ borderBottom: "2px solid #E5E2DB" }}>
              <th style={{ ...th, textAlign: "start" }}>Category</th>
              <th style={{ ...th, textAlign: "end" }}>Growth</th>
              <th style={{ ...th, textAlign: "end" }}>Avg discount depth</th>
              <th style={{ ...th, textAlign: "center" }}>Price volatility</th>
              <th style={{ ...th, textAlign: "start" }}>Top mover</th>
              <th style={{ ...th, textAlign: "center" }}>Your position</th>
              <th style={{ ...th, textAlign: "center" }}>Direction</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => {
              const c = volColor(row.volatility);
              const growthNum = Number(row.growth);
              return (
                <tr
                  key={row.id}
                  style={{
                    borderBottom: "1px solid #E5E2DB",
                    backgroundColor: i % 2 === 1 ? "#FAFAF9" : "transparent",
                    cursor: "pointer",
                    transition: "background-color 120ms ease",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#F5F4F1")}
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.backgroundColor = i % 2 === 1 ? "#FAFAF9" : "transparent")
                  }
                >
                  <td style={{ padding: "14px 10px", fontSize: 13, fontWeight: 500, color: "#1A1A18" }}>
                    {row.category}
                  </td>
                  <td
                    style={{
                      padding: "14px 10px",
                      fontSize: 13,
                      fontWeight: 600,
                      textAlign: "end",
                      color: growthNum >= 0 ? "#22C55E" : "#EF4444",
                    }}
                  >
                    {growthNum >= 0 ? "+" : ""}
                    {growthNum}%
                  </td>
                  <td style={{ padding: "14px 10px", fontSize: 13, fontWeight: 400, color: "#1A1A18", textAlign: "end" }}>
                    {Number(row.avg_discount)}%
                  </td>
                  <td style={{ padding: "14px 10px", textAlign: "center" }}>
                    <div style={{ display: "inline-flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                      <div
                        style={{
                          width: 60,
                          height: 6,
                          backgroundColor: "#E5E2DB",
                          borderRadius: 3,
                          overflow: "hidden",
                        }}
                      >
                        <div
                          style={{
                            width: `${row.volatility_pct}%`,
                            height: "100%",
                            backgroundColor: c,
                            borderRadius: 3,
                          }}
                        />
                      </div>
                      <span style={{ fontSize: 10, color: c, fontWeight: 500 }}>{row.volatility}</span>
                    </div>
                  </td>
                  <td style={{ padding: "14px 10px", fontSize: 12, color: "#6B6B6B", textAlign: "start" }}>
                    {row.top_mover}
                  </td>
                  <td style={{ padding: "14px 10px", textAlign: "center" }}>
                    <PositionBadge position={row.market_position} />
                  </td>
                  <td style={{ padding: "14px 10px", textAlign: "center" }}>
                    <div style={{ display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
                      <DirectionIcon direction={row.direction} />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
