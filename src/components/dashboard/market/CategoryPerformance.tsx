import { TrendingUp, TrendingDown, Minus } from "lucide-react";

type Direction = "up" | "down" | "flat";
type Volatility = "Low" | "Medium" | "High";

type Row = {
  category: string;
  growth: number;
  avgDiscount: number;
  volatility: Volatility;
  volatilityPct: number;
  topMover: string;
  position: string;
  direction: Direction;
};

const ROWS: Row[] = [
  { category: "Electronics", growth: 14, avgDiscount: 8, volatility: "Medium", volatilityPct: 50, topMover: "Samsung Galaxy S24 series", position: "3rd / 6", direction: "up" },
  { category: "Grocery", growth: 22, avgDiscount: 12, volatility: "Low", volatilityPct: 25, topMover: "Ramadan bundles", position: "2nd / 4", direction: "up" },
  { category: "Fashion", growth: 6, avgDiscount: 18, volatility: "High", volatilityPct: 80, topMover: "Nike Air Max series", position: "4th / 5", direction: "flat" },
  { category: "Home", growth: -3, avgDiscount: 15, volatility: "Medium", volatilityPct: 55, topMover: "Dyson products", position: "5th / 6", direction: "down" },
  { category: "Beauty", growth: 19, avgDiscount: 10, volatility: "Medium", volatilityPct: 45, topMover: "The Ordinary serums", position: "4th / 5", direction: "up" },
  { category: "Baby & Kids", growth: 11, avgDiscount: 7, volatility: "Low", volatilityPct: 20, topMover: "Pampers bundles", position: "2nd / 3", direction: "up" },
  { category: "Sports", growth: 8, avgDiscount: 14, volatility: "Medium", volatilityPct: 50, topMover: "Adidas running shoes", position: "3rd / 4", direction: "flat" },
];

function volColor(v: Volatility) {
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

function DirectionIcon({ direction }: { direction: Direction }) {
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

export function CategoryPerformance() {
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
      <div style={{ marginTop: 14, overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "2px solid #E5E2DB" }}>
              <th style={{ ...th, textAlign: "left" }}>Category</th>
              <th style={{ ...th, textAlign: "right" }}>Growth</th>
              <th style={{ ...th, textAlign: "right" }}>Avg discount depth</th>
              <th style={{ ...th, textAlign: "center" }}>Price volatility</th>
              <th style={{ ...th, textAlign: "left" }}>Top mover</th>
              <th style={{ ...th, textAlign: "center" }}>Your position</th>
              <th style={{ ...th, textAlign: "center" }}>Direction</th>
            </tr>
          </thead>
          <tbody>
            {ROWS.map((row, i) => {
              const c = volColor(row.volatility);
              return (
                <tr
                  key={row.category}
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
                      textAlign: "right",
                      color: row.growth >= 0 ? "#22C55E" : "#EF4444",
                    }}
                  >
                    {row.growth >= 0 ? "+" : ""}
                    {row.growth}%
                  </td>
                  <td style={{ padding: "14px 10px", fontSize: 13, fontWeight: 400, color: "#1A1A18", textAlign: "right" }}>
                    {row.avgDiscount}%
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
                            width: `${row.volatilityPct}%`,
                            height: "100%",
                            backgroundColor: c,
                            borderRadius: 3,
                          }}
                        />
                      </div>
                      <span style={{ fontSize: 10, color: c, fontWeight: 500 }}>{row.volatility}</span>
                    </div>
                  </td>
                  <td style={{ padding: "14px 10px", fontSize: 12, color: "#6B6B6B", textAlign: "left" }}>
                    {row.topMover}
                  </td>
                  <td style={{ padding: "14px 10px", textAlign: "center" }}>
                    <PositionBadge position={row.position} />
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
