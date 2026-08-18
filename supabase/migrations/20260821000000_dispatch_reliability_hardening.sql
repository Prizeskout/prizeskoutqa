-- Dispatch reliability hardening: preserve residency, reclaim crashed-worker
-- leases, enforce per-channel concurrency/rate limits atomically, and give
-- rollback attempts their own immutable idempotency identity.

alter table public.ps_dispatch_queue
  add column if not exists region text,
  add column if not exists parent_dispatch_id uuid references public.ps_dispatch_queue(id) on delete set null,
  add column if not exists dedupe_key text;

update public.ps_dispatch_queue q
set region = coalesce(i.region, 'SA')
from public.ps_ingest_events i
where i.id = q.ingest_event_id and q.region is null;

update public.ps_dispatch_queue
set region = 'SA'
where region is null;

alter table public.ps_dispatch_queue alter column region set not null;
alter table public.ps_dispatch_queue alter column available_at drop not null;

update public.ps_dispatch_queue
set dedupe_key = case
  when rollback_reason is not null then 'legacy-rollback:' || id::text
  else 'dispatch:' || ingest_event_id::text || ':' || channel || ':' || target_price::text
end
where dedupe_key is null;

alter table public.ps_dispatch_queue alter column dedupe_key set not null;

alter table public.ps_dispatch_queue
  drop constraint if exists ps_dispatch_queue_ingest_event_id_channel_target_price_key;

create unique index if not exists ps_dispatch_queue_dedupe_key
  on public.ps_dispatch_queue(dedupe_key);

create unique index if not exists ps_dispatch_queue_one_rollback_per_parent
  on public.ps_dispatch_queue(parent_dispatch_id)
  where parent_dispatch_id is not null;

create index if not exists ps_dispatch_queue_confirmation_due
  on public.ps_dispatch_queue(state,accepted_at)
  where state = 'confirming';

create or replace function public.ps_lease_dispatch_jobs(p_owner text, p_limit integer default 10)
returns setof public.ps_dispatch_queue
language plpgsql
security definer
set search_path = public
as $$
declare
  candidate public.ps_dispatch_queue%rowtype;
  claimed_count integer := 0;
  active_count integer;
  recent_count integer;
  concurrency_limit integer;
  rpm_limit integer;
begin
  update public.ps_dispatch_queue
  set state = 'dead_letter',
      last_error = coalesce(last_error, 'Maximum dispatch attempts reached'),
      lease_owner = null,
      lease_expires_at = null,
      available_at = null,
      updated_at = now()
  where attempts >= max_attempts
    and (
      (state in ('queued','rollback_queued') and available_at <= now())
      or (state = 'leased' and lease_expires_at < now())
    );

  for candidate in
    select q.* from public.ps_dispatch_queue q
    where q.attempts < q.max_attempts
      and ((q.state in ('queued','rollback_queued') and q.available_at <= now())
        or (q.state='leased' and q.lease_expires_at < now()))
    order by q.priority,q.created_at
    for update skip locked
    limit greatest(1,least(p_limit,25))*10
  loop
    exit when claimed_count >= greatest(1,least(p_limit,25));

    -- Serialize capacity decisions for this merchant/channel across workers.
    perform pg_advisory_xact_lock(hashtextextended(candidate.account_id::text || ':' || candidate.channel,0));
    concurrency_limit:=null;
    rpm_limit:=null;
    select coalesce(max_concurrency,2),coalesce(requests_per_minute,30)
      into concurrency_limit,rpm_limit
    from public.ps_channel_rate_limits
    where account_id=candidate.account_id and channel=candidate.channel;
    concurrency_limit:=coalesce(concurrency_limit,2);
    rpm_limit:=coalesce(rpm_limit,30);
    select count(*) into active_count from public.ps_dispatch_queue
      where account_id=candidate.account_id and channel=candidate.channel
        and state='leased' and lease_expires_at>=now();
    select count(*) into recent_count from public.ps_aggregator_dispatch_log
      where account_id=candidate.account_id and target_channel=candidate.channel
        and created_at>=now()-interval '1 minute';
    if active_count>=concurrency_limit or recent_count>=rpm_limit then continue; end if;

    update public.ps_dispatch_queue q
    set state='leased',lease_owner=p_owner,lease_expires_at=now()+interval '90 seconds',
        attempts=q.attempts+1,updated_at=now()
    where q.id=candidate.id returning q.* into candidate;
    claimed_count:=claimed_count+1;
    return next candidate;
  end loop;
  return;
end $$;

revoke all on function public.ps_lease_dispatch_jobs(text,integer) from public,anon,authenticated;
grant execute on function public.ps_lease_dispatch_jobs(text,integer) to service_role;

do $$ begin
  if exists(select 1 from pg_extension where extname='pg_cron') then
    perform cron.unschedule(jobid) from cron.job where jobname='prizeskout-weekly-margin-digest';
    perform cron.schedule('prizeskout-weekly-margin-digest','0 7 * * 1',format($job$
      select net.http_post(url := %L, headers := jsonb_build_object('Authorization','Bearer ' || current_setting('app.settings.cron_secret',true),'Content-Type','application/json'), body := '{}'::jsonb)
    $job$,'https://prizeskout.qa/api/public/hooks/weekly-margin-digest'));
  end if;
end $$;
