import {createFileRoute} from "@tanstack/react-router";
import {supabaseAdmin} from "@/integrations/supabase/client.server";

type Job={id:string;account_id:string;target_id:string;target_name:string;action_type:string;payload:Record<string,unknown>;attempts:number;max_attempts:number};
const productName=(p:Record<string,unknown>)=>typeof p.name==="object"&&p.name?String((p.name as Record<string,unknown>).en??(p.name as Record<string,unknown>).ar??""):String(p.name??"");

async function run(job:Job){
  const {data:channel}=await supabaseAdmin.from("ps_merchant_channels").select("bearer_token,manager_token,metadata,status").eq("account_id",job.account_id).eq("platform","zid").maybeSingle();
  if(!channel||channel.status!=="connected"||!channel.bearer_token)throw new Error("Zid connection is unavailable");
  const meta=(channel.metadata??{}) as Record<string,unknown>,headers:Record<string,string>={Authorization:channel.bearer_token.startsWith("Bearer ")?channel.bearer_token:`Bearer ${channel.bearer_token}`,"X-Manager-Token":channel.manager_token??"","Access-Token":channel.manager_token??"",...(meta.store_id?{"Store-Id":String(meta.store_id)}:{}),Role:"Manager",Accept:"application/json","Content-Type":"application/json"};
  const patch:Record<string,unknown>=job.action_type==="publish_product"?{is_published:true,is_draft:false}:job.action_type==="unpublish_product"?{is_published:false,is_draft:true}:job.action_type==="set_product_price"?{price:Number(job.payload.price)}:{quantity:Number(job.payload.quantity),is_infinite:false};
  const response=await fetch(`https://api.zid.sa/v1/products/${encodeURIComponent(job.target_id)}/`,{method:"PATCH",headers,body:JSON.stringify(patch)});
  if(!response.ok)throw new Error(`Zid rejected scheduled action (${response.status}): ${(await response.text()).slice(0,180)}`);
  const check=await fetch(`https://api.zid.sa/v1/products/${encodeURIComponent(job.target_id)}/`,{headers}),product=await check.json().catch(()=>null) as Record<string,unknown>|null;
  const confirmed=Boolean(check.ok&&product&&productName(product)===job.target_name&&(job.action_type==="publish_product"?Boolean(product.is_published??!product.is_draft):job.action_type==="unpublish_product"?!Boolean(product.is_published??!product.is_draft):job.action_type==="set_product_price"?Math.abs(Number(product.price)-Number(job.payload.price))<.01:Number(product.quantity)===Number(job.payload.quantity)));
  if(!confirmed)throw new Error("Zid accepted the action but readback did not confirm it");
  return {confirmed:true,product_id:job.target_id,product_name:job.target_name,action:job.action_type,readback:product};
}

export const Route=createFileRoute("/api/public/hooks/copilot-schedules")({server:{handlers:{POST:async({request})=>{
  const expected=process.env.CRON_SECRET;if(!expected||request.headers.get("authorization")!==`Bearer ${expected}`)return new Response("Unauthorized",{status:401});
  const owner=crypto.randomUUID(),{data}=await (supabaseAdmin as any).rpc("ps_lease_copilot_scheduled_actions",{p_owner:owner,p_limit:10});const jobs=(data??[]) as Job[],results=[];
  for(const job of jobs){try{const result=await run(job);await (supabaseAdmin as any).from("ps_copilot_scheduled_actions").update({state:"completed",result,completed_at:new Date().toISOString(),lease_owner:null,lease_expires_at:null,updated_at:new Date().toISOString()}).eq("id",job.id);results.push({id:job.id,ok:true});}catch(error){const dead=job.attempts>=job.max_attempts;await (supabaseAdmin as any).from("ps_copilot_scheduled_actions").update({state:dead?"dead_letter":"queued",last_error:error instanceof Error?error.message:String(error),available_at:new Date(Date.now()+Math.min(3600,30*2**job.attempts)*1000).toISOString(),lease_owner:null,lease_expires_at:null,updated_at:new Date().toISOString()}).eq("id",job.id);results.push({id:job.id,ok:false,dead_letter:dead});}}
  return Response.json({ok:true,processed:jobs.length,results});
}}}});
