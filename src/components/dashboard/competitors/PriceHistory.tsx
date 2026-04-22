import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { PriceHistoryRow } from "@/lib/competitors-data";

const LINES = [
  { key: "you", label: "Snoonu (You)", color: "#EA580C", strokeWidth: 2.5, r: 3 },
  { key: "talabat", label: "Talabat", color: "#1A1A18", strokeWidth: 1.5, r: 2 },
  { key: "carrefour", label: "Carrefour", color: "#22C55E", strokeWidth: 1.5, r: 2 },
  { key: "amazon", label: "Amazon.ae", color: "#3B82F6", strokeWidth: 1.5, r: 2 },
] as const;

export function PriceHistory({ history }: { history: PriceHistoryRow[] }) {
  // Build chart data sorted by position. Recharts handles nulls by skipping the point.
  const data = [...history]
    .sort((a, b) => a.position - b.position)
    .map((h) => ({
      month: h.month_label,
      you: h.you,
      talabat: h.talabat,
      carrefour: h.carrefour,
      amazon: h.amazon,
    }));

  const headerProduct = history[0]?.product ?? "Top tracked product";

  if (!data.length) {
    return (
      <div
        style={{
          backgroundColor: "#FFFFFF",
          border: "1px dashed #E5E2DB",
          borderRadius: 10,
          padding: "20px 24px",
          fontSize: 13,
          color: "#6B6B6B",
        }}
      >
        No price history yet - your dashboard will populate as we track competitor prices over
        time.
      </div>
    );
  }

  return (
    <div
      style={{
        backgroundColor: "#FFFFFF",
        border: "1px solid #E5E2DB",
        borderRadius: 10,
        padding: 22,
      }}
    >
      <div style={{ fontSize: 15, fontWeight: 600, color: "#1A1A18" }}>Price history</div>
      <div style={{ fontSize: 12, color: "#6B6B6B", marginTop: 4 }}>
        {headerProduct} across key competitors, last {data.length} months
      </div>

      <div style={{ height: 240, marginTop: 18 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E2DB" />
            <XAxis
              dataKey="month"
              tick={{ fontSize: 11, fill: "#9A9A9A" }}
              axisLine={{ stroke: "#E5E2DB" }}
              tickLine={false}
            />
            <YAxis
              domain={["auto", "auto"]}
              tick={{ fontSize: 11, fill: "#9A9A9A" }}
              axisLine={false}
              tickLine={false}
              width={48}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "#FFFFFF",
                border: "1px solid #E5E2DB",
                borderRadius: 8,
                fontSize: 12,
              }}
              labelStyle={{ color: "#1A1A18", fontWeight: 600 }}
            />
            {LINES.map((l) => (
              <Line
                key={l.key}
                type="monotone"
                dataKey={l.key}
                name={l.label}
                stroke={l.color}
                strokeWidth={l.strokeWidth}
                dot={{ r: l.r, fill: l.color, strokeWidth: 0 }}
                activeDot={{ r: l.r + 1 }}
                connectNulls
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div style={{ display: "flex", gap: 20, marginTop: 14, flexWrap: "wrap" }}>
        {LINES.map((l) => (
          <div key={l.key} style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                backgroundColor: l.color,
                display: "inline-block",
              }}
            />
            <span style={{ fontSize: 12, color: "#6B6B6B" }}>{l.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
