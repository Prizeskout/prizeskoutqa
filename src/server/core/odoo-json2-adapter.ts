import { assertSafePublicHttpsUrl } from "@/server/safe-outbound-url";
import type { SourceOrderRecord } from "./evidence-source-sync";

type JsonObject = Record<string, unknown>;
type OdooCursor = { writeDate: string; id: number };

const object = (value:unknown):JsonObject|null => value!==null&&typeof value==="object"&&!Array.isArray(value)?value as JsonObject:null;
const text = (value:unknown) => typeof value === "string" ? value.trim() : "";
const amount = (value:unknown) => { const parsed=Number(value); return Number.isFinite(parsed)?Math.round(parsed*100)/100:null; };
const relationId = (value:unknown) => Array.isArray(value)&&value.length?String(value[0]):typeof value==="number"||typeof value==="string"?String(value):null;
const odooDate = (value:string) => /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(value) ? `${value.replace(" ","T")}Z` : value;

export function parseOdooCursor(value:string|null|undefined):OdooCursor|null{
  if(!value)return null;
  try{const parsed=JSON.parse(Buffer.from(value,"base64url").toString("utf8")) as OdooCursor;
    return parsed&&Number.isInteger(parsed.id)&&parsed.id>0&&Number.isFinite(Date.parse(odooDate(parsed.writeDate)))?parsed:null;
  }catch{return null;}
}

export function encodeOdooCursor(value:OdooCursor){return Buffer.from(JSON.stringify(value)).toString("base64url");}

/** Maps only financial/order fields documented by the merchant's own Odoo model metadata. */
export function mapOdooPosOrder(value:unknown,currency:string):SourceOrderRecord|null{
  const row=object(value),id=Number(row?.id),orderId=text(row?.name),occurred=text(row?.date_order),writeDate=text(row?.write_date);
  const total=amount(row?.amount_total),tax=amount(row?.amount_tax),state=text(row?.state);
  if(!row||!Number.isInteger(id)||id<=0||!orderId||!occurred||!writeDate||total===null||tax===null||!Number.isFinite(Date.parse(odooDate(occurred)))||!Number.isFinite(Date.parse(odooDate(writeDate))))return null;
  const normalizedCurrency=currency.trim().toUpperCase();
  if(!/^[A-Z]{3}$/.test(normalizedCurrency))return null;
  const isRefund=total<0;
  return {external_event_id:`odoo-pos-order:${id}:${writeDate}`,order_id:orderId,occurred_at:new Date(odooDate(occurred)).toISOString(),channel:"odoo",
    branch_external_id:relationId(row.config_id),currency:normalizedCurrency,gross_amount:Math.abs(total),
    tax_amount:Math.abs(tax),refund_amount:isRefund?Math.abs(total):0,status:state||"unknown",final:["paid","done","invoiced","cancel"].includes(state)};
}

export async function fetchOdooPosOrders(input:{baseUrl:string;apiKey:string;database?:string|null;currency:string;cursor?:string|null;fetchImpl?:typeof fetch;pageSize?:number}){
  const base=assertSafePublicHttpsUrl(input.baseUrl),apiKey=input.apiKey.trim();
  if(!apiKey)throw new Error("Odoo API key is required.");
  const pageSize=Math.min(Math.max(Math.floor(input.pageSize??100),1),500),cursor=parseOdooCursor(input.cursor),domain:unknown[]=[];
  if(cursor)domain.push("|",["write_date",">",cursor.writeDate],"&",["write_date","=",cursor.writeDate],["id",">",cursor.id]);
  const endpoint=new URL("/json/2/pos.order/search_read",base);
  const response=await (input.fetchImpl??fetch)(endpoint,{method:"POST",headers:{Authorization:`bearer ${apiKey}`,"Content-Type":"application/json; charset=utf-8",Accept:"application/json","User-Agent":"PrizeSkout-Odoo-Connector/1.0",...(input.database?.trim()?{"X-Odoo-Database":input.database.trim()}:{})},
    body:JSON.stringify({domain,fields:["id","name","date_order","write_date","amount_total","amount_tax","state","company_id","config_id"],order:"write_date asc, id asc",limit:pageSize})});
  if(!response.ok)throw new Error(`Odoo JSON-2 order read failed with HTTP ${response.status}.`);
  const payload=await response.json() as unknown;
  if(!Array.isArray(payload))throw new Error("Odoo JSON-2 returned an invalid order collection.");
  const records=payload.map(row=>mapOdooPosOrder(row,input.currency)).filter((row):row is SourceOrderRecord=>Boolean(row));
  const last=payload.length?object(payload.at(-1)):null,lastId=Number(last?.id),lastWriteDate=text(last?.write_date);
  const cursorAfter=last&&Number.isInteger(lastId)&&lastWriteDate?encodeOdooCursor({writeDate:lastWriteDate,id:lastId}):input.cursor??null;
  return {records,cursorAfter,deliveryComplete:payload.length<pageSize,recordsSeen:payload.length};
}
