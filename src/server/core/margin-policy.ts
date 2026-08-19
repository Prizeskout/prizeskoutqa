export type ApprovalMode = "recommend_only" | "auto_within_limit" | "approval_every_change";

export function evaluatePolicyControl(input:{approvalMode:ApprovalMode;maxPriceIncreasePct:number;currentPrice:number;recommendedPrice:number|null;floorBreached:boolean;evidenceReady?:boolean}){
  const increasePct=input.recommendedPrice!=null&&input.currentPrice>0?(input.recommendedPrice-input.currentPrice)/input.currentPrice:0;
  const withinIncreaseLimit=increasePct<=input.maxPriceIncreasePct;
  const evidenceReady=input.evidenceReady??true;
  const mayAutoApply=evidenceReady&&input.floorBreached&&input.recommendedPrice!=null&&input.approvalMode==="auto_within_limit"&&withinIncreaseLimit;
  const outcome=!evidenceReady?"blocked_missing_evidence":!input.floorBreached?"no_change":mayAutoApply?"auto_apply":!withinIncreaseLimit?"cannot_reach_target_within_limit":"waiting_for_approval";
  return {increasePct,withinIncreaseLimit,mayAutoApply,outcome} as const;
}
