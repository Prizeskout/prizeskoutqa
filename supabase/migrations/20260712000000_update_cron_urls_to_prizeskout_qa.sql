-- Migrate all pg_cron hook URLs from app.prizeskout.qa → prizeskout.qa.
-- Idempotent: unschedule existing jobs before re-scheduling with updated URLs.

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

SELECT cron.schedule(
  'flash-start',
  '* * * * *',
  $$
  SELECT net.http_post(
    url     := 'https://prizeskout.qa/api/public/hooks/flash-start',
    headers := '{"Content-Type":"application/json","Authorization":"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml0Zmhla2N2bWNibnRqbmR2aHpnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk1NzczNjYsImV4cCI6MjA5NTE1MzM2Nn0.Xz_3vvq_EY_jYBkXggC-7U_CdUSDLwroLTbyVlxfGMo"}'::jsonb,
    body    := '{}'::jsonb
  );
  $$
);

-- ── flash-end  (every minute) ─────────────────────────────────────────────────

SELECT cron.schedule(
  'flash-end',
  '* * * * *',
  $$
  SELECT net.http_post(
    url     := 'https://prizeskout.qa/api/public/hooks/flash-end',
    headers := '{"Content-Type":"application/json","Authorization":"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml0Zmhla2N2bWNibnRqbmR2aHpnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk1NzczNjYsImV4cCI6MjA5NTE1MzM2Nn0.Xz_3vvq_EY_jYBkXggC-7U_CdUSDLwroLTbyVlxfGMo"}'::jsonb,
    body    := '{}'::jsonb
  );
  $$
);

-- ── group-expire  (every minute) ─────────────────────────────────────────────

SELECT cron.schedule(
  'group-expire',
  '* * * * *',
  $$
  SELECT net.http_post(
    url     := 'https://prizeskout.qa/api/public/hooks/group-expire',
    headers := '{"Content-Type":"application/json","Authorization":"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml0Zmhla2N2bWNibnRqbmR2aHpnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk1NzczNjYsImV4cCI6MjA5NTE1MzM2Nn0.Xz_3vvq_EY_jYBkXggC-7U_CdUSDLwroLTbyVlxfGMo"}'::jsonb,
    body    := '{}'::jsonb
  );
  $$
);

-- ── webhook-retry  (every minute) ────────────────────────────────────────────

SELECT cron.schedule(
  'webhook-retry',
  '* * * * *',
  $$
  SELECT net.http_post(
    url     := 'https://prizeskout.qa/api/public/hooks/webhook-retry',
    headers := '{"Content-Type":"application/json","Authorization":"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml0Zmhla2N2bWNibnRqbmR2aHpnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk1NzczNjYsImV4cCI6MjA5NTE1MzM2Nn0.Xz_3vvq_EY_jYBkXggC-7U_CdUSDLwroLTbyVlxfGMo"}'::jsonb,
    body    := '{}'::jsonb
  );
  $$
);

-- ── webhook-intelligence-retry  (every 2 min) ────────────────────────────────

SELECT cron.schedule(
  'webhook-intelligence-retry',
  '*/2 * * * *',
  $$
  SELECT net.http_post(
    url     := 'https://prizeskout.qa/api/public/hooks/webhook-intelligence-retry',
    headers := '{"Content-Type":"application/json","Authorization":"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml0Zmhla2N2bWNibnRqbmR2aHpnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk1NzczNjYsImV4cCI6MjA5NTE1MzM2Nn0.Xz_3vvq_EY_jYBkXggC-7U_CdUSDLwroLTbyVlxfGMo"}'::jsonb,
    body    := '{}'::jsonb
  );
  $$
);

-- ── map-monitor  (every 4 hours) ──────────────────────────────────────────────

SELECT cron.schedule(
  'map-monitor',
  '0 */4 * * *',
  $$
  SELECT net.http_post(
    url     := 'https://prizeskout.qa/api/public/hooks/map-monitor',
    headers := '{"Content-Type":"application/json","Authorization":"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml0Zmhla2N2bWNibnRqbmR2aHpnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk1NzczNjYsImV4cCI6MjA5NTE1MzM2Nn0.Xz_3vvq_EY_jYBkXggC-7U_CdUSDLwroLTbyVlxfGMo"}'::jsonb,
    body    := '{}'::jsonb
  );
  $$
);

-- ── scrape-all  (09:00 + 18:00 Qatar / 06:00 + 15:00 UTC) ────────────────────

SELECT cron.schedule(
  'scrape-all-competitor-urls-qat',
  '0 6,15 * * *',
  $$
  SELECT net.http_post(
    url     := 'https://prizeskout.qa/api/public/hooks/scrape-all',
    headers := '{"Content-Type":"application/json","Authorization":"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml0Zmhla2N2bWNibnRqbmR2aHpnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk1NzczNjYsImV4cCI6MjA5NTE1MzM2Nn0.Xz_3vvq_EY_jYBkXggC-7U_CdUSDLwroLTbyVlxfGMo"}'::jsonb,
    body    := '{}'::jsonb
  );
  $$
);
