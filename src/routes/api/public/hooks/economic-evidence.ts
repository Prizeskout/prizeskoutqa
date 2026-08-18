import {createFileRoute} from "@tanstack/react-router";
import {collectEconomicEvidence} from "@/server/core/economic-evidence-collector";

export const Route=createFileRoute("/api/public/hooks/economic-evidence")({server:{handlers:{POST:async({request})=>{
  const expected=process.env.CRON_SECRET;
  if(!expected||request.headers.get("authorization")!==`Bearer ${expected}`)return new Response("Unauthorized",{status:401});
  try{return Response.json(await collectEconomicEvidence(100));}
  catch(error){
    const message=error instanceof Error?error.message:String(error);
    console.error("[economic-evidence] isolated collector failed",message);
    return Response.json({enabled:true,evaluated:0,observations:0,error:"Economic evidence could not be collected. Live pricing and merchant operations were not affected."},{status:500});
  }
}}}});
