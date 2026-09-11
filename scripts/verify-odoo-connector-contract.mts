import assert from "node:assert/strict";
import { encodeOdooCursor, fetchOdooPosOrders, mapOdooPosOrder, parseOdooCursor } from "../src/server/core/odoo-json2-adapter";

const fixture={id:42,name:"Order 0042",date_order:"2026-09-11T09:00:00Z",write_date:"2026-09-11T09:05:00Z",amount_total:125.5,amount_tax:0,state:"paid",config_id:[7,"West Bay"]};
const mapped=mapOdooPosOrder(fixture,"QAR");
assert.equal(mapped?.order_id,"Order 0042");
assert.equal(mapped?.branch_external_id,"7");
assert.equal(mapped?.gross_amount,125.5);
const encoded=encodeOdooCursor({writeDate:fixture.write_date,id:fixture.id});
assert.deepEqual(parseOdooCursor(encoded),{writeDate:fixture.write_date,id:fixture.id});
let request:Request|undefined;
const page=await fetchOdooPosOrders({baseUrl:"https://merchant.example.com",apiKey:"test-only",database:"merchant",currency:"QAR",fetchImpl:async(input,init)=>{
  request=new Request(input,init);return new Response(JSON.stringify([fixture]),{status:200,headers:{"Content-Type":"application/json"}});
},pageSize:100});
assert.equal(request?.url,"https://merchant.example.com/json/2/pos.order/search_read");
assert.equal(request?.headers.get("authorization"),"bearer test-only");
assert.equal(request?.headers.get("x-odoo-database"),"merchant");
const body=JSON.parse(await request!.text());
assert.deepEqual(body.fields,["id","name","date_order","write_date","amount_total","amount_tax","state","company_id","config_id"]);
assert.equal(page.records.length,1);
assert.equal(page.deliveryComplete,true);
assert.equal(mapOdooPosOrder({...fixture,amount_total:"unknown"},"QAR"),null);
console.log("Odoo JSON-2 connector contract verification passed.");
