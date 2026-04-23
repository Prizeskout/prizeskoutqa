import { useMemo } from "react";
import { Sparkles } from "lucide-react";
import { RecommendationCard, type Recommendation } from "./RecommendationCard";
import { ExportPdfButton } from "@/components/dashboard/ExportPdfButton";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { exportPricingPdf } from "./exportPricingPdf";
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
  const cards = recommendations.map(toCardRecommendation);

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
          description="Your dashboard fills in as the model learns from your sales and competitor data. That usually takes about 24 hours after you connect your first source."
        />
      </div>
    );
  }

  // Visible recommendations exclude dismissed; applied/snoozed still render
  // (so the user sees the resolved state and can undo).
  const visible = cards.filter((c) => decisionByRec.get(c.id)?.decision !== "dismissed");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
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
