// Cron hook: scrape every saved competitor product URL across all users.
// Triggered by pg_cron every 6 hours (see scheduled job in the database).
// Auth: requires `Authorization: Bearer <SUPABASE_PUBLISHABLE_KEY>` matching
// the project's anon key - bearer check happens inside the handler since
// `/api/public/*` routes bypass platform-level auth on published sites.
//
// Iterates competitor_product_urls with the admin client (bypasses RLS),
// scrapes each URL via Firecrawl, and persists results to competitor_scrapes
// keyed back to the URL's owning user_id so the existing per-user UI keeps
// showing live data without any frontend changes.

import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { runScrape } from "@/server/scrape-runner";
import { runPricingEngineForUser } from "@/server/pricing-engine";

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

export const Route = createFileRoute("/api/public/hooks/scrape-all")({
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

        // After scrapes land, regenerate pricing recommendations for every
        // user that had at least one URL processed. Engine failures are
        // logged but never fail the cron - scrape data is still useful even
        // if the engine has a bug.
        const affectedUserIds = Array.from(new Set(jobs.map((j) => j.user_id)));
        let engineWritten = 0;
        let engineSeedsWiped = 0;
        const engineFailures: { userId: string; error: string }[] = [];

        for (const userId of affectedUserIds) {
          try {
            const r = await runPricingEngineForUser(supabaseAdmin, userId);
            engineWritten += r.written;
            engineSeedsWiped += r.seedsWiped;
          } catch (err) {
            const msg = err instanceof Error ? err.message : "engine error";
            console.error(`pricing-engine failed for ${userId}`, err);
            engineFailures.push({ userId, error: msg });
          }
        }

        console.log(
          `scrape-all: engine wrote ${engineWritten} recs, wiped ${engineSeedsWiped} seeds across ${affectedUserIds.length} users (${engineFailures.length} failures)`,
        );

        return new Response(
          JSON.stringify({
            success: true,
            processed: results.length,
            ok,
            failed,
            engine: {
              users: affectedUserIds.length,
              written: engineWritten,
              seedsWiped: engineSeedsWiped,
              failures: engineFailures.length,
            },
            timestamp: new Date().toISOString(),
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      },
    },
  },
});
