import { AlertTriangle, ArrowDown, ArrowUp } from "lucide-react";

type Row = {
  product: string;
  competitor: string;
  online: number;
  inStore: number;
  gap: string;
  direction: "up" | "down";
  observed: string;
};

const ROWS: Row[] = [
  { product: "Samsung Galaxy S24 Ultra", competitor: "Carrefour", online: 3799, inStore: 3849, gap: "+1.3%", direction: "up", observed: "2 hrs ago" },
  { product: "Sony WH-1000XM5", competitor: "Carrefour", online: 1199, inStore: 1149, gap: "-4.2%", direction: "down", observed: "5 hrs ago" },
  { product: "Dyson V15 Detect", competitor: "Lulu", online: 2749, inStore: 2699, gap: "-1.8%", direction: "down", observed: "3 hrs ago" },
  { product: "Ariel Detergent 3kg", competitor: "Lulu", online: 39.9, inStore: 37.5, gap: "-6.0%", direction: "down", observed: "6 hrs ago" },
  { product: "Nespresso Vertuo Pop", competitor: "Lulu", online: 459, inStore: 429, gap: "-6.5%", direction: "down", observed: "1 day ago" },
];

const thStyle = {
  fontSize: 11,
  textTransform: "uppercase" as const,
  fontWeight: 600,
  color: "#9A9A9A",
  padding: "10px 12px",
  borderBottom: "1px solid #E5E2DB",
  letterSpacing: "0.04em",
};

export function PriceGaps() {
  return (
    <div
      style={{
        backgroundColor: "#FFFFFF",
        border: "1px solid #E5E2DB",
        borderRadius: 10,
        padding: "20px 24px",
      }}
    >
      <div style={{ fontSize: 15, fontWeight: 600, color: "#1A1A18" }}>
        In-store vs online price discrepancies
      </div>
      <div style={{ fontSize: 12, color: "#6B6B6B", marginTop: 4 }}>
        Products where field observations reveal different pricing than what is listed online
      </div>
      <div style={{ overflowX: "auto", marginTop: 14 }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={{ ...thStyle, textAlign: "left" }}>Product</th>
              <th style={{ ...thStyle, textAlign: "left" }}>Competitor</th>
              <th style={{ ...thStyle, textAlign: "right" }}>Online price</th>
              <th style={{ ...thStyle, textAlign: "right" }}>In-store price</th>
              <th style={{ ...thStyle, textAlign: "right" }}>Gap</th>
              <th style={{ ...thStyle, textAlign: "center" }}>Direction</th>
              <th style={{ ...thStyle, textAlign: "left" }}>Last observed</th>
            </tr>
          </thead>
          <tbody>
            {ROWS.map((r, i) => {
              const gapColor = r.direction === "up" ? "#F59E0B" : "#22C55E";
              return (
                <tr
                  key={r.product}
                  style={{
                    backgroundColor: i % 2 === 0 ? "white" : "#FAFAF9",
                    transition: "background 0.15s",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#F5F4F1")}
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.backgroundColor = i % 2 === 0 ? "white" : "#FAFAF9")
                  }
                >
                  <td style={{ padding: "12px", fontSize: 13, fontWeight: 500, color: "#1A1A18", borderBottom: "1px solid #F5F4F1" }}>
                    {r.product}
                  </td>
                  <td style={{ padding: "12px", fontSize: 12, color: "#6B6B6B", borderBottom: "1px solid #F5F4F1" }}>
                    {r.competitor}
                  </td>
                  <td style={{ padding: "12px", fontSize: 13, fontWeight: 400, color: "#1A1A18", textAlign: "right", borderBottom: "1px solid #F5F4F1" }}>
                    QAR {r.online.toFixed(2)}
                  </td>
                  <td style={{ padding: "12px", fontSize: 13, fontWeight: 600, color: "#1A1A18", textAlign: "right", borderBottom: "1px solid #F5F4F1" }}>
                    QAR {r.inStore.toFixed(2)}
                  </td>
                  <td style={{ padding: "12px", fontSize: 13, fontWeight: 600, color: gapColor, textAlign: "right", borderBottom: "1px solid #F5F4F1" }}>
                    {r.gap}
                  </td>
                  <td style={{ padding: "12px", textAlign: "center", borderBottom: "1px solid #F5F4F1" }}>
                    {r.direction === "up" ? (
                      <ArrowUp size={14} color="#F59E0B" style={{ display: "inline-block" }} />
                    ) : (
                      <ArrowDown size={14} color="#22C55E" style={{ display: "inline-block" }} />
                    )}
                  </td>
                  <td style={{ padding: "12px", fontSize: 12, color: "#9A9A9A", borderBottom: "1px solid #F5F4F1" }}>
                    {r.observed}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div
        style={{
          marginTop: 14,
          backgroundColor: "rgba(168, 85, 247, 0.04)",
          border: "1px solid rgba(168, 85, 247, 0.12)",
          borderRadius: 8,
          padding: "12px 18px",
          display: "flex",
          gap: 12,
          alignItems: "flex-start",
        }}
      >
        <AlertTriangle size={16} color="#7C3AED" style={{ flexShrink: 0, marginTop: 2 }} />
        <div style={{ fontSize: 12, color: "#6B6B6B", lineHeight: 1.6 }}>
          Several competitors are offering lower prices in-store than online. This is common during
          seasonal promotions and clearance events. Field intel helps you catch these gaps that web
          scrapers cannot see.
        </div>
      </div>
    </div>
  );
}
