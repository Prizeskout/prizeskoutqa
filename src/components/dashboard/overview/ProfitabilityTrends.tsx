import { useEffect, useMemo, useState } from "react";
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";

// Time-bucketed contribution + margin over the economic twin, filterable by a
// single channel, branch, or SKU. Fetches /api/channels/connect with
// platform:"profitability_trends" — see getProfitabilityTrends in
// src/server/core/dashboard-stats.ts. Category/campaign are not offered because
// order events carry no such tag (see the server comment).

type Granularity = "day" | "week" | "month" | "quarter";
type Dimension = "all" | "channel" | "branch" | "sku";

type TrendPoint = {
  bucket: string;
  start: string;
  gross_sales: number;
  net_revenue: number;
  contribution: number;
  orders: number;
  margin_pct: number | null;
};

type TrendsResponse = {
  ok?: boolean;
  granularity: Granularity;
  dimension: Dimension;
  key: string | null;
  currency: string | null;
  points: TrendPoint[];
  available: { channels: string[]; branches: string[]; skus: string[] };
};

const GRANULARITIES: { value: Granularity; label: string }[] = [
  { value: "day", label: "Daily" },
  { value: "week", label: "Weekly" },
  { value: "month", label: "Monthly" },
  { value: "quarter", label: "Quarterly" },
];

const DIMENSIONS: { value: Dimension; label: string }[] = [
  { value: "all", label: "All orders" },
  { value: "channel", label: "By channel" },
  { value: "branch", label: "By branch" },
  { value: "sku", label: "By SKU" },
];

const CONTRIBUTION_COLOR = "#4F8DF7";
const MARGIN_COLOR = "#10B981";

function formatLabel(bucket: string, granularity: Granularity): string {
  if (granularity === "quarter") {
    const [year, quarter] = bucket.split("-");
    return `${quarter} ${year.slice(2)}`;
  }
  if (granularity === "month") {
    const [year, month] = bucket.split("-");
    const names = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return `${names[Number(month) - 1] ?? month} ${year.slice(2)}`;
  }
  // day / week start — MM-DD
  return bucket.slice(5);
}

function formatMoney(value: number, currency: string | null): string {
  const rounded = Math.round(value).toLocaleString();
  return currency ? `${currency} ${rounded}` : rounded;
}

export function ProfitabilityTrends({ currency }: { currency: string }) {
  const [granularity, setGranularity] = useState<Granularity>("month");
  const [dimension, setDimension] = useState<Dimension>("all");
  const [key, setKey] = useState<string | null>(null);
  const [data, setData] = useState<TrendsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [notConnected, setNotConnected] = useState(false);

  useEffect(() => {
    let active = true;
    const mid = localStorage.getItem("ps_merchant_id") ?? "";
    const ac = localStorage.getItem("ps_access_code") ?? "";
    if (!mid || !ac) {
      setNotConnected(true);
      setLoading(false);
      return;
    }
    setLoading(true);
    fetch("/api/channels/connect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        merchant_id: mid,
        access_code: ac,
        platform: "profitability_trends",
        granularity,
        dimension,
        key: dimension === "all" ? "" : key ?? "",
      }),
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: TrendsResponse | null) => {
        if (!active || !d?.ok) return;
        setData(d);
        // When switching into a dimension with no key chosen yet, default to
        // the first available value so the chart isn't empty.
        if (dimension !== "all" && !key) {
          const list =
            dimension === "channel"
              ? d.available.channels
              : dimension === "branch"
                ? d.available.branches
                : d.available.skus;
          if (list.length) setKey(list[0]);
        }
      })
      .catch(() => {})
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [granularity, dimension, key]);

  const keyOptions = useMemo(() => {
    if (!data || dimension === "all") return [];
    return dimension === "channel"
      ? data.available.channels
      : dimension === "branch"
        ? data.available.branches
        : data.available.skus;
  }, [data, dimension]);

  const chartData = useMemo(
    () =>
      (data?.points ?? []).map((point) => ({
        label: formatLabel(point.bucket, data?.granularity ?? granularity),
        contribution: point.contribution,
        margin_pct: point.margin_pct,
        orders: point.orders,
      })),
    [data, granularity],
  );

  const hasData = chartData.some((row) => row.orders > 0);
  const cur = data?.currency ?? currency;

  const selectStyle: React.CSSProperties = {
    background: "var(--surface)",
    color: "var(--text)",
    border: "1px solid var(--border)",
    borderRadius: 8,
    padding: "6px 10px",
    fontSize: 12.5,
    fontWeight: 500,
  };

  return (
    <section
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: 14,
        padding: 20,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: 14,
          flexWrap: "wrap",
          marginBottom: 16,
        }}
      >
        <div>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "var(--text)" }}>
            Profitability trends
          </h2>
          <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 3 }}>
            Contribution and margin over time, from your normalized orders
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          {/* Granularity segmented control */}
          <div style={{ display: "inline-flex", border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden" }}>
            {GRANULARITIES.map((option) => (
              <button
                key={option.value}
                onClick={() => setGranularity(option.value)}
                style={{
                  border: "none",
                  padding: "6px 11px",
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                  background: granularity === option.value ? "var(--accent)" : "transparent",
                  color: granularity === option.value ? "#fff" : "var(--muted)",
                }}
              >
                {option.label}
              </button>
            ))}
          </div>

          {/* Dimension */}
          <select
            value={dimension}
            onChange={(e) => {
              setDimension(e.target.value as Dimension);
              setKey(null);
            }}
            style={selectStyle}
          >
            {DIMENSIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          {/* Key (specific channel / branch / SKU) */}
          {dimension !== "all" && (
            <select
              value={key ?? ""}
              onChange={(e) => setKey(e.target.value || null)}
              style={{ ...selectStyle, maxWidth: 200 }}
              disabled={!keyOptions.length}
            >
              {!keyOptions.length && <option value="">No data</option>}
              {keyOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      <div style={{ position: "relative", height: 280 }}>
        {notConnected ? (
          <Centered text="Connect a store to see profitability trends." />
        ) : loading && !data ? (
          <Centered text="Loading trends…" />
        ) : !hasData ? (
          <Centered text="No order data yet for this period. Trends appear once orders are ingested." />
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: "var(--muted)" }} tickLine={false} axisLine={{ stroke: "var(--border)" }} />
              <YAxis
                yAxisId="left"
                tick={{ fontSize: 11, fill: "var(--muted)" }}
                tickLine={false}
                axisLine={false}
                width={54}
                tickFormatter={(value: number) => Math.round(value).toLocaleString()}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                tick={{ fontSize: 11, fill: "var(--muted)" }}
                tickLine={false}
                axisLine={false}
                width={40}
                tickFormatter={(value: number) => `${value}%`}
              />
              <Tooltip
                contentStyle={{
                  background: "var(--surface)",
                  border: "1px solid var(--border)",
                  borderRadius: 8,
                  fontSize: 12,
                  color: "var(--text)",
                }}
                formatter={(value: number, name: string) =>
                  name === "Margin %"
                    ? [`${value == null ? "—" : value.toFixed(1)}%`, name]
                    : [formatMoney(Number(value), cur), name]
                }
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar yAxisId="left" dataKey="contribution" name="Contribution" fill={CONTRIBUTION_COLOR} radius={[3, 3, 0, 0]} maxBarSize={38} />
              <Line yAxisId="right" type="monotone" dataKey="margin_pct" name="Margin %" stroke={MARGIN_COLOR} strokeWidth={2} dot={false} connectNulls />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>
    </section>
  );
}

function Centered({ text }: { text: string }) {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        padding: 20,
        fontSize: 13,
        color: "var(--muted)",
      }}
    >
      {text}
    </div>
  );
}
