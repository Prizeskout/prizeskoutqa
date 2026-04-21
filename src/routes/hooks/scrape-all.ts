// Cron hook: scrape every saved competitor product URL across all users.
// Triggered by pg_cron (see migration scheduling cron.schedule) every 6 hours.
// Auth: requires `Authorization: Bearer <SUPABASE_PUBLISHABLE_KEY>` matching
// the project's anon key — same pattern as other Lovable scheduled hooks.
//
// Iterates competitor_product_urls with the admin client (bypasses RLS),
// scrapes each URL via Firecrawl, and persists results to competitor_scrapes
// keyed back to the URL's owning user_id so the existing per-user UI keeps
// showing live data without any frontend changes.

import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { runScrape } from "@/server/scrape-runner";

const CONCURRENCY = 3;

async function runJobs<T, R>(items: T[], fn: (item: T) => Promise<R>, concurrency: number): Promise<R[]> {
  const results: R[] = [];
  let cursor = 0;
  const workers = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (cursor < items.length) {
      const i = cursor++;
      results[i] = await fn(items[i]);
    }
  });
  await Promise.all(workers);
  return results;
}

export const Route = createFileRoute("/hooks/scrape-all")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const expected = process.env.SUPABASE_PUBLISHABLE_KEY;
        const authHeader = request.headers.get("authorization");
        const token = authHeader?.replace(/^Bearer\s+/i, "");

        if (!expected || !token || token !== expected) {
          return new Response(JSON.stringify({ error: "Unauthorized" }), {
            status: 401,
            headers: { "Content-Type": "application/json" },
          });
        }

        const { data: urls, error } = await supabaseAdmin
          .from("competitor_product_urls")
          .select("user_id, url, product, competitor");

        if (error) {
          console.error("scrape-all: failed to load saved URLs", error);
          return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }

        const jobs = urls ?? [];
        console.log(`scrape-all: processing ${jobs.length} saved URLs`);

        const results = await runJobs(
          jobs,
          (job) =>
            runScrape(supabaseAdmin, {
              userId: job.user_id,
              url: job.url,
              product: job.product,
              competitor: job.competitor,
            }),
          CONCURRENCY,
        );

        const ok = results.filter((r) => r.ok).length;
        const failed = results.length - ok;

        return new Response(
          JSON.stringify({
            success: true,
            processed: results.length,
            ok,
            failed,
            timestamp: new Date().toISOString(),
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      },
    },
  },
});
