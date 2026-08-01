import { createFileRoute } from "@tanstack/react-router";
import { processDispatchQueue } from "@/server/core/dispatch-queue";

export const Route=createFileRoute("/api/public/hooks/dispatch-queue")({server:{handlers:{POST:async({request})=>{
  const expected=process.env.CRON_SECRET;
  if(!expected||request.headers.get("authorization")!==`Bearer ${expected}`) return new Response("Unauthorized",{status:401});
  const results=await processDispatchQueue(crypto.randomUUID(),10);
  return Response.json({ok:true,processed:results.length,results});
}}}});
