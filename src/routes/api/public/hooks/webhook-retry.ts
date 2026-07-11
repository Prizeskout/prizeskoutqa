// Public cron hook: drain due retries from the webhook delivery queue.
// Schedule from pg_cron every 1-2 minutes:
//   curl -X POST -H "Authorization: Bearer <SUPABASE_PUBLISHABLE_KEY>" \
//     https://<project>.lovable.app/api/public/hooks/webhook-retry
//
// Auth: bearer-checks the project's anon key, identical to scrape-all.
// Routes under /api/public/* bypass platform auth on published sites, so
// the bearer check inside the handler is the only gate — we treat the
// publishable key as a shared secret for cron callers.

import { createFileRoute } from "@tanstack/react-router";
import { processWebhookRetryQueue } from "@/server/webhook-delivery";

export const Route = createFileRoute("/api/public/hooks/webhook-retry")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        // Auth: prefer CRON_SECRET; falls back to SUPABASE_PUBLISHABLE_KEY while pg_cron schedules are migrated.
        const expected = process.env.CRON_SECRET ?? process.env.SUPABASE_PUBLISHABLE_KEY;
        const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
        if (!expected || !token || token !== expected) {
          return new Response(JSON.stringify({ error: "Unauthorized" }), {
            status: 401,
            headers: { "Content-Type": "application/json" },
          });
        }

        const result = await processWebhookRetryQueue(100);
        return new Response(
          JSON.stringify({ success: true, ...result, timestamp: new Date().toISOString() }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      },
    },
  },
});
