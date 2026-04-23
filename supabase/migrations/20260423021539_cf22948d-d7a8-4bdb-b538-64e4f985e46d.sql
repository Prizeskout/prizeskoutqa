-- Pause the autonomous scrape cron during the demo so failed Firecrawl
-- attempts don't overwrite the curated demo dataset. The button-triggered
-- "Refresh recommendations" still works on demand.
DO $$
DECLARE
  jid bigint;
BEGIN
  FOR jid IN
    SELECT jobid FROM cron.job
    WHERE jobname IN ('scrape-all-every-6h', 'scrape-all-competitor-urls-qat')
  LOOP
    PERFORM cron.unschedule(jid);
  END LOOP;
END $$;
