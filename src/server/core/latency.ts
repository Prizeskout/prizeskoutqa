import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { Json } from "@/integrations/supabase/types";

export async function measured<T>(input:{traceId:string;accountId:string;stage:string;attributes?:Record<string,unknown>},work:()=>Promise<T>):Promise<T>{
  const started=performance.now(); let success=false;
  try{const value=await work();success=true;return value;}
  finally{await supabaseAdmin.from("ps_latency_spans").insert({trace_id:input.traceId,account_id:input.accountId,stage:input.stage,duration_ms:Math.round(performance.now()-started),success,attributes:(input.attributes??{}) as Json});}
}
