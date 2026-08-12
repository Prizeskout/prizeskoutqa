import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ArrowRight, CheckCircle, AlertTriangle, ChevronDown, TrendingUp, Shield, Sparkles } from "lucide-react";
import { MarketingShell } from "@/components/marketing/MarketingShell";

export const Route = createFileRoute("/roi-calculator")({
  head: () => ({
    meta: [
      { title: "ROI calculator | PrizeSkout" },
      {
        name: "description",
        content: "See how much margin you're losing to competitor moves you don't track, and what continuous pricing intelligence is worth to your category. Free, no signup.",
      },
      { property: "og:title", content: "ROI calculator | PrizeSkout" },
      {
        property: "og:description",
        content: "See how much margin you're losing to competitor moves you don't track. Free, no signup.",
      },
    ],
  }),
  component: RoiCalculatorPage,
});

/* ============================================================================
   Pure ROI math — no auth, no DB. Built so any visitor can try it.
   Inputs: monthly category revenue, gross margin %, competitor channels tracked,
   how often you currently check pricing, and assortment size.
   Outputs: estimated annual margin recovery, payback in days, confidence band.
   ========================================================================= */

type Inputs = {
  monthlyRevenue: number;     // QAR
  grossMarginPct: number;     // 0..100
  skus: number;
  channelsTracked: number;    // 1..6
  checkFrequency: "daily" | "weekly" | "monthly" | "rarely";
};

type Result = {
  annualRevenue: number;
  annualMargin: number;
  marginLeakPct: number;       // 0..1 of margin lost today
  recoveryRatePct: number;     // 0..1 of leak we can recover
  annualRecovery: number;      // QAR
  monthlyRecovery: number;
  paybackDays: number;
  confidence: "high" | "medium" | "low";
};

// Empirical-ish leak by check frequency. Sources: industry benchmarks for
// competitive price response in retail (3-7% margin erosion when prices are
// not actively monitored, dropping below 1% with daily monitoring).
const LEAK_BY_FREQ: Record<Inputs["checkFrequency"], number> = {
  daily: 0.012,
  weekly: 0.028,
  monthly: 0.052,
  rarely: 0.072,
};

// Channel coverage gap penalty. Each unmonitored channel widens the leak.
function channelGapMultiplier(tracked: number) {
  // Assume 6 reasonable channels in a market like Qatar
  const gap = Math.max(0, 6 - tracked) / 6;
  return 1 + gap * 0.45;
}

// Assortment complexity penalty. Larger catalogs leak more without tooling.
function assortmentMultiplier(skus: number) {
  if (skus < 200) return 0.85;
  if (skus < 1000) return 1.0;
  if (skus < 5000) return 1.15;
  return 1.3;
}

// What fraction of the leak we can realistically recover with continuous tracking.
function recoveryRate(freq: Inputs["checkFrequency"]) {
  switch (freq) {
    case "daily": return 0.35;     // Already disciplined, smaller delta
    case "weekly": return 0.55;
    case "monthly": return 0.70;
    case "rarely": return 0.78;    // Largest delta from going from blind to live
  }
}

// PrizeSkout monthly subscription estimate (used for payback math).
// Tied to assortment size, mirroring our pricing tiers loosely.
function estimateMonthlyCost(skus: number) {
  if (skus < 500) return 1200;       // Starter
  if (skus < 2500) return 3200;      // Growth
  if (skus < 10000) return 6800;     // Scale
  return 11500;                      // Enterprise floor
}

function calculate(inputs: Inputs): Result {
  const annualRevenue = inputs.monthlyRevenue * 12;
  const annualMargin = annualRevenue * (inputs.grossMarginPct / 100);
  const baseLeak = LEAK_BY_FREQ[inputs.checkFrequency];
  const marginLeakPct = Math.min(
    0.12,
    baseLeak * channelGapMultiplier(inputs.channelsTracked) * assortmentMultiplier(inputs.skus),
  );
  const recoveryRatePct = recoveryRate(inputs.checkFrequency);
  const annualRecovery = Math.max(0, annualMargin * marginLeakPct * recoveryRatePct);
  const monthlyRecovery = annualRecovery / 12;
  const monthlyCost = estimateMonthlyCost(inputs.skus);
  const paybackDays = monthlyRecovery > 0
    ? Math.max(1, Math.round((monthlyCost / monthlyRecovery) * 30))
    : 999;
  const confidence: Result["confidence"] =
    inputs.monthlyRevenue >= 200000 && inputs.skus >= 200 ? "high"
    : inputs.monthlyRevenue >= 50000 ? "medium"
    : "low";
  return {
    annualRevenue,
    annualMargin,
    marginLeakPct,
    recoveryRatePct,
    annualRecovery,
    monthlyRecovery,
    paybackDays,
    confidence,
  };
}

function formatQar(n: number): string {
  if (n >= 1_000_000) return `QAR ${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `QAR ${(n / 1_000).toFixed(n >= 10_000 ? 0 : 1)}K`;
  return `QAR ${Math.round(n).toLocaleString()}`;
}

/* ============================================================================
   UI
   ========================================================================= */

function NumberField({
  label, value, onChange, min, max, step, suffix, prefix,
}: {
  label: string; value: number; onChange: (n: number) => void;
  min?: number; max?: number; step?: number; suffix?: string; prefix?: string;
}) {
  return (
    <div>
      <label style={{ display: "block", fontSize: 12, fontWeight: 500, color: "#9A9A9A", marginBottom: 8 }}>
        {label}
      </label>
      <div style={{ position: "relative" }}>
        {prefix && (
          <span style={{
            position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)",
            fontSize: 13, color: "#6B6B6B", fontWeight: 500, pointerEvents: "none",
          }}>{prefix}</span>
        )}
        <input
          type="number"
          value={value}
          min={min}
          max={max}
          step={step}
          onChange={(e) => onChange(Number(e.target.value) || 0)}
          style={{
            width: "100%",
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.10)",
            borderRadius: 10,
            padding: prefix ? "12px 16px 12px 50px" : "12px 16px",
            paddingRight: suffix ? 50 : 16,
            fontSize: 14,
            fontWeight: 500,
            color: "#FAFAF9",
            outline: "none",
            transition: "border-color 0.15s",
            fontVariantNumeric: "tabular-nums",
          }}
          onFocus={(e) => (e.currentTarget.style.borderColor = "rgba(234,88,12,0.55)")}
          onBlur={(e) => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.10)")}
        />
        {suffix && (
          <span style={{
            position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)",
            fontSize: 13, color: "#6B6B6B", fontWeight: 500, pointerEvents: "none",
          }}>{suffix}</span>
        )}
      </div>
    </div>
  );
}

function SelectField<T extends string>({
  label, value, onChange, options,
}: {
  label: string; value: T; onChange: (v: T) => void;
  options: { value: T; label: string }[];
}) {
  return (
    <div>
      <label style={{ display: "block", fontSize: 12, fontWeight: 500, color: "#9A9A9A", marginBottom: 8 }}>
        {label}
      </label>
      <div style={{ position: "relative" }}>
        <select
          value={value}
          onChange={(e) => onChange(e.target.value as T)}
          style={{
            appearance: "none", WebkitAppearance: "none", MozAppearance: "none",
            width: "100%",
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.10)",
            borderRadius: 10,
            padding: "12px 40px 12px 16px",
            fontSize: 14,
            fontWeight: 500,
            color: "#FAFAF9",
            outline: "none",
            cursor: "pointer",
          }}
          onFocus={(e) => (e.currentTarget.style.borderColor = "rgba(234,88,12,0.55)")}
          onBlur={(e) => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.10)")}
        >
          {options.map((o) => (
            <option key={o.value} value={o.value} style={{ background: "#0A0A0A", color: "#FAFAF9" }}>
              {o.label}
            </option>
          ))}
        </select>
        <ChevronDown size={14} color="#9A9A9A" style={{
          position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", pointerEvents: "none",
        }} />
      </div>
    </div>
  );
}

function ChannelToggle({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  const channels = ["Snoonu", "Talabat", "Carrefour", "Lulu", "Amazon.ae", "Noon"];
  // Treat "tracked" as a count from 0..6; let users click pills to set it.
  return (
    <div>
      <label style={{ display: "block", fontSize: 12, fontWeight: 500, color: "#9A9A9A", marginBottom: 8 }}>
        Channels you actively track today
      </label>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {channels.map((c, i) => {
          const active = i < value;
          return (
            <button
              key={c}
              type="button"
              onClick={() => onChange(active && i === value - 1 ? i : i + 1)}
              style={{
                fontSize: 12,
                fontWeight: 500,
                padding: "8px 14px",
                borderRadius: 999,
                border: `1px solid ${active ? "rgba(234,88,12,0.55)" : "rgba(255,255,255,0.10)"}`,
                background: active ? "rgba(234,88,12,0.12)" : "rgba(255,255,255,0.03)",
                color: active ? "#FB923C" : "#8A8A8A",
                cursor: "pointer",
                transition: "all 0.15s",
              }}
            >
              {c}
            </button>
          );
        })}
      </div>
      <p style={{ fontSize: 11, color: "#5C5C5C", marginTop: 8 }}>
        Tap to add. {value} of 6 channels selected.
      </p>
    </div>
  );
}

function ResultCard({ result }: { result: Result }) {
  const healthy = result.annualRecovery > 0;
  return (
    <div style={{
      background: "linear-gradient(180deg, rgba(234,88,12,0.08), rgba(234,88,12,0.02))",
      border: "1px solid rgba(234,88,12,0.25)",
      borderRadius: 16,
      padding: 28,
      position: "sticky",
      top: 96,
    }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: "#EA580C", textTransform: "uppercase", letterSpacing: "0.08em" }}>
        Estimated impact
      </div>

      <div style={{ marginTop: 14 }}>
        <div style={{ fontSize: 12, color: "#8A8A8A", marginBottom: 6 }}>
          Annual margin we estimate you'll recover
        </div>
        <div style={{
          fontSize: 44, fontWeight: 700, lineHeight: 1.05,
          background: "linear-gradient(90deg, #EA580C, #FB923C)",
          WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
          fontVariantNumeric: "tabular-nums",
        }}>
          {formatQar(result.annualRecovery)}
        </div>
        <div style={{ fontSize: 13, color: "#8A8A8A", marginTop: 6 }}>
          Roughly {formatQar(result.monthlyRecovery)} every month
        </div>
      </div>

      <div style={{ marginTop: 22, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <div style={{
          background: "rgba(0,0,0,0.3)",
          border: "1px solid rgba(255,255,255,0.05)",
          borderRadius: 10,
          padding: "14px 16px",
        }}>
          <div style={{ fontSize: 10, color: "#6B6B6B", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600 }}>
            Margin leak today
          </div>
          <div style={{ fontSize: 22, fontWeight: 700, color: "#EF4444", marginTop: 6, fontVariantNumeric: "tabular-nums" }}>
            {(result.marginLeakPct * 100).toFixed(1)}%
          </div>
        </div>
        <div style={{
          background: "rgba(0,0,0,0.3)",
          border: "1px solid rgba(255,255,255,0.05)",
          borderRadius: 10,
          padding: "14px 16px",
        }}>
          <div style={{ fontSize: 10, color: "#6B6B6B", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600 }}>
            Payback in
          </div>
          <div style={{ fontSize: 22, fontWeight: 700, color: "#22C55E", marginTop: 6, fontVariantNumeric: "tabular-nums" }}>
            {result.paybackDays < 365 ? `${result.paybackDays} days` : "12+ mo"}
          </div>
        </div>
      </div>

      <div style={{
        marginTop: 18,
        background: healthy ? "rgba(34, 197, 94, 0.06)" : "rgba(245, 158, 11, 0.06)",
        border: `1px solid ${healthy ? "rgba(34, 197, 94, 0.2)" : "rgba(245, 158, 11, 0.25)"}`,
        borderRadius: 10,
        padding: "12px 14px",
        display: "flex",
        gap: 10,
        alignItems: "flex-start",
      }}>
        {healthy
          ? <CheckCircle size={16} color="#22C55E" style={{ flexShrink: 0, marginTop: 2 }} />
          : <AlertTriangle size={16} color="#F59E0B" style={{ flexShrink: 0, marginTop: 2 }} />}
        <div style={{ fontSize: 12, color: "#9A9A9A", lineHeight: 1.55 }}>
          {healthy
            ? `Confidence: ${result.confidence}. Estimate based on industry benchmarks for unmonitored competitive response. Your actual recovery depends on category elasticity and how quickly you act on signals.`
            : "Plug in your real numbers to see the impact. The defaults assume a small operation with healthy monitoring already in place."}
        </div>
      </div>

      <Link
        to="/signup"
        style={{
          marginTop: 22,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          background: "linear-gradient(135deg, #EA580C, #C2410C)",
          color: "#FFF",
          fontSize: 14,
          fontWeight: 600,
          padding: "14px 26px",
          borderRadius: 10,
          textDecoration: "none",
          boxShadow: "0 12px 30px rgba(234,88,12,0.35)",
          transition: "transform 0.15s, box-shadow 0.15s",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = "translateY(-1px)";
          e.currentTarget.style.boxShadow = "0 16px 40px rgba(234,88,12,0.45)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = "translateY(0)";
          e.currentTarget.style.boxShadow = "0 12px 30px rgba(234,88,12,0.35)";
        }}
      >
        Get started with PrizeSkout
        <ArrowRight size={14} />
      </Link>
      <p style={{ fontSize: 11, color: "#6B6B6B", textAlign: "center", marginTop: 10 }}>
        Connect your store and start protecting your margins.
      </p>
    </div>
  );
}

function RoiCalculatorPage() {
  const [inputs, setInputs] = useState<Inputs>({
    monthlyRevenue: 850000,
    grossMarginPct: 28,
    skus: 1500,
    channelsTracked: 2,
    checkFrequency: "weekly",
  });
  const result = useMemo(() => calculate(inputs), [inputs]);

  return (
    <MarketingShell>
      {/* Hero */}
      <section style={{
        position: "relative",
        background: "#050505",
        paddingTop: 80,
        paddingBottom: 40,
        overflow: "hidden",
      }} className="px-5 md:px-10">
        <div aria-hidden style={{
          position: "absolute", top: -200, left: "50%", transform: "translateX(-50%)",
          width: 1100, height: 700,
          background: "radial-gradient(ellipse at center, rgba(234,88,12,0.28) 0%, rgba(234,88,12,0.08) 30%, rgba(5,5,5,0) 65%)",
          filter: "blur(40px)", pointerEvents: "none", zIndex: 0,
        }} />
        <div style={{ position: "relative", zIndex: 1, maxWidth: 880, margin: "0 auto", textAlign: "center" }}>
          <p style={{
            fontSize: 11, fontWeight: 600, color: "#EA580C", textTransform: "uppercase",
            letterSpacing: "0.1em", margin: 0,
          }}>
            ROI calculator
          </p>
          <h1 style={{
            margin: "16px 0 0",
            fontSize: "clamp(32px, 5vw, 52px)",
            fontWeight: 700,
            color: "#FAFAF9",
            lineHeight: 1.05,
            letterSpacing: "-0.02em",
          }}>
            How much margin are you{" "}
            <span style={{
              background: "linear-gradient(90deg, #EA580C, #FB923C)",
              WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
            }}>
              leaving on the shelf?
            </span>
          </h1>
          <p style={{
            marginTop: 18, color: "#9A9A9A", fontSize: 16, lineHeight: 1.6,
            maxWidth: 620, margin: "18px auto 0",
          }}>
            Most category teams lose 3 to 7 percent of their margin every year to competitor moves they spot too late.
            Plug in your numbers and see what continuous tracking is worth to your team.
          </p>
        </div>
      </section>

      {/* Calculator */}
      <section style={{ background: "#050505", padding: "40px 20px 100px" }} className="px-5 md:px-10">
        <div style={{
          maxWidth: 1180, margin: "0 auto",
          display: "grid",
          gap: 32,
          gridTemplateColumns: "1fr",
        }} className="ps-roi-grid">
          {/* Inputs */}
          <div style={{
            background: "rgba(15,15,15,0.6)",
            border: "1px solid rgba(255,255,255,0.06)",
            borderRadius: 16,
            padding: 28,
          }}>
            <h2 style={{ fontSize: 18, fontWeight: 600, color: "#FAFAF9", margin: 0 }}>
              Tell us about your category
            </h2>
            <p style={{ fontSize: 13, color: "#8A8A8A", marginTop: 6 }}>
              All inputs stay in your browser. We don't save anything.
            </p>

            <div style={{ marginTop: 24, display: "flex", flexDirection: "column", gap: 18 }}>
              <NumberField
                label="Monthly category revenue"
                value={inputs.monthlyRevenue}
                onChange={(v) => setInputs({ ...inputs, monthlyRevenue: v })}
                min={0}
                step={10000}
                prefix="QAR"
              />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
                <NumberField
                  label="Gross margin"
                  value={inputs.grossMarginPct}
                  onChange={(v) => setInputs({ ...inputs, grossMarginPct: Math.min(80, Math.max(0, v)) })}
                  min={0}
                  max={80}
                  step={1}
                  suffix="%"
                />
                <NumberField
                  label="Active SKUs"
                  value={inputs.skus}
                  onChange={(v) => setInputs({ ...inputs, skus: v })}
                  min={0}
                  step={50}
                />
              </div>
              <ChannelToggle
                value={inputs.channelsTracked}
                onChange={(n) => setInputs({ ...inputs, channelsTracked: n })}
              />
              <SelectField
                label="How often does someone manually check competitor pricing?"
                value={inputs.checkFrequency}
                onChange={(v) => setInputs({ ...inputs, checkFrequency: v })}
                options={[
                  { value: "daily", label: "Daily, by a dedicated analyst" },
                  { value: "weekly", label: "Weekly, as part of a routine" },
                  { value: "monthly", label: "Monthly, when we have time" },
                  { value: "rarely", label: "Rarely, only when something feels off" },
                ]}
              />
            </div>

            {/* Method note */}
            <div style={{
              marginTop: 24,
              borderTop: "1px solid rgba(255,255,255,0.06)",
              paddingTop: 18,
            }}>
              <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                <Shield size={14} color="#6B6B6B" style={{ flexShrink: 0, marginTop: 2 }} />
                <p style={{ fontSize: 12, color: "#6B6B6B", lineHeight: 1.6, margin: 0 }}>
                  How we estimate: industry studies put margin erosion from unmonitored
                  competitive pricing at 3 to 7 percent annually. We adjust for your check
                  frequency, channel coverage, and assortment size, then assume continuous
                  tracking recovers a realistic share of that leak.
                </p>
              </div>
            </div>
          </div>

          {/* Result */}
          <div>
            <ResultCard result={result} />
          </div>
        </div>

        {/* Trust strip */}
        <div style={{
          maxWidth: 1180, margin: "60px auto 0",
          display: "grid", gap: 18,
          gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
        }}>
          {[
            { Icon: TrendingUp, title: "Recovers what you can't see", body: "Live signals on every channel you sell on, so price moves never sit unanswered for days." },
            { Icon: Sparkles, title: "Acts on the right ones", body: "AI ranks moves by margin impact, so your team works the signals that actually move the number." },
            { Icon: Shield, title: "Protects margin first", body: "Recommendations weigh elasticity and cannibalization before suggesting a price change." },
          ].map((b) => (
            <div key={b.title} style={{
              background: "rgba(255,255,255,0.02)",
              border: "1px solid rgba(255,255,255,0.06)",
              borderRadius: 12,
              padding: 20,
            }}>
              <span style={{
                width: 36, height: 36, borderRadius: 8,
                background: "linear-gradient(135deg, #EA580C, #C2410C)",
                display: "inline-flex", alignItems: "center", justifyContent: "center",
                boxShadow: "0 6px 16px rgba(234,88,12,0.3)",
              }}>
                <b.Icon size={16} color="#FFF" />
              </span>
              <div style={{ fontSize: 14, fontWeight: 600, color: "#FAFAF9", marginTop: 14 }}>{b.title}</div>
              <div style={{ fontSize: 13, color: "#8A8A8A", marginTop: 6, lineHeight: 1.55 }}>{b.body}</div>
            </div>
          ))}
        </div>
      </section>

      <style>{`
        @media (min-width: 900px) {
          .ps-roi-grid { grid-template-columns: 1.3fr 1fr !important; gap: 40px !important; }
        }
      `}</style>
    </MarketingShell>
  );
}
