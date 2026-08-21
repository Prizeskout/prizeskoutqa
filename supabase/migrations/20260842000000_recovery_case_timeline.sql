-- Append-only recovery progress history from submission through resolution.
-- Migrations through 20260841000000 are deployed and must remain unchanged.

create table if not exists public.ps_recovery_case_events (
  id uuid primary key default gen_random_uuid(), account_id text not null,
  recovery_case_id uuid not null references public.ps_recovery_cases(id) on delete restrict,
  event_type text not null check (event_type in ('case_updated','submission_recorded')),
  from_status text, to_status text, previous_recovered_amount numeric, recovered_amount numeric,
  platform_response text, recorded_by text, created_at timestamptz not null default now()
);
create index if not exists ps_recovery_case_events_case on public.ps_recovery_case_events(account_id,recovery_case_id,created_at desc);
alter table public.ps_recovery_case_events enable row level security;
revoke all on public.ps_recovery_case_events from anon,authenticated;

create or replace function public.ps_record_recovery_case_update()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  if old.status is distinct from new.status or old.recovered_amount is distinct from new.recovered_amount or old.platform_response is distinct from new.platform_response then
    insert into public.ps_recovery_case_events(account_id,recovery_case_id,event_type,from_status,to_status,previous_recovered_amount,recovered_amount,platform_response,recorded_by)
    values(new.account_id,new.id,case when old.status <> 'submitted_manually' and new.status = 'submitted_manually' then 'submission_recorded' else 'case_updated' end,old.status,new.status,old.recovered_amount,new.recovered_amount,new.platform_response,coalesce(new.submitted_by,new.owner,'merchant'));
  end if;
  return new;
end;
$$;
drop trigger if exists ps_recovery_case_update_history on public.ps_recovery_cases;
create trigger ps_recovery_case_update_history after update on public.ps_recovery_cases for each row execute function public.ps_record_recovery_case_update();
drop trigger if exists ps_recovery_case_events_immutable on public.ps_recovery_case_events;
create trigger ps_recovery_case_events_immutable before update or delete on public.ps_recovery_case_events for each row execute function public.ps_reject_reconciliation_mutation();
comment on table public.ps_recovery_case_events is 'Immutable recovery progress history, including submission, platform decision and recovered-money changes.';
