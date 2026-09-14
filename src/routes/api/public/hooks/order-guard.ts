import { createFileRoute } from "@tanstack/react-router";
import { sweepOrderGuard } from "@/server/core/order-guard";

async function run(request: Request) {
  const expected = process.env.CRON_SECRET?.trim();
  if (!expected)
    return Response.json({ error: "Order Guard scheduler is not configured." }, { status: 503 });
  const supplied = request.headers
    .get("authorization")
    ?.replace(/^Bearer\s+/i, "")
    .trim();
  if (supplied !== expected) return Response.json({ error: "Unauthorized." }, { status: 401 });
  try {
    return Response.json({ ok: true, ...(await sweepOrderGuard()) });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Order Guard sweep failed." },
      { status: 500 },
    );
  }
}

export const Route = createFileRoute("/api/public/hooks/order-guard")({
  server: { handlers: { POST: ({ request }) => run(request) } },
});
