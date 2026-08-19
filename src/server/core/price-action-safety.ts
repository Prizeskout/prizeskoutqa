import type { ApprovalMode } from "./margin-policy";

export function authorizePricePublication(input:{approvalMode:ApprovalMode;merchantConfirmed:boolean}){
  if(input.approvalMode==="recommend_only"){
    return {allowed:false as const,actorType:null,approvalSource:null,reason:"suggestions_only" as const};
  }
  if(input.approvalMode==="approval_every_change"&&!input.merchantConfirmed){
    return {allowed:false as const,actorType:null,approvalSource:null,reason:"merchant_approval_required" as const};
  }
  return {
    allowed:true as const,
    actorType:input.merchantConfirmed?"merchant" as const:"automation" as const,
    approvalSource:input.merchantConfirmed?"merchant_click" as const:"active_policy" as const,
    reason:null,
  };
}

export function pricesMatch(expected:number,observed:number|null,tolerance=.005){
  return observed!=null&&Number.isFinite(observed)&&Math.abs(observed-expected)<tolerance;
}

export function validPriceActionKey(value:string|undefined){
  return Boolean(value&&value.length<=120&&/^[A-Za-z0-9:_-]+$/.test(value));
}
