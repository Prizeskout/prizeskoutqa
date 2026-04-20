const ROWS = [
  { name: "Samsung Galaxy S24 Ultra", online: 3899, instore: 3999, gap: "+2.6% in-store" },
  { name: "Dyson V15 Detect", online: 2799, instore: 2899, gap: "+3.6% in-store" },
];

function fmt(n: number) {
  return `QAR ${n.toLocaleString("en-US")}`;
}

export function OmnichannelGaps() {
  return (
    <div
      style={{
        backgroundColor: "#FFFFFF",
        border: "1px solid #E5E2DB",
        borderRadius: 10,
        padding: 22,
      }}
    >
      <div style={{ fontSize: 15, fontWeight: 600, color: "#1A1A18" }}>
        Omnichannel price gaps
      </div>
      <div style={{ fontSize: 12, color: "#6B6B6B", marginTop: 4 }}>
        Products where your online and in-store prices do not match
      </div>

      <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 16 }}>
        <thead>
          <tr style={{ borderBottom: "2px solid #E5E2DB" }}>
            <th style={th}>Product</th>
            <th style={{ ...th, textAlign: "right" }}>Online Price</th>
            <th style={{ ...th, textAlign: "right" }}>In-Store Price</th>
            <th style={{ ...th, textAlign: "right" }}>Gap</th>
          </tr>
        </thead>
        <tbody>
          {ROWS.map((r, idx) => (
            <tr
              key={r.name}
              style={{
                borderBottom: "1px solid #E5E2DB",
                backgroundColor: idx % 2 === 0 ? "transparent" : "#FAFAF9",
              }}
            >
              <td style={{ padding: "14px 10px", fontSize: 13, fontWeight: 500, color: "#1A1A18" }}>
                {r.name}
              </td>
              <td style={tdRight}>{fmt(r.online)}</td>
              <td style={tdRight}>{fmt(r.instore)}</td>
              <td style={{ ...tdRight, color: "#F59E0B", fontWeight: 600 }}>{r.gap}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div
        style={{
          marginTop: 14,
          fontSize: 12,
          color: "#9A9A9A",
          fontStyle: "italic",
        }}
      >
        Customers comparing prices on their phones while in your store will see these gaps.
        Consider harmonizing.
      </div>
    </div>
  );
}

const th: React.CSSProperties = {
  textAlign: "left",
  padding: "12px 10px",
  fontSize: 11,
  fontWeight: 600,
  textTransform: "uppercase",
  letterSpacing: "0.03em",
  color: "#9A9A9A",
};

const tdRight: React.CSSProperties = {
  padding: "14px 10px",
  textAlign: "right",
  fontSize: 13,
  color: "#1A1A18",
};
