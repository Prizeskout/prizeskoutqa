export type ShadowDecisionInput = {
  baseCost: number;
  currentPrice: number;
  recommendedPrice: number | null;
  commissionRate: number;
  vatRate: number;
  logisticsSubsidy: number;
  marginFloorPct: number;
  floorBreached: boolean;
};

export type ShadowPrediction = {
  observedPrice: number;
  candidatePrice: number;
  predictedMargin: number;
  predictedMarginPct: number;
  predictedDemandChangePct: null;
  riskLevel: "low" | "medium" | "high" | "unknown";
  confidence: number;
  recommendation: "observe" | "hold" | "consider_reprice" | "insufficient_evidence";
  explanationCodes: string[];
  featureSnapshot: Record<string, number | boolean | null>;
};

const finite = (value: number) => Number.isFinite(value);
const round = (value: number, digits = 4) => Number(value.toFixed(digits));

/**
 * Honest first baseline for shadow evaluation. It does not claim to predict
 * demand. Its job is to create a versioned, measurable benchmark that future
 * statistical/causal models must beat before they can be recommended.
 */
export function predictShadowMargin(input: ShadowDecisionInput): ShadowPrediction {
  const numeric = [input.baseCost,input.currentPrice,input.commissionRate,input.vatRate,input.logisticsSubsidy,input.marginFloorPct];
  if (!numeric.every(finite) || input.currentPrice <= 0 || input.baseCost < 0) {
    return {
      observedPrice: finite(input.currentPrice) ? input.currentPrice : 0,
      candidatePrice: finite(input.currentPrice) ? input.currentPrice : 0,
      predictedMargin: 0,
      predictedMarginPct: 0,
      predictedDemandChangePct: null,
      riskLevel: "unknown",
      confidence: 0,
      recommendation: "insufficient_evidence",
      explanationCodes: ["invalid_or_missing_economics"],
      featureSnapshot: { ...input, recommendedPrice: input.recommendedPrice },
    };
  }

  const hasRecommendation = input.recommendedPrice !== null && finite(input.recommendedPrice) && input.recommendedPrice > 0;
  const candidatePrice = hasRecommendation ? input.recommendedPrice as number : input.currentPrice;
  const marketplaceFee = candidatePrice * input.commissionRate;
  const vatOnFee = marketplaceFee * input.vatRate;
  const margin = candidatePrice - marketplaceFee - vatOnFee - input.baseCost + input.logisticsSubsidy;
  const marginPct = margin / candidatePrice;
  const belowFloor = marginPct < input.marginFloorPct;
  const explanationCodes = [belowFloor ? "predicted_below_margin_floor" : "predicted_margin_floor_respected"];
  if (!hasRecommendation) explanationCodes.push("no_price_change_recommended");
  explanationCodes.push("demand_effect_not_yet_estimated");

  return {
    observedPrice: round(input.currentPrice),
    candidatePrice: round(candidatePrice),
    predictedMargin: round(margin),
    predictedMarginPct: round(marginPct, 8),
    predictedDemandChangePct: null,
    riskLevel: belowFloor ? "high" : input.floorBreached ? "medium" : "low",
    confidence: 0.35,
    recommendation: belowFloor ? "observe" : hasRecommendation ? "consider_reprice" : "hold",
    explanationCodes,
    featureSnapshot: {
      baseCost: input.baseCost,
      currentPrice: input.currentPrice,
      recommendedPrice: input.recommendedPrice,
      commissionRate: input.commissionRate,
      vatRate: input.vatRate,
      logisticsSubsidy: input.logisticsSubsidy,
      marginFloorPct: input.marginFloorPct,
      floorBreached: input.floorBreached,
    },
  };
}
