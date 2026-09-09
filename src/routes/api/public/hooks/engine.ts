import { timingSafeEqual } from "node:crypto";
import { createFileRoute } from "@tanstack/react-router";
import { processEngineQueue } from "@/server/core/engine-orchestrator";

const authorized=(request:Request)=>{const expected=Buffer.from(process.env.CRON_SECRET??""),actual=Buffer.from(request.headers.get("authorization")?.replace(/^Bearer\s+/i,"")??"");return expected.length>0&&expected.length===actual.length&&timingSafeEqual(expected,actual);};
export const Route=createFileRoute("/api/public/hooks/engine")({server:{handlers:{POST:async({request})=>{
  if(!authorized(request))return Response.json({error:"Unauthorized"},{status:401});
  const body=await request.json().catch(()=>({})) as {limit?:number};
  try{return Response.json({ok:true,...await processEngineQueue(crypto.randomUUID(),Number(body.limit)||20)});}catch(error){return Response.json({error:error instanceof Error?error.message:"Engine processing failed"},{status:500});}
}}}});
