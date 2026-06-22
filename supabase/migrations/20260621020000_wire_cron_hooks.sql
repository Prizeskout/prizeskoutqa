-- Wire pg_cron + pg_net hooks for all registered /api/public/hooks/* endpoints.
--
-- Auth: every job sends Bearer <publishable_key>.  The handler code does an
-- exact-match check against process.env.SUPABASE_PUBLISHABLE_KEY so the key
-- never grants any PostgREST access — it is only a shared cron caller secret.
--
-- Worker: https://prizeskoutqa.prizeskoutqatar.workers.dev  (never Lovable)
-- Key   : eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml0Zmhla2N2bWNibnRqbmR2aHpnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk1NzczNjYsImV4cCI6MjA5NTE1MzM2Nn0.Xz_3vvq_EY_jYBkXggC-7U_CdUSDLwroLTbyVlxfGMo
--
-- Idempotent: unschedule before scheduling so this migration is safe to replay.
--
-- Schedules (UTC):
--   flash-start                    * * * * *       every minute
--   flash-end                      * * * * *       every minute
--   group-expire                   * * * * *       every minute
--   webhook-retry                  * * * * *       every minute
--   webhook-intelligence-retry     */2 * * * *     every 2 min (offset from retry)
--   map-monitor                    0 */4 * * *     every 4 h  (00,04,08,12,16,20 UTC)
--   scrape-all (pre-existing)      0 6,15 * * *    09:00+18:00 Qatar — confirmed/re-wired

-- ── helpers ───────────────────────────────────────────────────────────────────

DO $$
DECLARE
  jobs text[] := ARRAY[
    'flash-start',
    'flash-end',
    'group-expire',
    'webhook-retry',
    'webhook-intelligence-retry',
    'map-monitor',
    'scrape-all-competitor-urls-qat'
  ];
  j text;
BEGIN
  FOREACH j IN ARRAY jobs LOOP
    IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = j) THEN
      PERFORM cron.unschedule(j);
    END IF;
  END LOOP;
END $$;

-- ── flash-start  (every minute) ───────────────────────────────────────────────
-- Activates flash sale events whose start_at <= now() and status = 'scheduled'.
-- Status guard in processFlashStart() prevents double-processing.

SELECT cron.schedule(
  'flash-start',
  '* * * * *',
  $$
  SELECT net.http_post(
    url     := 'https://prizeskoutqa.prizeskoutqatar.workers.dev/api/public/hooks/flash-start',
    headers := '{"Content-Type":"application/json","Authorization":"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml0Zmhla2N2bWNibnRqbmR2aHpnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk1NzczNjYsImV4cCI6MjA5NTE1MzM2Nn0.Xz_3vvq_EY_jYBkXggC-7U_CdUSDLwroLTbyVlxfGMo"}'::jsonb,
    body    := '{}'::jsonb
  );
  $$
);

-- ── flash-end  (every minute) ─────────────────────────────────────────────────
-- Ends active flash sales whose end_at <= now() and restores original prices.
-- Status guard prevents double-restore.

SELECT cron.schedule(
  'flash-end',
  '* * * * *',
  $$
  SELECT net.http_post(
    url     := 'https://prizeskoutqa.prizeskoutqatar.workers.dev/api/public/hooks/flash-end',
    headers := '{"Content-Type":"application/json","Authorization":"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml0Zmhla2N2bWNibnRqbmR2aHpnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk1NzczNjYsImV4cCI6MjA5NTE1MzM2Nn0.Xz_3vvq_EY_jYBkXggC-7U_CdUSDLwroLTbyVlxfGMo"}'::jsonb,
    body    := '{}'::jsonb
  );
  $$
);

-- ── group-expire  (every minute) ─────────────────────────────────────────────
-- Expires/completes group-buy campaigns whose expiry_at <= now() and status = 'active'.
-- Status guard prevents double-processing on overlapping ticks.

SELECT cron.schedule(
  'group-expire',
  '* * * * *',
  $$
  SELECT net.http_post(
    url     := 'https://prizeskoutqa.prizeskoutqatar.workers.dev/api/public/hooks/group-expire',
    headers := '{"Content-Type":"application/json","Authorization":"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml0Zmhla2N2bWNibnRqbmR2aHpnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk1NzczNjYsImV4cCI6MjA5NTE1MzM2Nn0.Xz_3vvq_EY_jYBkXggC-7U_CdUSDLwroLTbyVlxfGMo"}'::jsonb,
    body    := '{}'::jsonb
  );
  $$
);

-- ── webhook-retry  (every minute) ────────────────────────────────────────────
-- Drains webhook_delivery_queue where next_retry_at <= now() and not dead-lettered.
-- Exponential backoff (5s/30s/5m/30m) is computed at row-insert time; the hook
-- only processes rows whose next_retry_at has arrived.  Atomic per-row update
-- prevents double-delivery on overlapping ticks.

SELECT cron.schedule(
  'webhook-retry',
  '* * * * *',
  $$
  SELECT net.http_post(
    url     := 'https://prizeskoutqa.prizeskoutqatar.workers.dev/api/public/hooks/webhook-retry',
    headers := '{"Content-Type":"application/json","Authorization":"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml0Zmhla2N2bWNibnRqbmR2aHpnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk1NzczNjYsImV4cCI6MjA5NTE1MzM2Nn0.Xz_3vvq_EY_jYBkXggC-7U_CdUSDLwroLTbyVlxfGMo"}'::jsonb,
    body    := '{}'::jsonb
  );
  $$
);

-- ── webhook-intelligence-retry  (every 2 min) ────────────────────────────────
-- Drains webhook_intelligence_deliveries (enriched webhook) retry queue.
-- Offset to */2 to avoid always overlapping with the main webhook-retry tick.

SELECT cron.schedule(
  'webhook-intelligence-retry',
  '*/2 * * * *',
  $$
  SELECT net.http_post(
    url     := 'https://prizeskoutqa.prizeskoutqatar.workers.dev/api/public/hooks/webhook-intelligence-retry',
    headers := '{"Content-Type":"application/json","Authorization":"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml0Zmhla2N2bWNibnRqbmR2aHpnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk1NzczNjYsImV4cCI6MjA5NTE1MzM2Nn0.Xz_3vvq_EY_jYBkXggC-7U_CdUSDLwroLTbyVlxfGMo"}'::jsonb,
    body    := '{}'::jsonb
  );
  $$
);

-- ── map-monitor  (every 4 hours) ──────────────────────────────────────────────
-- Re-scrapes active MAP agreement URLs via Firecrawl, detects violations, and
-- records immutable evidence in map_violations.  Runs at 00,04,08,12,16,20 UTC.
-- Runs 2 h after the 06:00/15:00 UTC competitor scrape windows so fresh
-- competitor_prices data is available for the fallback comparison path.

SELECT cron.schedule(
  'map-monitor',
  '0 */4 * * *',
  $$
  SELECT net.http_post(
    url     := 'https://prizeskoutqa.prizeskoutqatar.workers.dev/api/public/hooks/map-monitor',
    headers := '{"Content-Type":"application/json","Authorization":"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml0Zmhla2N2bWNibnRqbmR2aHpnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk1NzczNjYsImV4cCI6MjA5NTE1MzM2Nn0.Xz_3vvq_EY_jYBkXggC-7U_CdUSDLwroLTbyVlxfGMo"}'::jsonb,
    body    := '{}'::jsonb
  );
  $$
);

-- ── scrape-all  (existing — re-wired to confirm correct URL) ─────────────────
-- Runs at 06:00 + 15:00 UTC = 09:00 + 18:00 Qatar.
-- Re-scheduled above (unschedule + schedule) to ensure it points at the
-- current Workers URL and not any stale Lovable URL.

SELECT cron.schedule(
  'scrape-all-competitor-urls-qat',
  '0 6,15 * * *',
  $$
  SELECT net.http_post(
    url     := 'https://prizeskoutqa.prizeskoutqatar.workers.dev/api/public/hooks/scrape-all',
    headers := '{"Content-Type":"application/json","Authorization":"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml0Zmhla2N2bWNibnRqbmR2aHpnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk1NzczNjYsImV4cCI6MjA5NTE1MzM2Nn0.Xz_3vvq_EY_jYBkXggC-7U_CdUSDLwroLTbyVlxfGMo"}'::jsonb,
    body    := '{}'::jsonb
  );
  $$
);
