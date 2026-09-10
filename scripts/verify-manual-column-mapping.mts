import assert from "node:assert/strict";
import {csvHeaders,parseColumnMapping,remapCsvHeader} from "../src/lib/manual-column-mapping";
const source='Reference,"Order Date",Subtotal,Fee\nA-1,2026-09-01,100,20';
const headers=csvHeaders(source);assert.deepEqual(headers,["Reference","Order Date","Subtotal","Fee"]);
const mapping=parseColumnMapping("order_id=Reference,date=Order Date,gross_amount=Subtotal,commission=Fee",headers);
assert.equal(remapCsvHeader(source,mapping).split("\n")[0],"order_id,date,gross_amount,commission");
assert.throws(()=>parseColumnMapping("order_id=Reference",headers));
console.log("Manual upload column mapping verified.");
