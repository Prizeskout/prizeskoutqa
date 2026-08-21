import {createHash} from "node:crypto";
import {supabaseAdmin} from "@/integrations/supabase/client.server";
import type {ClassifiedDocument} from "@/lib/commission-audit";
import {reconcileSettlementEvidence,type BankReceipt,type ExpectedOrder,type SettlementLine} from "./settlement-reconciliation";
import {getApprovedContractTerm} from "./contract-terms";

const fingerprint=(value:unknown)=>createHash("sha256").update(JSON.stringify(value)).digest("hex");

export async function persistSettlementReconciliation(accountId:string,auditId:string,documents:ClassifiedDocument[],rate:number,periodStart:string|null,periodEnd:string|null){
  const platforms=[...new Set(documents.map(doc=>(doc.result.platform||doc.platform_guess||"").toLowerCase()).filter(Boolean))];
  const currencies=[...new Set(documents.map(doc=>doc.result.currency).filter((v):v is string=>Boolean(v)))];
  const contract=platforms.length===1?await getApprovedContractTerm(accountId,platforms[0],periodStart??undefined):null;
  const contractCovers=Boolean(contract&&(!periodEnd||!contract.effective_to||contract.effective_to>=periodEnd));
  const contractSupportsTransactions=Boolean(contractCovers&&contract&&["eligible_sales","net_after_discount"].includes(contract.commission_base)&&contract.payment_fee_pct===0);
  const orders:ExpectedOrder[]=documents.flatMap(doc=>(doc.result.transaction_rows??[]).map(row=>{
    const eligible=Math.max(0,row.gross_sales-row.refund_amount),commissionPct=contractSupportsTransactions?contract!.commission_rate_pct:rate;
    const commission=eligible*commissionPct/100,vat=commission*(contractSupportsTransactions?contract!.vat_on_fees_pct:0)/100;
    const fixed=contractSupportsTransactions?contract!.fixed_order_fee:0,delivery=contractSupportsTransactions?contract!.delivery_contribution:0;
    return {orderId:row.order_id,amount:Math.round(Math.max(0,eligible-commission-vat-fixed-delivery)*100)/100,currency:doc.result.currency||contract?.currency||currencies[0]||"UNKNOWN",final:row.eligible,evidenceReady:Boolean(contractSupportsTransactions&&row.eligible&&doc.result.evidence_sha256)};
  }));
  const settlements:SettlementLine[]=documents.flatMap(doc=>(doc.result.settlement_rows??[]).map(row=>({settlementReference:row.settlement_reference,orderId:row.order_id,amount:row.amount,currency:row.currency})));
  const receipts:BankReceipt[]=documents.filter(doc=>doc.document_type==="merchant_received"&&typeof doc.result.received_amount==="number").map(doc=>({bankReference:doc.result.bank_reference||doc.id,settlementReference:doc.result.settlement_reference||null,amount:doc.result.received_amount!,currency:doc.result.currency||"UNKNOWN",evidenceReady:doc.result.evidence_level==="document_supported"&&Boolean(doc.result.bank_reference)}));
  // Aggregate statements are retained as unmatched evidence. They must not be
  // spread across orders without platform-provided allocation references.
  for(const doc of documents.filter(doc=>doc.document_type==="statement"&&!(doc.result.settlement_rows?.length)&&typeof doc.result.expected_payout==="number"))settlements.push({settlementReference:`aggregate:${doc.id}`,orderId:null,amount:doc.result.expected_payout!,currency:doc.result.currency||currencies[0]||"UNKNOWN"});
  const result=reconcileSettlementEvidence({orders,settlements,receipts});
  const inputFingerprint=fingerprint({documents:documents.map(doc=>({id:doc.id,sha:doc.result.evidence_sha256,result:doc.result})),rate});
  const platform=platforms.length===1?platforms[0]:platforms.length?"mixed":"unknown";
  const currency=currencies.length===1?currencies[0]:currencies.length?"MIXED":"UNKNOWN";
  // Bank evidence is optional. Order and settlement evidence can complete a
  // payout check; receipt evidence only confirms that funds actually landed.
  const status=!orders.length||!settlements.length?"insufficient_evidence":result.exceptions?"completed_with_exceptions":"completed";
  const summary={audit_id:auditId,counts:result.counts,claims_ready_amount:result.claimsReadyAmount,exceptions:result.exceptions,order_count:orders.length,settlement_count:settlements.length,receipt_count:receipts.length,contract_term_id:contract?.id??null,contract_authoritative:contractSupportsTransactions};
  const {data:existing}=await (supabaseAdmin as any).from("ps_settlement_reconciliation_runs").select("id,summary,status").eq("account_id",accountId).eq("platform",platform).eq("currency",currency).eq("input_fingerprint",inputFingerprint).maybeSingle();
  if(existing)return {runId:existing.id,status:existing.status,summary:existing.summary};
  const {data:run,error}=await (supabaseAdmin as any).from("ps_settlement_reconciliation_runs").insert({account_id:accountId,platform,currency,period_start:periodStart,period_end:periodEnd,engine_version:"settlement-reconciliation-v1",input_fingerprint:inputFingerprint,status,summary}).select("id").single();
  if(error||!run)throw new Error(error?.message??"Could not persist reconciliation run.");
  if(result.allocations.length){const {error:allocationError}=await (supabaseAdmin as any).from("ps_settlement_reconciliation_allocations").insert(result.allocations.map(row=>({run_id:run.id,account_id:accountId,platform,currency,order_id:row.orderId,settlement_reference:row.settlementReference,bank_reference:row.bankReference,expected_amount:row.expectedAmount,settled_amount:row.settledAmount,received_amount:row.receivedAmount,variance:row.variance,state:row.state,match_basis:row.matchBasis,evidence:{blockers:row.blockers}})));if(allocationError)throw new Error(allocationError.message);}
  return {runId:run.id,status,summary};
}
