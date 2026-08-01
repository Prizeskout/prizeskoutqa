import {createFileRoute} from "@tanstack/react-router";
import {recordLiveConfirmation} from "@/server/core/dispatch-queue";
export const Route=createFileRoute("/api/public/hooks/dispatch-confirmation")({server:{handlers:{POST:async({request})=>{
  if(!process.env.CRON_SECRET||request.headers.get("authorization")!==`Bearer ${process.env.CRON_SECRET}`)return new Response("Unauthorized",{status:401});
  const body=await request.json() as {queue_id?:string;live_price?:number;confirmed_by?:string};
  if(!body.queue_id||!Number.isFinite(body.live_price))return Response.json({error:"queue_id and live_price required"},{status:422});
  return Response.json(await recordLiveConfirmation({queueId:body.queue_id,livePrice:Number(body.live_price),confirmedBy:body.confirmed_by??"partner_readback"}));
}}}});
