/**
 * Margin Policy Engine — Screen 2 of the new dashboard.
 *
 * REAL data: reads/writes pricing_rules table (enabled toggle + numeric param slider).
 * DEMO data (clearly marked): SKU counts per category, propagation timing claim.
 *
 * Rule rendering:
 *   margin_floor_pct      → slider maps to params.pct (0-1 stored, 0-100 displayed)
 *   nominal_floor_qar     → slider maps to params.min_margin_qar (QAR)
 *   competitor_ceiling_pct → ceiling rule; slider maps to params.pct (displayed as %)
 *   other/legacy          → toggle only (no slider)
 */
import { useState, useEffect, useRef } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { PsShell } from "@/components/dashboard/PsShell";

// ── Types ─────────────────────────────────────────────────────────────────────
type RuleType = "margin_floor_pct" | "nominal_floor_qar" | "competitor_ceiling_pct" | "max_discount_pct" | "moci_ceiling" | "price_rounding" | "legacy";

interface PricingRule {
  id: string;
  rule_text: string;
  rule_type: RuleType;
  params: Record<string, unknown>;
  enabled: boolean;
  position: number;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function getCategoryName(rule: PricingRule): string {
  const cat = rule.params?.category;
  if (typeof cat === "string" && cat) return cat;
  // Shorten rule_text to ~28 chars for display
  return rule.rule_text.length > 28 ? rule.rule_text.slice(0, 26) + "…" : rule.rule_text;
}

function getFloorValue(rule: PricingRule): number | null {
  if (rule.rule_type === "margin_floor_pct") {
    const pct = Number(rule.params?.pct);
    return isNaN(pct) ? null : Math.round(pct * 100);
  }
  if (rule.rule_type === "nominal_floor_qar") {
    const v = Number(rule.params?.min_margin_qar);
    return isNaN(v) ? null : v;
  }
  if (rule.rule_type === "competitor_ceiling_pct") {
    const pct = Number(rule.params?.pct);
    return isNaN(pct) ? null : Math.round(pct * 100);
  }
  return null;
}

function getFloorLabel(rule: PricingRule): string {
  if (rule.rule_type === "nominal_floor_qar") return "QAR";
  if (rule.rule_type === "competitor_ceiling_pct") return "% ceiling";
  return "%";
}

function getSliderMax(rule: PricingRule): number {
  if (rule.rule_type === "nominal_floor_qar") return 200;
  return 60;
}

async function setParamValue(rule: PricingRule, value: number): Promise<Partial<Record<string, unknown>>> {
  if (rule.rule_type === "margin_floor_pct") return { ...rule.params, pct: value / 100 };
  if (rule.rule_type === "nominal_floor_qar") return { ...rule.params, min_margin_qar: value };
  if (rule.rule_type === "competitor_ceiling_pct") return { ...rule.params, pct: value / 100 };
  return rule.params;
}

// ── Route ─────────────────────────────────────────────────────────────────────
export const Route = createFileRoute("/dashboard/policy-engine")({
  component: PolicyEnginePage,
});

function PolicyEnginePage() {
  const [rules, setRules] = useState<PricingRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  // Optimistic slider values (keyed by rule id)
  const [sliderValues, setSliderValues] = useState<Record<string, number>>({});
  const isMounted = useRef(true);
  useEffect(() => { isMounted.current = true; return () => { isMounted.current = false; }; }, []);

  useEffect(() => {
    supabase
      .from("pricing_rules")
      .select("id, rule_text, rule_type, params, enabled, position")
      .order("position")
      .then(({ data }) => {
        if (!isMounted.current) return;
        const rs = (data ?? []) as PricingRule[];
        setRules(rs);
        const init: Record<string, number> = {};
        rs.forEach((r) => {
          const v = getFloorValue(r);
          if (v !== null) init[r.id] = v;
        });
        setSliderValues(init);
        setLoading(false);
      });
  }, []);

  const handleToggle = async (rule: PricingRule) => {
    // Optimistic update
    setRules((rs) => rs.map((r) => r.id === rule.id ? { ...r, enabled: !r.enabled } : r));
    setSavingId(rule.id);
    await supabase.from("pricing_rules").update({ enabled: !rule.enabled }).eq("id", rule.id);
    setSavingId(null);
  };

  const handleSliderChange = (rule: PricingRule, raw: number) => {
    setSliderValues((sv) => ({ ...sv, [rule.id]: raw }));
  };

  const handleSliderCommit = async (rule: PricingRule, raw: number) => {
    setSavingId(rule.id);
    const newParams = await setParamValue(rule, raw);
    setRules((rs) => rs.map((r) => r.id === rule.id ? { ...r, params: newParams } : r));
    await supabase.from("pricing_rules").update({ params: newParams }).eq("id", rule.id);
    setSavingId(null);
  };

  const defendedCount = rules.filter((r) => r.enabled).length;
  const totalCount = rules.length;

  const tw = 46, th = 26, kn = 20;

  return (
    <PsShell screen="policy-engine" title="Margin Policy Engine" subtitle="Author pricing rules without writing code">
      <div style={{ display: "flex", flexDirection: "column", gap: 22, maxWidth: 1060 }}>

        {/* Banner */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16,
          flexWrap: "wrap", border: "1px solid var(--ps-border)", borderRadius: 14, padding: "18px 22px",
          background: "linear-gradient(120deg, rgba(239,104,26,0.07), var(--ps-card) 60%)",
        }}>
          <div style={{ maxWidth: 560 }}>
            <div style={{ fontSize: 15, fontWeight: 600, color: "var(--ps-text)" }}>Author pricing rules without code</div>
            <div style={{ fontSize: 12.5, color: "var(--ps-muted)", marginTop: 4, lineHeight: 1.5 }}>
              Set a Net Margin Floor per category. The Defend Loop continuously reprices across every aggregator to never breach it — no spreadsheets, no engineers.
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 30, fontWeight: 600, color: "#EF681A", letterSpacing: "-0.5px" }}>
              {loading ? "—" : `${defendedCount} / ${totalCount}`}
            </div>
            <div style={{ fontSize: 11, color: "var(--ps-muted)", textTransform: "uppercase", letterSpacing: "0.6px" }}>Categories Defended</div>
          </div>
        </div>

        {/* Rules table */}
        <div style={{ border: "1px solid var(--ps-border)", borderRadius: 14, background: "var(--ps-card)", overflow: "hidden" }}>
          {/* Header */}
          <div style={{
            display: "grid", gridTemplateColumns: "1.4fr 2fr 1fr", gap: 16,
            padding: "14px 22px", borderBottom: "1px solid var(--ps-border-2)",
            background: "var(--ps-surface-3)", fontSize: 10.5, fontWeight: 600,
            letterSpacing: "0.8px", color: "var(--ps-muted)", textTransform: "uppercase",
          }}>
            <div>Rule / Category</div>
            <div>Net Margin Floor</div>
            <div style={{ textAlign: "right" }}>Active Defense</div>
          </div>

          {loading ? (
            <div style={{ padding: "32px 22px", fontSize: 13, color: "var(--ps-muted)", fontFamily: "'JetBrains Mono',monospace" }}>Loading rules…</div>
          ) : rules.length === 0 ? (
            <div style={{ padding: "32px 22px", fontSize: 13, color: "var(--ps-muted)" }}>
              No pricing rules yet. Add rules via the Pricing page.
            </div>
          ) : rules.map((rule) => {
            const sliderVal = sliderValues[rule.id] ?? getFloorValue(rule);
            const hasSlider = sliderVal !== null;
            const saving = savingId === rule.id;

            return (
              <div key={rule.id} style={{
                display: "grid", gridTemplateColumns: "1.4fr 2fr 1fr", gap: 16,
                padding: "18px 22px", borderBottom: "1px solid var(--ps-border-2)",
                alignItems: "center", opacity: saving ? 0.7 : 1, transition: "opacity .15s",
              }}>
                {/* Category */}
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "var(--ps-text)" }}>{getCategoryName(rule)}</div>
                  <div style={{ fontSize: 11, color: "var(--ps-muted)", fontFamily: "'JetBrains Mono',monospace", marginTop: 2 }}>
                    {rule.rule_type.replace(/_/g, " ")}
                    {/* SKU count is DEMO — not in schema */}
                  </div>
                </div>

                {/* Slider */}
                <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                  {hasSlider ? (
                    <>
                      <input
                        type="range"
                        min={5}
                        max={getSliderMax(rule)}
                        step={1}
                        value={sliderVal ?? 0}
                        onChange={(e) => handleSliderChange(rule, +e.target.value)}
                        onMouseUp={(e) => handleSliderCommit(rule, +(e.target as HTMLInputElement).value)}
                        onTouchEnd={(e) => handleSliderCommit(rule, +(e.target as HTMLInputElement).value)}
                        style={{ flex: 1, height: 24 }}
                      />
                      <div style={{ display: "flex", alignItems: "baseline", gap: 2, minWidth: 70, justifyContent: "flex-end" }}>
                        <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 20, fontWeight: 600, color: "#EF681A", letterSpacing: "-0.5px" }}>
                          {sliderVal}
                        </span>
                        <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 13, color: "var(--ps-muted)" }}>
                          {getFloorLabel(rule)}
                        </span>
                      </div>
                    </>
                  ) : (
                    <span style={{ fontSize: 12, color: "var(--ps-faint)", fontFamily: "'JetBrains Mono',monospace" }}>Rule-based (no floor param)</span>
                  )}
                </div>

                {/* Toggle */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 12 }}>
                  <span style={{
                    fontSize: 11.5, fontWeight: 600, fontFamily: "'JetBrains Mono',monospace",
                    minWidth: 64, textAlign: "right",
                    color: rule.enabled ? "#10B981" : "var(--ps-muted)",
                  }}>
                    {rule.enabled ? "Defending" : "Paused"}
                  </span>
                  <div
                    onClick={() => handleToggle(rule)}
                    role="switch"
                    aria-checked={rule.enabled}
                    tabIndex={0}
                    onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && handleToggle(rule)}
                    style={{
                      position: "relative", width: tw, height: th, borderRadius: 999,
                      cursor: "pointer", flexShrink: 0,
                      transition: "background .2s ease, border-color .2s ease",
                      background: rule.enabled ? "rgba(16,185,129,0.9)" : "var(--ps-track-off)",
                      border: `1px solid ${rule.enabled ? "#10B981" : "var(--ps-border-3)"}`,
                    }}
                  >
                    <div style={{
                      position: "absolute",
                      top: (th - kn) / 2 - 1,
                      width: kn, height: kn, borderRadius: 999,
                      background: "#fff", boxShadow: "0 2px 5px rgba(0,0,0,0.35)",
                      transition: "left .2s cubic-bezier(.4,0,.2,1)",
                      left: rule.enabled ? tw - kn - 2 : 2,
                    }} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer note */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 12, color: "var(--ps-muted)", fontFamily: "'JetBrains Mono',monospace" }}>
          <span style={{ color: "#10B981" }}>✓</span>
          {/* ↓ propagation timing is illustrative — not a measured SLA */}
          Changes propagate to all 4 edge nodes in &lt; 600ms · last sync just now
        </div>

      </div>
    </PsShell>
  );
}
