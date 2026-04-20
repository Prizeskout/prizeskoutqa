import type { MarketBenchmarkRow } from "@/lib/benchmarks-data";

function BenchmarkRow({ b, isLast }: { b: MarketBenchmarkRow; isLast: boolean }) {
  return (
    <div
      style={{
        padding: "20px 0",
        borderBottom: isLast ? "none" : "1px solid #E5E2DB",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ fontSize: 14, fontWeight: 500, color: "#1A1A18" }}>{b.metric}</div>
        <div style={{ fontSize: 14, fontWeight: 700, color: "#EA580C" }}>{b.you_display}</div>
      </div>
      <div style={{ marginTop: 28, position: "relative" }}>
        <div
          style={{
            width: "100%",
            height: 12,
            backgroundColor: "#F5F4F1",
            borderRadius: 6,
            position: "relative",
          }}
        >
          <div
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              height: "100%",
              width: `${b.you}%`,
              backgroundColor: "rgba(234, 88, 12, 0.15)",
              borderRadius: 6,
            }}
          />
          <div
            style={{
              position: "absolute",
              left: `${b.market_avg}%`,
              top: -4,
              width: 2,
              height: 20,
              backgroundColor: "#D1D5DB",
              borderRadius: 1,
              transform: "translateX(-1px)",
            }}
          >
            <div
              style={{
                position: "absolute",
                top: 24,
                left: "50%",
                transform: "translateX(-50%)",
                fontSize: 10,
                color: "#9A9A9A",
                whiteSpace: "nowrap",
              }}
            >
              Market avg: {b.market_avg_display}
            </div>
          </div>
          <div
            style={{
              position: "absolute",
              left: `${b.top}%`,
              top: -4,
              width: 2,
              height: 20,
              backgroundColor: "#22C55E",
              borderRadius: 1,
              transform: "translateX(-1px)",
            }}
          >
            <div
              style={{
                position: "absolute",
                top: 24,
                left: "50%",
                transform: "translateX(-50%)",
                fontSize: 10,
                color: "#22C55E",
                whiteSpace: "nowrap",
              }}
            >
              Top: {b.top_display}
            </div>
          </div>
          <div
            style={{
              position: "absolute",
              left: `${b.you}%`,
              top: "50%",
              transform: "translate(-50%, -50%)",
              width: 18,
              height: 18,
              borderRadius: "50%",
              backgroundColor: "#EA580C",
              border: "2.5px solid white",
              boxShadow: "0 1px 3px rgba(0,0,0,0.15)",
            }}
          >
            <div
              style={{
                position: "absolute",
                bottom: 24,
                left: "50%",
                transform: "translateX(-50%)",
                fontSize: 10,
                fontWeight: 600,
                color: "#EA580C",
              }}
            >
              You
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function MarketBenchmarks({ benchmarks }: { benchmarks: MarketBenchmarkRow[] }) {
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
        Your position vs the market
      </div>
      <div style={{ fontSize: 12, color: "#6B6B6B", marginTop: 4 }}>
        Anonymized benchmarks from across the Qatar commerce landscape. No competitor sees your
        data. You see where you stand.
      </div>
      <div style={{ marginTop: 8 }}>
        {benchmarks.map((b, i) => (
          <BenchmarkRow key={b.id} b={b} isLast={i === benchmarks.length - 1} />
        ))}
      </div>
      <div
        style={{
          display: "flex",
          gap: 24,
          paddingTop: 14,
          borderTop: "1px solid #E5E2DB",
          marginTop: 8,
          alignItems: "center",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div
            style={{
              width: 10,
              height: 10,
              borderRadius: "50%",
              backgroundColor: "#EA580C",
            }}
          />
          <span style={{ fontSize: 12, color: "#6B6B6B" }}>Your position</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 10, height: 2, backgroundColor: "#D1D5DB" }} />
          <span style={{ fontSize: 12, color: "#6B6B6B" }}>Market average</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 10, height: 2, backgroundColor: "#22C55E" }} />
          <span style={{ fontSize: 12, color: "#6B6B6B" }}>Top performer</span>
        </div>
      </div>
    </div>
  );
}
