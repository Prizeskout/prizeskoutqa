export type ExpectedOrder={orderId:string;amount:number;currency:string;final:boolean;evidenceReady:boolean};
export type SettlementLine={settlementReference:string;orderId:string|null;amount:number;currency:string};
export type BankReceipt={bankReference:string;settlementReference:string|null;amount:number;currency:string;evidenceReady:boolean};
export type ReconciliationState="awaiting_settlement"|"partially_settled"|"settled_awaiting_bank"|"partially_paid"|"reconciled"|"unexplained_deduction"|"overpaid"|"ambiguous"|"claim_ready";
export type ReconciliationAllocation={orderId:string|null;settlementReference:string|null;bankReference:string|null;expectedAmount:number;settledAmount:number|null;receivedAmount:number|null;variance:number|null;state:ReconciliationState;matchBasis:"exact_order_reference"|"exact_settlement_reference"|"unmatched"|"ambiguous";blockers:string[]};

const money=(n:number)=>Math.round(n*100)/100;
const duplicateKeys=(values:(string|null)[])=>{const seen=new Set<string>(),dupes=new Set<string>();for(const value of values){if(!value)continue;if(seen.has(value))dupes.add(value);seen.add(value);}return dupes;};

export function reconcileSettlementEvidence(input:{orders:ExpectedOrder[];settlements:SettlementLine[];receipts:BankReceipt[];tolerance?:number}){
  const tolerance=input.tolerance??0.01;
  const duplicateOrders=duplicateKeys(input.orders.map(row=>row.orderId));
  const duplicateSettlementOrders=duplicateKeys(input.settlements.map(row=>row.orderId));
  const duplicateSettlementReferences=duplicateKeys(input.settlements.map(row=>row.settlementReference));
  const duplicateBankReferences=duplicateKeys(input.receipts.map(row=>row.bankReference));
  const allocations:ReconciliationAllocation[]=[];
  for(const order of input.orders){
    const blockers:string[]=[];
    if(duplicateOrders.has(order.orderId)||duplicateSettlementOrders.has(order.orderId)){
      allocations.push({orderId:order.orderId,settlementReference:null,bankReference:null,expectedAmount:money(order.amount),settledAmount:null,receivedAmount:null,variance:null,state:"ambiguous",matchBasis:"ambiguous",blockers:["Order identity is duplicated in the evidence set."]});continue;
    }
    const settlement=input.settlements.find(row=>row.orderId===order.orderId);
    if(!settlement){allocations.push({orderId:order.orderId,settlementReference:null,bankReference:null,expectedAmount:money(order.amount),settledAmount:null,receivedAmount:null,variance:null,state:"awaiting_settlement",matchBasis:"unmatched",blockers:order.final?[]:["Order lifecycle is not final."]});continue;}
    if(settlement.currency!==order.currency)blockers.push("Settlement currency differs from the order currency.");
    if(duplicateSettlementReferences.has(settlement.settlementReference))blockers.push("Settlement reference covers multiple lines and needs an evidenced batch allocation.");
    const receipts=input.receipts.filter(row=>row.settlementReference===settlement.settlementReference);
    if(receipts.length>1||receipts.some(row=>duplicateBankReferences.has(row.bankReference)))blockers.push("Bank evidence reference is duplicated or ambiguous.");
    const receipt=receipts.length===1&&!duplicateBankReferences.has(receipts[0].bankReference)?receipts[0]:null;
    if(receipt&&receipt.currency!==order.currency)blockers.push("Bank receipt currency differs from the order currency.");
    const settled=money(settlement.amount),received=receipt?money(receipt.amount):null,variance=money(settled-order.amount);
    const receivedValue=received??0;
    let state:ReconciliationState;
    if(blockers.length)state="ambiguous";
    else if(settled<order.amount-tolerance)state=receipt&&Math.abs(received!-settled)<=tolerance&&order.final&&order.evidenceReady&&receipt.evidenceReady?"claim_ready":settled>0?"partially_settled":"awaiting_settlement";
    else if(settled>order.amount+tolerance)state="overpaid";
    else if(!receipt)state="settled_awaiting_bank";
    else if(receivedValue<settled-tolerance)state=receivedValue>0?"partially_paid":"unexplained_deduction";
    else if(receivedValue>settled+tolerance)state="overpaid";
    else state=order.final&&order.evidenceReady&&receipt.evidenceReady?"reconciled":"ambiguous";
    allocations.push({orderId:order.orderId,settlementReference:settlement.settlementReference,bankReference:receipt?.bankReference??null,expectedAmount:money(order.amount),settledAmount:settled,receivedAmount:received,variance, state,matchBasis:receipt?"exact_settlement_reference":"exact_order_reference",blockers});
  }
  const usedOrders=new Set(input.orders.map(row=>row.orderId));
  for(const settlement of input.settlements.filter(row=>!row.orderId||!usedOrders.has(row.orderId))){allocations.push({orderId:settlement.orderId,settlementReference:settlement.settlementReference,bankReference:null,expectedAmount:0,settledAmount:money(settlement.amount),receivedAmount:null,variance:null,state:"ambiguous",matchBasis:"unmatched",blockers:["Settlement line has no unique matching expected order."]});}
  const usedBankReferences=new Set(allocations.map(row=>row.bankReference).filter(Boolean));
  for(const receipt of input.receipts.filter(row=>!usedBankReferences.has(row.bankReference))){allocations.push({orderId:null,settlementReference:receipt.settlementReference,bankReference:receipt.bankReference,expectedAmount:0,settledAmount:null,receivedAmount:money(receipt.amount),variance:null,state:"ambiguous",matchBasis:"unmatched",blockers:["Bank receipt has no unique matching platform settlement."]});}
  const counts=allocations.reduce((out,row)=>(out[row.state]=(out[row.state]??0)+1,out),{} as Record<string,number>);
  return {allocations,counts,claimsReadyAmount:money(allocations.filter(row=>row.state==="claim_ready").reduce((sum,row)=>sum+Math.max(0,-(row.variance??0)),0)),exceptions:allocations.filter(row=>!["reconciled","awaiting_settlement"].includes(row.state)).length};
}
