import type {TalabatOrder} from "./talabat-client";

export type OrderEligibility="eligible"|"cancelled"|"refunded"|"pending"|"unknown";

const text=(value:unknown):string=>{
  if(typeof value==="string")return value.trim().toLowerCase();
  if(value&&typeof value==="object"){
    const row=value as Record<string,unknown>;
    return text(row.code??row.name??row.status??row.value);
  }
  return "";
};
const amount=(...values:unknown[])=>{
  for(const value of values){const parsed=typeof value==="number"?value:Number(value);if(Number.isFinite(parsed)&&parsed>=0)return parsed;}
  return 0;
};

export function orderIdentity(order:TalabatOrder){
  return String(order.order_id??order.order_code??"").trim()||null;
}

export function classifyOrder(order:TalabatOrder):{status:string;eligibility:OrderEligibility;refundAmount:number;final:boolean}{
  const row=order as Record<string,unknown>,payment=(order.payment??{}) as Record<string,unknown>;
  const status=text(row.order_status??row.status??row.state??row.delivery_status??row.fulfilment_status);
  const refundAmount=amount(payment.refund_amount,payment.refunded_amount,row.refund_amount,row.refunded_amount);
  if(/cancel|reject|void|failed/.test(status))return {status:status||"cancelled",eligibility:"cancelled",refundAmount,final:true};
  if(refundAmount>0||/refund|chargeback|revers/.test(status))return {status:status||"refunded",eligibility:"refunded",refundAmount,final:true};
  if(/deliver|complete|settled|closed|fulfilled/.test(status))return {status,eligibility:"eligible",refundAmount:0,final:true};
  if(/pending|accept|prepar|dispatch|ready|confirm|new|open/.test(status))return {status,eligibility:"pending",refundAmount,final:false};
  return {status:status||"not supplied",eligibility:"unknown",refundAmount,final:false};
}

export function commissionBaseForOrder(order:TalabatOrder,subTotal:number,basis:string){
  const payment=(order.payment??{}) as Record<string,unknown>;
  if(basis==="net_after_discount")return {amount:subTotal,evidenced:true};
  if(basis==="gross_before_discount"){
    const gross=amount(payment.gross_before_discount,payment.gross_amount,payment.menu_total,payment.items_total_before_discount);
    return gross>0?{amount:gross,evidenced:true}:{amount:subTotal,evidenced:false};
  }
  if(basis==="eligible_sales"){
    const eligible=amount(payment.eligible_sales,payment.commissionable_amount);
    return eligible>0?{amount:eligible,evidenced:true}:{amount:subTotal,evidenced:false};
  }
  return {amount:subTotal,evidenced:false};
}

export function duplicateOrderIds(orders:TalabatOrder[]){
  const counts=new Map<string,number>();
  for(const order of orders){const id=orderIdentity(order);if(id)counts.set(id,(counts.get(id)??0)+1);}
  return new Set([...counts].filter(([,count])=>count>1).map(([id])=>id));
}
