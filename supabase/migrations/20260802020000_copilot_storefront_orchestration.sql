-- Durable Copilot storefront schedules with atomic leasing, retry and dead-letter handling.
create extension if not exists pgcrypto;

create table if not exists public.ps_copilot_scheduled_actions (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null,
  licensee_id uuid not null,
  merchant_id text not null,
  platform text not null default 'zid' check (platform = 'zid'),
  action_type text not null check (action_type in ('publish_product','unpublish_product','set_product_price','set_product_stock')),
  target_id text not null,
  target_name text not null,
  payload jsonb not null default '{}'::jsonb,
  execute_at timestamptz not null,
  state text not null default 'queued' check (state in ('queued','leased','completed','cancelled','dead_letter')),
  attempts integer not null default 0,
  max_attempts integer not null default 5 check (max_attempts between 1 and 20),
  available_at timestamptz not null default now(),
  lease_owner text,
  lease_expires_at timestamptz,
  last_error text,
  result jsonb,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists ps_copilot_schedules_due
  on public.ps_copilot_scheduled_actions(state, execute_at, available_at);
alter table public.ps_copilot_scheduled_actions enable row level security;

create or replace function public.ps_lease_copilot_scheduled_actions(p_owner text, p_limit integer default 10)
returns setof public.ps_copilot_scheduled_actions
language plpgsql security definer set search_path=public as $$
begin
  return query
  with due as (
    select id from public.ps_copilot_scheduled_actions
    where execute_at <= now() and available_at <= now()
      and (state='queued' or (state='leased' and lease_expires_at < now()))
    order by execute_at, created_at for update skip locked limit greatest(1,least(p_limit,50))
  ), leased as (
    update public.ps_copilot_scheduled_actions a set state='leased', lease_owner=p_owner,
      lease_expires_at=now()+interval '90 seconds', attempts=a.attempts+1, updated_at=now()
    from due where a.id=due.id returning a.*
  ) select * from leased;
end $$;
revoke all on function public.ps_lease_copilot_scheduled_actions(text,integer) from public, anon, authenticated;
grant execute on function public.ps_lease_copilot_scheduled_actions(text,integer) to service_role;

do $$ begin
  if exists(select 1 from pg_extension where extname='pg_cron') then
    if exists(select 1 from cron.job where jobname='prizeskout-copilot-schedules') then
      perform cron.unschedule('prizeskout-copilot-schedules');
    end if;
    perform cron.schedule('prizeskout-copilot-schedules','* * * * *',format($job$
      select net.http_post(url := %L, headers := jsonb_build_object('Authorization','Bearer ' || current_setting('app.settings.cron_secret',true),'Content-Type','application/json'), body := '{}'::jsonb)
    $job$,'https://prizeskout.qa/api/public/hooks/copilot-schedules'));
  end if;
end $$;
