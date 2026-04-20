import { useState } from "react";
import {
  type Product,
  type CompetitorPrice,
  getPriceValue,
  isOutOfStock,
  formatQAR,
} from "./types";

const COMP_KEYS = ["talabat", "carrefour", "lulu", "amazon", "noon"] as const;
const COMP_LABELS = ["TALABAT", "CARREFOUR", "LULU", "AMAZON.AE", "NOON"];

function CompetitorCell({ price, yourPrice }: { price: CompetitorPrice; yourPrice: number }) {
  const v = getPriceValue(price);
  const oos = isOutOfStock(price);
  if (v === null) {
    return <span style={{ fontSize: 13, color: "#9A9A9A" }}>N/A</span>;
  }
  let color = "#1A1A18";
  let weight: 400 | 600 = 400;
  if (v < yourPrice) {
    color = "#EF4444";
    weight = 600;
  } else if (v > yourPrice) {
    color = "#22C55E";
  }
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
      <span style={{ fontSize: 13, color, fontWeight: weight }}>{formatQAR(v)}</span>
      {oos && (
        <span style={{ fontSize: 10, color: "#F59E0B", marginTop: 2 }}>Out of stock</span>
      )}
    </div>
  );
}

function SignalBadge({ signal }: { signal: Product["signal"] }) {
  const styles: Record<Product["signal"], { bg: string; color: string }> = {
    RAISE: { bg: "rgba(34, 197, 94, 0.1)", color: "#16A34A" },
    LOWER: { bg: "rgba(245, 158, 11, 0.1)", color: "#D97706" },
    HOLD: { bg: "rgba(59, 130, 246, 0.1)", color: "#2563EB" },
    WATCH: { bg: "rgba(239, 68, 68, 0.1)", color: "#DC2626" },
  };
  const s = styles[signal];
  return (
    <span
      style={{
        display: "inline-block",
        padding: "3px 10px",
        borderRadius: 20,
        backgroundColor: s.bg,
        color: s.color,
        fontSize: 11,
        fontWeight: 600,
        letterSpacing: "0.02em",
      }}
    >
      {signal}
    </span>
  );
}

function ChannelPill({ channel }: { channel: Product["channel"] }) {
  const isOnline = channel === "online";
  return (
    <span
      style={{
        display: "inline-block",
        padding: "2px 8px",
        borderRadius: 10,
        backgroundColor: isOnline ? "rgba(59, 130, 246, 0.08)" : "rgba(168, 85, 247, 0.08)",
        color: isOnline ? "#3B82F6" : "#7C3AED",
        fontSize: 10,
        fontWeight: 500,
      }}
    >
      {isOnline ? "Online" : "In-Store"}
    </span>
  );
}

function GapCell({ product }: { product: Product }) {
  const competitors = COMP_KEYS.map((k) => getPriceValue(product[k])).filter(
    (v): v is number => v !== null,
  );
  if (competitors.length === 0) {
    return <span style={{ fontSize: 13, color: "#9A9A9A" }}>0.0%</span>;
  }
  const lowest = Math.min(...competitors);
  const diff = ((lowest - product.yourPrice) / product.yourPrice) * 100;
  let color = "#9A9A9A";
  if (diff < -0.05) color = "#EF4444";
  else if (diff > 0.05) color = "#22C55E";
  const sign = diff > 0 ? "+" : "";
  return (
    <span style={{ fontSize: 13, fontWeight: 600, color }}>
      {sign}
      {diff.toFixed(1)}%
    </span>
  );
}

export function PriceTable({ products }: { products: Product[] }) {
  const [hoverId, setHoverId] = useState<number | null>(null);

  return (
    <div
      className="table-scroll"
      style={{
        backgroundColor: "#FFFFFF",
        border: "1px solid #E5E2DB",
        borderRadius: 10,
        padding: 6,
      }}
    >
      <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 1000 }}>
        <thead>
          <tr style={{ borderBottom: "2px solid #E5E2DB" }}>
            <th
              style={{
                textAlign: "left",
                padding: "12px 10px",
                fontSize: 11,
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.03em",
                color: "#9A9A9A",
                width: 260,
              }}
            >
              Product
            </th>
            <th style={thRight}>Your Price</th>
            {COMP_LABELS.map((l) => (
              <th key={l} style={thRight}>
                {l}
              </th>
            ))}
            <th style={thRight}>Gap</th>
            <th style={{ ...thRight, textAlign: "center" }}>Signal</th>
          </tr>
        </thead>
        <tbody>
          {products.length === 0 ? (
            <tr>
              <td
                colSpan={9}
                style={{ padding: 40, textAlign: "center", fontSize: 13, color: "#9A9A9A" }}
              >
                No products match your filters.
              </td>
            </tr>
          ) : (
            products.map((p, idx) => {
              const baseBg = idx % 2 === 0 ? "transparent" : "#FAFAF9";
              const bg = hoverId === p.id ? "#F5F4F1" : baseBg;
              return (
                <tr
                  key={p.id}
                  onMouseEnter={() => setHoverId(p.id)}
                  onMouseLeave={() => setHoverId(null)}
                  style={{
                    borderBottom: "1px solid #E5E2DB",
                    backgroundColor: bg,
                    cursor: "pointer",
                    transition: "background-color 0.15s",
                  }}
                >
                  <td style={{ padding: "14px 10px" }}>
                    <div style={{ fontSize: 13, fontWeight: 500, color: "#1A1A18" }}>
                      {p.name}
                    </div>
                    <div
                      style={{
                        marginTop: 4,
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                      }}
                    >
                      <span style={{ fontSize: 11, color: "#6B6B6B" }}>{p.category}</span>
                      <ChannelPill channel={p.channel} />
                    </div>
                  </td>
                  <td style={tdRight}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: "#EA580C" }}>
                      {formatQAR(p.yourPrice)}
                    </span>
                  </td>
                  {COMP_KEYS.map((k) => (
                    <td key={k} style={tdRight}>
                      <CompetitorCell price={p[k]} yourPrice={p.yourPrice} />
                    </td>
                  ))}
                  <td style={tdRight}>
                    <GapCell product={p} />
                  </td>
                  <td style={{ padding: "14px 10px", textAlign: "center" }}>
                    <SignalBadge signal={p.signal} />
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}

const thRight: React.CSSProperties = {
  textAlign: "right",
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
};
