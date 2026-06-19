-- Re-enable the scrape cron, corrected to point at the Cloudflare Worker URL
-- and use the itfhekcvmcbntjndvhzg anon key (public, safe to commit)

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'scrape-all-competitor-urls-qat') THEN
    PERFORM cron.unschedule('scrape-all-competitor-urls-qat');
  END IF;
END $$;

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
