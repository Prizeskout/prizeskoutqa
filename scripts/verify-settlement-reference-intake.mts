import assert from "node:assert/strict";
import {parseAggregatorDailyCsv} from "../src/server/core/payout-csv-parser.ts";

const parsed=parseAggregatorDailyCsv("Date,Order ID,Sales,Status,Settlement Reference,Net Payout,Currency\n2026-08-01,O-1,100,completed,S-1,80,QAR",20,"talabat");
assert.equal(parsed.ok,true);
assert.deepEqual(parsed.settlement_rows,[{settlement_reference:"S-1",order_id:"O-1",amount:80,currency:"QAR"}]);
assert.equal(parsed.currency,"QAR");
assert.equal(parseAggregatorDailyCsv("Date,Order ID,Sales\n2026-08-01,O-1,100",0,"zid").expected_payout,100);
const genericReference=parseAggregatorDailyCsv("Date,Reference,Sales\n2026-08-01,O-1,100",10,"talabat");
assert.equal(genericReference.ok,false,"A generic Reference column must not be guessed as an order ID.");
console.log("Explicit settlement references, currency, zero commission, and anti-guessing controls verified.");
