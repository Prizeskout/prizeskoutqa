type Row = {
  label: string;
  amount: string;
  share: string;
  percent: number;
  color: string;
};

const ROWS: Row[] = [
  { label: "Online", amount: "QAR 1.2M", share: "68% of total", percent: 68, color: "#3B82F6" },
  { label: "In-Store", amount: "QAR 480K", share: "27% of total", percent: 27, color: "#7C3AED" },
  { label: "Marketplace", amount: "QAR 89K", share: "5% of total", percent: 5, color: "#EA580C" },
];

export function ChannelBreakdown() {
  return (
    <div
      style={{
        backgroundColor: "#FFFFFF",
        border: "1px solid #E5E2DB",
        borderRadius: 10,
        padding: "20px 24px",
        height: "100%",
      }}
    >
      <h2 style={{ fontSize: 15, fontWeight: 600, color: "#1A1A18", margin: 0 }}>
        Revenue by channel
      </h2>

      <div style={{ marginTop: 4 }}>
        {ROWS.map((row, i) => {
          const isLast = i === ROWS.length - 1;
          return (
            <div
              key={row.label}
              style={{
                padding: "14px 0",
                borderBottom: isLast ? "none" : "1px solid #E5E2DB",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  justifyContent: "space-between",
                  gap: 12,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span
                    aria-hidden
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: 9999,
                      backgroundColor: row.color,
                    }}
                  />
                  <span style={{ fontSize: 13, fontWeight: 500, color: "#1A1A18" }}>
                    {row.label}
                  </span>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "#1A1A18" }}>
                    {row.amount}
                  </div>
                  <div style={{ fontSize: 11, color: "#9A9A9A", marginTop: 2 }}>
                    {row.share}
                  </div>
                </div>
              </div>
              <div
                style={{
                  marginTop: 10,
                  height: 6,
                  borderRadius: 3,
                  backgroundColor: "#E5E2DB",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    width: `${row.percent}%`,
                    height: "100%",
                    backgroundColor: row.color,
                    borderRadius: 3,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
