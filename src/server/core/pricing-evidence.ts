export const PRICE_DECISION_TTL_MS=4*60*60_000;
export const PLATFORM_COST_TTL_MS=24*60*60_000;

export function pricingEvidenceWindow(observedAt=new Date()){
  return {
    costObservedAt:observedAt.toISOString(),
    costEvidenceExpiresAt:new Date(observedAt.getTime()+PLATFORM_COST_TTL_MS).toISOString(),
    decisionExpiresAt:new Date(observedAt.getTime()+PRICE_DECISION_TTL_MS).toISOString(),
  };
}

export type PublicationEvidenceInput={
  now?:Date; activePolicyVersion:number; decisionPolicyVersion:number|null;
  decisionExpiresAt:string|null; costObservedAt:string|null; costEvidenceExpiresAt:string|null;
  sourcePlatform:string; itemId:string; currency:string;
  evidenceChannel:string|null; evidenceItemId:string|null; evidenceCurrency:string|null;
  economics:{id:string;accountId:string;merchantId:string;channel:string;status:string;effectiveFrom:string;effectiveTo:string|null;sourceContractId:string|null}|null;
  decisionEconomicsVersionId:string|null; accountId:string; merchantId:string;
};

export function publicationEvidenceBlockers(input:PublicationEvidenceInput){
  const now=(input.now??new Date()).getTime();
  const blockers:string[]=[];
  const validFuture=(value:string|null)=>Boolean(value&&Number.isFinite(Date.parse(value))&&Date.parse(value)>now);
  if(input.decisionPolicyVersion!==input.activePolicyVersion)blockers.push("policy_version_changed");
  if(!validFuture(input.decisionExpiresAt))blockers.push("decision_expired");
  if(!input.costObservedAt||!Number.isFinite(Date.parse(input.costObservedAt))||Date.parse(input.costObservedAt)>now+5*60_000||!validFuture(input.costEvidenceExpiresAt))blockers.push("cost_evidence_stale");
  if(input.evidenceChannel!==input.sourcePlatform)blockers.push("channel_scope_mismatch");
  if(input.evidenceItemId!==input.itemId)blockers.push("product_scope_mismatch");
  if(input.evidenceCurrency!==input.currency)blockers.push("currency_scope_mismatch");
  const economics=input.economics;
  if(!economics||economics.id!==input.decisionEconomicsVersionId)blockers.push("economics_version_missing");
  else {
    if(economics.status!=="approved")blockers.push("economics_not_approved");
    if(economics.accountId!==input.accountId||economics.merchantId!==input.merchantId||economics.channel!==input.sourcePlatform)blockers.push("economics_scope_mismatch");
    const effectiveFrom=Date.parse(economics.effectiveFrom),effectiveTo=economics.effectiveTo?Date.parse(economics.effectiveTo):null;
    if(!Number.isFinite(effectiveFrom)||(effectiveTo!=null&&!Number.isFinite(effectiveTo))||effectiveFrom>now||Boolean(effectiveTo!=null&&effectiveTo<=now))blockers.push("contract_not_effective");
    if(!economics.sourceContractId)blockers.push("approved_contract_missing");
  }
  return [...new Set(blockers)];
}
