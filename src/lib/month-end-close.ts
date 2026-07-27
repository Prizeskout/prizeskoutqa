import type {ClassifiedDocument,LedgerRow} from "@/lib/commission-audit";
export type CloseSchedule={code:string;label:string;amount:number;evidence:string;status:"supported"|"partial"|"missing"};
export type JournalLine={journal:string;account:string;description:string;debit:number;credit:number;source:string};
export type MonthEndClose={schedules:CloseSchedule[];journals:JournalLine[];expected_receivable:number;cash_received:number|null;cash_in_transit:number|null;unresolved_variance:number|null;balanced:boolean;limitations:string[]};
const r=(n:number)=>Math.round((n+Number.EPSILON)*100)/100;
export function buildMonthEndClose(totals:LedgerRow|null,documents:ClassifiedDocument[]):MonthEndClose{
  const statement=documents.find(d=>d.document_type==="statement");
  const receipt=documents.find(d=>d.document_type==="merchant_received");
  const gross=totals?.sales??statement?.result.sub_total_sum??0;
  const commission=totals?.commission_at_agreed_rate??statement?.result.commission_amount??0;
  const charges=statement?.result.additional_charges??0;
  const promoIncome=statement?.result.additional_income??0;
  const expected=r(gross-commission-charges+promoIncome);
  const cash=receipt?.result.received_amount??null;
  const variance=cash==null?null:r(cash-expected);
  const transit=cash==null?expected:Math.max(0,r(expected-cash));
  const schedules:CloseSchedule[]=[
    {code:"GROSS_SALES",label:"Gross sales",amount:r(gross),evidence:totals?"Order activity ledger":statement?.file_name??"No source",status:totals||statement?"supported":"missing"},
    {code:"COMMISSIONS",label:"Contractual commissions",amount:r(commission),evidence:totals?"Effective-dated contract × eligible sales":"Platform statement",status:totals?"supported":statement?"partial":"missing"},
    {code:"VAT_FEES",label:"VAT on platform fees",amount:0,evidence:"No separately evidenced amount",status:"missing"},
    {code:"MERCHANT_DISCOUNTS",label:"Merchant-funded discounts",amount:0,evidence:"No structured promotion funding split",status:"missing"},
    {code:"PLATFORM_DISCOUNTS",label:"Platform-funded discounts",amount:r(promoIncome),evidence:statement?.file_name??"No statement",status:statement?"partial":"missing"},
    {code:"REFUNDS",label:"Refunds and reversals",amount:0,evidence:"No monetarily classified refund schedule",status:"missing"},
    {code:"DELIVERY_ADS",label:"Delivery, payment and advertising charges",amount:r(charges),evidence:statement?.file_name??"No statement",status:statement?"partial":"missing"},
    {code:"RECEIVABLE",label:"Marketplace receivable",amount:expected,evidence:"Deterministic close bridge",status:totals?"supported":"partial"},
    {code:"CASH_RECEIVED",label:"Settlement received",amount:r(cash??0),evidence:receipt?.result.evidence_level==="document_supported"?receipt.file_name:cash!=null?"Merchant assertion":"No receipt evidence",status:receipt?.result.evidence_level==="document_supported"?"supported":cash!=null?"partial":"missing"},
    {code:"CASH_IN_TRANSIT",label:"Cash in transit",amount:r(transit),evidence:"Expected receivable less recorded receipt",status:cash!=null?"supported":"partial"},
    {code:"UNRESOLVED",label:"Unresolved variance",amount:r(variance??0),evidence:cash!=null?"Receipt less expected settlement":"Cannot calculate without receipt evidence",status:cash!=null?"supported":"missing"},
  ];
  const journals:JournalLine[]=[
    {journal:"Marketplace sales accrual",account:"Marketplace receivable",description:"Expected net marketplace settlement",debit:expected,credit:0,source:"Close bridge"},
    {journal:"Marketplace sales accrual",account:"Platform commission expense",description:"Contractual marketplace commission",debit:r(commission),credit:0,source:"Commission schedule"},
    ...(charges?[{journal:"Marketplace sales accrual",account:"Platform fees expense",description:"Delivery, payment and other platform charges",debit:r(charges),credit:0,source:"Platform statement"}]:[]),
    {journal:"Marketplace sales accrual",account:"Marketplace sales revenue",description:"Gross eligible marketplace sales",debit:0,credit:r(gross),source:"Order activity ledger"},
    ...(promoIncome?[{journal:"Marketplace sales accrual",account:"Platform promotion income",description:"Platform-funded promotions and reimbursements",debit:0,credit:r(promoIncome),source:"Platform statement"}]:[]),
  ];
  if(cash!=null){
    journals.push({journal:"Settlement receipt",account:"Cash clearing",description:"Merchant-provided settlement receipt",debit:r(cash),credit:0,source:receipt?.file_name??"Merchant assertion"});
    if(transit>0)journals.push({journal:"Settlement receipt",account:"Cash in transit",description:"Expected amount not yet evidenced as received",debit:r(transit),credit:0,source:"Reconciliation bridge"});
    if((variance??0)>0)journals.push({journal:"Settlement receipt",account:"Unresolved settlement suspense",description:"Receipt exceeds expected settlement",debit:0,credit:r(variance!),source:"Reconciliation variance"});
    journals.push({journal:"Settlement receipt",account:"Marketplace receivable",description:"Clear expected marketplace settlement",debit:0,credit:expected,source:"Close bridge"});
  }
  const grouped=new Map<string,{debit:number;credit:number}>();
  journals.forEach(line=>{const v=grouped.get(line.journal)??{debit:0,credit:0};v.debit+=line.debit;v.credit+=line.credit;grouped.set(line.journal,v);});
  return {schedules,journals,expected_receivable:expected,cash_received:cash,cash_in_transit:r(transit),unresolved_variance:variance,balanced:[...grouped.values()].every(v=>Math.abs(v.debit-v.credit)<.01),limitations:schedules.filter(s=>s.status==="missing").map(s=>`${s.label}: ${s.evidence}`)};
}
