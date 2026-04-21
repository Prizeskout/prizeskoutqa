-- Unschedule the previous 6-hour job and replace with twice-daily Qatar windows.
-- Qatar Standard Time is UTC+3 year-round, so 09:00 QAT = 06:00 UTC and 18:00 QAT = 15:00 UTC.
do $$
begin
  perform cron.unschedule('scrape-all-competitor-urls-6h');
exception when others then
  -- ignore if the job does not exist
  null;
end $$;

do $$
begin
  perform cron.unschedule('scrape-all-competitor-urls-qat');
exception when others then
  null;
end $$;

select cron.schedule(
  'scrape-all-competitor-urls-qat',
  '0 6,15 * * *', -- 09:00 and 18:00 Qatar time daily
  $$
  select net.http_post(
    url:='https://prizeskoutqa.lovable.app/hooks/scrape-all',
    headers:='{"Content-Type": "application/json", "Lovable-Context": "cron", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNmYm93bmVydnRib3NwdWJqbnVmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY2OTk3NzEsImV4cCI6MjA5MjI3NTc3MX0.YouzTKpa2GTJkDtGTq_GfFVaRdZUJdi8cDLOOBpivCI"}'::jsonb,
    body:='{}'::jsonb
  ) as request_id;
  $$
);