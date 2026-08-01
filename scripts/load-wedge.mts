import {performance} from "node:perf_hooks";

const url=process.env.LOAD_URL;
const token=process.env.LOAD_TOKEN;
const requests=Math.max(1,Number(process.env.LOAD_REQUESTS??500));
const concurrency=Math.max(1,Number(process.env.LOAD_CONCURRENCY??20));
if(!url||!token) throw new Error("Set LOAD_URL and LOAD_TOKEN. Point only at an authorized staging environment.");
const durations:number[]=[]; let failures=0; let cursor=0;
async function worker(){while(cursor<requests){const n=cursor++;const started=performance.now();try{const response=await fetch(url,{method:"POST",headers:{authorization:`Bearer ${token}`,"content-type":"application/json","x-idempotency-key":crypto.randomUUID(),"x-region":"SA"},body:JSON.stringify({event_id:`load-${Date.now()}-${n}`,timestamp:new Date().toISOString(),merchant_id:process.env.LOAD_MERCHANT_ID??"load-test",source_platform:"salla",data:{sku:`LOAD-${n%50}`,financials:{base_cost:10,current_retail_price:20,currency:"SAR"}}})});if(!response.ok)failures++;}catch{failures++;}finally{durations.push(performance.now()-started);}}}
await Promise.all(Array.from({length:concurrency},worker));durations.sort((a,b)=>a-b);
const percentile=(p:number)=>durations[Math.min(durations.length-1,Math.ceil(p*durations.length)-1)];
console.log(JSON.stringify({requests,concurrency,failures,success_rate:(requests-failures)/requests,p50_ms:Math.round(percentile(.5)),p95_ms:Math.round(percentile(.95)),p99_ms:Math.round(percentile(.99)),max_ms:Math.round(durations.at(-1)??0)},null,2));
if(failures/requests>.01)process.exitCode=1;
