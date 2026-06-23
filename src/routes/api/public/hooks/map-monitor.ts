// MAP Compliance monitor hook — POST /api/public/hooks/map-monitor
//
// Iterates all active MAP agreements, scrapes each retailer URL via Firecrawl,
// falls back to competitor_prices column data, detects price violations, and
// records them as immutable evidence in map_violations.
//
// Auth: bearer-checks SUPABASE_PUBLISHABLE_KEY (same pattern as scrape-all).
//
// pg_cron schedule (run 30 min after competitor scrape):
//   SELECT cron.schedule('map-compliance-monitor', '30 6,15 * * *', $$
//     SELECT net.http_post(
//       url     := 'https://prizeskoutqa.prizeskoutqatar.workers.dev/api/public/hooks/map-monitor',
//       headers := '{"Authorization":"Bearer <SUPABASE_PUBLISHABLE_KEY>"}'::jsonb,
//       body    := '{}'::jsonb
//     );
//   $$);
//
// Cloudflare Cron Trigger: add '30 6,15 * * *' to wrangler.jsonc triggers.crons
// and dispatch POST to this endpoint from the scheduled handler.

import { createFileRoute } from "@tanstack/react-router";
import { processMapMonitoring } from "@/server/compliance-handlers";

export const Route = createFileRoute("/api/public/hooks/map-monitor")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const expected = process.env.SUPABASE_PUBLISHABLE_KEY;
        const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
        if (!expected || !token || token !== expected) {
          return new Response(JSON.stringify({ error: "Unauthorized" }), {
            status: 401,
            headers: { "Content-Type": "application/json" },
          });
        }

        let filterAccountId: string | undefined;
        try {
          const body = await request.json() as { account_id?: string };
          if (body?.account_id) filterAccountId = body.account_id;
        } catch { /* empty body is fine */ }

        const result = await processMapMonitoring(filterAccountId);

        return new Response(
          JSON.stringify({ success: true, ...result, timestamp: new Date().toISOString() }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      },
    },
  },
});
