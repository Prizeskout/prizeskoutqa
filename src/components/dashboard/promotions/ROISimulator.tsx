import { useMemo, useState } from "react";
import { CheckCircle, AlertTriangle, ChevronDown } from "lucide-react";

function Field({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
}) {
  return (
    <div style={{ flex: 1, minWidth: 160 }}>
      <div style={{ fontSize: 11, fontWeight: 500, color: "#6B6B6B", marginBottom: 4 }}>
        {label}
      </div>
      <div style={{ position: "relative" }}>
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          style={{
            appearance: "none",
            WebkitAppearance: "none",
            MozAppearance: "none",
            width: "100%",
            backgroundColor: "#FFFFFF",
            border: "1px solid #E5E2DB",
            borderRadius: 8,
            padding: "10px 36px 10px 14px",
            fontSize: 13,
            fontWeight: 400,
            color: "#1A1A18",
            cursor: "pointer",
            outline: "none",
          }}
          onFocus={(e) => (e.currentTarget.style.borderColor = "#EA580C")}
          onBlur={(e) => (e.currentTarget.style.borderColor = "#E5E2DB")}
        >
          {options.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
        <ChevronDown
          size={14}
          color="#9A9A9A"
          style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}
        />
      </div>
    </div>
  );
}

// --- Deterministic ROI model -------------------------------------------------
// Per-category price elasticity of demand (absolute value). Higher = more
// volume response to a discount. Sourced as plausible retail benchmarks; the
// goal is a stable, reproducible simulation, not a forecast.
const CATEGORY_ELASTICITY: Record<string, { elasticity: number; baselineDailyOrders: number; avgOrderValue: number; cannibalizationBase: number; baseMargin: number }> = {
  Electronics: { elasticity: 1.8, baselineDailyOrders: 220, avgOrderValue: 480, cannibalizationBase: 0.12, baseMargin: 0.18 },
  Grocery:     { elasticity: 0.9, baselineDailyOrders: 1800, avgOrderValue: 65,  cannibalizationBase: 0.22, baseMargin: 0.14 },
  Fashion:     { elasticity: 2.1, baselineDailyOrders: 340, avgOrderValue: 180, cannibalizationBase: 0.18, baseMargin: 0.42 },
  Home:        { elasticity: 1.4, baselineDailyOrders: 160, avgOrderValue: 240, cannibalizationBase: 0.15, baseMargin: 0.28 },
  Beauty:      { elasticity: 1.6, baselineDailyOrders: 410, avgOrderValue: 120, cannibalizationBase: 0.20, baseMargin: 0.38 },
};

const CHANNEL_REACH: Record<string, number> = {
  Online: 0.55,
  "In-Store": 0.45,
  Both: 0.92, // not 1.0 — overlap
};

function parsePct(s: string): number {
  return Number(s.replace("%", "")) / 100;
}
function parseDays(s: string): number {
  return Number(s.split(" ")[0]);
}

type SimResult = {
  gmvUplift: number;       // QAR
  incrementalOrders: number;
  cannibalizationPct: number; // 0..1
  netRoi: number;          // multiplier
  healthy: boolean;
};

function simulate(category: string, depth: string, duration: string, channel: string): SimResult {
  const c = CATEGORY_ELASTICITY[category] ?? CATEGORY_ELASTICITY.Electronics;
  const d = parsePct(depth);            // e.g. 0.15
  const days = parseDays(duration);     // e.g. 5
  const reach = CHANNEL_REACH[channel] ?? 0.5;

  // Volume lift from elasticity, with diminishing returns at deeper discounts.
  const rawLift = c.elasticity * d;
  const liftMultiplier = 1 - Math.exp(-rawLift); // saturates toward 1
  const baselineOrders = c.baselineDailyOrders * days * reach;
  const incrementalOrders = Math.round(baselineOrders * liftMultiplier);

  // GMV uplift = incremental orders * discounted AOV
  const discountedAov = c.avgOrderValue * (1 - d);
  const gmvUplift = Math.round(incrementalOrders * discountedAov);

  // Cannibalization scales with depth and duration (longer = more pull-forward).
  const cannibalizationPct = Math.min(
    0.6,
    c.cannibalizationBase + d * 0.4 + Math.max(0, days - 3) * 0.012,
  );

  // Margin after discount; ROI = incremental margin / discount cost.
  const marginPerOrder = discountedAov * (c.baseMargin - d);
  const incrementalMargin = incrementalOrders * marginPerOrder;
  const cannibalizedOrderCost = baselineOrders * cannibalizationPct * c.avgOrderValue * d;
  const promoCost = Math.max(1, cannibalizedOrderCost);
  const netRoi = Math.max(0, incrementalMargin / promoCost);

  const healthy = netRoi >= 1.5 && cannibalizationPct <= 0.25 && marginPerOrder > 0;

  return { gmvUplift, incrementalOrders, cannibalizationPct, netRoi, healthy };
}

function formatQar(n: number): string {
  if (n >= 1000) return `+QAR ${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}K`;
  return `+QAR ${n}`;
}

export function ROISimulator() {
  const [category, setCategory] = useState("Electronics");
  const [depth, setDepth] = useState("15%");
  const [duration, setDuration] = useState("5 days");
  const [channel, setChannel] = useState("Online");

  // Inputs the user has actually clicked Simulate on.
  const [submitted, setSubmitted] = useState({ category, depth, duration, channel });

  const result = useMemo(
    () => simulate(submitted.category, submitted.depth, submitted.duration, submitted.channel),
    [submitted],
  );

  const cannibalizationColor =
    result.cannibalizationPct <= 0.18 ? "#22C55E" : result.cannibalizationPct <= 0.28 ? "#F59E0B" : "#EF4444";
  const roiColor = result.netRoi >= 2 ? "#22C55E" : result.netRoi >= 1.2 ? "#F59E0B" : "#EF4444";

  const metrics = [
    { label: "Projected GMV uplift", value: formatQar(result.gmvUplift), color: "#22C55E" },
    { label: "Incremental orders", value: `+${result.incrementalOrders.toLocaleString()}`, color: "#1A1A18" },
    { label: "Cannibalization risk", value: `${Math.round(result.cannibalizationPct * 100)}%`, color: cannibalizationColor },
    { label: "Net ROI", value: `${result.netRoi.toFixed(1)}x`, color: roiColor },
  ];

  const dayOfWeek = submitted.channel === "In-Store" ? "Saturday" : "Thursday";
  const verdictText = result.healthy
    ? `This campaign profile looks strong. Low cannibalization risk and healthy ROI. Recommended timing: launch on a ${dayOfWeek} to capture weekend traffic. Avoid overlapping with Talabat's Eid sale for maximum impact.`
    : `This campaign profile is marginal. ${
        result.netRoi < 1.2 ? "Net ROI is below 1.2x — discount depth is eating margin faster than it lifts volume. " : ""
      }${
        result.cannibalizationPct > 0.28 ? "Cannibalization risk is elevated — much of the lift is pulled-forward demand. " : ""
      }Consider reducing depth, shortening the window, or narrowing the category mix before launch.`;

  return (
    <div
      style={{
        backgroundColor: "#FFFFFF",
        border: "1px solid #E5E2DB",
        borderRadius: 10,
        padding: "20px 24px",
      }}
    >
      <div style={{ fontSize: 15, fontWeight: 600, color: "#1A1A18" }}>Campaign ROI simulator</div>
      <div style={{ fontSize: 12, color: "#6B6B6B", marginTop: 4 }}>
        Predict the impact of a promotion before you launch it
      </div>

      <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginTop: 14 }}>
        <Field
          label="Category"
          value={category}
          onChange={setCategory}
          options={["Electronics", "Grocery", "Fashion", "Home", "Beauty"]}
        />
        <Field
          label="Discount depth"
          value={depth}
          onChange={setDepth}
          options={["5%", "10%", "15%", "20%", "25%", "30%"]}
        />
        <Field
          label="Duration"
          value={duration}
          onChange={setDuration}
          options={["2 days", "3 days", "5 days", "7 days", "10 days", "14 days"]}
        />
        <Field
          label="Channel"
          value={channel}
          onChange={setChannel}
          options={["Online", "In-Store", "Both"]}
        />
      </div>

      <button
        onClick={() => setSubmitted({ category, depth, duration, channel })}
        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#C2410C")}
        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#EA580C")}
        style={{
          marginTop: 14,
          backgroundColor: "#EA580C",
          color: "#FFFFFF",
          fontSize: 13,
          fontWeight: 600,
          padding: "10px 24px",
          borderRadius: 8,
          border: "none",
          cursor: "pointer",
          transition: "background-color 150ms ease",
        }}
      >
        Simulate
      </button>

      <div
        style={{
          marginTop: 20,
          backgroundColor: "#FAFAF9",
          borderRadius: 10,
          padding: "22px 26px",
        }}
      >
        <div style={{ display: "flex", gap: 16, justifyContent: "space-between", flexWrap: "wrap" }}>
          {metrics.map((m) => (
            <div key={m.label} style={{ flex: 1, minWidth: 140 }}>
              <div style={{ fontSize: 10, color: "#9A9A9A", textTransform: "uppercase", fontWeight: 500 }}>
                {m.label}
              </div>
              <div style={{ fontSize: 24, fontWeight: 700, color: m.color, marginTop: 6 }}>
                {m.value}
              </div>
            </div>
          ))}
        </div>
        <div
          style={{
            marginTop: 16,
            backgroundColor: result.healthy ? "rgba(34, 197, 94, 0.04)" : "rgba(245, 158, 11, 0.05)",
            border: `1px solid ${result.healthy ? "rgba(34, 197, 94, 0.12)" : "rgba(245, 158, 11, 0.18)"}`,
            borderRadius: 8,
            padding: "12px 18px",
            display: "flex",
            alignItems: "flex-start",
            gap: 10,
          }}
        >
          {result.healthy ? (
            <CheckCircle size={16} color="#22C55E" style={{ flexShrink: 0, marginTop: 2 }} />
          ) : (
            <AlertTriangle size={16} color="#F59E0B" style={{ flexShrink: 0, marginTop: 2 }} />
          )}
          <div style={{ fontSize: 12, color: "#6B6B6B", lineHeight: 1.6 }}>{verdictText}</div>
        </div>
      </div>
    </div>
  );
}
