import {createHash} from "node:crypto";

export type EvidenceLayoutProfile="talabat_payout_metadata_v1"|"order_transaction_v1"|"daily_order_summary_v1";
export type EvidenceLayoutDetection={supported:boolean;profile:EvidenceLayoutProfile|null;headerRow:number;formatFingerprint:string;headers:string[];reason:string|null};

const parseDelimitedLine=(line:string)=>{
  const delimiter=line.includes("\t")?"\t":line.includes(";")&&!line.includes(",")?";":",";
  const cells:string[]=[];let value="",quoted=false;
  for(let i=0;i<line.length;i++){const char=line[i];if(quoted){if(char==='"'){if(line[i+1]==='"'){value+='"';i++;}else quoted=false;}else value+=char;}else if(char==='"')quoted=true;else if(char===delimiter){cells.push(value.trim());value="";}else value+=char;}
  cells.push(value.trim());return cells;
};
const normalized=(value:string)=>value.toLowerCase().replace(/^\ufeff/,"").replace(/[^a-z0-9]+/g," ").trim();
const fingerprint=(headers:string[])=>createHash("sha256").update(headers.map(normalized).join("|")).digest("hex");
const has=(headers:string[],aliases:string[])=>aliases.some(alias=>headers.includes(alias));

/**
 * Exact, versioned header families only. New or changed layouts stop for
 * merchant review instead of falling through to fuzzy financial parsing.
 */
export function detectEvidenceLayout(text:string):EvidenceLayoutDetection{
  const lines=text.replace(/^\ufeff/,"").split(/\r?\n/).filter(line=>line.trim()).slice(0,3);
  if(!lines.length)return {supported:false,profile:null,headerRow:0,formatFingerprint:fingerprint([]),headers:[],reason:"The document has no header row."};
  const first=parseDelimitedLine(lines[0]).map(normalized),second=lines[1]?parseDelimitedLine(lines[1]).map(normalized):[];
  const talabatHeader=second,looksTalabat=first.includes("payout metadata")&&has(talabatHeader,["earnings range"])&&has(talabatHeader,["orders count"])&&has(talabatHeader,["total payout"])&&has(talabatHeader,["gross sales"]);
  if(looksTalabat)return {supported:true,profile:"talabat_payout_metadata_v1",headerRow:2,formatFingerprint:fingerprint(talabatHeader),headers:talabatHeader,reason:null};
  const orderId=["order id","order number","transaction id"],date=["date","order date","transaction date"],sales=["sales","gmv","revenue","total sales","gross sales"];
  if(has(first,orderId)&&has(first,date)&&has(first,sales))return {supported:true,profile:"order_transaction_v1",headerRow:1,formatFingerprint:fingerprint(first),headers:first,reason:null};
  if(has(first,["orders","order count","orders count"])&&has(first,date)&&has(first,sales))return {supported:true,profile:"daily_order_summary_v1",headerRow:1,formatFingerprint:fingerprint(first),headers:first,reason:null};
  return {supported:false,profile:null,headerRow:1,formatFingerprint:fingerprint(first),headers:first,reason:"The column layout is new or unsupported and requires review."};
}
