import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

type Row = { name: string; value: number; color: string };

const DATA: Row[] = [
  { name: "Talabat", value: 28, color: "rgba(26, 26, 24, 0.7)" },
  { name: "Snoonu (You)", value: 22, color: "#EA580C" },
  { name: "Carrefour", value: 18, color: "rgba(26, 26, 24, 0.5)" },
  { name: "Amazon.ae", value: 15, color: "rgba(26, 26, 24, 0.4)" },
  { name: "Lulu", value: 10, color: "rgba(26, 26, 24, 0.3)" },
  { name: "Others", value: 7, color: "rgba(26, 26, 24, 0.2)" },
];

function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: Row }>;
}) {
  if (!active || !payload || !payload.length) return null;
  const row = payload[0].payload;
  return (
    <div
      style={{
        backgroundColor: "#FFFFFF",
        border: "1px solid #E5E2DB",
        borderRadius: 8,
        padding: "8px 12px",
        fontSize: 12,
        color: "#1A1A18",
        boxShadow: "0 4px 12px rgba(0, 0, 0, 0.06)",
      }}
    >
      <div style={{ fontWeight: 600 }}>{row.name}</div>
      <div style={{ color: "#6B6B6B", marginTop: 2 }}>{row.value}% est. share</div>
    </div>
  );
}

export function MarketPosition() {
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
        Market position by category
      </h2>
      <p style={{ fontSize: 12, color: "#6B6B6B", margin: "4px 0 16px" }}>
        Estimated share across monitored categories
      </p>

      <div style={{ width: "100%", height: 200 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={DATA}
            layout="vertical"
            margin={{ top: 0, right: 16, bottom: 0, left: 0 }}
            barCategoryGap={6}
          >
            <XAxis
              type="number"
              domain={[0, 30]}
              tickFormatter={(v) => `${v}%`}
              tick={{ fontSize: 11, fill: "#9A9A9A" }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              type="category"
              dataKey="name"
              tick={{ fontSize: 12, fill: "#6B6B6B" }}
              axisLine={false}
              tickLine={false}
              width={100}
            />
            <Tooltip
              cursor={{ fill: "rgba(0,0,0,0.03)" }}
              content={<CustomTooltip />}
            />
            <Bar dataKey="value" barSize={20} radius={[0, 4, 4, 0]}>
              {DATA.map((row, i) => (
                <Cell key={i} fill={row.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
