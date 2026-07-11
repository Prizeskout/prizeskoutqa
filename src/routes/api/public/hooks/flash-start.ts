// Flash Sale start hook — activates events whose start_at <= now.
//
// Schedule via pg_cron every minute:
//   SELECT cron.schedule('flash-start', '* * * * *', $$
//     SELECT net.http_post(
//       url     := 'https://prizeskout.qa/api/public/hooks/flash-start',
//       headers := '{"Authorization":"Bearer <SUPABASE_PUBLISHABLE_KEY>"}'::jsonb,
//       body    := '{}'::jsonb
//     );
//   $$);
//
// Auth: SUPABASE_PUBLISHABLE_KEY Bearer token (same pattern as group-expire).

import { createFileRoute } from "@tanstack/react-router";
import { processFlashStart } from "@/server/flash-handlers";

export const Route = createFileRoute("/api/public/hooks/flash-start")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        // Auth: prefer CRON_SECRET; falls back to SUPABASE_PUBLISHABLE_KEY while pg_cron schedules are migrated.
        const expected = process.env.CRON_SECRET ?? process.env.SUPABASE_PUBLISHABLE_KEY;
        const token    = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
        if (!expected || !token || token !== expected) {
          return new Response(JSON.stringify({ error: "Unauthorized" }), {
            status: 401,
            headers: { "Content-Type": "application/json" },
          });
        }
        const result = await processFlashStart();
        return new Response(
          JSON.stringify({ success: true, ...result, timestamp: new Date().toISOString() }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      },
    },
  },
});
