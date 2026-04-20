import { TrendingUp } from "lucide-react";
import type { TrendingProductRow } from "@/lib/market-data";

export function TrendingProducts({ trending }: { trending: TrendingProductRow[] }) {
  return (
    <div
      style={{
        backgroundColor: "#FFFFFF",
        border: "1px solid #E5E2DB",
        borderRadius: 10,
        padding: "20px 24px",
      }}
    >
      <div style={{ fontSize: 15, fontWeight: 600, color: "#1A1A18" }}>Trending in Qatar right now</div>
      <div style={{ fontSize: 12, color: "#6B6B6B", marginTop: 4 }}>
        Products gaining search volume and sales momentum across all platforms
      </div>
      <div
        style={{
          marginTop: 14,
          display: "flex",
          gap: 14,
          overflowX: "auto",
          paddingBottom: 8,
        }}
      >
        {trending.map((t) => {
          const inCatalog = t.status === "In catalog";
          return (
            <div
              key={t.id}
              style={{
                width: 200,
                flexShrink: 0,
                backgroundColor: "#FFFFFF",
                border: "1px solid #E5E2DB",
                borderRadius: 10,
                padding: 16,
              }}
            >
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                  backgroundColor: "rgba(34, 197, 94, 0.1)",
                  color: "#16A34A",
                  fontSize: 10,
                  fontWeight: 600,
                  padding: "3px 8px",
                  borderRadius: 12,
                }}
              >
                <TrendingUp size={12} />
                Trending
              </span>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#1A1A18", marginTop: 10 }}>
                {t.name}
              </div>
              <div style={{ fontSize: 11, color: "#9A9A9A", marginTop: 2 }}>{t.category}</div>
              <div style={{ marginTop: 10 }}>
                <div style={{ fontSize: 10, color: "#9A9A9A" }}>Search growth</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#22C55E", marginTop: 2 }}>
                  {t.growth}
                </div>
              </div>
              <div style={{ marginTop: 10 }}>
                <div style={{ fontSize: 10, color: "#9A9A9A" }}>Your status</div>
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 500,
                    color: inCatalog ? "#22C55E" : "#EF4444",
                    marginTop: 2,
                  }}
                >
                  {t.status}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
