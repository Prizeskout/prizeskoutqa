import { Sparkles } from "lucide-react";
import { RecommendationCard, type Recommendation } from "./RecommendationCard";
import { ExportPdfButton } from "@/components/dashboard/ExportPdfButton";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { exportPricingPdf } from "./exportPricingPdf";
import type { PricingRecommendation } from "@/lib/pricing-data";

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
}: {
  recommendations: PricingRecommendation[];
}) {
  const cards = recommendations.map(toCardRecommendation);

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

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <ExportPdfButton onExport={() => exportPricingPdf(cards)} />
      </div>
      {cards.map((rec) => (
        <RecommendationCard key={rec.id} rec={rec} />
      ))}
    </div>
  );
}
