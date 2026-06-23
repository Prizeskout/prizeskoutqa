import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight, Sparkles, Zap } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/lib/auth-context";
import type { OverviewAlert } from "@/lib/overview-data";

export type SeverityFilter = "action" | "opportunity" | "intel" | null;

function getGreetingKey(mounted: boolean): string {
  if (!mounted) return "hero.welcomeBack";
  const h = new Date().getHours();
  if (h < 12) return "hero.greeting_morning";
  if (h < 18) return "hero.greeting_afternoon";
  return "hero.greeting_evening";
}

function getFirstName(name: string | null | undefined, email: string | null | undefined): string {
  if (name && name.trim().length > 0) return name.trim().split(/\s+/)[0];
  if (email) return email.split("@")[0];
  return "there";
}

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
  const { user } = useAuth();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const displayName = (user?.user_metadata?.display_name as string | undefined) ?? null;
  const firstName = getFirstName(displayName, user?.email);

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
        position: "relative",
        backgroundColor: "#FFFFFF",
        border: "1px solid #E5E2DB",
        borderRadius: 14,
        padding: "22px 24px",
        overflow: "hidden",
      }}
    >
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(120% 80% at 0% 0%, rgba(234,88,12,0.08) 0%, transparent 55%), radial-gradient(120% 80% at 100% 100%, rgba(124,58,237,0.08) 0%, transparent 55%)",
          pointerEvents: "none",
        }}
      />
      <div style={{ position: "relative" }}>
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            fontSize: 11,
            fontWeight: 600,
            color: "#7C3AED",
            backgroundColor: "rgba(124,58,237,0.08)",
            padding: "4px 10px",
            borderRadius: 999,
            letterSpacing: "0.04em",
            textTransform: "uppercase",
          }}
        >
          <Sparkles size={12} strokeWidth={2.25} />
          {t("hero.briefingLabel")}
        </div>

        <h1
          style={{
            fontSize: 24,
            fontWeight: 700,
            color: "#1A1A18",
            margin: "12px 0 4px",
            letterSpacing: "-0.015em",
            lineHeight: 1.2,
          }}
        >
          {t(getGreetingKey(mounted), { name: firstName })}
        </h1>
        <p
          style={{
            fontSize: 15,
            color: "#3A3A38",
            margin: 0,
            lineHeight: 1.5,
            maxWidth: 720,
          }}
        >
          {headline}
        </p>

        {/* Status strip — click to filter the alerts list below */}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 8,
            marginTop: 16,
            alignItems: "center",
          }}
        >
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
                color: "#7C3AED",
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
                padding: "5px 6px",
              }}
            >
              {t("hero.clearFilter")}
            </button>
          )}
        </div>

        {/* Primary CTAs */}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 10,
            marginTop: 18,
          }}
        >
          <Link
            to="/dashboard/pricing"
            search={{ from: "overview" }}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              backgroundColor: "#1A1A18",
              color: "#FFFFFF",
              textDecoration: "none",
              padding: "10px 16px",
              borderRadius: 10,
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            <Zap size={14} strokeWidth={2.25} />
            {t("hero.reviewPricing")}
            <CountBadge value={pricingCount} variant="onDark" />
            <ArrowRight size={14} strokeWidth={2} />
          </Link>
          <Link
            to="/dashboard/competitors"
            search={{ from: "overview" }}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              backgroundColor: "#FFFFFF",
              border: "1px solid #E5E2DB",
              color: "#1A1A18",
              textDecoration: "none",
              padding: "10px 16px",
              borderRadius: 10,
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            {t("hero.seeCompetitors")}
            <CountBadge value={competitorChangeCount} variant="onLight" />
            <ArrowRight size={14} strokeWidth={2} />
          </Link>
        </div>
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
        gap: 8,
        backgroundColor: active ? "#1A1A18" : "#FAF8F3",
        border: `1px solid ${active ? "#1A1A18" : "#EFEAE0"}`,
        borderRadius: 999,
        padding: "5px 12px",
        fontSize: 12,
        fontWeight: 500,
        color: active ? "#FFFFFF" : "#3A3A38",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.55 : 1,
        transition: "background-color 0.12s ease, color 0.12s ease, border-color 0.12s ease",
      }}
    >
      <span
        aria-hidden
        style={{
          width: 7,
          height: 7,
          borderRadius: 9999,
          backgroundColor: dotColor,
        }}
      />
      {label}
    </button>
  );
}
