// Shown when the backend returns HTTP 402 (plan limit exceeded).
//
// Usage:
//   const nextPlan = upgradeTarget(currentPlan);
//   <UpgradeModal
//     open={open}
//     onClose={() => setOpen(false)}
//     currentPlan={currentPlan}
//     resource="products"
//     limit={50}
//   />
//
// Plan names and limits are read from plan-config.ts (SSOT) — never hardcoded here.

import { useTranslation } from "react-i18next";
import { X, ArrowUpRight } from "lucide-react";
import { Link } from "@tanstack/react-router";
import {
  PLAN_LIMITS,
  PLAN_ACCENTS,
  PLANS,
  type Plan,
} from "@/lib/plan-config";

export function upgradeTarget(current: Plan): Plan | null {
  const idx = PLANS.indexOf(current);
  return idx >= 0 && idx < PLANS.length - 1 ? PLANS[idx + 1] : null;
}

interface UpgradeModalProps {
  open: boolean;
  onClose: () => void;
  currentPlan: Plan;
  resource: string;
  limit: number;
}

export function UpgradeModal({ open, onClose, currentPlan, resource, limit }: UpgradeModalProps) {
  const { t } = useTranslation();
  const next   = upgradeTarget(currentPlan);
  const accent = next ? PLAN_ACCENTS[next] : PLAN_ACCENTS.enterprise;

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
    >
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "absolute",
          inset: 0,
          background: "rgba(0,0,0,0.5)",
          backdropFilter: "blur(2px)",
        }}
      />

      {/* Panel */}
      <div
        style={{
          position: "relative",
          backgroundColor: "#fff",
          borderRadius: 16,
          padding: 28,
          maxWidth: 420,
          width: "100%",
          boxShadow: "0 25px 60px rgba(0,0,0,0.18)",
          border: `1px solid ${accent}30`,
        }}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          style={{
            position: "absolute",
            top: 14,
            insetInlineEnd: 14,
            background: "none",
            border: "none",
            cursor: "pointer",
            color: "#9A9A9A",
            padding: 4,
            borderRadius: 6,
            display: "flex",
          }}
          aria-label={t("plans.upgradeModal.dismiss")}
        >
          <X size={16} />
        </button>

        {/* Accent top bar */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: 4,
            background: `linear-gradient(90deg, ${accent}, ${accent}80)`,
            borderRadius: "16px 16px 0 0",
          }}
        />

        <div style={{ marginTop: 8 }}>
          <div style={{ fontSize: 17, fontWeight: 700, color: "#1A1A18", marginBottom: 10 }}>
            {t("plans.upgradeModal.title")}
          </div>
          <p style={{ fontSize: 13.5, color: "#4A4A48", lineHeight: 1.6, marginBottom: 20 }}>
            {t("plans.upgradeModal.desc", {
              plan:        t(`plans.${currentPlan}Name`),
              limit:       String(limit),
              resource,
              upgradePlan: next ? t(`plans.${next}Name`) : t("plans.enterpriseName"),
            })}
          </p>

          {/* Upgrade-plan limits preview */}
          {next && (
            <div
              style={{
                backgroundColor: `${accent}08`,
                border: `1px solid ${accent}30`,
                borderRadius: 10,
                padding: "12px 14px",
                marginBottom: 20,
              }}
            >
              <div style={{ fontSize: 11, fontWeight: 700, color: accent, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>
                {t(`plans.${next}Name`)}
              </div>
              <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                {[
                  { label: t("plans.limit_products"),    value: PLAN_LIMITS[next].maxProducts === -1 ? t("plans.unlimited") : String(PLAN_LIMITS[next].maxProducts) },
                  { label: t("plans.limit_competitors"), value: PLAN_LIMITS[next].maxCompetitorsPerProduct === -1 ? t("plans.unlimited") : String(PLAN_LIMITS[next].maxCompetitorsPerProduct) },
                  { label: t("plans.limit_seats"),       value: PLAN_LIMITS[next].maxSeats === -1 ? t("plans.unlimited") : String(PLAN_LIMITS[next].maxSeats) },
                ].map(({ label, value }) => (
                  <div key={label}>
                    <div style={{ fontSize: 10, color: "#9A9A9A", textTransform: "uppercase", letterSpacing: "0.04em", fontWeight: 600 }}>
                      {label}
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: accent }}>{value}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <Link
              to="/dashboard/revenue-hub"
              onClick={onClose}
              style={{
                flex: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                padding: "11px 16px",
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 600,
                textDecoration: "none",
                background: `linear-gradient(135deg, ${accent}, ${accent}CC)`,
                color: "#fff",
              }}
            >
              {t("plans.upgradeModal.cta")} <ArrowUpRight size={13} />
            </Link>
            <button
              onClick={onClose}
              style={{
                padding: "11px 16px",
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 600,
                border: "1px solid #E5E2DB",
                background: "#fff",
                color: "#4A4A48",
                cursor: "pointer",
              }}
            >
              {t("plans.upgradeModal.dismiss")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
