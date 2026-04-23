import { useMemo, useState } from "react";
import { useRouter } from "@tanstack/react-router";
import { RefreshCw, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { RecommendationCard, type Recommendation } from "./RecommendationCard";
import { ExportPdfButton } from "@/components/dashboard/ExportPdfButton";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { exportPricingPdf } from "./exportPricingPdf";
import { recomputePricing } from "@/server/pricing-engine.functions";
import type { PricingRecommendation } from "@/lib/pricing-data";
import type { PricingDecision } from "@/routes/dashboard.pricing";

function toCardRecommendation(r: PricingRecommendation): Recommendation {
  return {
    id: r.id,
    product: r.product,
    category: r.category,
    channel: r.channel,
    current: Number(r.current_price),
    recommended: Number(r.recommended_price),
    reason: r.reason,
    unitImpact: r.unit_impact,
    marginImpact: r.margin_impact,
    netMonthly: r.net_monthly,
    confidence: r.confidence,
  };
}

export function RecommendationsList({
  recommendations,
  decisions,
}: {
  recommendations: PricingRecommendation[];
  decisions: PricingDecision[];
}) {
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);

  const cards = recommendations.map(toCardRecommendation);
  const allSeed = recommendations.length > 0 && recommendations.every((r) => r.source === "seed");

  // Index latest decision per recommendation, dropping snoozes that have expired.
  const decisionByRec = useMemo(() => {
    const now = Date.now();
    const map = new Map<string, PricingDecision>();
    for (const d of decisions) {
      if (map.has(d.recommendation_id)) continue;
      if (d.decision === "snoozed" && d.snooze_until && new Date(d.snooze_until).getTime() < now) {
        continue;
      }
      map.set(d.recommendation_id, d);
    }
    return map;
  }, [decisions]);

  async function handleRefresh() {
    setRefreshing(true);
    try {
      const res = await recomputePricing();
      if (!res.ok) {
        toast.error(res.error || "Could not refresh recommendations");
        return;
      }
      if (res.written === 0) {
        toast(
          "No new recommendations. Add competitor URLs (and a 'self' URL for your own price) on the Competitors page, then trigger a scrape.",
          { duration: 6000 },
        );
      } else {
        toast.success(
          `${res.written} live recommendation${res.written === 1 ? "" : "s"} generated${res.seedsWiped > 0 ? ` (${res.seedsWiped} sample row${res.seedsWiped === 1 ? "" : "s"} replaced)` : ""}`,
        );
      }
      // Re-run the route loader to pull the fresh rows.
      await router.invalidate();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Refresh failed";
      toast.error(msg);
    } finally {
      setRefreshing(false);
    }
  }

  if (!cards.length) {
    return (
      <div
        style={{
          backgroundColor: "#FFFFFF",
          border: "1px solid var(--color-light-border, #E5E2DB)",
          borderRadius: "var(--radius-card, 12px)",
        }}
      >
        <EmptyState
          icon={<Sparkles size={20} strokeWidth={1.75} />}
          title="No pricing recommendations yet"
          description="Add competitor product URLs (and one with competitor='self' for your own price) on the Competitors page, then trigger a scrape. Recommendations will appear here within a minute."
        />
        <div style={{ display: "flex", justifyContent: "center", paddingBottom: 20 }}>
          <RefreshButton onClick={handleRefresh} loading={refreshing} />
        </div>
      </div>
    );
  }

  // Visible recommendations exclude dismissed; applied/snoozed still render
  // (so the user sees the resolved state and can undo).
  const visible = cards.filter((c) => decisionByRec.get(c.id)?.decision !== "dismissed");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {allSeed && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 16,
            padding: "10px 16px",
            borderRadius: 8,
            backgroundColor: "rgba(245, 158, 11, 0.08)",
            border: "1px solid rgba(245, 158, 11, 0.25)",
          }}
        >
          <div style={{ fontSize: 12, color: "#92400E", lineHeight: 1.5 }}>
            <strong>Sample data.</strong> These recommendations are placeholders. Connect competitor product URLs (with one marked <code>self</code> for your own price) on the Competitors page, then refresh to generate live recommendations from your own scrape data.
          </div>
        </div>
      )}
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
        <RefreshButton onClick={handleRefresh} loading={refreshing} />
        <ExportPdfButton onExport={() => exportPricingPdf(cards)} />
      </div>
      {visible.map((rec) => (
        <RecommendationCard
          key={rec.id}
          rec={rec}
          initialDecision={decisionByRec.get(rec.id) ?? null}
        />
      ))}
    </div>
  );
}

function RefreshButton({ onClick, loading }: { onClick: () => void; loading: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "6px 12px",
        borderRadius: 8,
        border: "1px solid #E5E2DB",
        backgroundColor: "#FFFFFF",
        color: "#1A1A18",
        fontSize: 12,
        fontWeight: 500,
        cursor: loading ? "wait" : "pointer",
        opacity: loading ? 0.6 : 1,
      }}
    >
      <RefreshCw
        size={13}
        style={{ animation: loading ? "spin 1s linear infinite" : undefined }}
      />
      {loading ? "Refreshing…" : "Refresh recommendations"}
      <style>{`@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`}</style>
    </button>
  );
}
