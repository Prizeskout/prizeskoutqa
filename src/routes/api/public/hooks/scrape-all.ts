// URL-centric shared-cache scrape cron.
//
// Each unique competitor URL is scraped ONCE per freshness window, regardless
// of how many merchants track it.  The result is then propagated to every
// watching account via competitor_scrapes inserts, so the existing bridge
// trigger (trg_sync_scrape_to_competitor_prices) fans out to competitor_prices
// for each merchant without any change to downstream code.
//
// Cost model:
//   scrapes_performed = Firecrawl API calls (URL-unique, not merchant-unique)
//   scrapes_saved     = sum(watcher_count - 1) per URL scraped
//                     = Firecrawl calls the old merchant-centric loop would have made
//
// Auth: Bearer <SUPABASE_PUBLISHABLE_KEY> — same as before.
//
// Query params:
//   dry_run=1   Use stub prices (99.99 QAR) instead of calling Firecrawl.
//               Proves the full pipeline — dedup, cache update, propagation,
//               pricing engine — without spending Firecrawl credits.
//   (plan=X is accepted but ignored; required_freshness_seconds() handles
//    per-plan cadence automatically via the v_url_due_status view.)

import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { fetchCompetitorPrice } from "@/server/scrape-runner";
import { runPricingEngineForUser } from "@/server/pricing-engine";

const CONCURRENCY = 3;

async function runJobs<T, R>(
  items: T[],
  fn: (item: T) => Promise<R>,
  concurrency: number,
): Promise<R[]> {
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

type DueUrl = {
  normalized_url: string;
  raw_url_sample: string;
  last_price: number | null;
  currency: string | null;
  last_scraped_at: string | null;
  last_status: string | null;
  consecutive_unchanged: number;
  watcher_count: number;
  required_freshness_sec: number;
  max_freshness_sec: number;
  is_due: boolean;
};

type Watcher = {
  user_id: string; product: string; competitor: string; channel: string;
  match_confidence: number; match_status: string;
};

export const Route = createFileRoute("/api/public/hooks/scrape-all")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        // Auth: CRON_SECRET — set via `wrangler secret put CRON_SECRET` or env var.
        const expected   = process.env.CRON_SECRET;
        const authHeader = request.headers.get("authorization");
        const token      = authHeader?.replace(/^Bearer\s+/i, "");

        if (!expected || !token || token !== expected) {
          return new Response(JSON.stringify({ error: "Unauthorized" }), {
            status: 401,
            headers: { "Content-Type": "application/json" },
          });
        }

        const reqUrl  = new URL(request.url);
        const dryRun  = reqUrl.searchParams.get("dry_run") === "1";
        const runId   = crypto.randomUUID();

        // ── 1. Load all URLs due for a fresh scrape ────────────────────────────
        // v_url_due_status computes is_due per-URL based on required_freshness
        // (driven by the most-demanding watcher's plan) and smart-backoff.
        const { data: allEntries, error: viewErr } = await (supabaseAdmin
          .from("v_url_due_status")
          .select("*") as unknown as Promise<{ data: DueUrl[] | null; error: unknown }>);

        if (viewErr) {
          console.error(`scrape-all[${runId}]: failed to load v_url_due_status`, viewErr);
          return new Response(JSON.stringify({ error: "Failed to load due URLs" }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }

        const entries      = allEntries ?? [];
        const dueEntries   = entries.filter((e) => e.is_due);
        const cacheHitUrls = entries.length - dueEntries.length;

        console.log(
          `scrape-all[${runId}]: ${dueEntries.length} due / ${cacheHitUrls} cached / ` +
          `${entries.length} total${dryRun ? " [DRY RUN]" : ""}`,
        );

        // ── 2. Scrape each due URL once ────────────────────────────────────────
        let scrapesPerformed = 0;
        let scrapesSaved     = 0;
        let okCount          = 0;
        let nullPriceCount   = 0;
        let failedCount      = 0;
        let watchersNotified = 0;
        const affectedUsers  = new Set<string>();

        await runJobs(dueEntries, async (entry) => {
          scrapesPerformed++;
          const now = new Date().toISOString();

          // ── fetch (or stub in dry-run) ─────────────────────────────────────
          let fetchOk   = false;
          let fetchPrice: number | null = null;
          let fetchCurrency: string | null = null;
          let fetchStatus: "ok" | "null_price" | "failed" = "failed";
          let fetchError = "";
          let observation: Record<string, unknown> = {};

          if (dryRun) {
            // Deterministic stub: avoids Firecrawl spend while exercising the
            // full dedup + propagation + engine path.
            fetchOk       = true;
            fetchPrice    = parseFloat((99.99 + (entry.normalized_url.charCodeAt(8) % 100)).toFixed(2));
            fetchCurrency = "QAR";
            fetchStatus   = "ok";
          } else {
            const raw = await fetchCompetitorPrice(entry.raw_url_sample);
            if (raw.ok) {
              fetchOk       = true;
              fetchPrice    = raw.price;
              fetchCurrency = raw.currency;
              fetchStatus   = "ok";
              observation = {
                original_price: raw.originalPrice,
                availability: raw.availability,
                product_title: raw.productTitle,
                sku: raw.sku,
                gtin: raw.gtin,
                seller: raw.seller,
                evidence: raw.evidence,
                collector: "firecrawl",
              };
            } else {
              fetchError  = raw.error;
              fetchStatus = raw.category;
            }
          }

          // ── 3. Update the shared cache ─────────────────────────────────────
          if (fetchOk && fetchPrice !== null) {
            const priceChanged = entry.last_price === null || entry.last_price !== fetchPrice;
            await (supabaseAdmin.from("competitor_url_cache") as any).update({
              last_price:            fetchPrice,
              currency:              fetchCurrency,
              last_scraped_at:       now,
              last_status:           "ok",
              consecutive_unchanged: priceChanged ? 0 : entry.consecutive_unchanged + 1,
              updated_at:            now,
            }).eq("normalized_url", entry.normalized_url);
            okCount++;
          } else {
            // Failure: update timestamps and status but NEVER overwrite last_price.
            // Downstream engines see stale-but-valid prices rather than nulls.
            await (supabaseAdmin.from("competitor_url_cache") as any).update({
              last_scraped_at: now,
              last_status:     fetchStatus,
              updated_at:      now,
            }).eq("normalized_url", entry.normalized_url);
            if (fetchStatus === "null_price") nullPriceCount++;
            else failedCount++;
          }

          // ── 4. Propagate to all watching accounts ──────────────────────────
          // Single batch INSERT for all watchers of this URL — one subrequest
          // instead of N.  PostgreSQL FOR EACH ROW trigger still fires per row,
          // so the bridge trigger (trg_sync_scrape_to_competitor_prices) fans
          // out to each account's competitor_prices exactly as before.
          const { data: watchers } = await (supabaseAdmin.rpc as any)("get_url_watchers", {
            p_url: entry.normalized_url,
          });

          const watcherList: Watcher[] = watchers ?? [];
          scrapesSaved += Math.max(0, watcherList.length - 1);

          const scrapeRows = watcherList.map((w) =>
            fetchOk && fetchPrice !== null
              ? {
                  user_id:    w.user_id,
                  url:        entry.raw_url_sample,
                  competitor: w.competitor,
                  product:    w.product,
                  price:      fetchPrice,
                  currency:   fetchCurrency,
                  channel:    w.channel,
                  match_confidence: w.match_confidence,
                  ...observation,
                  status:     "success",
                  scraped_at: now,
                }
              : {
                  user_id:    w.user_id,
                  url:        entry.raw_url_sample,
                  competitor: w.competitor,
                  product:    w.product,
                  price:      null,
                  channel:    w.channel,
                  match_confidence: w.match_confidence,
                  status:     fetchStatus,
                  error:      fetchError || null,
                  scraped_at: now,
                },
          );

          if (scrapeRows.length > 0) {
            await (supabaseAdmin.from("competitor_scrapes") as any).insert(scrapeRows);
          }

          for (const w of watcherList) {
            affectedUsers.add(w.user_id);
            watchersNotified++;
          }
        }, CONCURRENCY);

        // ── 5. Log cost instrumentation (before engine so a crash doesn't lose it)
        // Use a raw fetch to PostgREST so supabase-js client state after bulk
        // inserts cannot interfere with this write.
        let logInserted = false;
        {
          const supabaseUrl = process.env.SUPABASE_URL;
          const svcKey      = process.env.SUPABASE_SERVICE_ROLE_KEY;
          console.log(`scrape-all[${runId}]: log env check: url=${!!supabaseUrl} key=${!!svcKey}`);
          if (supabaseUrl && svcKey) {
            try {
              const logRes = await fetch(`${supabaseUrl}/rest/v1/scrape_cost_log`, {
                method: "POST",
                headers: {
                  "Content-Type":  "application/json",
                  "apikey":        svcKey,
                  "Authorization": `Bearer ${svcKey}`,
                },
                body: JSON.stringify({
                  run_id:            runId,
                  due_urls:          dueEntries.length,
                  cache_hit_urls:    cacheHitUrls,
                  scrapes_performed: scrapesPerformed,
                  scrapes_saved:     scrapesSaved,
                  ok:                okCount,
                  null_price:        nullPriceCount,
                  failed:            failedCount,
                  watchers_notified: watchersNotified,
                }),
              });
              if (!logRes.ok) {
                const errBody = await logRes.text();
                console.error(`scrape-all[${runId}]: scrape_cost_log insert failed ${logRes.status}:`, errBody);
              } else {
                logInserted = true;
                console.log(`scrape-all[${runId}]: scrape_cost_log inserted ok (${logRes.status})`);
              }
            } catch (fetchErr) {
              console.error(`scrape-all[${runId}]: scrape_cost_log fetch threw:`, fetchErr);
            }
          } else {
            console.warn(`scrape-all[${runId}]: SKIPPED scrape_cost_log — env vars missing`);
          }
        }

        // ── 6. Run pricing engine for every affected account ───────────────────
        let engineWritten    = 0;
        let engineSeedsWiped = 0;
        const engineFailures: { userId: string; error: string }[] = [];

        for (const userId of affectedUsers) {
          try {
            const r       = await runPricingEngineForUser(supabaseAdmin, userId);
            engineWritten    += r.written;
            engineSeedsWiped += r.seedsWiped;
          } catch (err) {
            const msg = err instanceof Error ? err.message : "engine error";
            console.error(`pricing-engine failed for ${userId}:`, err);
            engineFailures.push({ userId, error: msg });
          }
        }

        const totalOldSystem = scrapesPerformed + scrapesSaved;
        const savingsPct     = totalOldSystem > 0
          ? Math.round((scrapesSaved / totalOldSystem) * 100)
          : 0;

        console.log(
          `scrape-all[${runId}]: performed=${scrapesPerformed} saved=${scrapesSaved} ` +
          `(${savingsPct}% reduction vs merchant-centric) ` +
          `ok=${okCount} null_price=${nullPriceCount} failed=${failedCount} ` +
          `watchers=${watchersNotified} engine_users=${affectedUsers.size}`,
        );

        return new Response(
          JSON.stringify({
            success:           true,
            run_id:            runId,
            dry_run:           dryRun,
            due_urls:          dueEntries.length,
            cache_hit_urls:    cacheHitUrls,
            scrapes_performed: scrapesPerformed,
            scrapes_saved:     scrapesSaved,
            savings_pct:       savingsPct,
            ok:                okCount,
            null_price:        nullPriceCount,
            failed:            failedCount,
            watchers_notified: watchersNotified,
            engine: {
              users:      affectedUsers.size,
              written:    engineWritten,
              seedsWiped: engineSeedsWiped,
              failures:   engineFailures.length,
            },
            log_inserted: logInserted,
            timestamp: new Date().toISOString(),
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      },
    },
  },
});
