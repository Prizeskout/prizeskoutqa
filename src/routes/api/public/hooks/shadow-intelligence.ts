import { createFileRoute } from "@tanstack/react-router";
import { runShadowIntelligence } from "@/server/core/shadow-intelligence";

export const Route=createFileRoute("/api/public/hooks/shadow-intelligence")({server:{handlers:{POST:async({request})=>{
  const expected=process.env.CRON_SECRET;
  if(!expected||request.headers.get("authorization")!==`Bearer ${expected}`)return new Response("Unauthorized",{status:401});
  try{return Response.json(await runShadowIntelligence(100));}
  catch(error){
    const message=error instanceof Error?error.message:String(error);
    console.error("[shadow-intelligence] isolated runner failed",message);
    return Response.json({enabled:true,recorded:0,error:"The research run could not be completed. Live pricing was not affected."},{status:500});
  }
}}}});
