import assert from "node:assert/strict";
import {applyMinimumPayoutThreshold,expectedSettlementDate} from "../src/server/core/settlement-calendar.ts";

const terms={settlementDays:2,dayBasis:"business_days" as const,scheduleType:"weekly" as const,weekday:4,monthDays:[],cutoffHour:17,timeZone:"Asia/Riyadh",weekendDays:[5,6],holidays:[],reserveDays:0,minimumPayoutThreshold:null};
assert.equal(expectedSettlementDate("2026-08-16T10:00:00Z",terms).date,"2026-08-20");
assert.ok(expectedSettlementDate("2026-08-16T10:00:00Z",{...terms,timeZone:null}).blockers.some(item=>item.includes("timezone")));
assert.deepEqual(applyMinimumPayoutThreshold([{date:"2026-08-01",amount:40,orders:1},{date:"2026-08-08",amount:70,orders:2}],100),{rows:[{date:"2026-08-08",amount:110,orders:3}],heldAmount:0});
console.log("Settlement business-day, batching, cutoff, and threshold rules verified.");
