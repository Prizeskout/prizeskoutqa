-- Preserve every normalized event revision while identifying the one current
-- version that financial calculations may use.
-- Migrations through 20260847000000 are deployed and must remain unchanged.

create table if not exists public.ps_normalized_event_heads (
  account_id text not null,
  source_provider text not null,
  event_kind text not null,
  external_event_id text not null,
  current_event_id uuid not null references public.ps_normalized_commerce_events(id) on delete restrict,
  updated_at timestamptz not null default now(),
  primary key(account_id,source_provider,event_kind,external_event_id)
);

create unique index if not exists ps_normalized_event_heads_current
  on public.ps_normalized_event_heads(current_event_id);
alter table public.ps_normalized_event_heads enable row level security;
revoke all on public.ps_normalized_event_heads from anon,authenticated;

-- Catch up historical data. The immutable event with the latest ingestion time
-- is current; all earlier rows remain available as audit history.
insert into public.ps_normalized_event_heads(account_id,source_provider,event_kind,external_event_id,current_event_id,updated_at)
select distinct on (account_id,source_provider,event_kind,external_event_id)
  account_id,source_provider,event_kind,external_event_id,id,created_at
from public.ps_normalized_commerce_events
order by account_id,source_provider,event_kind,external_event_id,created_at desc,id desc
on conflict(account_id,source_provider,event_kind,external_event_id) do nothing;

create or replace function public.ps_advance_normalized_event_head()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  insert into public.ps_normalized_event_heads(account_id,source_provider,event_kind,external_event_id,current_event_id,updated_at)
  values(new.account_id,new.source_provider,new.event_kind,new.external_event_id,new.id,new.created_at)
  on conflict(account_id,source_provider,event_kind,external_event_id) do update
    set current_event_id=excluded.current_event_id,updated_at=excluded.updated_at
    where excluded.updated_at >= public.ps_normalized_event_heads.updated_at;
  return new;
end;
$$;

drop trigger if exists ps_normalized_event_advance_head on public.ps_normalized_commerce_events;
create trigger ps_normalized_event_advance_head
after insert on public.ps_normalized_commerce_events
for each row execute function public.ps_advance_normalized_event_head();

comment on table public.ps_normalized_event_heads is
  'Mutable pointer to the latest immutable revision of a provider event. Reconciliation reads heads; prior revisions remain audit evidence.';
