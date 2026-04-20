import { Globe, ShieldAlert } from "lucide-react";

type Risk = "High" | "Medium" | "Low";

type Row = {
  product: string;
  you: number;
  intl: number;
  platform: string;
  delivery: string;
  gap: string;
  risk: Risk;
};

const ROWS: Row[] = [
  { product: "Sony WH-1000XM5", you: 1299, intl: 1049, platform: "Amazon Global", delivery: "5-8 days", gap: "-19.2%", risk: "High" },
  { product: "Nike Air Max 90", you: 549, intl: 419, platform: "Shein", delivery: "7-12 days", gap: "-23.7%", risk: "High" },
  { product: "The Ordinary Niacinamide", you: 45, intl: 29, platform: "iHerb", delivery: "6-10 days", gap: "-35.6%", risk: "Medium" },
  { product: "Apple AirPods Pro 2", you: 949, intl: 879, platform: "Amazon Global", delivery: "5-8 days", gap: "-7.4%", risk: "Medium" },
  { product: "Dyson V15 Detect", you: 2799, intl: 2399, platform: "Noon (UAE)", delivery: "3-5 days", gap: "-14.3%", risk: "High" },
];

function RiskBadge({ risk }: { risk: Risk }) {
  const map = {
    High: { bg: "rgba(239, 68, 68, 0.1)", color: "#DC2626" },
    Medium: { bg: "rgba(245, 158, 11, 0.1)", color: "#D97706" },
    Low: { bg: "rgba(59, 130, 246, 0.1)", color: "#2563EB" },
  } as const;
  const { bg, color } = map[risk];
  return (
    <span
      style={{
        fontSize: 11,
        fontWeight: 600,
        padding: "3px 10px",
        borderRadius: 20,
        backgroundColor: bg,
        color,
      }}
    >
      {risk}
    </span>
  );
}

const th: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 600,
  textTransform: "uppercase",
  letterSpacing: "0.03em",
  color: "#9A9A9A",
  padding: "12px 10px",
};

export function CrossBorderRadar() {
  return (
    <div
      style={{
        backgroundColor: "#FFFFFF",
        border: "1px solid #E5E2DB",
        borderRadius: 10,
        padding: "20px 24px",
      }}
    >
      <div style={{ fontSize: 15, fontWeight: 600, color: "#1A1A18" }}>Cross-border threats</div>
      <div style={{ fontSize: 12, color: "#6B6B6B", marginTop: 4 }}>
        International platforms shipping into Qatar that undercut your prices
      </div>
      <div style={{ marginTop: 14, overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "2px solid #E5E2DB" }}>
              <th style={{ ...th, textAlign: "left" }}>Product</th>
              <th style={{ ...th, textAlign: "right" }}>Your price</th>
              <th style={{ ...th, textAlign: "right" }}>International price</th>
              <th style={{ ...th, textAlign: "left" }}>Platform</th>
              <th style={{ ...th, textAlign: "left" }}>Delivery time</th>
              <th style={{ ...th, textAlign: "right" }}>Price gap</th>
              <th style={{ ...th, textAlign: "center" }}>Risk level</th>
            </tr>
          </thead>
          <tbody>
            {ROWS.map((row, i) => (
              <tr
                key={row.product}
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
                  {row.product}
                </td>
                <td style={{ padding: "14px 10px", fontSize: 13, fontWeight: 600, color: "#EA580C", textAlign: "right" }}>
                  QAR {row.you.toLocaleString()}
                </td>
                <td style={{ padding: "14px 10px", fontSize: 13, fontWeight: 600, color: "#EF4444", textAlign: "right" }}>
                  QAR {row.intl.toLocaleString()}
                </td>
                <td style={{ padding: "14px 10px", fontSize: 12, color: "#6B6B6B" }}>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                    <Globe size={14} color="#9A9A9A" />
                    {row.platform}
                  </span>
                </td>
                <td style={{ padding: "14px 10px", fontSize: 12, color: "#6B6B6B" }}>{row.delivery}</td>
                <td style={{ padding: "14px 10px", fontSize: 13, fontWeight: 600, color: "#EF4444", textAlign: "right" }}>
                  {row.gap}
                </td>
                <td style={{ padding: "14px 10px", textAlign: "center" }}>
                  <RiskBadge risk={row.risk} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div
        style={{
          marginTop: 16,
          backgroundColor: "rgba(59, 130, 246, 0.04)",
          border: "1px solid rgba(59, 130, 246, 0.12)",
          borderRadius: 8,
          padding: "12px 18px",
          display: "flex",
          alignItems: "flex-start",
          gap: 10,
        }}
      >
        <ShieldAlert size={16} color="#3B82F6" style={{ flexShrink: 0, marginTop: 2 }} />
        <div style={{ fontSize: 12, color: "#6B6B6B", lineHeight: 1.6 }}>
          Your same-day and next-day delivery advantage offsets a price gap of up to 8% for most
          customers. Products with gaps larger than 8% require a pricing response or a value-add
          strategy.
        </div>
      </div>
    </div>
  );
}
