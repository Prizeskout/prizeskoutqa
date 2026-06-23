// Plans & Pricing page.
//
// SINGLE SOURCE OF TRUTH: limits (products, seats, etc.) come from
// src/lib/plan-config.ts which imports them directly from src/server/plans.ts —
// the same module the backend enforces.  Change a limit in plans.ts and it
// updates here automatically.  No second copy of plan data lives in this file.

import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Check, Sparkles, Zap, Building2, Handshake, ArrowUpRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import {
  PLANS,
  PLAN_LIMITS,
  PLAN_PRICES_USD,
  PLAN_ACCENTS,
  PLAN_POPULAR,
  freshnessI18nKey,
  type Plan,
} from "@/lib/plan-config";

export const Route = createFileRoute("/dashboard/plans")({
  head: () => ({ meta: [{ title: "Plans & Pricing | PrizeSkout" }] }),
  component: PlansPage,
});

const ICONS: Record<Plan, typeof Sparkles> = {
  starter:    Sparkles,
  standard:   Zap,
  enterprise: Building2,
};

// ── Current plan fetch ──────────────────────────────────────────────────────

async function fetchCurrentPlan(): Promise<Plan | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await (supabase
    .from("licensee_members")
    .select("licensees(plan)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle() as unknown as Promise<{ data: { licensees: { plan: string } | null } | null }>);
  const raw = data?.licensees?.plan ?? null;
  if (raw === "starter" || raw === "standard" || raw === "enterprise") return raw;
  return null;
}

// ── Feature matrix ──────────────────────────────────────────────────────────
// null = not available   true = available   "soon" = coming soon

type FeatureRow = {
  key: string;         // i18n key suffix under plans.features.*
  starter:    boolean | "soon" | null;
  standard:   boolean | "soon" | null;
  enterprise: boolean | "soon" | null;
};

const FEATURE_MATRIX: FeatureRow[] = [
  { key: "competitorIntel",   starter: true,   standard: true,   enterprise: true   },
  { key: "aiRecommendations", starter: true,   standard: true,   enterprise: true   },
  { key: "whiteLabelAll",     starter: true,   standard: true,   enterprise: true   },
  { key: "automatedRepricing",starter: null,   standard: true,   enterprise: true   },
  { key: "priceSync",         starter: null,   standard: true,   enterprise: true   },
  { key: "priceGovernance",   starter: null,   standard: true,   enterprise: true   },
  { key: "apiAccess",         starter: true,   standard: true,   enterprise: true   },
  { key: "dynamicPricing",    starter: null,   standard: true,   enterprise: true   },
  { key: "flashSales",        starter: null,   standard: true,   enterprise: true   },
  { key: "groupBuying",       starter: null,   standard: "soon", enterprise: "soon" },
  { key: "loyaltyPricing",    starter: null,   standard: "soon", enterprise: "soon" },
  { key: "webhooks",          starter: null,   standard: null,   enterprise: true   },
  { key: "mapMonitoring",     starter: null,   standard: null,   enterprise: "soon" },
  { key: "channelPush",       starter: null,   standard: null,   enterprise: "soon" },
  { key: "realtimeMonitoring",starter: null,   standard: null,   enterprise: "soon" },
  { key: "customBenchmarks",  starter: null,   standard: null,   enterprise: true   },
  { key: "dedicatedCSM",      starter: null,   standard: null,   enterprise: true   },
  { key: "sla9995",           starter: null,   standard: null,   enterprise: true   },
  { key: "gccResidency",      starter: null,   standard: null,   enterprise: true   },
];

// ── Component ───────────────────────────────────────────────────────────────

function PlansPage() {
  const { t } = useTranslation();
  const [currentPlan, setCurrentPlan] = useState<Plan | null>(null);
  const [loadingPlan, setLoadingPlan] = useState(true);

  useEffect(() => {
    fetchCurrentPlan().then((p) => {
      setCurrentPlan(p);
      setLoadingPlan(false);
    });
  }, []);

  return (
    <DashboardLayout
      title={t("plans.title")}
      subtitle={t("plans.subtitle")}
      helpItems={[
        t("plans.priceUSD"),
        t("plans.whiteLabelNote"),
      ]}
    >
      {/* ── Current plan banner ─────────────────────────────────────────── */}
      {!loadingPlan && currentPlan && (
        <CurrentPlanBanner plan={currentPlan} />
      )}

      {/* ── Plan cards ──────────────────────────────────────────────────── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: 16,
          marginBottom: 24,
        }}
      >
        {PLANS.map((plan) => (
          <PlanCard key={plan} plan={plan} isCurrent={currentPlan === plan} />
        ))}
      </div>

      {/* ── White-label universal promise ────────────────────────────────── */}
      <WhiteLabelNote />

      {/* ── Feature comparison table ─────────────────────────────────────── */}
      <ComparisonTable />

      {/* ── Partner Program ──────────────────────────────────────────────── */}
      <PartnerCard />
    </DashboardLayout>
  );
}

// ── Current plan banner ─────────────────────────────────────────────────────

function CurrentPlanBanner({ plan }: { plan: Plan }) {
  const { t } = useTranslation();
  const accent = PLAN_ACCENTS[plan];
  const price  = PLAN_PRICES_USD[plan];
  const limits = PLAN_LIMITS[plan];

  return (
    <div
      style={{
        backgroundColor: "#fff",
        border: `1px solid ${accent}40`,
        borderLeft: `4px solid ${accent}`,
        borderRadius: 12,
        padding: "16px 20px",
        marginBottom: 20,
        display: "flex",
        flexWrap: "wrap",
        gap: 20,
        alignItems: "center",
        justifyContent: "space-between",
      }}
    >
      <div>
        <div style={{ fontSize: 11, color: "#9A9A9A", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600 }}>
          {t("plans.currentPlan")}
        </div>
        <div style={{ fontSize: 20, fontWeight: 700, color: accent, marginTop: 2 }}>
          {t(`plans.${plan}Name`)}
        </div>
        <div style={{ fontSize: 12.5, color: "#6B6B6B", marginTop: 4 }}>
          {t(`plans.${plan}Tagline`)}
        </div>
      </div>
      <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
        <Stat label={t("plans.limit_products")}  value={limits.maxProducts === -1 ? t("plans.unlimited") : String(limits.maxProducts)} />
        <Stat label={t("plans.limit_freshness")} value={t(freshnessI18nKey(plan))} />
        <Stat label={t("plans.limit_mode")}       value={t(`plans.mode_${limits.mode}`)} />
        <Stat
          label={price === null ? "" : t("plans.billingCycle")}
          value={price === null ? t("plans.custom") : `$${price}${t("plans.perMonth")}`}
        />
      </div>
      <span
        style={{
          backgroundColor: "rgba(34,197,94,0.1)",
          color: "#16A34A",
          fontSize: 11,
          fontWeight: 600,
          padding: "4px 14px",
          borderRadius: 20,
        }}
      >
        {t("plans.active")}
      </span>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ fontSize: 10.5, color: "#9A9A9A", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 600 }}>
        {label}
      </div>
      <div style={{ fontSize: 15, fontWeight: 600, color: "#1A1A18", marginTop: 2 }}>
        {value}
      </div>
    </div>
  );
}

// ── Individual plan card ────────────────────────────────────────────────────

function PlanCard({ plan, isCurrent }: { plan: Plan; isCurrent: boolean }) {
  const { t } = useTranslation();
  const accent  = PLAN_ACCENTS[plan];
  const popular = PLAN_POPULAR[plan];
  const price   = PLAN_PRICES_USD[plan];
  const limits  = PLAN_LIMITS[plan];
  const Icon    = ICONS[plan];

  // Top features to show on the card (not the full matrix)
  const cardFeatureKeys: string[] = plan === "starter"
    ? ["competitorIntel", "aiRecommendations", "whiteLabelAll", "apiAccess"]
    : plan === "standard"
    ? ["competitorIntel", "aiRecommendations", "whiteLabelAll", "automatedRepricing", "priceSync", "priceGovernance", "dynamicPricing"]
    : ["competitorIntel", "aiRecommendations", "whiteLabelAll", "automatedRepricing", "webhooks", "customBenchmarks", "dedicatedCSM", "sla9995", "gccResidency"];

  return (
    <div
      style={{
        position: "relative",
        backgroundColor: "#fff",
        border: `2px solid ${isCurrent ? accent : popular ? `${accent}60` : "#E5E2DB"}`,
        borderRadius: 14,
        padding: 22,
        boxShadow: popular ? `0 0 0 4px ${accent}12` : "none",
        display: "flex",
        flexDirection: "column",
        gap: 14,
      }}
    >
      {popular && !isCurrent && (
        <span
          style={{
            position: "absolute",
            top: -12,
            insetInlineStart: 20,
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: accent,
            background: `${accent}18`,
            border: `1px solid ${accent}`,
            padding: "4px 10px",
            borderRadius: 4,
          }}
        >
          {t("plans.mostPopular")}
        </span>
      )}
      {isCurrent && (
        <span
          style={{
            position: "absolute",
            top: -12,
            insetInlineStart: 20,
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: "#16A34A",
            background: "rgba(34,197,94,0.12)",
            border: "1px solid #16A34A",
            padding: "4px 10px",
            borderRadius: 4,
          }}
        >
          {t("plans.currentPlan")}
        </span>
      )}

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div
          style={{
            width: 34,
            height: 34,
            borderRadius: 8,
            backgroundColor: `${accent}15`,
            color: accent,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Icon size={18} />
        </div>
        <div>
          <div style={{ fontSize: 16, fontWeight: 700, color: "#1A1A18" }}>{t(`plans.${plan}Name`)}</div>
          <div style={{ fontSize: 12, color: "#8A8A8A" }}>{t(`plans.${plan}Tagline`)}</div>
        </div>
      </div>

      {/* Price */}
      <div>
        <div style={{ fontSize: 32, fontWeight: 700, color: "#1A1A18", lineHeight: 1 }}>
          {price === null ? t("plans.custom") : `$${price}`}
          {price !== null && (
            <span style={{ fontSize: 14, fontWeight: 500, color: "#6B6B6B" }}>{t("plans.perMonth")}</span>
          )}
        </div>
        <div style={{ fontSize: 11.5, color: "#9A9A9A", marginTop: 4 }}>
          {t("plans.priceUSD")}
        </div>
      </div>

      {/* Key limits */}
      <div
        style={{
          backgroundColor: "#FAFAF9",
          border: "1px solid #E5E2DB",
          borderRadius: 8,
          padding: 10,
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 8,
          fontSize: 12,
        }}
      >
        <LimitPill label={t("plans.limit_products")}
          value={limits.maxProducts === -1 ? t("plans.unlimited") : limits.maxProducts} />
        <LimitPill label={t("plans.limit_competitors")}
          value={limits.maxCompetitorsPerProduct === -1 ? t("plans.unlimited") : limits.maxCompetitorsPerProduct} />
        <LimitPill label={t("plans.limit_channels")}
          value={limits.maxChannels === -1 ? t("plans.unlimited") : limits.maxChannels} />
        <LimitPill label={t("plans.limit_freshness")}
          value={t(freshnessI18nKey(plan))} />
        <LimitPill label={t("plans.limit_mode")}
          value={t(`plans.mode_${limits.mode}`)} accent={accent} />
        <LimitPill label={t("plans.limit_seats")}
          value={limits.maxSeats === -1 ? t("plans.unlimited") : limits.maxSeats} />
      </div>

      {/* Mode callout */}
      <div
        style={{
          fontSize: 12,
          color: "#4A4A48",
          backgroundColor: `${accent}08`,
          border: `1px solid ${accent}30`,
          borderRadius: 8,
          padding: "8px 10px",
          lineHeight: 1.5,
        }}
      >
        <strong style={{ color: accent }}>{t(`plans.mode_${limits.mode}`)}: </strong>
        {t(`plans.modeDesc_${limits.mode}`)}
      </div>

      {/* Feature list */}
      <ul style={{ display: "flex", flexDirection: "column", gap: 6, margin: 0, padding: 0, listStyle: "none" }}>
        {cardFeatureKeys.map((k) => (
          <li key={k} style={{ display: "flex", gap: 8, fontSize: 12.5, color: "#1A1A18", alignItems: "flex-start" }}>
            <Check size={13} color={accent} style={{ marginTop: 2, flexShrink: 0 }} />
            <span>{t(`plans.features.${k}`)}</span>
          </li>
        ))}
      </ul>

      {/* CTA */}
      {isCurrent ? (
        <div style={{ fontSize: 12, fontWeight: 600, color: "#16A34A", marginTop: "auto", paddingTop: 4 }}>
          ✓ {t("plans.active")}
        </div>
      ) : price === null ? (
        <Link
          to="/contact"
          style={{
            display: "block",
            textAlign: "center",
            marginTop: "auto",
            padding: "10px 16px",
            borderRadius: 8,
            fontSize: 13,
            fontWeight: 600,
            textDecoration: "none",
            background: `linear-gradient(135deg, ${accent}, ${accent}CC)`,
            color: "#fff",
          }}
        >
          {t("plans.contactUs")} <ArrowUpRight size={12} style={{ display: "inline", verticalAlign: "-1px" }} />
        </Link>
      ) : (
        <Link
          to="/contact"
          style={{
            display: "block",
            textAlign: "center",
            marginTop: "auto",
            padding: "10px 16px",
            borderRadius: 8,
            fontSize: 13,
            fontWeight: 600,
            textDecoration: "none",
            border: `1px solid ${accent}`,
            color: accent,
          }}
        >
          {t("plans.contactSales")} <ArrowUpRight size={12} style={{ display: "inline", verticalAlign: "-1px" }} />
        </Link>
      )}
    </div>
  );
}

function LimitPill({ label, value, accent }: { label: string; value: string | number; accent?: string }) {
  return (
    <div>
      <div style={{ fontSize: 10, color: "#9A9A9A", textTransform: "uppercase", letterSpacing: "0.04em", fontWeight: 600 }}>
        {label}
      </div>
      <div style={{ fontSize: 13, fontWeight: 600, color: accent ?? "#1A1A18", marginTop: 1 }}>
        {value}
      </div>
    </div>
  );
}

// ── White-label universal promise ───────────────────────────────────────────

function WhiteLabelNote() {
  const { t } = useTranslation();
  return (
    <div
      style={{
        backgroundColor: "#F0FDF4",
        border: "1px solid #BBF7D0",
        borderRadius: 10,
        padding: "12px 16px",
        marginBottom: 20,
        display: "flex",
        gap: 10,
        alignItems: "flex-start",
        fontSize: 13,
        color: "#166534",
      }}
    >
      <Check size={15} color="#16A34A" style={{ flexShrink: 0, marginTop: 1 }} />
      <span>{t("plans.whiteLabelNote")}</span>
    </div>
  );
}

// ── Feature comparison table ────────────────────────────────────────────────

function ComparisonTable() {
  const { t } = useTranslation();
  return (
    <div
      style={{
        backgroundColor: "#fff",
        border: "1px solid #E5E2DB",
        borderRadius: 12,
        padding: 16,
        marginBottom: 24,
        overflowX: "auto",
      }}
    >
      <div style={{ fontSize: 13.5, fontWeight: 700, color: "#1A1A18", marginBottom: 14 }}>
        {t("plans.comparisonTitle")}
      </div>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
        <thead>
          <tr style={{ borderBottom: "2px solid #E5E2DB" }}>
            <th style={{ textAlign: "left", padding: "8px 10px", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em", color: "#8A8A8A", fontWeight: 600 }}>
              Feature
            </th>
            {PLANS.map((p) => (
              <th
                key={p}
                style={{
                  textAlign: "center",
                  padding: "8px 10px",
                  fontSize: 12,
                  fontWeight: 700,
                  color: PLAN_ACCENTS[p],
                }}
              >
                {t(`plans.${p}Name`)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {FEATURE_MATRIX.map((row) => (
            <tr key={row.key} style={{ borderBottom: "1px solid #F1EFEA" }}>
              <td style={{ padding: "9px 10px", color: "#1A1A18" }}>
                {t(`plans.features.${row.key}`)}
              </td>
              {PLANS.map((p) => {
                const val = row[p];
                return (
                  <td key={p} style={{ textAlign: "center", padding: "9px 10px" }}>
                    {val === true  && <Check size={14} color={PLAN_ACCENTS[p]} />}
                    {val === null  && <span style={{ color: "#D1D5DB", fontSize: 16 }}>—</span>}
                    {val === "soon" && (
                      <span style={{ fontSize: 10, fontWeight: 600, color: "#9A9A9A", background: "#F1EFEA", padding: "2px 6px", borderRadius: 4 }}>
                        {t("plans.features.comingSoon")}
                      </span>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Partner Program card ────────────────────────────────────────────────────

function PartnerCard() {
  const { t } = useTranslation();
  const ORANGE = "#EA580C";
  const items = ["item1", "item2", "item3", "item4"] as const;

  return (
    <div
      style={{
        background: "linear-gradient(135deg, #050505 0%, #0F0E14 100%)",
        border: `1px solid ${ORANGE}40`,
        borderRadius: 14,
        padding: 24,
        color: "#FAFAF9",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
        <div
          style={{
            width: 34,
            height: 34,
            borderRadius: 8,
            backgroundColor: `${ORANGE}20`,
            color: ORANGE,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Handshake size={18} />
        </div>
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: ORANGE, marginBottom: 2 }}>
            {t("plans.partner.eyebrow")}
          </div>
          <div style={{ fontSize: 17, fontWeight: 700, color: "#FAFAF9" }}>
            {t("plans.partner.title")}
          </div>
        </div>
      </div>

      <p style={{ fontSize: 13.5, color: "#9A9A9A", lineHeight: 1.6, marginBottom: 18 }}>
        {t("plans.partner.desc")}
      </p>

      <ul style={{ display: "flex", flexDirection: "column", gap: 8, margin: 0, padding: 0, listStyle: "none", marginBottom: 20 }}>
        {items.map((k) => (
          <li key={k} style={{ display: "flex", gap: 8, fontSize: 13, color: "#C4C4C4", alignItems: "flex-start" }}>
            <span
              style={{
                width: 14,
                height: 14,
                borderRadius: "50%",
                background: `${ORANGE}20`,
                border: `1px solid ${ORANGE}`,
                flexShrink: 0,
                marginTop: 3,
              }}
            />
            {t(`plans.partner.${k}`)}
          </li>
        ))}
      </ul>

      <Link
        to="/contact"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          padding: "10px 18px",
          borderRadius: 8,
          fontSize: 13,
          fontWeight: 600,
          textDecoration: "none",
          background: `linear-gradient(135deg, ${ORANGE}, #C2410C)`,
          color: "#fff",
        }}
      >
        {t("plans.partner.cta")} <ArrowUpRight size={13} />
      </Link>
    </div>
  );
}
