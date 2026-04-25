// Plans & Usage Costs (Week 5)
//
// Lets a licensee:
//   1. Pick a plan tier (Starter / Growth / Scale).
//   2. See projected monthly cost based on actual API usage (pulled from
//      api_request_logs over the last 30 days, then extrapolated).
//   3. Compare what they'd pay on each tier.
//
// This is purely presentation + a small client-side calculator. No DB writes,
// no billing wired up — selecting a plan persists locally only.

import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Check, Sparkles, Zap, Building2, AlertTriangle, ArrowUpRight } from "lucide-react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/dashboard/plans")({
  head: () => ({ meta: [{ title: "Plans & Usage Costs | PrizeSkout" }] }),
  component: PlansPage,
});

type PlanId = "starter" | "growth" | "scale";

type Plan = {
  id: PlanId;
  name: string;
  tagline: string;
  basePrice: number; // QAR / month
  includedCalls: number; // included API calls / month
  overagePerCall: number; // QAR per call beyond included
  features: string[];
  icon: typeof Sparkles;
  accent: string;
};

const PLANS: Plan[] = [
  {
    id: "starter",
    name: "Starter",
    tagline: "For teams piloting the API",
    basePrice: 1499,
    includedCalls: 50_000,
    overagePerCall: 0.04,
    icon: Sparkles,
    accent: "#3B82F6",
    features: [
      "50,000 API calls / month included",
      "Pricing engine + competitor data",
      "1 webhook endpoint",
      "Email support",
    ],
  },
  {
    id: "growth",
    name: "Growth",
    tagline: "For brands scaling decisioning",
    basePrice: 4999,
    includedCalls: 250_000,
    overagePerCall: 0.025,
    icon: Zap,
    accent: "#EA580C",
    features: [
      "250,000 API calls / month included",
      "All Starter features",
      "5 webhook endpoints",
      "Field Intel + Promotions modules",
      "Priority support (8h SLA)",
    ],
  },
  {
    id: "scale",
    name: "Scale",
    tagline: "For category leaders",
    basePrice: 12_999,
    includedCalls: 1_000_000,
    overagePerCall: 0.015,
    icon: Building2,
    accent: "#1A1A18",
    features: [
      "1,000,000 API calls / month included",
      "All Growth features",
      "Unlimited webhook endpoints",
      "Custom benchmarks + dedicated CSM",
      "1h SLA, 99.95% uptime",
    ],
  },
];

const STORAGE_KEY = "prizeskout.selected_plan";

function PlansPage() {
  const [selected, setSelected] = useState<PlanId>(() => {
    if (typeof window === "undefined") return "growth";
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return (stored as PlanId) || "growth";
  });
  const [callsLast30d, setCallsLast30d] = useState<number | null>(null);

  useEffect(() => {
    (async () => {
      const since = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString();
      const { count } = await supabase
        .from("api_request_logs")
        .select("*", { count: "exact", head: true })
        .gte("occurred_at", since);
      setCallsLast30d(count ?? 0);
    })();
  }, []);

  // Persist selection locally.
  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(STORAGE_KEY, selected);
  }, [selected]);

  // Project to a 30-day month. Logs are already a 30-day rolling window so
  // the projection is just the raw count; callers that want strict per-day
  // can swap in a different window.
  const projectedMonthly = callsLast30d ?? 0;

  function costFor(plan: Plan, calls: number) {
    const overage = Math.max(0, calls - plan.includedCalls);
    const overageCost = overage * plan.overagePerCall;
    return {
      base: plan.basePrice,
      overage: overageCost,
      total: plan.basePrice + overageCost,
      overageCalls: overage,
    };
  }

  const summary = useMemo(() => {
    return PLANS.map((p) => ({ plan: p, cost: costFor(p, projectedMonthly) }));
  }, [projectedMonthly]);

  const selectedPlan = PLANS.find((p) => p.id === selected)!;
  const selectedCost = costFor(selectedPlan, projectedMonthly);

  return (
    <DashboardLayout
      title="Plans & Usage Costs"
      subtitle="Pick a plan and see your projected monthly cost based on real API usage."
      helpItems={[
        "Projected usage is your last 30 days of API calls across all keys (test + live).",
        "Overage is billed per call beyond the plan's included volume.",
        "Selecting a plan here is informational — billing is handled separately by your CSM.",
      ]}
    >
      {/* Usage callout */}
      <div
        style={{
          backgroundColor: "#fff",
          border: "1px solid #E5E2DB",
          borderRadius: 12,
          padding: 18,
          marginBottom: 20,
          display: "flex",
          flexWrap: "wrap",
          gap: 24,
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div>
          <div
            style={{
              fontSize: 11,
              color: "#8A8A8A",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              fontWeight: 600,
            }}
          >
            Projected monthly usage
          </div>
          <div style={{ fontSize: 28, fontWeight: 700, color: "#1A1A18", marginTop: 4 }}>
            {callsLast30d === null ? "…" : projectedMonthly.toLocaleString()}{" "}
            <span style={{ fontSize: 14, fontWeight: 500, color: "#6B6B6B" }}>API calls</span>
          </div>
          <div style={{ fontSize: 12, color: "#8A8A8A", marginTop: 4 }}>
            Based on the last 30 days of traffic.
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div
            style={{
              fontSize: 11,
              color: "#8A8A8A",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              fontWeight: 600,
            }}
          >
            On <span style={{ color: selectedPlan.accent }}>{selectedPlan.name}</span> you'd pay
          </div>
          <div style={{ fontSize: 28, fontWeight: 700, color: "#1A1A18", marginTop: 4 }}>
            QAR {selectedCost.total.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            <span style={{ fontSize: 14, fontWeight: 500, color: "#6B6B6B" }}> / month</span>
          </div>
          <div style={{ fontSize: 12, color: "#8A8A8A", marginTop: 4 }}>
            Base QAR {selectedCost.base.toLocaleString()} ·{" "}
            {selectedCost.overageCalls > 0
              ? `+${selectedCost.overageCalls.toLocaleString()} overage calls @ QAR ${selectedPlan.overagePerCall}`
              : "no overage"}
          </div>
        </div>
      </div>

      {/* Plan cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
          gap: 16,
          marginBottom: 24,
        }}
      >
        {summary.map(({ plan, cost }) => {
          const isSelected = plan.id === selected;
          const Icon = plan.icon;
          return (
            <button
              key={plan.id}
              type="button"
              onClick={() => setSelected(plan.id)}
              aria-pressed={isSelected}
              style={{
                textAlign: "left",
                backgroundColor: "#fff",
                border: `2px solid ${isSelected ? plan.accent : "#E5E2DB"}`,
                borderRadius: 12,
                padding: 20,
                cursor: "pointer",
                transition: "border-color 0.15s, box-shadow 0.15s",
                boxShadow: isSelected ? `0 0 0 4px ${plan.accent}15` : "none",
                display: "flex",
                flexDirection: "column",
                gap: 12,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 8,
                    backgroundColor: `${plan.accent}15`,
                    color: plan.accent,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Icon size={18} />
                </div>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: "#1A1A18" }}>{plan.name}</div>
                  <div style={{ fontSize: 12, color: "#8A8A8A" }}>{plan.tagline}</div>
                </div>
              </div>

              <div>
                <div style={{ fontSize: 24, fontWeight: 700, color: "#1A1A18" }}>
                  QAR {plan.basePrice.toLocaleString()}
                  <span style={{ fontSize: 13, fontWeight: 500, color: "#6B6B6B" }}> / month</span>
                </div>
                <div style={{ fontSize: 12, color: "#6B6B6B", marginTop: 2 }}>
                  {plan.includedCalls.toLocaleString()} calls included · QAR {plan.overagePerCall}{" "}
                  per extra call
                </div>
              </div>

              {/* Projected cost on this plan */}
              <div
                style={{
                  backgroundColor: "#FAFAF9",
                  border: "1px solid #E5E2DB",
                  borderRadius: 8,
                  padding: 10,
                  fontSize: 12,
                  color: "#1A1A18",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "#6B6B6B" }}>Your projected cost</span>
                  <span style={{ fontWeight: 700 }}>
                    QAR {cost.total.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </span>
                </div>
                <div
                  style={{ display: "flex", justifyContent: "space-between", marginTop: 4, color: "#8A8A8A" }}
                >
                  <span>Overage</span>
                  <span>
                    {cost.overageCalls > 0
                      ? `+QAR ${cost.overage.toLocaleString(undefined, { maximumFractionDigits: 0 })}`
                      : "—"}
                  </span>
                </div>
              </div>

              <ul style={{ display: "flex", flexDirection: "column", gap: 6, margin: 0, padding: 0, listStyle: "none" }}>
                {plan.features.map((f) => (
                  <li
                    key={f}
                    style={{ display: "flex", gap: 8, fontSize: 13, color: "#1A1A18", alignItems: "flex-start" }}
                  >
                    <Check size={14} color={plan.accent} style={{ marginTop: 3, flexShrink: 0 }} />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>

              <div
                style={{
                  marginTop: "auto",
                  fontSize: 12,
                  fontWeight: 600,
                  color: isSelected ? plan.accent : "#6B6B6B",
                }}
              >
                {isSelected ? "✓ Selected" : "Select this plan"}
              </div>
            </button>
          );
        })}
      </div>

      {/* Comparison table */}
      <div
        style={{
          backgroundColor: "#fff",
          border: "1px solid #E5E2DB",
          borderRadius: 12,
          padding: 16,
        }}
      >
        <div style={{ fontSize: 13, fontWeight: 600, color: "#1A1A18", marginBottom: 12 }}>
          Cost breakdown at your current usage
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid #E5E2DB" }}>
                <Th>Plan</Th>
                <Th align="right">Base</Th>
                <Th align="right">Included</Th>
                <Th align="right">Overage calls</Th>
                <Th align="right">Overage cost</Th>
                <Th align="right">Total / mo</Th>
              </tr>
            </thead>
            <tbody>
              {summary.map(({ plan, cost }) => (
                <tr key={plan.id} style={{ borderBottom: "1px solid #F1EFEA" }}>
                  <Td>
                    <span style={{ fontWeight: 600, color: plan.accent }}>{plan.name}</span>
                  </Td>
                  <Td align="right">QAR {plan.basePrice.toLocaleString()}</Td>
                  <Td align="right">{plan.includedCalls.toLocaleString()}</Td>
                  <Td align="right">
                    {cost.overageCalls > 0 ? cost.overageCalls.toLocaleString() : "—"}
                  </Td>
                  <Td align="right">
                    {cost.overageCalls > 0
                      ? `QAR ${cost.overage.toLocaleString(undefined, { maximumFractionDigits: 0 })}`
                      : "—"}
                  </Td>
                  <Td align="right">
                    <strong>
                      QAR {cost.total.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </strong>
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardLayout>
  );
}

function Th({ children, align }: { children: React.ReactNode; align?: "right" }) {
  return (
    <th
      style={{
        textAlign: align ?? "left",
        padding: "8px 10px",
        fontSize: 11,
        textTransform: "uppercase",
        letterSpacing: "0.05em",
        color: "#8A8A8A",
        fontWeight: 600,
      }}
    >
      {children}
    </th>
  );
}

function Td({ children, align }: { children: React.ReactNode; align?: "right" }) {
  return (
    <td style={{ textAlign: align ?? "left", padding: "10px", color: "#1A1A18" }}>{children}</td>
  );
}
