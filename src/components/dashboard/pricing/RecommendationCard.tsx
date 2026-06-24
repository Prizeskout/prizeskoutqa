import { useState } from "react";
import { ArrowRight, Check, ChevronDown, Clock, Undo2 } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { useBranding } from "@/hooks/useBranding";
import { supabase } from "@/integrations/supabase/client";
import { resolveReason } from "@/locales/reasons";
import type { PricingDecision } from "@/routes/dashboard.pricing";
import type { Locale } from "@/lib/i18n";

export type Recommendation = {
  id: string;
  product: string;
  category: string;
  channel: "Online" | "In-Store";
  current: number;
  recommended: number;
  reason: string;   // v2 JSON blob OR legacy plain string
  unitImpact: string;
  marginImpact: string;
  netMonthly: string;
  confidence: number;
};

type Status = "pending" | "applied" | "dismissed" | "snoozed";

function confidenceColor(score: number) {
  if (score > 85) return "#22C55E";
  if (score >= 70) return "#F59E0B";
  return "#EF4444";
}

function formatPrice(n: number) {
  return `QAR ${n.toLocaleString("en-US", { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 })}`;
}

function priceDeltaLabel(current: number, recommended: number): string {
  const pct = ((recommended - current) / current) * 100;
  return `${pct >= 0 ? "+" : ""}${pct.toFixed(1)}%`;
}

function ChannelPill({ channel }: { channel: "Online" | "In-Store" }) {
  const isOnline = channel === "Online";
  return (
    <span
      style={{
        fontSize: 10,
        fontWeight: 500,
        padding: "2px 10px",
        borderRadius: 20,
        backgroundColor: isOnline ? "rgba(59, 130, 246, 0.08)" : "rgba(168, 85, 247, 0.08)",
        color: isOnline ? "#3B82F6" : "#7C3AED",
      }}
    >
      {channel}
    </span>
  );
}

function WhyExpander({ detail }: { detail: string }) {
  const [open, setOpen] = useState(false);
  if (!detail) return null;
  return (
    <div style={{ marginTop: 8 }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 4,
          fontSize: 12,
          fontWeight: 500,
          color: "#6B6B6B",
          background: "none",
          border: "none",
          padding: 0,
          cursor: "pointer",
        }}
      >
        <ChevronDown
          size={14}
          style={{
            transition: "transform 150ms ease",
            transform: open ? "rotate(180deg)" : "none",
          }}
        />
        Why?
      </button>
      {open && (
        <div
          style={{
            marginTop: 6,
            fontSize: 12,
            color: "#6B6B6B",
            lineHeight: 1.6,
            paddingInlineStart: 18,
            borderInlineStart: "2px solid #E5E2DB",
          }}
        >
          {detail}
        </div>
      )}
    </div>
  );
}

export function RecommendationCard({
  rec,
  initialDecision,
}: {
  rec: Recommendation;
  initialDecision: PricingDecision | null;
}) {
  const initialStatus: Status = initialDecision?.decision ?? "pending";
  const [status, setStatus] = useState<Status>(initialStatus);
  const [decisionId, setDecisionId] = useState<string | null>(initialDecision?.id ?? null);
  const [snoozeUntil, setSnoozeUntil] = useState<string | null>(
    initialDecision?.snooze_until ?? null,
  );
  const [busy, setBusy] = useState(false);
  const { accentColor } = useBranding();
  const { i18n } = useTranslation();
  const lang = (i18n.language?.slice(0, 2) ?? "en") as Locale;

  // Resolve reason: v2 JSON blob → localised templates; legacy string → transformer.
  const { headline, detail } = resolveReason(rec.reason, rec.current, rec.recommended, lang);

  // Margin floor reassurance from params — shown in the price panel if available.
  const aboveFloorQar = (() => {
    try {
      const j = JSON.parse(rec.reason) as Record<string, unknown>;
      return j?.v === 2 ? (j.params as Record<string, unknown>)?.above_floor_qar as string | undefined : undefined;
    } catch { return undefined; }
  })();

  const cColor = confidenceColor(rec.confidence);

  async function recordDecision(
    decision: "applied" | "dismissed" | "snoozed",
    snoozeDays?: number,
  ) {
    setBusy(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData.session?.user.id;
      if (!userId) {
        toast.error("Please sign in again");
        return;
      }

      const snoozeIso =
        decision === "snoozed" && snoozeDays
          ? new Date(Date.now() + snoozeDays * 24 * 60 * 60 * 1000).toISOString()
          : null;

      const { data, error } = await supabase
        .from("pricing_decisions")
        .upsert(
          {
            user_id: userId,
            recommendation_id: rec.id,
            product: rec.product,
            category: rec.category,
            channel: rec.channel,
            current_price: rec.current,
            recommended_price: rec.recommended,
            expected_net_monthly: rec.netMonthly,
            decision,
            snooze_until: snoozeIso,
          },
          { onConflict: "user_id,recommendation_id" },
        )
        .select("id, snooze_until")
        .single();

      if (error) throw error;

      setStatus(decision);
      setDecisionId(data?.id ?? null);
      setSnoozeUntil(data?.snooze_until ?? null);

      if (decision === "applied") toast.success("Marked as applied");
      else if (decision === "dismissed") toast("Kept your price");
      else if (decision === "snoozed")
        toast(`Snoozed for ${snoozeDays} day${snoozeDays === 1 ? "" : "s"}`);
    } catch (err) {
      console.error("Failed to record decision", err);
      toast.error("Could not save your decision. Try again.");
    } finally {
      setBusy(false);
    }
  }

  async function undoDecision() {
    if (!decisionId) {
      setStatus("pending");
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase.from("pricing_decisions").delete().eq("id", decisionId);
      if (error) throw error;
      setStatus("pending");
      setDecisionId(null);
      setSnoozeUntil(null);
      toast("Reverted");
    } catch (err) {
      console.error("Failed to undo decision", err);
      toast.error("Could not undo. Try again.");
    } finally {
      setBusy(false);
    }
  }

  if (status === "dismissed") {
    return null;
  }

  const applied = status === "applied";
  const snoozed = status === "snoozed";
  const borderColor = applied ? "#22C55E" : snoozed ? "#F59E0B" : "#E5E2DB";

  return (
    <div
      style={{
        backgroundColor: "#FFFFFF",
        border: `1px solid ${borderColor}`,
        borderRadius: 10,
        padding: "22px 26px",
        transition: "border-color 200ms ease",
      }}
    >
      {/* ── Header row: product + pills | confidence ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 16, fontWeight: 600, color: "#1A1A18" }}>{rec.product}</div>
          <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
            <span
              style={{
                fontSize: 10,
                fontWeight: 500,
                padding: "2px 10px",
                borderRadius: 20,
                backgroundColor: "#F5F4F1",
                color: "#6B6B6B",
              }}
            >
              {rec.category}
            </span>
            <ChannelPill channel={rec.channel} />
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8, flexShrink: 0 }}>
          <div style={{ textAlign: "center" }}>
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: "50%",
                border: `3px solid ${cColor}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 14,
                fontWeight: 700,
                color: cColor,
              }}
            >
              {rec.confidence}
            </div>
            <div style={{ fontSize: 10, color: "#9A9A9A", marginTop: 4 }}>confidence</div>
          </div>
        </div>
      </div>

      {/* ── Headline: decision-first ── */}
      <div
        style={{
          marginTop: 14,
          fontSize: 14,
          fontWeight: 600,
          color: "#1A1A18",
          lineHeight: 1.5,
        }}
      >
        {headline}
      </div>

      {/* ── Why? expander ── */}
      <WhyExpander detail={detail} />

      {/* ── Price panel ── */}
      <div
        style={{
          marginTop: 16,
          backgroundColor: "#FAFAF9",
          borderRadius: 8,
          padding: "16px 20px",
          display: "flex",
          alignItems: "center",
          gap: 20,
          flexWrap: "wrap",
        }}
      >
        <div>
          <div style={{ fontSize: 10, fontWeight: 500, color: "#9A9A9A", textTransform: "uppercase" }}>
            Current price
          </div>
          <div
            style={{
              fontSize: 18,
              fontWeight: 500,
              color: "#9A9A9A",
              textDecoration: "line-through",
              marginTop: 2,
            }}
          >
            {formatPrice(rec.current)}
          </div>
        </div>
        <ArrowRight size={18} color="#9A9A9A" />
        <div>
          <div style={{ fontSize: 10, fontWeight: 500, color: "#22C55E", textTransform: "uppercase" }}>
            Recommended
          </div>
          <div style={{ fontSize: 18, fontWeight: 700, color: "#22C55E", marginTop: 2 }}>
            {formatPrice(rec.recommended)}
          </div>
        </div>
        <div style={{ width: 1, height: 40, backgroundColor: "#E5E2DB" }} />
        <div>
          <div style={{ fontSize: 10, fontWeight: 500, color: "#9A9A9A", textTransform: "uppercase" }}>
            Price change
          </div>
          <div
            style={{
              fontSize: 14,
              fontWeight: 600,
              color: rec.recommended < rec.current ? "#EF4444" : "#22C55E",
              marginTop: 2,
            }}
          >
            {priceDeltaLabel(rec.current, rec.recommended)}
          </div>
        </div>
        {aboveFloorQar && (
          <>
            <div style={{ width: 1, height: 40, backgroundColor: "#E5E2DB" }} />
            <div>
              <div style={{ fontSize: 10, fontWeight: 500, color: "#9A9A9A", textTransform: "uppercase" }}>
                Above cost floor
              </div>
              <div style={{ fontSize: 14, fontWeight: 600, color: "#22C55E", marginTop: 2 }}>
                QAR {aboveFloorQar}
              </div>
            </div>
          </>
        )}

        {/* ── Action buttons ── */}
        <div style={{ marginInlineStart: "auto", display: "flex", gap: 8, alignItems: "center" }}>
          {applied && (
            <>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  fontSize: 12,
                  fontWeight: 600,
                  color: "#22C55E",
                  padding: "8px 14px",
                }}
              >
                <Check size={14} />
                Applied
              </div>
              <button
                onClick={undoDecision}
                disabled={busy}
                style={{
                  backgroundColor: "transparent",
                  border: "1px solid #E5E2DB",
                  color: "#6B6B6B",
                  fontSize: 12,
                  fontWeight: 500,
                  padding: "8px 12px",
                  borderRadius: 8,
                  cursor: busy ? "not-allowed" : "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <Undo2 size={12} />
                Undo
              </button>
            </>
          )}

          {snoozed && (
            <>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  fontSize: 12,
                  fontWeight: 600,
                  color: "#F59E0B",
                  padding: "8px 14px",
                }}
              >
                <Clock size={14} />
                Snoozed
                {snoozeUntil ? ` until ${new Date(snoozeUntil).toLocaleDateString()}` : ""}
              </div>
              <button
                onClick={undoDecision}
                disabled={busy}
                style={{
                  backgroundColor: "transparent",
                  border: "1px solid #E5E2DB",
                  color: "#6B6B6B",
                  fontSize: 12,
                  fontWeight: 500,
                  padding: "8px 12px",
                  borderRadius: 8,
                  cursor: busy ? "not-allowed" : "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <Undo2 size={12} />
                Undo
              </button>
            </>
          )}

          {status === "pending" && (
            <>
              <button
                onClick={() => recordDecision("snoozed", 7)}
                disabled={busy}
                title="Snooze for 7 days"
                style={{
                  backgroundColor: "transparent",
                  border: "1px solid #E5E2DB",
                  color: "#6B6B6B",
                  fontSize: 12,
                  fontWeight: 500,
                  padding: "8px 12px",
                  borderRadius: 8,
                  cursor: busy ? "not-allowed" : "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <Clock size={12} />
                Snooze 7d
              </button>
              <button
                onClick={() => recordDecision("dismissed")}
                disabled={busy}
                style={{
                  backgroundColor: "transparent",
                  border: "1px solid #E5E2DB",
                  color: "#6B6B6B",
                  fontSize: 12,
                  fontWeight: 500,
                  padding: "8px 14px",
                  borderRadius: 8,
                  cursor: busy ? "not-allowed" : "pointer",
                }}
              >
                Keep my price
              </button>
              <button
                onClick={() => recordDecision("applied")}
                disabled={busy}
                style={{
                  backgroundColor: accentColor,
                  color: "#FFFFFF",
                  fontSize: 12,
                  fontWeight: 600,
                  padding: "8px 18px",
                  borderRadius: 8,
                  border: "none",
                  cursor: busy ? "not-allowed" : "pointer",
                  opacity: busy ? 0.7 : 1,
                }}
              >
                Apply
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
