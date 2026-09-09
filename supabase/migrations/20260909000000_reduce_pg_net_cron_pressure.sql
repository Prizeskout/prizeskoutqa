-- Reduce pg_cron/pg_net pressure observed in production on 2026-09-09.
--
-- pg_stat_statements showed pg_net response cleanup consuming 92.9% of
-- recorded execution time, with more than 519k HTTP enqueues and 626k cron
-- history writes. Several legacy schedules duplicate newer canonical jobs.

do $$
declare
  duplicate_name text;
begin
  foreach duplicate_name in array array[
    'scrape-all',
    'group-buy-expiry',
    'map-compliance-monitor'
  ] loop
    if exists (select 1 from cron.job where jobname = duplicate_name) then
      perform cron.unschedule(duplicate_name);
    end if;
  end loop;
end
$$;

-- Stagger background hooks so they do not all enqueue pg_net work at once.
-- Five-minute latency is appropriate for lifecycle/retry orchestration; the
-- central dispatch queue remains more responsive at a two-minute cadence.
select cron.alter_job(jobid, schedule := '*/5 * * * *')
from cron.job where jobname = 'flash-start';

select cron.alter_job(jobid, schedule := '1-59/5 * * * *')
from cron.job where jobname = 'flash-end';

select cron.alter_job(jobid, schedule := '2-59/5 * * * *')
from cron.job where jobname = 'group-expire';

select cron.alter_job(jobid, schedule := '3-59/5 * * * *')
from cron.job where jobname = 'webhook-retry';

select cron.alter_job(jobid, schedule := '4-59/5 * * * *')
from cron.job where jobname = 'prizeskout-copilot-schedules';

select cron.alter_job(jobid, schedule := '*/5 * * * *')
from cron.job where jobname = 'webhook-intelligence-retry';

select cron.alter_job(jobid, schedule := '*/2 * * * *')
from cron.job where jobname = 'prizeskout-dispatch-queue';
