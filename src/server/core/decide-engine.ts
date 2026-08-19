// =============================================================================
// Decide Engine — GCC Net Margin Calculator
//
// Regional commission and VAT matrix per the PrizeSkout infrastructure spec.
// Formula:
//   fee_vat = sell_price × commission_rate × vat_on_fees_rate
//   net_revenue = sell_price × (1 - commission_rate - fee_vat_rate) - logistics_subsidy
//   net_margin  = net_revenue - base_cost
//   net_margin_pct = net_margin / sell_price
//
// If net_margin_pct < floor → compute minimum price that restores the floor:
//   recommended_price = (base_cost + logistics_subsidy) / (1 - commission - vat - floor)
// =============================================================================

export const REGIONAL_COMMISSION: Record<string, number> = {
  // Scenario ceiling only. Live repricing must use approved merchant terms.
  QA: 0.19,
  AE: 0.25,
  SA: 0.21,
  KW: 0.20,
  BH: 0.20,
  OM: 0.20,
};

export const REGIONAL_VAT: Record<string, number> = {
  QA: 0.00,
  AE: 0.05,
  SA: 0.15,
  KW: 0.00,
  BH: 0.10,
  OM: 0.05,
};

export const VALID_REGIONS = Object.keys(REGIONAL_COMMISSION);
export const DEFAULT_MARGIN_FLOOR = 0.18;
export const CIRCUIT_OPEN_BACKOFF_SECONDS = 30;

export type DecideInput = {
  region: string;
  baseCost: number;
  currentRetailPrice: number;
  vatRate?: number;
  logisticsSubsidy?: number;
  marginFloorPct?: number;
  minimumContributionAmount?: number;
  commissionRate?: number;
  paymentFeeRate?: number;
  fixedOrderFee?: number;
  promotionContributionRate?: number;
};

export type DecideOutput = {
  commissionRate: number;
  vatRate: number;
  logisticsSubsidy: number;
  marginFloorPct: number;
  minimumContributionAmount: number;
  netRevenue: number;
  netMargin: number;
  netMarginPct: number;
  floorBreached: boolean;
  recommendedPrice: number | null;
  decisionAction: "hold" | "reprice_up" | "reprice_down" | "cannot_achieve_floor";
};

export function decide(input: DecideInput): DecideOutput {
  const {
    region,
    baseCost,
    currentRetailPrice,
    logisticsSubsidy = 0,
    marginFloorPct = DEFAULT_MARGIN_FLOOR,
    minimumContributionAmount = 0,
  } = input;

  const commissionRate = input.commissionRate ?? (REGIONAL_COMMISSION[region] ?? 0.22);
  const vatRate = input.vatRate ?? (REGIONAL_VAT[region] ?? 0);
  const paymentFeeRate = input.paymentFeeRate ?? 0;
  const fixedOrderFee = input.fixedOrderFee ?? 0;
  const promotionContributionRate = input.promotionContributionRate ?? 0;

  // vatRate is VAT on the marketplace commission, not on the complete sale.
  const feeVatRate = commissionRate * vatRate;
  const variableRate = commissionRate + feeVatRate + paymentFeeRate + promotionContributionRate;
  const netRevenue = currentRetailPrice * (1 - variableRate) - logisticsSubsidy - fixedOrderFee;
  const netMargin = netRevenue - baseCost;
  const netMarginPct = currentRetailPrice > 0 ? netMargin / currentRetailPrice : 0;
  const floorBreached = netMarginPct < marginFloorPct || netMargin < minimumContributionAmount;

  let recommendedPrice: number | null = null;
  let decisionAction: DecideOutput["decisionAction"];

  if (!floorBreached) {
    decisionAction = "hold";
  } else {
    const percentageDenominator = 1 - variableRate - marginFloorPct;
    const cashDenominator = 1 - variableRate;
    if (percentageDenominator <= 0 || cashDenominator <= 0) {
      decisionAction = "cannot_achieve_floor";
    } else {
      const percentageFloor = (baseCost + logisticsSubsidy + fixedOrderFee) / percentageDenominator;
      const cashFloor = (baseCost + logisticsSubsidy + fixedOrderFee + minimumContributionAmount) / cashDenominator;
      recommendedPrice = r4(Math.max(percentageFloor, cashFloor));
      decisionAction = recommendedPrice > currentRetailPrice ? "reprice_up" : "reprice_down";
    }
  }

  return {
    commissionRate,
    vatRate,
    logisticsSubsidy,
    marginFloorPct,
    minimumContributionAmount,
    netRevenue: r4(netRevenue),
    netMargin: r4(netMargin),
    netMarginPct: r6(netMarginPct),
    floorBreached,
    recommendedPrice,
    decisionAction,
  };
}

function r4(n: number) { return Math.round(n * 10000) / 10000; }
function r6(n: number) { return Math.round(n * 1000000) / 1000000; }
