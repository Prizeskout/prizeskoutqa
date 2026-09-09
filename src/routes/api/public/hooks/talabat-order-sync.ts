import { createFileRoute } from "@tanstack/react-router";
import { syncConnectedTalabatOrders } from "@/server/core/talabat-order-sync";

export const Route = createFileRoute("/api/public/hooks/talabat-order-sync")({
  server: { handlers: { POST: async ({ request }) => {
    const expected = process.env.CRON_SECRET;
    if (!expected || request.headers.get("authorization") !== `Bearer ${expected}`)
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    let pastHours = 24;
    try { const body = await request.json() as { past_hours?: number }; pastHours = Number(body.past_hours ?? 24); }
    catch { /* An empty scheduler body uses the documented 24-hour window. */ }
    const result = await syncConnectedTalabatOrders(pastHours);
    return Response.json({ ok: result.failed === 0, ...result }, { status: result.failed === 0 ? 200 : 207 });
  } } },
});
