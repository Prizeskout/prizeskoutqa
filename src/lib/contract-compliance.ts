import type { ClassifiedDocument, FourWayReconciliation } from "./commission-audit";

export type ComplianceStatus = "passed"|"failed"|"review"|"not_testable";
export type ComplianceTest = {
  id:string;
  category:"commission"|"fees"|"tax"|"promotions"|"liability"|"completeness"|"timing";
  title:string;
  status:ComplianceStatus;
  contractualBasis:string;
  observed:string;
  evidence:string;
  amount:number|null;
  explanation:string;
};

export type ComplianceContract = {
  commission_rate_pct:number;
  commission_base:string;
  vat_on_fees_pct:number;
  payment_fee_pct:number;
  fixed_order_fee:number;
  delivery_contribution:number;
  promotion_funding_platform_pct:number|null;
  refund_liability:string;
  cancellation_liability:string;
  settlement_days:number|null;
  contract_name:string;
};

const round2=(n:number)=>Math.round(n*100)/100;
const amountFromLabel=(docs:ClassifiedDocument[],pattern:RegExp)=>
  docs.flatMap(doc=>doc.result.extra_line_items??[])
    .filter(item=>pattern.test(item.label))
    .reduce((sum,item)=>sum+item.value,0);

export function runContractCompliance(
  documents:ClassifiedDocument[],
  contract:ComplianceContract|null,
  fourWay:FourWayReconciliation|undefined,
):ComplianceTest[] {
  if(!contract) return [{
    id:"contract-required",category:"commission",title:"Approved contract coverage",
    status:"not_testable",contractualBasis:"No approved effective-dated contract",
    observed:"Settlement evidence may exist, but no authorized terms govern the test.",
    evidence:"Contract Intelligence Vault",amount:null,
    explanation:"Approve a reviewed contract covering the audit period before issuing compliance conclusions.",
  }];
  const statements=documents.filter(doc=>doc.document_type==="statement");
  const received=documents.filter(doc=>doc.document_type==="merchant_received");
  const effectiveRates=statements.map(doc=>doc.result.effective_commission_pct).filter((v):v is number=>typeof v==="number");
  const actualRate=effectiveRates.length?effectiveRates.reduce((a,b)=>a+b,0)/effectiveRates.length:null;
  const gross=statements.reduce((sum,doc)=>sum+(doc.result.sub_total_sum??0),0);
  const actualCommission=statements.reduce((sum,doc)=>sum+(doc.result.commission_amount??0),0);
  const commissionVariance=actualRate==null?null:round2(actualCommission-(gross*contract.commission_rate_pct/100));
  const vatObserved=amountFromLabel(statements,/\bvat\b|\btax\b/i);
  const expectedVat=round2(actualCommission*contract.vat_on_fees_pct/100);
  const namedFees=statements.flatMap(doc=>doc.result.extra_line_items??[]).filter(item=>Math.abs(item.value)>.005);
  const duplicateLabels=[...new Set(namedFees.map(item=>item.label.toLowerCase()).filter((label,index,all)=>all.indexOf(label)!==index))];
  const unapproved=namedFees.filter(item=>!/vat|tax|payment|delivery|commission|promotion|marketing/i.test(item.label));
  const platformFunding=statements.reduce((sum,doc)=>sum+(doc.result.additional_income??0),0);
  const settlementDays=contract.settlement_days;
  const delayed=received.flatMap(doc=>{
    const end=doc.result.period_end;
    const paid=doc.result.bank_transaction_date;
    if(!end||!paid||settlementDays==null)return[];
    const due=new Date(`${end}T00:00:00Z`);due.setUTCDate(due.getUTCDate()+settlementDays);
    return Date.parse(paid)>due.getTime()?[{days:Math.ceil((Date.parse(paid)-due.getTime())/86_400_000)}]:[];
  });
  const orderLink=fourWay?.links.find(link=>link.from==="order_activity"&&link.to==="platform_transactions");

  return [
    {
      id:"commission-rate",category:"commission",title:"Applied commission versus approved commission",
      status:actualRate==null?"not_testable":Math.abs(actualRate-contract.commission_rate_pct)<=.05?"passed":"failed",
      contractualBasis:`${contract.commission_rate_pct}% under ${contract.contract_name}`,
      observed:actualRate==null?"No effective commission evidenced":`${actualRate.toFixed(2)}% effective commission`,
      evidence:statements.length?`${statements.length} platform statement(s)`:"Platform statement required",
      amount:commissionVariance==null?null:Math.abs(commissionVariance),
      explanation:actualRate==null?"A platform statement with commission detail is required.":"Recomputed from statement gross sales and commission amount.",
    },{
      id:"commission-base",category:"commission",title:"Contractual commission calculation base",
      status:contract.commission_base==="unknown"?"not_testable":"review",
      contractualBasis:contract.commission_base.replaceAll("_"," "),
      observed:"Current statement parser supplies aggregate sales; discount-level basis is not separately evidenced.",
      evidence:"Contract clause and platform transaction detail",amount:null,
      explanation:"Transaction-level discount fields are required before the fee base can pass or fail.",
    },{
      id:"vat-on-fees",category:"tax",title:"VAT calculation on platform fees",
      status:!statements.length||vatObserved===0?"not_testable":Math.abs(vatObserved-expectedVat)<=1?"passed":"failed",
      contractualBasis:`${contract.vat_on_fees_pct}% VAT on commission`,
      observed:vatObserved?`${vatObserved.toFixed(2)} VAT/tax identified`:"VAT is not separately itemized",
      evidence:"Platform statement fee lines",amount:vatObserved?Math.abs(round2(vatObserved-expectedVat)):null,
      explanation:"VAT is recomputed only when a separately labelled tax line is available.",
    },{
      id:"duplicate-fees",category:"fees",title:"Duplicate fee detection",
      status:!statements.length?"not_testable":duplicateLabels.length?"failed":"passed",
      contractualBasis:"Each contractual fee should be charged once per applicable basis.",
      observed:duplicateLabels.length?`Repeated fee labels: ${duplicateLabels.join(", ")}`:"No duplicate non-zero fee labels identified",
      evidence:"Itemized platform statement lines",amount:null,
      explanation:"This test detects repeated itemized fee categories; order-level duplicate charges require transaction detail.",
    },{
      id:"unapproved-fees",category:"fees",title:"Unapproved fee categories",
      status:!statements.length?"not_testable":unapproved.length?"failed":"passed",
      contractualBasis:`Payment ${contract.payment_fee_pct}%; fixed ${contract.fixed_order_fee}; delivery ${contract.delivery_contribution}`,
      observed:unapproved.length?unapproved.map(item=>item.label).join(", "):"No unidentified non-zero fee category",
      evidence:"Approved contract fields versus statement lines",amount:unapproved.length?Math.abs(round2(unapproved.reduce((sum,item)=>sum+item.value,0))):0,
      explanation:"Unrecognized fee labels are exceptions pending clause-level validation, not automatically claims-ready.",
    },{
      id:"promotion-funding",category:"promotions",title:"Platform-funded promotion allocation",
      status:contract.promotion_funding_platform_pct==null?"not_testable":platformFunding?"review":"not_testable",
      contractualBasis:contract.promotion_funding_platform_pct==null?"Funding split not established":`${contract.promotion_funding_platform_pct}% platform funded`,
      observed:platformFunding?`${platformFunding.toFixed(2)} additional income reported`:"No separately evidenced campaign funding",
      evidence:"Campaign participation and settlement funding lines",amount:null,
      explanation:"Campaign-level discount totals are required to recompute the promised funding allocation.",
    },{
      id:"refund-cancellation",category:"liability",title:"Refund and cancellation responsibility",
      status:contract.refund_liability==="unknown"&&contract.cancellation_liability==="unknown"?"not_testable":"review",
      contractualBasis:`Refund: ${contract.refund_liability}; cancellation: ${contract.cancellation_liability}`,
      observed:"Current evidence does not identify responsibility at transaction level.",
      evidence:"Cancelled/refunded transaction reason codes",amount:null,
      explanation:"Reason codes and charged-party fields are required before liability can pass or fail.",
    },{
      id:"missing-orders",category:"completeness",title:"Missing completed orders",
      status:!orderLink||orderLink.status==="not_testable"?"not_testable":orderLink.status==="matched"?"passed":"failed",
      contractualBasis:"All eligible completed orders should enter platform settlement processing.",
      observed:orderLink?.variance==null?"No order-to-platform match available":`${orderLink.variance.toFixed(2)} aggregate variance`,
      evidence:"Order activity versus platform transaction export",amount:orderLink?.variance==null?null:Math.abs(orderLink.variance),
      explanation:orderLink?.explanation??"Platform transactions are required.",
    },{
      id:"settlement-timing",category:"timing",title:"Settlement within contractual period",
      status:settlementDays==null||!received.length?"not_testable":delayed.length?"failed":"passed",
      contractualBasis:settlementDays==null?"Settlement lag not established":`Settlement within ${settlementDays} day(s)`,
      observed:delayed.length?`${delayed.length} receipt(s) late; maximum ${Math.max(...delayed.map(item=>item.days))} day(s)`:"No late documented receipt identified",
      evidence:"Settlement period and merchant receipt transaction date",amount:null,
      explanation:"Timing is tested only where both period end and receipt date are available.",
    },
  ];
}
