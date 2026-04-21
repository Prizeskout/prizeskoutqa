-- Enable scheduler + outbound HTTP extensions (idempotent)
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Remove any prior schedule with this name so re-runs don't duplicate jobs
DO $$
BEGIN
  PERFORM cron.unschedule('scrape-all-competitor-urls-6h');
EXCEPTION WHEN OTHERS THEN
  -- ignore if not present
  NULL;
END $$;

-- Every 6 hours: POST to the scrape-all hook, which iterates every saved
-- competitor_product_urls row and refreshes its competitor_scrapes entry.
SELECT cron.schedule(
  'scrape-all-competitor-urls-6h',
  '0 */6 * * *',
  $$
  SELECT net.http_post(
    url := 'https://prizeskoutqa.lovable.app/hooks/scrape-all',
    headers := '{"Content-Type": "application/json", "Lovable-Context": "cron", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNmYm93bmVydnRib3NwdWJqbnVmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY2OTk3NzEsImV4cCI6MjA5MjI3NTc3MX0.YouzTKpa2GTJkDtGTq_GfFVaRdZUJdi8cDLOOBpivCI"}'::jsonb,
    body := '{}'::jsonb
  ) AS request_id;
  $$
);