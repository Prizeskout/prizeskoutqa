// Flash Sale end hook — completes events whose end_at <= now, restores prices.
//
// Schedule via pg_cron every minute:
//   SELECT cron.schedule('flash-end', '* * * * *', $$
//     SELECT net.http_post(
//       url     := 'https://prizeskoutqa.prizeskoutqatar.workers.dev/api/public/hooks/flash-end',
//       headers := '{"Authorization":"Bearer <SUPABASE_PUBLISHABLE_KEY>"}'::jsonb,
//       body    := '{}'::jsonb
//     );
//   $$);
//
// Auth: SUPABASE_PUBLISHABLE_KEY Bearer token (same pattern as group-expire).

import { createFileRoute } from "@tanstack/react-router";
import { processFlashEnd } from "@/server/flash-handlers";

export const Route = createFileRoute("/api/public/hooks/flash-end")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const expected = process.env.SUPABASE_PUBLISHABLE_KEY;
        const token    = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
        if (!expected || !token || token !== expected) {
          return new Response(JSON.stringify({ error: "Unauthorized" }), {
            status: 401,
            headers: { "Content-Type": "application/json" },
          });
        }
        const result = await processFlashEnd();
        return new Response(
          JSON.stringify({ success: true, ...result, timestamp: new Date().toISOString() }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      },
    },
  },
});
