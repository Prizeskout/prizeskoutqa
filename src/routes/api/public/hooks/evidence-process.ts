import {timingSafeEqual} from "node:crypto";
import {createFileRoute} from "@tanstack/react-router";
import {processEvidenceQueue} from "@/server/core/evidence-document-processor";

const response = (data: unknown, status = 200) => new Response(JSON.stringify(data), {status, headers: {"Content-Type": "application/json"}});
const authorized = (request: Request) => {
  const secret = process.env.EVIDENCE_PROCESSOR_SECRET || "";
  const supplied = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") || "";
  const expectedBytes = Buffer.from(secret), suppliedBytes = Buffer.from(supplied);
  return Boolean(secret && supplied && expectedBytes.length === suppliedBytes.length && timingSafeEqual(expectedBytes, suppliedBytes));
};

export const Route = createFileRoute("/api/public/hooks/evidence-process")({server:{handlers:{
  POST: async ({request}) => { try {
    if (!process.env.EVIDENCE_PROCESSOR_SECRET) return response({error: "Evidence processing is not configured."}, 503);
    if (!authorized(request)) return response({error: "Unauthorized"}, 401);
    const body = await request.json().catch(() => ({})) as {limit?: number};
    const result = await processEvidenceQueue(Number(body.limit) || 20);
    return response({ok: true, ...result});
  } catch (error) { return response({error: error instanceof Error ? error.message : "Evidence processing failed."}, 500); }
  },
}}});
