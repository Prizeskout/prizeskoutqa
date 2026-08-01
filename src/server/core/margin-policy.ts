export type ApprovalMode = "recommend_only" | "auto_within_limit" | "approval_every_change";

export function evaluatePolicyControl(input:{approvalMode:ApprovalMode;maxPriceIncreasePct:number;currentPrice:number;recommendedPrice:number|null;floorBreached:boolean}){
  const increasePct=input.recommendedPrice!=null&&input.currentPrice>0?(input.recommendedPrice-input.currentPrice)/input.currentPrice:0;
  const withinIncreaseLimit=increasePct<=input.maxPriceIncreasePct;
  const mayAutoApply=input.floorBreached&&input.recommendedPrice!=null&&input.approvalMode==="auto_within_limit"&&withinIncreaseLimit;
  const outcome=!input.floorBreached?"no_change":mayAutoApply?"auto_apply":!withinIncreaseLimit?"blocked_over_maximum":"waiting_for_approval";
  return {increasePct,withinIncreaseLimit,mayAutoApply,outcome} as const;
}
