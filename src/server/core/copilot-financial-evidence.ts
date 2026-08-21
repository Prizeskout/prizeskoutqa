import {supabaseAdmin} from "@/integrations/supabase/client.server";

const number=(value:unknown)=>typeof value==="number"&&Number.isFinite(value)?value:null;
export function summarizeCopilotFinancialEvidence(input:{runs:any[];findings:any[];contracts:any[];cases:any[];evidenceCount:number}){
  const claimsReady=input.findings.filter(row=>row.recoverability==="claims_ready"),recoverable=claimsReady.reduce((sum,row)=>sum+Math.max(0,-(number(row.variance)??0)),0);
  return {generated_at:new Date().toISOString(),reviewed_evidence_count:input.evidenceCount,
    latest_reconciliations:input.runs.map(row=>({id:row.id,platform:row.platform,currency:row.currency,period_start:row.period_start,period_end:row.period_end,status:row.status,created_at:row.created_at,readiness:row.summary?.readiness??null,claims_ready_amount:row.summary?.claims_ready_amount??null})),
    findings:{total:input.findings.length,claims_ready:claimsReady.length,claims_ready_amount:Math.round(recoverable*100)/100,items:input.findings.map(row=>({id:row.id,run_id:row.run_id,conclusion:row.conclusion,recoverability:row.recoverability,currency:row.currency,variance:row.variance,evidence_strength:row.evidence_strength,explanation:row.explanation,blockers:row.blockers,created_at:row.created_at}))},
    approved_agreements:input.contracts.map(row=>({id:row.id,platform:row.platform,contract_name:row.contract_name,currency:row.currency,effective_from:row.effective_from,effective_to:row.effective_to,status:row.status})),
    recovery_cases:input.cases.map(row=>({id:row.id,title:row.title,platform:row.platform,status:row.status,claims_ready_amount:row.claims_ready_amount,recovered_amount:row.recovered_amount,submission_reference:row.submission_reference,updated_at:row.updated_at})),
    limitations:["Only reviewed and stored PrizeSkout evidence is included.","Absence from this snapshot does not prove that a platform paid correctly."]};
}

export async function getCopilotFinancialEvidence(accountId:string){
  const db=supabaseAdmin as any;
  const [runs,findings,contracts,cases,evidence]=await Promise.all([
    db.from("ps_settlement_reconciliation_runs").select("id,platform,currency,period_start,period_end,status,summary,created_at").eq("account_id",accountId).order("created_at",{ascending:false}).limit(10),
    db.from("ps_reconciliation_findings").select("id,run_id,conclusion,recoverability,currency,variance,evidence_strength,explanation,blockers,created_at").eq("account_id",accountId).order("created_at",{ascending:false}).limit(25),
    db.from("ps_marketplace_contract_terms").select("id,platform,contract_name,currency,effective_from,effective_to,status").eq("account_id",accountId).eq("status","approved").order("effective_from",{ascending:false}).limit(20),
    db.from("ps_recovery_cases").select("id,title,platform,status,claims_ready_amount,recovered_amount,submission_reference,updated_at").eq("account_id",accountId).order("updated_at",{ascending:false}).limit(20),
    db.from("ps_merchant_evidence_items").select("id",{count:"exact",head:true}).eq("account_id",accountId),
  ]);
  for(const result of [runs,findings,contracts,cases,evidence])if(result.error)throw new Error(result.error.message);
  return summarizeCopilotFinancialEvidence({runs:runs.data??[],findings:findings.data??[],contracts:contracts.data??[],cases:cases.data??[],evidenceCount:evidence.count??0});
}
