export type EvidenceQualityInput={
  hasUnits:boolean;
  hasRevenue:boolean;
  hasCost:boolean;
  orderReconciled:boolean;
  hasItemLevelSettlement:boolean;
};

export type EvidenceQuality={
  grade:"A"|"B"|"C"|"D";
  completeness:number;
  trainingEligible:boolean;
  limitations:string[];
};

export function gradeEconomicEvidence(input:EvidenceQualityInput):EvidenceQuality{
  const present=[input.hasUnits,input.hasRevenue,input.hasCost,input.orderReconciled,input.hasItemLevelSettlement];
  const completeness=Number((present.filter(Boolean).length/present.length).toFixed(6));
  const limitations:string[]=[];
  if(!input.hasUnits)limitations.push("units_missing");
  if(!input.hasRevenue)limitations.push("revenue_missing");
  if(!input.hasCost)limitations.push("verified_cost_missing");
  if(!input.orderReconciled)limitations.push("order_not_financially_reconciled");
  if(!input.hasItemLevelSettlement)limitations.push("item_level_settlement_missing");
  if(input.hasUnits&&input.hasRevenue&&input.hasCost&&input.orderReconciled&&input.hasItemLevelSettlement)
    return {grade:"A",completeness,trainingEligible:true,limitations};
  if(input.hasUnits&&input.hasRevenue&&input.hasCost&&input.orderReconciled)
    return {grade:"B",completeness,trainingEligible:true,limitations};
  if(input.hasUnits&&input.hasRevenue)
    return {grade:"C",completeness,trainingEligible:false,limitations};
  return {grade:"D",completeness,trainingEligible:false,limitations};
}
