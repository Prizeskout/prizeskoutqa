import {supabaseAdmin} from "@/integrations/supabase/client.server";
import {listContractTerms,type ContractTerm} from "./contract-terms";

export const EVIDENCE_AGREEMENT_MATCHER_VERSION="evidence-agreement-matcher-v1";
export type AgreementMatchContext={platform:string|null;periodStart:string|null;periodEnd:string|null;currency:string|null;branch:string|null;brand:string|null;legalEntity:string|null};
export type AgreementMatchResult={state:"automatic"|"needs_confirmation"|"no_match";contract:ContractTerm|null;score:number;reasons:string[];blockers:string[];candidateIds:string[]};
const norm=(value:string|null|undefined)=>value?.trim().toLowerCase()||null;
const included=(values:string[],target:string)=>values.some(value=>norm(value)===target);

export function rankAgreementCandidates(terms:ContractTerm[],context:AgreementMatchContext):AgreementMatchResult{
  const platform=norm(context.platform),currency=norm(context.currency),branch=norm(context.branch),brand=norm(context.brand),entity=norm(context.legalEntity),start=context.periodStart,end=context.periodEnd??start;
  const blockers:string[]=[];
  if(!platform)blockers.push("The evidence platform is missing.");
  if(!start)blockers.push("The evidence period is missing.");
  if(blockers.length)return {state:"no_match",contract:null,score:0,reasons:[],blockers,candidateIds:[]};
  const candidates=terms.filter(term=>term.status==="approved"&&norm(term.platform)===platform&&term.effective_from<=start!&&(!term.effective_to||term.effective_to>=(end??start)!)).filter(term=>!currency||!term.currency||norm(term.currency)===currency).filter(term=>!branch||!term.coverage_branches.length||included(term.coverage_branches,branch)).filter(term=>!brand||!term.coverage_brands.length||included(term.coverage_brands,brand)).filter(term=>!entity||!term.coverage_legal_entity||norm(term.coverage_legal_entity)===entity);
  if(!candidates.length)return {state:"no_match",contract:null,score:0,reasons:[],blockers:["No approved agreement covers the platform, evidence period and supplied scope."],candidateIds:[]};
  const scored=candidates.map(term=>{let score=60;const reasons=["Approved agreement covers the platform and complete evidence period."];if(currency&&term.currency&&norm(term.currency)===currency){score+=10;reasons.push("Currency matches.");}if(branch&&term.coverage_branches.length&&included(term.coverage_branches,branch)){score+=10;reasons.push("Branch matches.");}if(brand&&term.coverage_brands.length&&included(term.coverage_brands,brand)){score+=10;reasons.push("Brand matches.");}if(entity&&term.coverage_legal_entity&&norm(term.coverage_legal_entity)===entity){score+=10;reasons.push("Legal entity matches.");}return {term,score,reasons};}).sort((a,b)=>b.score-a.score||b.term.effective_from.localeCompare(a.term.effective_from));
  const top=scored[0],tied=scored.filter(row=>row.score===top.score);
  const missingScope=[!branch&&top.term.coverage_branches.length?"branch":null,!brand&&top.term.coverage_brands.length?"brand":null,!entity&&top.term.coverage_legal_entity?"legal entity":null].filter(Boolean);
  if(tied.length>1||missingScope.length)return {state:"needs_confirmation",contract:top.term,score:top.score,reasons:top.reasons,blockers:[...(tied.length>1?["More than one approved agreement matches equally."]:[]),...(missingScope.length?[`The agreement is scoped by ${missingScope.join(", ")}, but the evidence does not identify that scope.`]:[])],candidateIds:scored.map(row=>row.term.id)};
  return {state:"automatic",contract:top.term,score:top.score,reasons:top.reasons,blockers:[],candidateIds:scored.map(row=>row.term.id)};
}

export async function matchEvidenceAgreement(input:{accountId:string;merchantId:string;evidenceItemId:string;reviewDecisionId:string;context:AgreementMatchContext}){
  const result=rankAgreementCandidates(await listContractTerms(input.accountId),input.context),db=supabaseAdmin as any;
  const row={account_id:input.accountId,merchant_id:input.merchantId,evidence_item_id:input.evidenceItemId,review_decision_id:input.reviewDecisionId,contract_term_id:result.contract?.id??null,state:result.state,platform:norm(input.context.platform),evidence_date_start:input.context.periodStart,evidence_date_end:input.context.periodEnd,currency:input.context.currency?.toUpperCase()??null,branch_reference:input.context.branch,brand_reference:input.context.brand,legal_entity_reference:input.context.legalEntity,match_score:result.score,reasons:result.reasons,blockers:result.blockers,candidate_contract_ids:result.candidateIds,matcher_version:EVIDENCE_AGREEMENT_MATCHER_VERSION,revision:1};
  const {data,error}=await db.from("ps_evidence_agreement_matches").upsert(row,{onConflict:"evidence_item_id,review_decision_id,matcher_version,revision",ignoreDuplicates:true}).select("id,state,contract_term_id,match_score,reasons,blockers").single();
  if(error||!data)throw new Error(error?.message??"Evidence agreement match could not be recorded.");
  return {...data,contract:result.state==="automatic"?result.contract:null};
}

export async function rematchEvidenceAfterContractApproval(input:{accountId:string;merchantId:string;platform:string;contractTermId:string}){
  const db=supabaseAdmin as any,{data,error}=await db.from("ps_evidence_agreement_matches").select("*").eq("account_id",input.accountId).eq("merchant_id",input.merchantId).eq("platform",norm(input.platform)).order("revision",{ascending:false}).limit(1000);
  if(error)throw new Error(error.message);
  const latest=new Map<string,any>();for(const row of data??[]){if(!latest.has(row.evidence_item_id))latest.set(row.evidence_item_id,row);}
  const terms=await listContractTerms(input.accountId),results:Record<string,unknown>[]=[];
  for(const prior of [...latest.values()].filter(row=>["no_match","needs_confirmation"].includes(row.state))){
    const context={platform:prior.platform,periodStart:prior.evidence_date_start,periodEnd:prior.evidence_date_end,currency:prior.currency,branch:prior.branch_reference,brand:prior.brand_reference,legalEntity:prior.legal_entity_reference},ranked=rankAgreementCandidates(terms,context);
    if(ranked.state===prior.state&&String(ranked.contract?.id??"")===String(prior.contract_term_id??"")&&JSON.stringify(ranked.candidateIds)===JSON.stringify(prior.candidate_contract_ids??[]))continue;
    const revision=Number(prior.revision??1)+1,row={account_id:input.accountId,merchant_id:input.merchantId,evidence_item_id:prior.evidence_item_id,review_decision_id:prior.review_decision_id,contract_term_id:ranked.contract?.id??null,state:ranked.state,platform:prior.platform,evidence_date_start:prior.evidence_date_start,evidence_date_end:prior.evidence_date_end,currency:prior.currency,branch_reference:prior.branch_reference,brand_reference:prior.brand_reference,legal_entity_reference:prior.legal_entity_reference,match_score:ranked.score,reasons:ranked.reasons,blockers:ranked.blockers,candidate_contract_ids:ranked.candidateIds,matcher_version:EVIDENCE_AGREEMENT_MATCHER_VERSION,revision,rematch_reason:`Approved agreement ${input.contractTermId}`};
    const {data:created,error:createError}=await db.from("ps_evidence_agreement_matches").insert(row).select("id,state,contract_term_id").single();if(createError||!created)throw new Error(createError?.message??"Agreement rematch could not be stored.");
    let reconciliationRunId:null|string=null;if(ranked.state==="automatic"&&ranked.contract){const run=await (await import("./normalized-reconciliation-shadow")).runNormalizedReconciliationShadow({accountId:input.accountId,evidenceItemId:String(prior.evidence_item_id),contractTermId:ranked.contract.id,requireExplicitContract:true});reconciliationRunId=run.runId;}
    results.push({evidenceItemId:prior.evidence_item_id,matchId:created.id,state:created.state,revision,reconciliationRunId});
  }
  return results;
}

export async function confirmEvidenceAgreement(input:{accountId:string;merchantId:string;matchId:string;contractTermId:string;confirmedBy:string}){
  const db=supabaseAdmin as any,{data:match,error}=await db.from("ps_evidence_agreement_matches").select("id,evidence_item_id,state,candidate_contract_ids,revision").eq("id",input.matchId).eq("account_id",input.accountId).eq("merchant_id",input.merchantId).maybeSingle();
  if(error||!match)throw new Error(error?.message??"Agreement match was not found.");
  if(match.state!=="needs_confirmation")throw new Error("This agreement match no longer needs confirmation.");
  const {data:newer}=await db.from("ps_evidence_agreement_matches").select("id").eq("account_id",input.accountId).eq("merchant_id",input.merchantId).eq("evidence_item_id",match.evidence_item_id).gt("revision",Number(match.revision??1)).limit(1).maybeSingle();if(newer)throw new Error("A newer agreement match is available. Refresh before confirming.");
  if(!(match.candidate_contract_ids??[]).includes(input.contractTermId))throw new Error("Choose one of the agreements evaluated for this evidence.");
  const term=(await listContractTerms(input.accountId)).find(row=>row.id===input.contractTermId&&row.status==="approved");
  if(!term)throw new Error("The selected agreement is no longer approved.");
  const {data,error:updateError}=await db.from("ps_evidence_agreement_matches").update({state:"confirmed",contract_term_id:term.id,confirmed_by:input.confirmedBy,confirmed_at:new Date().toISOString(),updated_at:new Date().toISOString()}).eq("id",match.id).eq("account_id",input.accountId).eq("merchant_id",input.merchantId).eq("state","needs_confirmation").select("id,evidence_item_id,state,contract_term_id,confirmed_at").single();
  if(updateError||!data)throw new Error(updateError?.message??"Agreement confirmation could not be saved.");
  const shadow=await (await import("./normalized-reconciliation-shadow")).runNormalizedReconciliationShadow({accountId:input.accountId,evidenceItemId:String(match.evidence_item_id),contractTermId:term.id,requireExplicitContract:true});
  return {...data,shadowRunId:shadow.runId};
}
