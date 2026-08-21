const MAX_BYTES = 15 * 1024 * 1024;
const DOCUMENT_KINDS = ["order_export","order_summary","settlement_report","payout_notice","credit_note","promotion_confirmation","contract","contract_amendment","adjustment_notice","merchant_confirmation","unknown"] as const;

type RawDraft = Record<string, unknown>;
export type OcrEvidenceDraft = {
  document_kind: typeof DOCUMENT_KINDS[number]; platform: string | null; currency: string | null;
  branch_external_id:string|null;brand:string|null;legal_entity:string|null;
  period_start: string | null; period_end: string | null; payout_total: number | null;
  gross_total: number | null; commission_total: number | null; other_charges_total: number | null;
  adjustment_amount:number|null;adjustment_direction:"credit"|"debit"|"unknown";adjustment_reason:string|null;
  promotion_discount_total:number|null;platform_funding_amount:number|null;merchant_funding_amount:number|null;
  cancellation_amount:number|null;received_amount:number|null;confirmation_reference:string|null;
  order_references: string[]; settlement_references: string[];
  evidence: {field: string; value: string; source_quote: string; page: number | null; confidence: number}[];
  missing_information: string[]; warnings: string[]; confidence: number;
};

const text = (value: unknown, max = 200) => typeof value === "string" && value.trim() ? value.trim().slice(0,max) : null;
const amount = (value: unknown) => typeof value === "number" && Number.isFinite(value) ? Math.round(value * 100) / 100 : null;
const date = (value: unknown) => { const result = text(value,10); return result && /^\d{4}-\d{2}-\d{2}$/.test(result) ? result : null; };
const list = (value: unknown, max: number) => Array.isArray(value) ? value.filter(item => typeof item === "string" && item.trim()).map(item => item.trim().slice(0,180)).slice(0,max) : [];
const confidence = (value: unknown) => Math.max(0,Math.min(1,typeof value === "number" && Number.isFinite(value) ? value : 0));

export function sanitizeOcrEvidenceDraft(raw: RawDraft): OcrEvidenceDraft {
  const evidence = Array.isArray(raw.evidence) ? raw.evidence.flatMap(item => {
    if (!item || typeof item !== "object") return [];
    const row = item as RawDraft, field = text(row.field,80), value = text(row.value,160), source_quote = text(row.source_quote,400);
    if (!field || !value || !source_quote) return [];
    return [{field,value,source_quote,page:Number.isInteger(row.page)&&Number(row.page)>0?Number(row.page):null,confidence:confidence(row.confidence)}];
  }).slice(0,30) : [];
  return {
    document_kind: DOCUMENT_KINDS.includes(String(raw.document_kind) as any) ? raw.document_kind as OcrEvidenceDraft["document_kind"] : "unknown",
    platform: text(raw.platform,80)?.toLowerCase() ?? null, currency: text(raw.currency,12)?.toUpperCase() ?? null,
    branch_external_id:text(raw.branch_external_id,160),brand:text(raw.brand,160),legal_entity:text(raw.legal_entity,200),
    period_start: date(raw.period_start), period_end: date(raw.period_end), payout_total: amount(raw.payout_total),
    gross_total: amount(raw.gross_total), commission_total: amount(raw.commission_total), other_charges_total: amount(raw.other_charges_total),
    adjustment_amount:amount(raw.adjustment_amount),adjustment_direction:["credit","debit"].includes(String(raw.adjustment_direction))?raw.adjustment_direction as "credit"|"debit":"unknown",adjustment_reason:text(raw.adjustment_reason,300),
    promotion_discount_total:amount(raw.promotion_discount_total),platform_funding_amount:amount(raw.platform_funding_amount),merchant_funding_amount:amount(raw.merchant_funding_amount),cancellation_amount:amount(raw.cancellation_amount),received_amount:amount(raw.received_amount),confirmation_reference:text(raw.confirmation_reference,180),
    order_references: list(raw.order_references,200), settlement_references: list(raw.settlement_references,100), evidence,
    missing_information: list(raw.missing_information,20), warnings: list(raw.warnings,20), confidence: confidence(raw.confidence),
  };
}

const TOOL = {
  type:"function", name:"record_evidence_draft", description:"Record only financial evidence visibly supported by the supplied merchant document.", strict:true,
  parameters:{type:"object",additionalProperties:false,properties:{
    document_kind:{type:"string",enum:[...DOCUMENT_KINDS]},platform:{type:["string","null"]},currency:{type:["string","null"]},branch_external_id:{type:["string","null"]},brand:{type:["string","null"]},legal_entity:{type:["string","null"]},
    period_start:{type:["string","null"]},period_end:{type:["string","null"]},payout_total:{type:["number","null"]},gross_total:{type:["number","null"]},commission_total:{type:["number","null"]},other_charges_total:{type:["number","null"]},
    adjustment_amount:{type:["number","null"]},adjustment_direction:{type:"string",enum:["credit","debit","unknown"]},adjustment_reason:{type:["string","null"]},promotion_discount_total:{type:["number","null"]},platform_funding_amount:{type:["number","null"]},merchant_funding_amount:{type:["number","null"]},cancellation_amount:{type:["number","null"]},received_amount:{type:["number","null"]},confirmation_reference:{type:["string","null"]},
    order_references:{type:"array",items:{type:"string"},maxItems:200},settlement_references:{type:"array",items:{type:"string"},maxItems:100},
    evidence:{type:"array",maxItems:30,items:{type:"object",additionalProperties:false,properties:{field:{type:"string"},value:{type:"string"},source_quote:{type:"string"},page:{type:["integer","null"]},confidence:{type:"number",minimum:0,maximum:1}},required:["field","value","source_quote","page","confidence"]}},
    missing_information:{type:"array",items:{type:"string"},maxItems:20},warnings:{type:"array",items:{type:"string"},maxItems:20},confidence:{type:"number",minimum:0,maximum:1},
  },required:["document_kind","platform","currency","branch_external_id","brand","legal_entity","period_start","period_end","payout_total","gross_total","commission_total","other_charges_total","adjustment_amount","adjustment_direction","adjustment_reason","promotion_discount_total","platform_funding_amount","merchant_funding_amount","cancellation_amount","received_amount","confirmation_reference","order_references","settlement_references","evidence","missing_information","warnings","confidence"]},
};

export async function extractOcrEvidenceDraft(input:{bytes:Buffer;mediaType:string;filename:string}) {
  const apiKey=process.env.OPENAI_API_KEY;
  if(!apiKey)return {ok:false as const,error:"OPENAI_API_KEY is not configured for scanned-document review."};
  if(!input.bytes.length||input.bytes.length>MAX_BYTES)return {ok:false as const,error:"The document is empty or exceeds the 15 MB OCR limit."};
  const isPdf=input.mediaType==="application/pdf",isImage=["image/jpeg","image/png","image/webp"].includes(input.mediaType);
  if(!isPdf&&!isImage)return {ok:false as const,error:"This file type is not supported by scanned-document review."};
  const encoded=input.bytes.toString("base64"),model=process.env.OPENAI_DOCUMENT_MODEL||process.env.OPENAI_MODEL||"gpt-5.6-luna";
  const filePart=isPdf?{type:"input_file",filename:input.filename,file_data:encoded}:{type:"input_image",image_url:`data:${input.mediaType};base64,${encoded}`,detail:"high"};
  const response=await fetch("https://api.openai.com/v1/responses",{method:"POST",headers:{Authorization:`Bearer ${apiKey}`,"Content-Type":"application/json"},body:JSON.stringify({model,store:false,instructions:"Extract only facts visibly supported by this merchant financial document. Never infer standard fees, rates, missing order allocations, or a platform identity. Use null and missing_information when absent. Every important amount or date needs a short source quote and page when available. This is a review-required draft, not an approved financial conclusion.",input:[{role:"user",content:[{type:"input_text",text:"Prepare a structured, evidence-backed draft from this document."},filePart]}],tools:[TOOL],tool_choice:{type:"function",name:"record_evidence_draft"},max_output_tokens:5000}),signal:AbortSignal.timeout(90_000)});
  const payload=await response.json().catch(()=>({})) as {output?:Array<{type?:string;name?:string;arguments?:string}>;error?:{message?:string}};
  if(!response.ok)return {ok:false as const,error:payload.error?.message||`Scanned-document review failed (${response.status}).`};
  const call=payload.output?.find(item=>item.type==="function_call"&&item.name==="record_evidence_draft");
  if(!call?.arguments)return {ok:false as const,error:"Scanned-document review returned no structured draft."};
  try{return {ok:true as const,draft:sanitizeOcrEvidenceDraft(JSON.parse(call.arguments) as RawDraft),model};}
  catch{return {ok:false as const,error:"Scanned-document review returned an invalid structured draft."};}
}
