import { useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { useTranslation } from "react-i18next";

type Row = { name: string; value: number; color: string; isYou?: boolean; isOthers?: boolean };

const DATA_BASE: Row[] = [
  { name: "Talabat", value: 28, color: "rgba(26, 26, 24, 0.7)" },
  { name: "Snoonu", value: 22, color: "#EA580C", isYou: true },
  { name: "Carrefour", value: 18, color: "rgba(26, 26, 24, 0.5)" },
  { name: "Amazon.ae", value: 15, color: "rgba(26, 26, 24, 0.4)" },
  { name: "Lulu", value: 10, color: "rgba(26, 26, 24, 0.3)" },
  { name: "Others", value: 7, color: "rgba(26, 26, 24, 0.2)", isOthers: true },
];

function CustomTooltip({
  active,
  payload,
  estShareLabel,
}: {
  active?: boolean;
  payload?: Array<{ payload: Row }>;
  estShareLabel: (name: string, value: number) => string;
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
      <div style={{ color: "#6B6B6B", marginTop: 2 }}>{estShareLabel(row.name, row.value)}</div>
    </div>
  );
}

export function MarketPosition() {
  const { t } = useTranslation();

  const data = useMemo(
    () =>
      DATA_BASE.map((row) => ({
        ...row,
        name: row.isYou
          ? `${row.name} ${t("market.youSuffix")}`
          : row.isOthers
            ? t("market.others")
            : row.name,
      })),
    [t],
  );

  const estShareLabel = (name: string, value: number) =>
    t("market.estShare", { value });

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
        {t("market.positionTitle")}
      </h2>
      <p style={{ fontSize: 12, color: "#6B6B6B", margin: "4px 0 16px" }}>
        {t("market.positionSubtitle")}
      </p>

      <div style={{ width: "100%", height: 200 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
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
              content={<CustomTooltip estShareLabel={estShareLabel} />}
            />
            <Bar dataKey="value" barSize={20} radius={[0, 4, 4, 0]}>
              {data.map((row, i) => (
                <Cell key={i} fill={row.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
