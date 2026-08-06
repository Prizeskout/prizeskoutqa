/**
 * PlanGateModal — shown when a Sandbox user tries to switch to Live mode.
 *
 * New user path:   picks a plan → activatePlan() → live mode unlocked.
 * Payment gateway: replace the onClick handler below with a redirect to
 *                  your payment provider. On successful return, call
 *                  activatePlan(tier) to complete the unlock.
 */
import { X, Check, Zap } from "lucide-react";
import { useModeContext, type PlanTier } from "@/lib/mode-context";
import { useTranslation } from "react-i18next";
import {
  PLAN_PACKAGE_KEYS,
  PLAN_PRICES_QAR_MONTHLY,
  PLANS,
  packageFeatureKeys,
} from "@/lib/plan-config";

type GatePlan = {
  tier: PlanTier;
  name: string;
  price: string;
  priceSub: string;
  tagline: string;
  features: string[];
  highlight?: boolean;
};

export function PlanGateModal() {
  const { t } = useTranslation();
  const { planGateOpen, closePlanGate, activatePlan, activatingPlan } =
    useModeContext();

  const gatePlans: GatePlan[] = PLANS.map((tier) => {
    const price = PLAN_PRICES_QAR_MONTHLY[tier];
    return {
      tier,
      name: t(`plans.${tier}Name`),
      price: price == null ? t("plans.custom") : `QAR ${price.toLocaleString("en-US")}`,
      priceSub: price == null ? "" : t("plans.perMonth"),
      tagline: t(`${PLAN_PACKAGE_KEYS[tier]}.description`),
      features: packageFeatureKeys(tier).map((key) => t(key)),
      highlight: tier === "standard",
    };
  });

  if (!planGateOpen) return null;

  const handleSelect = async (tier: PlanTier) => {
    if (activatingPlan) return;
    // PAYMENT GATEWAY INTEGRATION POINT:
    // Replace this call with: redirect to Stripe/payment provider.
    // On payment success webhook, call activatePlan(tier) server-side,
    // then redirect back here. The modal will close and live mode activates.
    await activatePlan(tier);
  };

  return (
    <>
      {/* Backdrop */}
      <div
        aria-hidden
        onClick={closePlanGate}
        style={{
          position: "fixed",
          inset: 0,
          backgroundColor: "rgba(0,0,0,0.45)",
          zIndex: 200,
        }}
      />

      {/* Modal */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="plan-gate-title"
        style={{
          position: "fixed",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          zIndex: 201,
          width: "min(960px, calc(100vw - 32px))",
          maxHeight: "calc(100vh - 48px)",
          overflowY: "auto",
          backgroundColor: "#FFFFFF",
          borderRadius: 16,
          boxShadow: "0 24px 64px rgba(0,0,0,0.18)",
          padding: "32px 32px 40px",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 16,
            marginBottom: 28,
          }}
        >
          <div>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                fontSize: 11,
                fontWeight: 600,
                color: "#16A34A",
                textTransform: "uppercase",
                letterSpacing: "0.07em",
                marginBottom: 8,
              }}
            >
              <Zap size={12} strokeWidth={2.5} />
              Activate live mode
            </div>
            <h2
              id="plan-gate-title"
              style={{
                fontSize: 22,
                fontWeight: 700,
                color: "#1A1A18",
                margin: 0,
                letterSpacing: "-0.015em",
              }}
            >
              Choose a plan to go live
            </h2>
            <p
              style={{
                fontSize: 14,
                color: "#6B6B6B",
                margin: "6px 0 0",
                lineHeight: 1.5,
              }}
            >
              Sandbox is free forever. Live mode requires a plan to use real
              keys and production data.
            </p>
          </div>
          <button
            type="button"
            onClick={closePlanGate}
            aria-label="Close"
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: 32,
              height: 32,
              borderRadius: 8,
              border: "1px solid #E5E2DB",
              background: "transparent",
              color: "#6B6B6B",
              cursor: "pointer",
              flexShrink: 0,
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Plan cards */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
            gap: 16,
          }}
        >
          {gatePlans.map((p) => (
            <PlanCard
              key={p.tier}
              plan={p}
              onSelect={handleSelect}
              loading={activatingPlan}
            />
          ))}
        </div>

        <p
          style={{
            fontSize: 12,
            color: "#9A9A9A",
            textAlign: "center",
            margin: "24px 0 0",
          }}
        >
          {t("plans.whiteLabelNote")}
        </p>
      </div>
    </>
  );
}

function PlanCard({
  plan,
  onSelect,
  loading,
}: {
  plan: GatePlan;
  onSelect: (tier: PlanTier) => void;
  loading: boolean;
}) {
  const isEnterprise = plan.tier === "enterprise";

  return (
    <div
      style={{
        backgroundColor: plan.highlight ? "#1A1A18" : "#FFFFFF",
        border: plan.highlight ? "none" : "1px solid #E5E2DB",
        borderRadius: 12,
        padding: "24px 22px",
        display: "flex",
        flexDirection: "column",
        position: "relative",
      }}
    >
      {plan.highlight && (
        <div
          style={{
            position: "absolute",
            top: -11,
            left: "50%",
            transform: "translateX(-50%)",
            backgroundColor: "#EA580C",
            color: "#FFFFFF",
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            padding: "3px 12px",
            borderRadius: 999,
            whiteSpace: "nowrap",
          }}
        >
          Most popular
        </div>
      )}

      <div
        style={{
          fontSize: 11,
          fontWeight: 600,
          color: plan.highlight ? "rgba(255,255,255,0.5)" : "#9A9A9A",
          textTransform: "uppercase",
          letterSpacing: "0.07em",
          marginBottom: 6,
        }}
      >
        {plan.name}
      </div>

      <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginBottom: 4 }}>
        <span
          style={{
            fontSize: 30,
            fontWeight: 700,
            color: plan.highlight ? "#FFFFFF" : "#1A1A18",
            letterSpacing: "-0.02em",
          }}
        >
          {plan.price}
        </span>
        {plan.priceSub && (
          <span
            style={{
              fontSize: 13,
              color: plan.highlight ? "rgba(255,255,255,0.5)" : "#9A9A9A",
            }}
          >
            {plan.priceSub}
          </span>
        )}
      </div>

      <p
        style={{
          fontSize: 13,
          color: plan.highlight ? "rgba(255,255,255,0.7)" : "#6B6B6B",
          lineHeight: 1.5,
          margin: "0 0 18px",
        }}
      >
        {plan.tagline}
      </p>

      <ul style={{ listStyle: "none", padding: 0, margin: "0 0 24px", flex: 1 }}>
        {plan.features.map((f) => (
          <li
            key={f}
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: 8,
              fontSize: 13,
              color: plan.highlight ? "rgba(255,255,255,0.85)" : "#3A3A38",
              marginBottom: 8,
              lineHeight: 1.4,
            }}
          >
            <Check
              size={14}
              strokeWidth={2.5}
              style={{
                color: plan.highlight ? "#FFFFFF" : "#16A34A",
                flexShrink: 0,
                marginTop: 1,
              }}
            />
            {f}
          </li>
        ))}
      </ul>

      <button
        type="button"
        disabled={loading}
        onClick={() => onSelect(plan.tier)}
        style={{
          width: "100%",
          padding: "10px 16px",
          borderRadius: 8,
          border: isEnterprise ? "1px solid #E5E2DB" : "none",
          backgroundColor: plan.highlight
            ? "#EA580C"
            : isEnterprise
              ? "transparent"
              : "#1A1A18",
          color: isEnterprise ? "#1A1A18" : "#FFFFFF",
          fontSize: 13,
          fontWeight: 600,
          cursor: loading ? "wait" : "pointer",
          opacity: loading ? 0.7 : 1,
          transition: "opacity 0.15s",
        }}
      >
        {loading
          ? "Activating…"
          : isEnterprise
            ? "Contact us"
            : `Start with ${plan.name}`}
      </button>
    </div>
  );
}
