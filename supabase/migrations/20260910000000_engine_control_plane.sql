-- One durable control plane for PrizeSkout business behavior.
create table if not exists public.ps_engine_events (
  id uuid primary key default gen_random_uuid(),
  account_id text not null,
  merchant_id text,
  event_type text not null,
  source text not null,
  source_event_id text not null,
  correlation_id uuid not null default gen_random_uuid(),
  causation_id uuid references public.ps_engine_events(id) on delete restrict,
  schema_version text not null,
  payload jsonb not null default '{}'::jsonb,
  occurred_at timestamptz,
  received_at timestamptz not null default now(),
  unique(account_id,source,source_event_id)
);

create table if not exists public.ps_engine_work_items (
  id uuid primary key default gen_random_uuid(),
  account_id text not null,
  event_id uuid not null references public.ps_engine_events(id) on delete restrict,
  work_kind text not null,
  state text not null default 'queued' check (state in ('queued','leased','processing','waiting_evidence','waiting_approval','verifying','retry_scheduled','completed','dead_letter','cancelled')),
  priority smallint not null default 50 check (priority between 0 and 100),
  attempt integer not null default 0 check (attempt >= 0),
  max_attempts integer not null default 5 check (max_attempts between 1 and 20),
  available_at timestamptz,
  lease_owner text,
  lease_expires_at timestamptz,
  approval_reference text,
  result jsonb,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz,
  unique(event_id,work_kind)
);

create table if not exists public.ps_engine_transitions (
  id bigint generated always as identity primary key,
  account_id text not null,
  work_item_id uuid not null references public.ps_engine_work_items(id) on delete restrict,
  from_state text,
  to_state text not null,
  actor text not null,
  reason text,
  detail jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists ps_engine_events_account_received on public.ps_engine_events(account_id,received_at desc);
create index if not exists ps_engine_work_due on public.ps_engine_work_items(priority,available_at,created_at) where state in ('queued','retry_scheduled');
create index if not exists ps_engine_work_account_state on public.ps_engine_work_items(account_id,state,updated_at desc);
create index if not exists ps_engine_transitions_work on public.ps_engine_transitions(work_item_id,created_at);

alter table public.ps_engine_events enable row level security;
alter table public.ps_engine_work_items enable row level security;
alter table public.ps_engine_transitions enable row level security;
revoke all on public.ps_engine_events, public.ps_engine_work_items, public.ps_engine_transitions from anon,authenticated;

create or replace function public.ps_engine_accept_event(
  p_account_id text, p_merchant_id text, p_event_type text, p_source text,
  p_source_event_id text, p_schema_version text, p_payload jsonb,
  p_work_kind text, p_occurred_at timestamptz default null, p_priority smallint default 50
) returns table(event_id uuid,work_item_id uuid,duplicate boolean)
language plpgsql security definer set search_path=public as $$
declare v_event uuid; v_work uuid; v_inserted boolean := true;
begin
  insert into ps_engine_events(account_id,merchant_id,event_type,source,source_event_id,schema_version,payload,occurred_at)
  values(p_account_id,nullif(p_merchant_id,''),p_event_type,p_source,p_source_event_id,p_schema_version,coalesce(p_payload,'{}'::jsonb),p_occurred_at)
  on conflict(account_id,source,source_event_id) do nothing returning id into v_event;
  if v_event is null then
    v_inserted := false;
    select id into v_event from ps_engine_events where account_id=p_account_id and source=p_source and source_event_id=p_source_event_id;
  end if;
  insert into ps_engine_work_items(account_id,event_id,work_kind,priority,available_at)
  values(p_account_id,v_event,p_work_kind,p_priority,now())
  on conflict(event_id,work_kind) do update set event_id=excluded.event_id returning id into v_work;
  if v_inserted then insert into ps_engine_transitions(account_id,work_item_id,from_state,to_state,actor,reason) values(p_account_id,v_work,null,'queued','engine','event_accepted'); end if;
  return query select v_event,v_work,not v_inserted;
end $$;

create or replace function public.ps_engine_lease_work(p_owner text,p_limit integer default 20)
returns setof public.ps_engine_work_items language plpgsql security definer set search_path=public as $$
begin
  return query
  with candidates as (
    select id from ps_engine_work_items
    where state in ('queued','retry_scheduled') and coalesce(available_at,now())<=now()
      and (lease_expires_at is null or lease_expires_at<now())
    order by priority,created_at for update skip locked limit least(greatest(p_limit,1),50)
  ), updated as (
    update ps_engine_work_items w set state='leased',attempt=w.attempt+1,lease_owner=p_owner,
      lease_expires_at=now()+interval '2 minutes',updated_at=now()
    from candidates c where w.id=c.id returning w.*
  ) select * from updated;
end $$;

grant execute on function public.ps_engine_accept_event(text,text,text,text,text,text,jsonb,text,timestamptz,smallint) to service_role;
grant execute on function public.ps_engine_lease_work(text,integer) to service_role;

create or replace function public.ps_engine_transition(
  p_work_item_id uuid, p_owner text, p_to_state text, p_actor text,
  p_reason text default null, p_detail jsonb default '{}'::jsonb,
  p_available_at timestamptz default null, p_last_error text default null
) returns public.ps_engine_work_items language plpgsql security definer set search_path=public as $$
declare v_before ps_engine_work_items; v_after ps_engine_work_items;
begin
  select * into v_before from ps_engine_work_items where id=p_work_item_id for update;
  if not found then raise exception 'engine work item not found'; end if;
  if v_before.lease_owner is not null and v_before.lease_owner<>p_owner then raise exception 'engine work item is owned by another worker'; end if;
  update ps_engine_work_items set state=p_to_state,available_at=p_available_at,
    lease_owner=case when p_to_state in ('leased','processing','verifying') then p_owner else null end,
    lease_expires_at=case when p_to_state in ('leased','processing','verifying') then now()+interval '2 minutes' else null end,
    result=case when p_to_state='completed' then coalesce(p_detail,'{}'::jsonb) else result end,
    last_error=p_last_error,completed_at=case when p_to_state='completed' then now() else null end,updated_at=now()
  where id=p_work_item_id returning * into v_after;
  insert into ps_engine_transitions(account_id,work_item_id,from_state,to_state,actor,reason,detail)
  values(v_before.account_id,v_before.id,v_before.state,p_to_state,p_actor,p_reason,coalesce(p_detail,'{}'::jsonb));
  return v_after;
end $$;
grant execute on function public.ps_engine_transition(uuid,text,text,text,text,jsonb,timestamptz,text) to service_role;

create or replace function public.ps_engine_transition_guard() returns trigger language plpgsql as $$
declare allowed boolean;
begin
  if old.state=new.state then return new; end if;
  allowed := case old.state
    when 'queued' then new.state in ('leased','cancelled')
    when 'leased' then new.state in ('processing','retry_scheduled','dead_letter','cancelled')
    when 'processing' then new.state in ('waiting_evidence','waiting_approval','verifying','completed','retry_scheduled','dead_letter','cancelled')
    when 'waiting_evidence' then new.state in ('queued','cancelled')
    when 'waiting_approval' then new.state in ('queued','cancelled')
    when 'verifying' then new.state in ('completed','retry_scheduled','dead_letter')
    when 'retry_scheduled' then new.state in ('leased','cancelled')
    when 'dead_letter' then new.state in ('queued','cancelled')
    else false end;
  if not allowed then raise exception 'illegal engine transition: % -> %',old.state,new.state using errcode='check_violation'; end if;
  return new;
end $$;

drop trigger if exists ps_engine_work_transition_guard on public.ps_engine_work_items;
create trigger ps_engine_work_transition_guard before update of state on public.ps_engine_work_items for each row execute function public.ps_engine_transition_guard();

create or replace function public.ps_engine_transitions_immutable() returns trigger language plpgsql as $$ begin raise exception 'engine transitions are immutable'; end $$;
drop trigger if exists ps_engine_transitions_immutable on public.ps_engine_transitions;
create trigger ps_engine_transitions_immutable before update or delete on public.ps_engine_transitions for each row execute function public.ps_engine_transitions_immutable();
