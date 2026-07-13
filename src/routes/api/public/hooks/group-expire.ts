// Expiry hook for Group Buying Engine (API 12).
//
// Processes all active campaigns whose expiry_at has passed:
//   tier threshold met  → status=completed, emit group.payment_trigger
//   threshold not met   → status=expired, emit group.campaign_expired
//
// Schedule via pg_cron every 5 minutes:
//   SELECT cron.schedule('group-buy-expiry', '*/5 * * * *', $$
//     SELECT net.http_post(
//       url     := 'https://<worker>.workers.dev/api/public/hooks/group-expire',
//       headers := '{"Authorization": "Bearer <SUPABASE_PUBLISHABLE_KEY>"}'::jsonb,
//       body    := '{}'::jsonb
//     );
//   $$);
//
// Cloudflare Cron Trigger alternative: add "*/5 * * * *" to wrangler.jsonc
// triggers.crons and have the scheduled handler POST to this endpoint.
//
// Auth: bearer-checks SUPABASE_PUBLISHABLE_KEY (same pattern as webhook-retry).

import { createFileRoute } from "@tanstack/react-router";
import { processExpiredCampaigns } from "@/server/group-handlers";

export const Route = createFileRoute("/api/public/hooks/group-expire")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        // Auth: CRON_SECRET — set via `wrangler secret put CRON_SECRET` or env var.
        const expected = process.env.CRON_SECRET;
        const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
        if (!expected || !token || token !== expected) {
          return new Response(JSON.stringify({ error: "Unauthorized" }), {
            status: 401,
            headers: { "Content-Type": "application/json" },
          });
        }

        const result = await processExpiredCampaigns();
        return new Response(
          JSON.stringify({ success: true, ...result, timestamp: new Date().toISOString() }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      },
    },
  },
});
