import { useMemo } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight, Zap } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { OverviewAlert } from "@/lib/overview-data";

export type SeverityFilter = "action" | "opportunity" | "intel" | null;


export function OverviewHero({
  alerts,
  activeFilter,
  onFilterChange,
  pricingCount,
  competitorChangeCount,
}: {
  alerts: OverviewAlert[];
  activeFilter: SeverityFilter;
  onFilterChange: (next: SeverityFilter) => void;
  pricingCount: number;
  competitorChangeCount: number;
}) {
  const { t } = useTranslation();
  const counts = useMemo(() => {
    const action = alerts.filter((a) => a.severity === "action").length;
    const opportunity = alerts.filter((a) => a.severity === "opportunity").length;
    const intel = alerts.filter((a) => a.severity === "intel").length;
    return { action, opportunity, intel, total: alerts.length };
  }, [alerts]);

  const headline = useMemo(() => {
    if (counts.action > 0) return t(counts.action === 1 ? "hero.headlineAction" : "hero.headlineAction_plural", { count: counts.action });
    if (counts.opportunity > 0) return t(counts.opportunity === 1 ? "hero.headlineOpportunity" : "hero.headlineOpportunity_plural", { count: counts.opportunity });
    if (counts.intel > 0) return t(counts.intel === 1 ? "hero.headlineIntel" : "hero.headlineIntel_plural", { count: counts.intel });
    return t("hero.headlineClear");
  }, [counts, t]);

  return (
    <section
      style={{
        backgroundColor: "#FFFFFF",
        border: "1px solid #E5E2DB",
        borderRadius: 12,
        padding: "24px 28px",
      }}
    >
      {/* Top row: section label + primary CTAs */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
          flexWrap: "wrap",
          marginBottom: 18,
        }}
      >
        <span
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: "#9A9A9A",
            textTransform: "uppercase",
            letterSpacing: "0.07em",
          }}
        >
          {t("hero.briefingLabel")}
        </span>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          <Link
            to="/dashboard/revenue-hub"
            search={{ from: "overview" }}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 7,
              backgroundColor: "#1A1A18",
              color: "#FFFFFF",
              textDecoration: "none",
              padding: "8px 14px",
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            <Zap size={13} strokeWidth={2.25} />
            {t("hero.reviewPricing")}
            <CountBadge value={pricingCount} variant="onDark" />
            <ArrowRight size={13} strokeWidth={2} />
          </Link>
          <Link
            to="/dashboard/competitors"
            search={{ from: "overview" }}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 7,
              backgroundColor: "#FFFFFF",
              border: "1px solid #E5E2DB",
              color: "#1A1A18",
              textDecoration: "none",
              padding: "8px 14px",
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            {t("hero.seeCompetitors")}
            <CountBadge value={competitorChangeCount} variant="onLight" />
            <ArrowRight size={13} strokeWidth={2} />
          </Link>
        </div>
      </div>

      {/* Market status headline */}
      <p
        style={{
          fontSize: 22,
          fontWeight: 700,
          color: "#1A1A18",
          margin: "0 0 20px",
          letterSpacing: "-0.01em",
          lineHeight: 1.3,
        }}
      >
        {headline}
      </p>

      {/* Status filter chips */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
        <StatusChip
          dotColor="#DC2626"
          label={t(counts.action === 1 ? "hero.action" : "hero.action_plural", { count: counts.action })}
          active={activeFilter === "action"}
          disabled={counts.action === 0}
          onClick={() => onFilterChange(activeFilter === "action" ? null : "action")}
        />
        <StatusChip
          dotColor="#16A34A"
          label={t(counts.opportunity === 1 ? "hero.opportunity" : "hero.opportunity_plural", { count: counts.opportunity })}
          active={activeFilter === "opportunity"}
          disabled={counts.opportunity === 0}
          onClick={() => onFilterChange(activeFilter === "opportunity" ? null : "opportunity")}
        />
        <StatusChip
          dotColor="#2563EB"
          label={t(counts.intel === 1 ? "hero.signal" : "hero.signal_plural", { count: counts.intel })}
          active={activeFilter === "intel"}
          disabled={counts.intel === 0}
          onClick={() => onFilterChange(activeFilter === "intel" ? null : "intel")}
        />
        {activeFilter && (
          <button
            type="button"
            onClick={() => onFilterChange(null)}
            style={{
              background: "transparent",
              border: "none",
              color: "#EA580C",
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
              padding: "4px 6px",
            }}
          >
            {t("hero.clearFilter")}
          </button>
        )}
      </div>
    </section>
  );
}

function CountBadge({ value, variant }: { value: number; variant: "onDark" | "onLight" }) {
  if (value <= 0) return null;
  const isDark = variant === "onDark";
  return (
    <span
      aria-label={`${value} items`}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        minWidth: 20,
        height: 20,
        padding: "0 6px",
        borderRadius: 999,
        fontSize: 11,
        fontWeight: 700,
        lineHeight: 1,
        backgroundColor: isDark ? "rgba(255,255,255,0.18)" : "#1A1A18",
        color: "#FFFFFF",
      }}
    >
      {value > 99 ? "99+" : value}
    </span>
  );
}

function StatusChip({
  dotColor,
  label,
  active,
  disabled,
  onClick,
}: {
  dotColor: string;
  label: string;
  active: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={() => {
        if (disabled) return;
        onClick();
        if (typeof window !== "undefined") {
          window.requestAnimationFrame(() => {
            const el = document.getElementById("overview-live-alerts");
            if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
          });
        }
      }}
      aria-pressed={active}
      disabled={disabled}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 7,
        backgroundColor: active ? "#1A1A18" : "transparent",
        border: `1px solid ${active ? "#1A1A18" : "#E5E2DB"}`,
        borderRadius: 999,
        padding: "5px 12px",
        fontSize: 12,
        fontWeight: 500,
        color: active ? "#FFFFFF" : "#6B6B6B",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.5 : 1,
        transition: "background-color 0.12s ease, color 0.12s ease, border-color 0.12s ease",
      }}
    >
      <span
        aria-hidden
        style={{
          width: 6,
          height: 6,
          borderRadius: 9999,
          backgroundColor: dotColor,
          flexShrink: 0,
        }}
      />
      {label}
    </button>
  );
}
