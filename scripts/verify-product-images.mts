import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";
import { deflateSync } from "node:zlib";

assert.equal(process.env.RUN_LIVE_IMAGE_TEST,"true","Set RUN_LIVE_IMAGE_TEST=true to acknowledge this temporary connected-store mutation.");
const baseUrl=process.env.E2E_BASE_URL??"http://127.0.0.1:4177";
const supabaseUrl=process.env.SUPABASE_URL,serviceKey=process.env.SUPABASE_SERVICE_ROLE_KEY;
assert(supabaseUrl&&serviceKey,"SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.");
const admin=createClient(supabaseUrl,serviceKey);

const {data:channels,error:channelError}=await admin.from("ps_merchant_channels").select("account_id,bearer_token,manager_token,metadata").eq("platform","zid").eq("status","connected").not("bearer_token","is",null).limit(20);
assert(!channelError&&channels?.length,"No connected store is available for the live image test.");
let selected:{accountId:string;code:string;headers:Record<string,string>;query:string;productId:string}|null=null;
for(const channel of channels){
  const {data:access}=await admin.from("ps_access_codes").select("code").eq("merchant_id",channel.account_id).limit(1).maybeSingle();
  if(!access?.code)continue;
  const metadata=(channel.metadata??{}) as Record<string,unknown>,headers:Record<string,string>={Authorization:String(channel.bearer_token).startsWith("Bearer ")?String(channel.bearer_token):`Bearer ${channel.bearer_token}`,"X-Manager-Token":channel.manager_token??"","Access-Token":channel.manager_token??"",Role:"Manager",Accept:"application/json","Accept-Language":"en"};
  if(metadata.store_id)headers["Store-Id"]=String(metadata.store_id);
  const response=await fetch("https://api.zid.sa/v1/products/?page=1&page_size=100",{headers});if(!response.ok)continue;
  const payload=await response.json() as Record<string,unknown>,products=(Array.isArray(payload.products)?payload.products:Array.isArray(payload.results)?payload.results:[]) as Array<Record<string,unknown>>;
  const skuCounts=new Map<string,number>();for(const product of products){const sku=String(product.sku??"").trim();if(sku)skuCounts.set(sku,(skuCounts.get(sku)??0)+1);}
  const product=products.find(item=>{const sku=String(item.sku??"").trim();return sku&&skuCounts.get(sku)===1;});if(!product)continue;
  selected={accountId:channel.account_id,code:access.code,headers,query:String(product.sku),productId:String(product.id)};break;
}
assert(selected,"No connected store with a uniquely identifiable product was found.");

const galleryUrl=`https://api.zid.sa/v1/products/${encodeURIComponent(selected.productId)}/images/`;
const existingResponse=await fetch(galleryUrl,{headers:selected.headers}),existingPayload=await existingResponse.json() as Record<string,unknown>,existingImages=(Array.isArray(existingPayload.images)?existingPayload.images:Array.isArray(existingPayload.results)?existingPayload.results:[]) as Array<Record<string,unknown>>;
for(const image of existingImages.filter(item=>JSON.stringify(item).includes("PrizeSkout temporary verification image"))){const id=String(image.id??"");if(id)await fetch(`${galleryUrl}${encodeURIComponent(id)}/`,{method:"DELETE",headers:selected.headers});}

let jobId="",managerTaskId="";
try{
  const crc=(input:Buffer)=>{let value=0xffffffff;for(const byte of input){value^=byte;for(let bit=0;bit<8;bit++)value=(value>>>1)^((value&1)?0xedb88320:0);}return(value^0xffffffff)>>>0;},chunk=(name:string,data:Buffer)=>{const type=Buffer.from(name),size=Buffer.alloc(4),sum=Buffer.alloc(4);size.writeUInt32BE(data.length);sum.writeUInt32BE(crc(Buffer.concat([type,data])));return Buffer.concat([size,type,data,sum]);};
  const width=1000,height=1000,header=Buffer.alloc(13);header.writeUInt32BE(width,0);header.writeUInt32BE(height,4);header[8]=8;header[9]=2;const row=Buffer.alloc(1+width*3);for(let x=0;x<width;x++){row[1+x*3]=239;row[2+x*3]=104;row[3+x*3]=26;}const pixels=Buffer.concat(Array.from({length:height},()=>row));const png=Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk("IHDR",header),chunk("IDAT",deflateSync(pixels)),chunk("IEND",Buffer.alloc(0))]);
  const form=new FormData();form.set("merchant_id",selected.accountId);form.set("access_code",selected.code);form.set("product_query",selected.query);form.set("alt_text","PrizeSkout temporary verification image");form.append("images",new File([png],"prizeskout-live-verification.png",{type:"image/png"}));
  const createdResponse=await fetch(`${baseUrl}/api/copilot/images`,{method:"POST",body:form}),created=await createdResponse.json() as any;
  assert.equal(createdResponse.status,200,`Image job creation failed: ${created.error??"unknown error"}`);jobId=created.job.id;managerTaskId=created.job.manager_task_id??"";assert.equal(created.job.status,"matched");

  const call=async(body:Record<string,string>)=>{const response=await fetch(`${baseUrl}/api/copilot/images`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({merchant_id:selected!.accountId,access_code:selected!.code,...body})});return{response,payload:await response.json() as any};};
  const preview=await call({action:"preview",job_id:jobId});assert.equal(preview.response.status,200,`Preview failed: ${preview.payload.error??"unknown error"}`);assert(preview.payload.preview.approval_token);
  const applied=await call({action:"apply",approval_token:preview.payload.preview.approval_token});if(!applied.payload.confirmed){console.error("Live verification detail:",JSON.stringify(applied.payload.results??[]));const emergencyRollback=await call({action:"rollback",job_id:jobId});console.error("Emergency rollback detail:",JSON.stringify(emergencyRollback.payload.results??[]));}assert.equal(applied.response.status,200,`Apply/verification failed: ${applied.payload.error??applied.payload.message??"unknown error"}`);assert.equal(applied.payload.confirmed,true);
  const rolledBack=await call({action:"rollback",job_id:jobId});assert.equal(rolledBack.response.status,200,`Rollback failed: ${rolledBack.payload.error??rolledBack.payload.message??"unknown error"}`);assert.equal(rolledBack.payload.confirmed,true);
  console.log("PASS private upload, exact product matching, signed approval, connected-store upload, live read-back verification, and confirmed rollback");
}finally{
  if(jobId){const {data:items}=await admin.from("ps_product_image_items" as never).select("storage_path").eq("job_id",jobId) as any;const paths=(items??[]).map((item:{storage_path:string})=>item.storage_path);if(paths.length)await admin.storage.from("product-image-jobs").remove(paths);await admin.from("ps_product_image_jobs" as never).delete().eq("id",jobId);}
  if(managerTaskId)await admin.from("ps_store_manager_tasks" as never).delete().eq("id",managerTaskId);
}
