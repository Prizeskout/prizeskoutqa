import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight, Sparkles, Zap } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import type { OverviewAlert } from "@/lib/overview-data";

export type SeverityFilter = "action" | "opportunity" | "intel" | null;

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
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
  const { user } = useAuth();
  // Greeting depends on local time → render only on client to avoid hydration drift.
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
    if (counts.action > 0) {
      return `${counts.action} ${counts.action === 1 ? "thing needs" : "things need"} your attention today.`;
    }
    if (counts.opportunity > 0) {
      return `${counts.opportunity} ${counts.opportunity === 1 ? "opportunity" : "opportunities"} worth a look today.`;
    }
    if (counts.intel > 0) {
      return `Quiet day — ${counts.intel} new market signal${counts.intel === 1 ? "" : "s"} to review.`;
    }
    return "All clear. Your market is steady — explore what's moving.";
  }, [counts]);

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
          Today's briefing
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
          {mounted ? `${getGreeting()}, ${firstName}.` : `Welcome back, ${firstName}.`}
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
            label={`${counts.action} ${counts.action === 1 ? "action" : "actions"}`}
            active={activeFilter === "action"}
            disabled={counts.action === 0}
            onClick={() => onFilterChange(activeFilter === "action" ? null : "action")}
          />
          <StatusChip
            dotColor="#16A34A"
            label={`${counts.opportunity} ${counts.opportunity === 1 ? "opportunity" : "opportunities"}`}
            active={activeFilter === "opportunity"}
            disabled={counts.opportunity === 0}
            onClick={() => onFilterChange(activeFilter === "opportunity" ? null : "opportunity")}
          />
          <StatusChip
            dotColor="#2563EB"
            label={`${counts.intel} market signal${counts.intel === 1 ? "" : "s"}`}
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
              Clear filter
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
            Review pricing recommendations
            <ArrowRight size={14} strokeWidth={2} />
          </Link>
          <Link
            to="/dashboard/competitors"
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
            See what competitors changed
            <ArrowRight size={14} strokeWidth={2} />
          </Link>
        </div>
      </div>
    </section>
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
