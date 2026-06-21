// Enriched Webhook Intelligence retry hook — POST /api/public/hooks/webhook-intelligence-retry
//
// Drains webhook_intelligence_deliveries rows where:
//   success = false AND dead_lettered = false AND next_retry_at <= now()
// Re-delivers with fresh enrichment, increments attempt.
// After 4 retries (5 total attempts), marks delivery dead_lettered = true
// and subscription status = 'dead'.
//
// Auth: Bearer SUPABASE_PUBLISHABLE_KEY
//
// pg_cron schedule (run every 2 minutes, offset from the main retry hook):
//   SELECT cron.schedule('webhook-intelligence-retry', '*/2 * * * *', $$
//     SELECT net.http_post(
//       url     := 'https://prizeskoutqa.prizeskoutqatar.workers.dev/api/public/hooks/webhook-intelligence-retry',
//       headers := '{"Authorization":"Bearer <SUPABASE_PUBLISHABLE_KEY>"}'::jsonb,
//       body    := '{}'::jsonb
//     );
//   $$);
//
// Cloudflare Cron Trigger: add '*/2 * * * *' to wrangler.jsonc triggers.crons
// and dispatch POST to this endpoint from the scheduled handler.

import { createFileRoute } from "@tanstack/react-router";
import { processIntelligenceRetryQueue } from "@/server/webhook-intelligence-handlers";

export const Route = createFileRoute("/api/public/hooks/webhook-intelligence-retry")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const expected = process.env.SUPABASE_PUBLISHABLE_KEY;
        const token    = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
        if (!expected || !token || token !== expected) {
          return new Response(JSON.stringify({ error: "Unauthorized" }), {
            status:  401,
            headers: { "Content-Type": "application/json" },
          });
        }

        const result = await processIntelligenceRetryQueue(100);

        return new Response(
          JSON.stringify({ success: true, ...result, timestamp: new Date().toISOString() }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      },
    },
  },
});
