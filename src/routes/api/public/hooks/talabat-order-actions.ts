import { createFileRoute } from "@tanstack/react-router";
import { processDueTalabatOrderActions } from "@/server/core/talabat-order-actions";

export const Route = createFileRoute("/api/public/hooks/talabat-order-actions")({
  server: { handlers: { POST: async ({ request }) => {
    const expected = process.env.CRON_SECRET;
    if (!expected || request.headers.get("authorization") !== `Bearer ${expected}`)
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    const result = await processDueTalabatOrderActions();
    return Response.json({ ok: result.failed === 0, ...result }, { status: result.failed === 0 ? 200 : 207 });
  } } },
});
