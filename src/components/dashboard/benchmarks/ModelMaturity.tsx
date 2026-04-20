import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const DATA = [
  { month: "Month 1", accuracy: 61 },
  { month: "Month 3", accuracy: 74 },
  { month: "Month 6", accuracy: 82 },
  { month: "Month 9", accuracy: 87 },
  { month: "Month 12", accuracy: 91 },
  { month: "Month 18", accuracy: 94 },
];

function CustomTooltip({ active, payload }: { active?: boolean; payload?: Array<{ value: number }> }) {
  if (!active || !payload || !payload.length) return null;
  return (
    <div
      style={{
        backgroundColor: "#FFFFFF",
        border: "1px solid #E5E2DB",
        borderRadius: 8,
        padding: "8px 12px",
        fontSize: 12,
        color: "#1A1A18",
      }}
    >
      Accuracy: {payload[0].value}%
    </div>
  );
}

function StatCard({ label, value, valueColor, sub }: { label: string; value: string; valueColor: string; sub: string }) {
  return (
    <div
      style={{
        flex: 1,
        backgroundColor: "#FAFAF9",
        border: "1px solid #E5E2DB",
        borderRadius: 8,
        padding: "14px 18px",
      }}
    >
      <div style={{ fontSize: 11, color: "#9A9A9A" }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 700, color: valueColor, marginTop: 4 }}>{value}</div>
      <div style={{ fontSize: 10, color: "#9A9A9A", marginTop: 2 }}>{sub}</div>
    </div>
  );
}

export function ModelMaturity() {
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
        Your custom pricing model
      </div>
      <div style={{ fontSize: 12, color: "#6B6B6B", marginTop: 4 }}>
        This model is trained exclusively on Snoonu's data. It improves every month. If you leave,
        this model does not come with you.
      </div>
      <div style={{ height: 260, marginTop: 18 }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={DATA} margin={{ top: 10, right: 180, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E2DB" />
            <XAxis
              dataKey="month"
              tick={{ fontSize: 11, fill: "#9A9A9A" }}
              axisLine={{ stroke: "#E5E2DB" }}
              tickLine={false}
            />
            <YAxis
              domain={[50, 100]}
              tick={{ fontSize: 11, fill: "#9A9A9A" }}
              axisLine={{ stroke: "#E5E2DB" }}
              tickLine={false}
              tickFormatter={(v) => `${v}%`}
            />
            <Tooltip content={<CustomTooltip />} />
            <ReferenceLine
              y={61}
              stroke="#EF4444"
              strokeWidth={1}
              strokeDasharray="6 4"
              label={{
                value: "New client starting today: 61%",
                position: "right",
                fill: "#EF4444",
                fontSize: 11,
              }}
            />
            <ReferenceLine
              y={91}
              stroke="#22C55E"
              strokeWidth={1}
              strokeDasharray="6 4"
              label={{
                value: "Your current accuracy: 91%",
                position: "right",
                fill: "#22C55E",
                fontSize: 11,
              }}
            />
            <Area
              type="monotone"
              dataKey="accuracy"
              stroke="#EA580C"
              strokeWidth={2.5}
              fill="rgba(234, 88, 12, 0.08)"
              dot={{ r: 4, fill: "#EA580C", stroke: "white", strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <div style={{ display: "flex", gap: 14, marginTop: 18 }}>
        <StatCard
          label="Current accuracy"
          value="91%"
          valueColor="#22C55E"
          sub="Month 12 maturity"
        />
        <StatCard
          label="Data points processed"
          value="2.4M"
          valueColor="#1A1A18"
          sub="Snoonu-specific signals"
        />
        <StatCard
          label="Competitor starting today"
          value="61%"
          valueColor="#EF4444"
          sub="Would need 12+ months to catch up"
        />
      </div>
    </div>
  );
}
