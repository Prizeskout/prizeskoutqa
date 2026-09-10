import {timingSafeEqual} from "node:crypto";
import {createFileRoute} from "@tanstack/react-router";
import {pullDueEvidenceSources} from "@/server/core/evidence-source-pull";

const authorized = (request: Request) => {
  const configured = process.env.EVIDENCE_SOURCE_PULL_SECRET ?? "";
  const provided = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  const expected = Buffer.from(configured), actual = Buffer.from(provided);
  return Boolean(configured && provided && expected.length === actual.length && timingSafeEqual(expected, actual));
};

export const Route = createFileRoute("/api/public/hooks/evidence-source-pull")({server:{handlers:{
  POST: async ({request}) => {
    if (!process.env.EVIDENCE_SOURCE_PULL_SECRET) return Response.json({error: "Evidence source pulling is not configured."}, {status: 503});
    if (!authorized(request)) return Response.json({error: "Unauthorized"}, {status: 401});
    try {
      const body = await request.json().catch(() => ({})) as {limit?: number};
      return Response.json({ok: true, ...await pullDueEvidenceSources(Number(body.limit) || 10)});
    } catch (error) {
      return Response.json({error: error instanceof Error ? error.message : "Evidence source pull failed."}, {status: 500});
    }
  },
}}});
