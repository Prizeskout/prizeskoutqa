import {supabaseAdmin} from "@/integrations/supabase/client.server";
import {parseAggregatorDailyCsv} from "./payout-csv-parser";
import {parseTalabatPayoutStatementCsv} from "./payout-statement-parser";
import {appendEvidenceProcessingAttempt, type MerchantDocumentKind} from "./merchant-evidence-intake";
import type {ExpectedPayoutResult} from "./expected-payout";
import {extractPdfTextServer} from "./server-pdf-text";
import {parseSnoonuBrandReportPdf} from "./payout-pdf-parser";
import {extractOcrEvidenceDraft} from "./ocr-evidence-extractor";
import {createEvidenceReviewDraft} from "./evidence-review";
import {detectEvidenceLayout,type EvidenceLayoutDetection} from "./evidence-layout-registry";
import {extractContractTerms} from "./contract-extractor";
import {recordEvidenceLayouts} from "./evidence-layout-drift";
import {spreadsheetRowsToCsv} from "@/lib/spreadsheet-rows";

export const EVIDENCE_DOCUMENT_PROCESSOR_VERSION = "evidence-document-processor-v2";
const XLSX_TYPE = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
const LEGACY_XLS_TYPE = "application/vnd.ms-excel";

type EvidenceItem = {
  id: string; account_id: string; merchant_id: string; source_kind: string; source_provider: string;
  document_kind: MerchantDocumentKind; media_type: string | null; original_filename: string | null;
  storage_reference: string | null; source_metadata: Record<string, unknown> | null;
};

const knownPlatforms = ["talabat","jahez","snoonu","deliveroo","keeta","zid","salla","noon","instashop"];
export function inferEvidencePlatform(...values: (string | null | undefined)[]) {
  const text = values.filter(Boolean).join(" ").toLowerCase();
  return knownPlatforms.find(platform => text.includes(platform)) ?? "unknown";
}

export function classifyStructuredText(text: string, hinted: MerchantDocumentKind): MerchantDocumentKind {
  if (/earnings range/i.test(text) && /total payout/i.test(text)) return "settlement_report";
  const header = text.split(/\r?\n/, 1)[0]?.toLowerCase() ?? "";
  if (/settlement|payout reference|payout id/.test(header)) return "settlement_report";
  if (/order id|order number|transaction id/.test(header)) return "order_export";
  return hinted;
}

async function spreadsheetSheets(bytes: Buffer) {
  if(bytes.length>5*1024*1024)throw new Error("Spreadsheet files must be 5 MB or smaller.");
  const {default:readWorkbook}=await import("read-excel-file/node"),workbook=await readWorkbook(bytes);
  if(!workbook.length)throw new Error("The spreadsheet has no readable sheets.");
  return workbook.slice(0,25).map(sheet=>({sheetName:sheet.sheet,csv:spreadsheetRowsToCsv(sheet.data)})).filter(sheet=>sheet.csv.trim()).map(sheet=>{
    if(sheet.csv.split(/\r?\n/).length>10_000)throw new Error(`The spreadsheet sheet ${sheet.sheetName} exceeds the 10,000-row processing limit.`);
    return sheet;
  });
}

function mergeStructuredResults(results:ExpectedPayoutResult[]):ExpectedPayoutResult{
  if(results.length===1)return results[0];
  const platforms=[...new Set(results.map(row=>row.platform).filter(Boolean))],currencies=[...new Set(results.map(row=>row.currency).filter(Boolean))];
  if(platforms.length>1)throw new Error("Spreadsheet sheets identify different platforms and require review.");
  if(currencies.length>1)throw new Error("Spreadsheet sheets contain different currencies and require review.");
  const orderIds=results.flatMap(row=>(row.transaction_rows??[]).map(item=>item.order_id)),duplicateOrderIds=[...new Set(orderIds.filter((id,index)=>orderIds.indexOf(id)!==index))];
  if(duplicateOrderIds.length)throw new Error("Spreadsheet sheets repeat order references and require review before totals can be combined.");
  const dates=results.flatMap(row=>[row.period_start,row.period_end]).filter((value):value is string=>Boolean(value)).sort();
  return {ok:true,source:"upload",platform:platforms[0],currency:currencies[0],period_start:dates[0],period_end:dates.at(-1),order_count:results.reduce((sum,row)=>sum+Number(row.order_count??0),0),sub_total_sum:Math.round(results.reduce((sum,row)=>sum+Number(row.sub_total_sum??0),0)*100)/100,expected_payout:Math.round(results.reduce((sum,row)=>sum+Number(row.expected_payout??0),0)*100)/100,rows_total:results.reduce((sum,row)=>sum+Number(row.rows_total??0),0),rows_skipped:results.reduce((sum,row)=>sum+Number(row.rows_skipped??0),0),daily_rows:results.flatMap(row=>row.daily_rows??[]),transaction_rows:results.flatMap(row=>row.transaction_rows??[]),settlement_rows:results.flatMap(row=>row.settlement_rows??[]),accounting_blockers:[...new Set(results.flatMap(row=>row.accounting_blockers??[]))]};
}

function parseRegisteredLayout(text:string,layout:EvidenceLayoutDetection,hinted:MerchantDocumentKind,platformHint:string){
  const documentKind=layout.profile==="talabat_payout_metadata_v1"?"settlement_report":classifyStructuredText(text,hinted);
  const result:ExpectedPayoutResult=layout.profile==="talabat_payout_metadata_v1"?parseTalabatPayoutStatementCsv(text,0):parseAggregatorDailyCsv(text,0,platformHint);
  return {result,documentKind};
}

export async function extractStructuredEvidence(input: {bytes: Buffer; mediaType: string | null; filename: string | null; documentKind: MerchantDocumentKind; platformHint: string}) {
  let text: string,layoutProfiles:EvidenceLayoutDetection[]=[];
  let pdfQuality: Record<string, unknown> | null = null;
  const filename=input.filename??"",isCsv=/\.csv$/i.test(filename)||["text/csv","application/csv","text/plain"].includes(input.mediaType??""),isXlsx=/\.xlsx$/i.test(filename)||input.mediaType===XLSX_TYPE,isLegacyXls=!isCsv&&(/\.xls$/i.test(filename)||input.mediaType===LEGACY_XLS_TYPE);
  if(isLegacyXls)return {ok:false as const,state:"needs_review" as const,errorCode:"LEGACY_XLS_UNSUPPORTED",error:"The original .xls file is safely retained, but this legacy format is not parsed automatically. Save it as .xlsx or CSV and upload it again.",documentKind:input.documentKind};
  if (isXlsx){
    const sheets=await spreadsheetSheets(input.bytes),parsed:ExpectedPayoutResult[]=[],documentKinds:MerchantDocumentKind[]=[];
    for(const sheet of sheets){const layout=detectEvidenceLayout(sheet.csv);layoutProfiles.push(layout);if(!layout.supported)continue;const candidate=parseRegisteredLayout(sheet.csv,layout,input.documentKind,input.platformHint);if(candidate.result.ok){parsed.push(candidate.result);documentKinds.push(candidate.documentKind);}}
    if(!parsed.length)return {ok:false as const,state:"needs_review" as const,errorCode:"UNSUPPORTED_LAYOUT",error:"No spreadsheet sheet matches a verified layout. The original workbook is retained for review.",documentKind:input.documentKind,quality:{sheet_count:sheets.length,layouts:layoutProfiles}};
    try{const result=mergeStructuredResults(parsed);return {ok:true as const,result,documentKind:documentKinds.includes("settlement_report")?"settlement_report" as const:documentKinds[0],extractedTextLength:sheets.reduce((sum,sheet)=>sum+sheet.csv.length,0),quality:{sheet_count:sheets.length,parsed_sheet_count:parsed.length,layouts:layoutProfiles}};}catch(error){return {ok:false as const,state:"needs_review" as const,errorCode:"MULTI_SHEET_CONFLICT",error:error instanceof Error?error.message:"Spreadsheet sheets conflict and require review.",documentKind:input.documentKind,quality:{sheet_count:sheets.length,layouts:layoutProfiles}};}
  }
  else if (isCsv) text = input.bytes.toString("utf8");
  else if (input.mediaType === "application/pdf" || /\.pdf$/i.test(input.filename ?? "")) {
    const pdf = await extractPdfTextServer(input.bytes);
    text = pdf.text;
    pdfQuality = {...pdf.quality, truncated: pdf.truncated};
    if (!pdf.quality.usable) return {ok: false as const, state: "needs_review" as const, errorCode: "SCANNED_PDF_OCR_REQUIRED", error: "The PDF is safely retained, but it does not contain enough reliable embedded text. It requires the scanned-document OCR review stage.", documentKind: input.documentKind, quality: pdfQuality};
    if (input.platformHint === "snoonu") {
      const result = parseSnoonuBrandReportPdf(text, 0);
      if (result.ok) return {ok: true as const, result, documentKind: "order_summary" as const, extractedTextLength: text.length, quality: pdfQuality};
    }
  }
  else return {ok: false as const, state: "needs_review" as const, errorCode: "TEXT_EXTRACTION_REQUIRED", error: "The original file is retained, but this format requires the verified PDF, image, or email text-extraction stage.", documentKind: input.documentKind};
  if (!text.trim()) return {ok: false as const, state: "quarantined" as const, errorCode: "EMPTY_DOCUMENT", error: "The document contains no readable rows.", documentKind: input.documentKind};
  const layout=detectEvidenceLayout(text);layoutProfiles=[layout];
  if(!layout.supported)return {ok:false as const,state:"needs_review" as const,errorCode:"UNSUPPORTED_LAYOUT",error:layout.reason??"The document layout is not supported yet.",documentKind:input.documentKind,quality:{...(pdfQuality??{}),layout}};
  const {result,documentKind}=parseRegisteredLayout(text,layout,input.documentKind,input.platformHint);
  if (!result.ok) return {ok: false as const, state: "needs_review" as const, errorCode: "UNSUPPORTED_LAYOUT", error: result.error ?? "The document layout is not supported yet.", documentKind, quality: pdfQuality};
  return {ok: true as const, result, documentKind, extractedTextLength: text.length, quality:{...(pdfQuality??{}),layouts:layoutProfiles}};
}

const storageLocation = (reference: string) => {
  const prefix = "merchant-evidence/";
  if (!reference.startsWith(prefix) || reference.length <= prefix.length) throw new Error("Evidence storage reference is invalid.");
  return {bucket: "merchant-evidence", path: reference.slice(prefix.length)};
};

async function extractAgreementDraft(bytes:Buffer,mediaType:string|null,filename:string|null){
  let text="",images:Parameters<typeof extractContractTerms>[1]=[];
  if(mediaType==="application/pdf"||/\.pdf$/i.test(filename??"")){
    const pdf=await extractPdfTextServer(bytes);
    if(!pdf.quality.usable)return {ok:false as const,error:"This scanned agreement needs a readable-text PDF or image before its commercial terms can be extracted safely."};
    text=pdf.text;
  }else if(mediaType?.startsWith("image/")||/\.(png|jpe?g)$/i.test(filename??"")){
    const imageType=mediaType==="image/png"?"image/png" as const:"image/jpeg" as const;
    images=[{page:1,media_type:imageType,data:bytes.toString("base64")}];
  }else if(["text/plain","text/markdown","text/csv","application/csv"].includes(mediaType??"")||/\.(txt|md|csv)$/i.test(filename??"")){
    text=bytes.toString("utf8");
  }else return {ok:false as const,error:"This agreement file type cannot be read safely yet. Upload a PDF, image, or text document."};
  return extractContractTerms(text,images);
}

export async function processEvidenceDocument(evidenceItemId: string) {
  const db = supabaseAdmin as any;
  const {data: item, error: itemError} = await db.from("ps_merchant_evidence_items").select("id,account_id,merchant_id,source_kind,source_provider,document_kind,media_type,original_filename,storage_reference,source_metadata").eq("id", evidenceItemId).maybeSingle();
  if (itemError || !item) throw new Error(itemError?.message ?? "Evidence item was not found.");
  const evidence = item as EvidenceItem;
  const {data:latestAttempt,error:latestAttemptError}=await db.from("ps_evidence_processing_attempts").select("attempt_number").eq("evidence_item_id",evidence.id).eq("processor_version",EVIDENCE_DOCUMENT_PROCESSOR_VERSION).order("attempt_number",{ascending:false}).limit(1).maybeSingle();
  if(latestAttemptError)throw new Error(latestAttemptError.message);
  const processingAttemptNumber=Number(latestAttempt?.attempt_number??0)+1,finalAttemptNumber=processingAttemptNumber+1;
  const {error: claimError} = await db.from("ps_evidence_processing_attempts").insert({
    evidence_item_id: evidence.id, account_id: evidence.account_id, processor_version: EVIDENCE_DOCUMENT_PROCESSOR_VERSION,
    attempt_number: processingAttemptNumber, state: "processing", detected_document_kind: evidence.document_kind,
    extraction_summary: {}, limitations: [],
  });
  if (claimError?.code === "23505") return {ok: true, skipped: true, reason: "already_claimed"};
  if (claimError) throw new Error(claimError.message);
  try {
    if (!evidence.storage_reference) throw new Error("The original evidence file was not retained.");
    const location = storageLocation(evidence.storage_reference);
    const {data: file, error: downloadError} = await supabaseAdmin.storage.from(location.bucket).download(location.path);
    if (downloadError || !file) throw new Error(downloadError?.message ?? "The retained evidence file could not be downloaded.");
    const bytes = Buffer.from(await file.arrayBuffer());
    const metadata = evidence.source_metadata ?? {};
    const platform = inferEvidencePlatform(evidence.source_provider, evidence.original_filename, String(metadata.subject ?? ""));
    if(evidence.document_kind==="contract"||evidence.document_kind==="contract_amendment"){
      const extraction=await extractAgreementDraft(bytes,evidence.media_type,evidence.original_filename);
      if(!extraction.ok){
        const attempt=await appendEvidenceProcessingAttempt({evidenceItemId:evidence.id,accountId:evidence.account_id,processorVersion:EVIDENCE_DOCUMENT_PROCESSOR_VERSION,attemptNumber:finalAttemptNumber,state:"needs_review",detectedDocumentKind:evidence.document_kind,extractionSummary:{platform,review_required:true},limitations:[extraction.error]});
        const review=await createEvidenceReviewDraft({accountId:evidence.account_id,merchantId:evidence.merchant_id,evidenceItemId:evidence.id,processingAttemptId:attempt.attemptId,processorVersion:EVIDENCE_DOCUMENT_PROCESSOR_VERSION,documentKind:evidence.document_kind,platform,extractionPayload:{format:"contract_unsupported",error:extraction.error},missingInformation:[extraction.error],warnings:[],confidence:0});
        return {ok:true,state:"needs_review",reviewRequired:true,contractDraft:true,unsupportedLayout:true,reviewDraftId:review.reviewDraftId};
      }
      const attempt=await appendEvidenceProcessingAttempt({evidenceItemId:evidence.id,accountId:evidence.account_id,processorVersion:EVIDENCE_DOCUMENT_PROCESSOR_VERSION,attemptNumber:finalAttemptNumber,state:"needs_review",detectedDocumentKind:evidence.document_kind,extractionSummary:{platform:extraction.extraction.platform??platform,extraction_model:extraction.model,review_required:true},limitations:["Extracted agreement terms are a draft. Evidence approval creates an editable contract draft, not an active agreement."]});
      const review=await createEvidenceReviewDraft({accountId:evidence.account_id,merchantId:evidence.merchant_id,evidenceItemId:evidence.id,processingAttemptId:attempt.attemptId,processorVersion:EVIDENCE_DOCUMENT_PROCESSOR_VERSION,documentKind:evidence.document_kind,platform:extraction.extraction.platform??platform,extractionPayload:{format:"contract_terms",document_kind:evidence.document_kind,model:extraction.model,extraction:extraction.extraction},citations:extraction.extraction.clauses,missingInformation:extraction.extraction.missing_terms,warnings:extraction.extraction.warnings,confidence:extraction.extraction.confidence});
      return {ok:true,state:"needs_review",reviewRequired:true,contractDraft:true,reviewDraftId:review.reviewDraftId};
    }
    const extracted = await extractStructuredEvidence({bytes, mediaType: evidence.media_type, filename: evidence.original_filename, documentKind: evidence.document_kind, platformHint: platform});
    if (!extracted.ok) {
      if (["SCANNED_PDF_OCR_REQUIRED","TEXT_EXTRACTION_REQUIRED"].includes(extracted.errorCode) && evidence.media_type && evidence.original_filename) {
        const ocr = await extractOcrEvidenceDraft({bytes,mediaType:evidence.media_type,filename:evidence.original_filename});
        if (ocr.ok) {
          const attempt=await appendEvidenceProcessingAttempt({evidenceItemId:evidence.id,accountId:evidence.account_id,processorVersion:EVIDENCE_DOCUMENT_PROCESSOR_VERSION,attemptNumber:finalAttemptNumber,state:"needs_review",detectedDocumentKind:ocr.draft.document_kind,extractionSummary:{platform:ocr.draft.platform??platform,ocr_model:ocr.model,quality:extracted.quality??null,review_required:true},limitations:["OCR and vision extraction is a draft. Confirm the source document before creating normalized financial events or approving commercial terms."]});
          const review=await createEvidenceReviewDraft({accountId:evidence.account_id,merchantId:evidence.merchant_id,evidenceItemId:evidence.id,processingAttemptId:attempt.attemptId,processorVersion:EVIDENCE_DOCUMENT_PROCESSOR_VERSION,documentKind:ocr.draft.document_kind,platform:ocr.draft.platform??platform,extractionPayload:ocr.draft as unknown as Record<string,unknown>,citations:ocr.draft.evidence,missingInformation:ocr.draft.missing_information,warnings:ocr.draft.warnings,confidence:ocr.draft.confidence});
          return {ok:true,state:"needs_review",reviewRequired:true,ocrDraft:true,reviewDraftId:review.reviewDraftId};
        }
      }
      const attempt=await appendEvidenceProcessingAttempt({evidenceItemId: evidence.id, accountId: evidence.account_id, processorVersion: EVIDENCE_DOCUMENT_PROCESSOR_VERSION, attemptNumber: finalAttemptNumber, state: extracted.state, detectedDocumentKind: extracted.documentKind ?? evidence.document_kind, extractionSummary: {platform, quality: extracted.quality ?? null}, limitations: [extracted.error], errorCode: extracted.state === "quarantined" ? extracted.errorCode : null, errorMessage: extracted.state === "quarantined" ? extracted.error : null});
      if(extracted.state==="needs_review"){
        const review=await createEvidenceReviewDraft({accountId:evidence.account_id,merchantId:evidence.merchant_id,evidenceItemId:evidence.id,processingAttemptId:attempt.attemptId,processorVersion:EVIDENCE_DOCUMENT_PROCESSOR_VERSION,documentKind:extracted.documentKind??evidence.document_kind,platform,extractionPayload:{format:"unsupported",error_code:extracted.errorCode,layout_evidence:extracted.quality??null},missingInformation:["A verified parser for this document layout is not available."],warnings:[extracted.error],confidence:0});
        return {ok:true,state:"needs_review",reviewRequired:true,unsupportedLayout:true,reviewDraftId:review.reviewDraftId};
      }
      return {ok: false, state: extracted.state, error: extracted.error};
    }
    const quality=extracted.quality as {layouts?:EvidenceLayoutDetection[]}|null,layoutState=await recordEvidenceLayouts({accountId:evidence.account_id,merchantId:evidence.merchant_id,evidenceItemId:evidence.id,sourceProvider:evidence.source_provider.trim().toLowerCase()||platform,layouts:quality?.layouts??[]});
    const driftWarning="This source changed its report columns since the last merchant-approved layout. Review the document carefully before approving the new format.";
    const attempt=await appendEvidenceProcessingAttempt({evidenceItemId: evidence.id, accountId: evidence.account_id, processorVersion: EVIDENCE_DOCUMENT_PROCESSOR_VERSION, attemptNumber: finalAttemptNumber, state: "needs_review", detectedDocumentKind: extracted.documentKind, extractionSummary: {platform, extracted_text_length: extracted.extractedTextLength, quality: extracted.quality ?? null, layout_drift:layoutState.drift, review_required:true}, limitations: ["Parsed values are a draft and cannot enter financial calculations until merchant approval.",...(layoutState.drift?[driftWarning]:[])]});
    const review=await createEvidenceReviewDraft({accountId:evidence.account_id,merchantId:evidence.merchant_id,evidenceItemId:evidence.id,processingAttemptId:attempt.attemptId,processorVersion:EVIDENCE_DOCUMENT_PROCESSOR_VERSION,documentKind:extracted.documentKind,platform,extractionPayload:{format:"structured",result:extracted.result,layout_evidence:extracted.quality??null,layout_drift:layoutState.drift} as Record<string,unknown>,warnings:[...(extracted.result.accounting_blockers??[]),...(layoutState.drift?[driftWarning]:[])],confidence:null});
    return {ok: true, state: "needs_review", reviewRequired:true, reviewDraftId:review.reviewDraftId};
  } catch (error) {
    const message = error instanceof Error ? error.message : "Evidence processing failed.";
    await appendEvidenceProcessingAttempt({evidenceItemId: evidence.id, accountId: evidence.account_id, processorVersion: EVIDENCE_DOCUMENT_PROCESSOR_VERSION, attemptNumber: finalAttemptNumber, state: "failed", detectedDocumentKind: evidence.document_kind, limitations: [], errorCode: "PROCESSING_FAILED", errorMessage: message});
    throw error;
  }
}

type EvidenceJob={id:string;evidence_item_id:string;attempts:number;max_attempts:number;lease_owner:string};
const retryDelayMs=(attempt:number)=>Math.min(6*60*60_000,30_000*2**Math.max(0,attempt-1));

export async function processEvidenceQueue(limit=20){
  const db=supabaseAdmin as any,workerId=crypto.randomUUID(),startedAt=new Date().toISOString();
  const {data:run,error:runError}=await db.from("ps_evidence_processor_runs").insert({worker_id:workerId,state:"running",started_at:startedAt}).select("id").single();
  if(runError||!run)throw new Error(runError?.message??"Evidence worker run could not be recorded.");
  try{
    const {data,error}=await db.rpc("ps_lease_evidence_processing_jobs",{p_owner:workerId,p_limit:Math.min(Math.max(limit,1),50)});
    if(error)throw new Error(error.message);
    const jobs=(data??[]) as EvidenceJob[],results:Record<string,unknown>[]=[];let completed=0,retried=0,dead=0;
    for(const job of jobs){
      try{
        const result=await processEvidenceDocument(job.evidence_item_id);
        await db.from("ps_evidence_processing_jobs").update({state:"completed",completed_at:new Date().toISOString(),available_at:null,lease_owner:null,lease_expires_at:null,last_error:null,updated_at:new Date().toISOString()}).eq("id",job.id).eq("lease_owner",workerId);
        completed++;results.push({job_id:job.id,evidence_item_id:job.evidence_item_id,...result,ok:true});
      }catch(reason){
        const message=(reason instanceof Error?reason.message:String(reason)).slice(0,2000),isDead=job.attempts>=job.max_attempts;
        await db.from("ps_evidence_processing_jobs").update({state:isDead?"dead_letter":"queued",available_at:isDead?null:new Date(Date.now()+retryDelayMs(job.attempts)).toISOString(),lease_owner:null,lease_expires_at:null,last_error:message,updated_at:new Date().toISOString()}).eq("id",job.id).eq("lease_owner",workerId);
        if(isDead)dead++;else retried++;results.push({job_id:job.id,evidence_item_id:job.evidence_item_id,ok:false,dead_letter:isDead,error:message});
      }
    }
    await db.from("ps_evidence_processor_runs").update({state:"completed",leased_count:jobs.length,completed_count:completed,retried_count:retried,dead_letter_count:dead,finished_at:new Date().toISOString()}).eq("id",run.id);
    return {workerId,leased:jobs.length,completed,retried,deadLetter:dead,results};
  }catch(reason){
    const message=(reason instanceof Error?reason.message:String(reason)).slice(0,2000);
    await db.from("ps_evidence_processor_runs").update({state:"failed",error_message:message,finished_at:new Date().toISOString()}).eq("id",run.id);
    throw reason;
  }
}

export async function processPendingEvidence(limit = 20) {
  const db = supabaseAdmin as any;
  const target = Math.min(Math.max(limit, 1), 50), results = [];
  let offset = 0;
  while (results.filter(result => !(result as {skipped?: boolean}).skipped).length < target && offset < 5000) {
    const {data, error} = await db.from("ps_merchant_evidence_items").select("id").not("storage_reference", "is", null).order("received_at", {ascending: true}).range(offset, offset + 99);
    if (error) throw new Error(error.message);
    if (!(data?.length)) break;
    for (const row of data) {
      try { results.push({evidence_item_id: row.id, ...(await processEvidenceDocument(row.id))}); }
      catch (processingError) { results.push({evidence_item_id: row.id, ok: false, error: processingError instanceof Error ? processingError.message : "Processing failed."}); }
      if (results.filter(result => !(result as {skipped?: boolean}).skipped).length >= target) break;
    }
    offset += data.length;
    if (data.length < 100) break;
  }
  return results;
}
