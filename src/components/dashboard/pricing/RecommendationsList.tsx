import { RecommendationCard, type Recommendation } from "./RecommendationCard";
import { ExportPdfButton } from "@/components/dashboard/ExportPdfButton";
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
          border: "1px dashed #E5E2DB",
          borderRadius: 10,
          padding: "20px 24px",
          fontSize: 13,
          color: "#6B6B6B",
        }}
      >
        No pricing recommendations yet — your dashboard will populate as the model learns
        your sales and competitor data.
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
