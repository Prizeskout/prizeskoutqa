import { useEffect, useMemo, useState } from "react";
import { useRouter } from "@tanstack/react-router";
import { CheckCircle, AlertTriangle, ChevronDown, Pin, PinOff, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  CHANNEL_OPTIONS,
  DEPTH_OPTIONS,
  DURATION_OPTIONS,
  formatPctPoints,
  formatQar,
  formatSignedInt,
  simulate,
  type RoiModelCategory,
  type ScenarioInputs,
  type ScenarioResult,
  type ScenarioRow,
} from "@/lib/roi-model";

function Field({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: readonly string[];
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

type PinnedScenario = { inputs: ScenarioInputs; result: ScenarioResult };

function rowToPinned(r: ScenarioRow): PinnedScenario {
  return {
    inputs: { category: r.category, depth: r.depth, duration: r.duration, channel: r.channel },
    result: {
      gmvUplift: Number(r.gmv_uplift),
      incrementalOrders: Number(r.incremental_orders),
      cannibalizationPct: Number(r.cannibalization_pct),
      netRoi: Number(r.net_roi),
      healthy: r.healthy,
    },
  };
}

const tileLabel: Record<string, string> = {
  gmv: "Projected GMV uplift",
  orders: "Incremental orders",
  cannibalization: "Cannibalization risk",
  roi: "Net ROI",
};

function colorForCannibalization(p: number) {
  return p <= 0.18 ? "#22C55E" : p <= 0.28 ? "#F59E0B" : "#EF4444";
}
function colorForRoi(r: number) {
  return r >= 2 ? "#22C55E" : r >= 1.2 ? "#F59E0B" : "#EF4444";
}

function ResultTiles({ result }: { result: ScenarioResult }) {
  const tiles = [
    { key: "gmv", value: formatQar(result.gmvUplift), color: "#22C55E" },
    { key: "orders", value: formatSignedInt(result.incrementalOrders), color: "#1A1A18" },
    {
      key: "cannibalization",
      value: `${Math.round(result.cannibalizationPct * 100)}%`,
      color: colorForCannibalization(result.cannibalizationPct),
    },
    { key: "roi", value: `${result.netRoi.toFixed(1)}x`, color: colorForRoi(result.netRoi) },
  ];
  return (
    <div style={{ display: "flex", gap: 16, justifyContent: "space-between", flexWrap: "wrap" }}>
      {tiles.map((t) => (
        <div key={t.key} style={{ flex: 1, minWidth: 140 }}>
          <div style={{ fontSize: 10, color: "#9A9A9A", textTransform: "uppercase", fontWeight: 500 }}>
            {tileLabel[t.key]}
          </div>
          <div style={{ fontSize: 24, fontWeight: 700, color: t.color, marginTop: 6 }}>
            {t.value}
          </div>
        </div>
      ))}
    </div>
  );
}

function CompareTiles({ baseline, current }: { baseline: ScenarioResult; current: ScenarioResult }) {
  const dGmv = current.gmvUplift - baseline.gmvUplift;
  const dOrders = current.incrementalOrders - baseline.incrementalOrders;
  const dCannib = current.cannibalizationPct - baseline.cannibalizationPct;
  const dRoi = current.netRoi - baseline.netRoi;

  const items = [
    {
      key: "gmv",
      base: formatQar(baseline.gmvUplift),
      curr: formatQar(current.gmvUplift),
      delta: formatQar(dGmv),
      deltaColor: dGmv >= 0 ? "#22C55E" : "#EF4444",
    },
    {
      key: "orders",
      base: formatSignedInt(baseline.incrementalOrders),
      curr: formatSignedInt(current.incrementalOrders),
      delta: formatSignedInt(dOrders),
      deltaColor: dOrders >= 0 ? "#22C55E" : "#EF4444",
    },
    {
      key: "cannibalization",
      base: `${Math.round(baseline.cannibalizationPct * 100)}%`,
      curr: `${Math.round(current.cannibalizationPct * 100)}%`,
      delta: formatPctPoints(dCannib),
      // Lower cannibalization is better → negative delta is green
      deltaColor: dCannib <= 0 ? "#22C55E" : "#EF4444",
    },
    {
      key: "roi",
      base: `${baseline.netRoi.toFixed(1)}x`,
      curr: `${current.netRoi.toFixed(1)}x`,
      delta: `${dRoi >= 0 ? "+" : ""}${dRoi.toFixed(1)}x`,
      deltaColor: dRoi >= 0 ? "#22C55E" : "#EF4444",
    },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1.4fr 1fr 1fr 1fr",
          gap: 12,
          padding: "0 6px",
          fontSize: 10,
          color: "#9A9A9A",
          textTransform: "uppercase",
          fontWeight: 500,
        }}
      >
        <span>Metric</span>
        <span>Baseline</span>
        <span>Current</span>
        <span>Delta</span>
      </div>
      {items.map((it) => (
        <div
          key={it.key}
          style={{
            display: "grid",
            gridTemplateColumns: "1.4fr 1fr 1fr 1fr",
            gap: 12,
            alignItems: "center",
            backgroundColor: "#FFFFFF",
            border: "1px solid #E5E2DB",
            borderRadius: 8,
            padding: "10px 14px",
          }}
        >
          <span style={{ fontSize: 12, color: "#6B6B6B" }}>{tileLabel[it.key]}</span>
          <span style={{ fontSize: 14, fontWeight: 600, color: "#6B6B6B" }}>{it.base}</span>
          <span style={{ fontSize: 14, fontWeight: 700, color: "#1A1A18" }}>{it.curr}</span>
          <span style={{ fontSize: 14, fontWeight: 700, color: it.deltaColor }}>{it.delta}</span>
        </div>
      ))}
    </div>
  );
}

export function ROISimulator({
  roiModel,
  scenarios,
}: {
  roiModel: RoiModelCategory[];
  scenarios: ScenarioRow[];
}) {
  const router = useRouter();

  const categoryOptions = useMemo(
    () => (roiModel.length > 0 ? roiModel.map((m) => m.category) : ["Electronics"]),
    [roiModel],
  );

  // Restore last scenario if persisted; otherwise sane defaults.
  const last = scenarios.find((s) => !s.is_baseline) ?? scenarios[0];
  const persistedBaseline = scenarios.find((s) => s.is_baseline);

  const [category, setCategory] = useState(last?.category ?? categoryOptions[0]);
  const [depth, setDepth] = useState(last?.depth ?? "15%");
  const [duration, setDuration] = useState(last?.duration ?? "5 days");
  const [channel, setChannel] = useState(last?.channel ?? "Online");

  const [submitted, setSubmitted] = useState<ScenarioInputs>({
    category: last?.category ?? categoryOptions[0],
    depth: last?.depth ?? "15%",
    duration: last?.duration ?? "5 days",
    channel: last?.channel ?? "Online",
  });

  const [baseline, setBaseline] = useState<PinnedScenario | null>(
    persistedBaseline ? rowToPinned(persistedBaseline) : null,
  );
  const [pinning, setPinning] = useState(false);
  const [simulating, setSimulating] = useState(false);

  const result = useMemo(() => simulate(submitted, roiModel), [submitted, roiModel]);

  // If the model changes (e.g. user retunes in Settings), recompute already-pinned baseline
  // so deltas stay consistent with the active model.
  useEffect(() => {
    if (baseline) {
      setBaseline({ inputs: baseline.inputs, result: simulate(baseline.inputs, roiModel) });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roiModel]);

  async function persistScenario(
    inputs: ScenarioInputs,
    res: ScenarioResult,
    isBaseline: boolean,
  ) {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    if (isBaseline) {
      // Only one baseline per user — clear previous, then insert.
      await supabase
        .from("promotions_scenarios")
        .delete()
        .eq("user_id", session.user.id)
        .eq("is_baseline", true);
    }
    await supabase.from("promotions_scenarios").insert({
      user_id: session.user.id,
      category: inputs.category,
      depth: inputs.depth,
      duration: inputs.duration,
      channel: inputs.channel,
      gmv_uplift: res.gmvUplift,
      incremental_orders: res.incrementalOrders,
      cannibalization_pct: res.cannibalizationPct,
      net_roi: res.netRoi,
      healthy: res.healthy,
      is_baseline: isBaseline,
    });
  }

  async function handleSimulate() {
    const next: ScenarioInputs = { category, depth, duration, channel };
    setSubmitted(next);
    setSimulating(true);
    try {
      await persistScenario(next, simulate(next, roiModel), false);
      router.invalidate();
    } finally {
      setSimulating(false);
    }
  }

  async function handlePinBaseline() {
    setPinning(true);
    try {
      const pinned: PinnedScenario = { inputs: submitted, result };
      setBaseline(pinned);
      await persistScenario(submitted, result, true);
      router.invalidate();
    } finally {
      setPinning(false);
    }
  }

  async function handleClearBaseline() {
    setPinning(true);
    try {
      setBaseline(null);
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        await supabase
          .from("promotions_scenarios")
          .delete()
          .eq("user_id", session.user.id)
          .eq("is_baseline", true);
      }
      router.invalidate();
    } finally {
      setPinning(false);
    }
  }

  const compareMode = baseline !== null;

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
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 600, color: "#1A1A18" }}>Campaign ROI simulator</div>
          <div style={{ fontSize: 12, color: "#6B6B6B", marginTop: 4 }}>
            Predict the impact of a promotion before you launch it
          </div>
        </div>
        {compareMode && baseline && (
          <div
            style={{
              fontSize: 11,
              color: "#6B6B6B",
              backgroundColor: "#FAFAF9",
              border: "1px solid #E5E2DB",
              borderRadius: 8,
              padding: "8px 12px",
              display: "flex",
              alignItems: "center",
              gap: 8,
              maxWidth: "100%",
            }}
          >
            <Pin size={12} color="#EA580C" />
            <span>
              Baseline: {baseline.inputs.category} · {baseline.inputs.depth} · {baseline.inputs.duration} · {baseline.inputs.channel}
            </span>
          </div>
        )}
      </div>

      <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginTop: 14 }}>
        <Field label="Category" value={category} onChange={setCategory} options={categoryOptions} />
        <Field label="Discount depth" value={depth} onChange={setDepth} options={DEPTH_OPTIONS} />
        <Field label="Duration" value={duration} onChange={setDuration} options={DURATION_OPTIONS} />
        <Field label="Channel" value={channel} onChange={setChannel} options={CHANNEL_OPTIONS} />
      </div>

      <div style={{ marginTop: 14, display: "flex", gap: 10, flexWrap: "wrap" }}>
        <button
          onClick={handleSimulate}
          disabled={simulating}
          onMouseEnter={(e) => {
            if (!simulating) e.currentTarget.style.backgroundColor = "#C2410C";
          }}
          onMouseLeave={(e) => {
            if (!simulating) e.currentTarget.style.backgroundColor = "#EA580C";
          }}
          style={{
            backgroundColor: "#EA580C",
            color: "#FFFFFF",
            fontSize: 13,
            fontWeight: 600,
            padding: "10px 24px",
            borderRadius: 8,
            border: "none",
            cursor: simulating ? "not-allowed" : "pointer",
            opacity: simulating ? 0.7 : 1,
            transition: "background-color 150ms ease",
          }}
        >
          {simulating ? "Simulating…" : "Simulate"}
        </button>

        {!compareMode ? (
          <button
            onClick={handlePinBaseline}
            disabled={pinning}
            style={{
              backgroundColor: "#FFFFFF",
              color: "#EA580C",
              fontSize: 13,
              fontWeight: 600,
              padding: "10px 18px",
              borderRadius: 8,
              border: "1px solid #EA580C",
              cursor: pinning ? "not-allowed" : "pointer",
              opacity: pinning ? 0.6 : 1,
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <Pin size={14} />
            Pin as baseline
          </button>
        ) : (
          <button
            onClick={handleClearBaseline}
            disabled={pinning}
            style={{
              backgroundColor: "#FFFFFF",
              color: "#6B6B6B",
              fontSize: 13,
              fontWeight: 600,
              padding: "10px 18px",
              borderRadius: 8,
              border: "1px solid #E5E2DB",
              cursor: pinning ? "not-allowed" : "pointer",
              opacity: pinning ? 0.6 : 1,
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <PinOff size={14} />
            Exit compare
          </button>
        )}
      </div>

      <div
        style={{
          marginTop: 20,
          backgroundColor: "#FAFAF9",
          borderRadius: 10,
          padding: "22px 26px",
        }}
      >
        {compareMode && baseline ? (
          <CompareTiles baseline={baseline.result} current={result} />
        ) : (
          <ResultTiles result={result} />
        )}

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

        {compareMode && baseline && (
          <div
            style={{
              marginTop: 12,
              fontSize: 11,
              color: "#9A9A9A",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <span>{baseline.inputs.category} · {baseline.inputs.depth} · {baseline.inputs.duration}</span>
            <ArrowRight size={12} />
            <span style={{ color: "#1A1A18", fontWeight: 600 }}>
              {submitted.category} · {submitted.depth} · {submitted.duration}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
