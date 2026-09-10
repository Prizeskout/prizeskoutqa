-- Transactional bridges from existing authoritative action ledgers into the
-- unified engine. No network call is required for the audit event to exist.
create or replace function public.ps_engine_bridge_price_action() returns trigger
language plpgsql security definer set search_path=public as $$
declare v_event uuid; v_work uuid;
begin
  if new.state not in ('confirmed','rejected_stale_price','rejected_policy','platform_failed','confirmation_failed','rolled_back','rollback_failed') then return new; end if;
  if tg_op='UPDATE' and old.state=new.state then return new; end if;
  insert into ps_engine_events(account_id,event_type,source,source_event_id,schema_version,payload,occurred_at)
  values(new.account_id::text,'pricing.action.'||new.state,'price_action_ledger',new.id::text||':'||new.state,'2026-09-10',jsonb_build_object('action_id',new.id,'platform',new.platform,'item_id',new.item_id,'state',new.state),now())
  on conflict(account_id,source,source_event_id) do nothing returning id into v_event;
  if v_event is null then select id into v_event from ps_engine_events where account_id=new.account_id and source='price_action_ledger' and source_event_id=new.id::text||':'||new.state; end if;
  insert into ps_engine_work_items(account_id,event_id,work_kind,priority,available_at)
  values(new.account_id::text,v_event,'audit_price_action_outcome',10,now())
  on conflict(event_id,work_kind) do update set state=case when ps_engine_work_items.state in ('waiting_evidence','dead_letter') then 'queued' else ps_engine_work_items.state end,available_at=now(),updated_at=now()
  returning id into v_work;
  insert into ps_engine_transitions(account_id,work_item_id,from_state,to_state,actor,reason)
  select new.account_id,v_work,null,'queued','database:price_action','terminal_action_recorded'
  where not exists(select 1 from ps_engine_transitions where work_item_id=v_work);
  return new;
end $$;
drop trigger if exists ps_engine_price_action_bridge on public.ps_price_actions;
create trigger ps_engine_price_action_bridge after insert or update on public.ps_price_actions for each row execute function public.ps_engine_bridge_price_action();

create or replace function public.ps_engine_bridge_dispatch() returns trigger
language plpgsql security definer set search_path=public as $$
declare v_event uuid; v_work uuid;
begin
  if tg_op='UPDATE' and old.state=new.state then return new; end if;
  insert into ps_engine_events(account_id,merchant_id,event_type,source,source_event_id,schema_version,payload,occurred_at)
  values(new.account_id::text,new.merchant_id,'pricing.dispatch.'||new.state,'dispatch_queue',new.id::text||':'||new.state,'2026-09-10',jsonb_build_object('dispatch_id',new.id,'channel',new.channel,'sku',new.sku,'state',new.state),now())
  on conflict(account_id,source,source_event_id) do nothing returning id into v_event;
  if v_event is null then select id into v_event from ps_engine_events where account_id=new.account_id and source='dispatch_queue' and source_event_id=new.id::text||':'||new.state; end if;
  insert into ps_engine_work_items(account_id,event_id,work_kind,priority,available_at)
  values(new.account_id::text,v_event,'supervise_dispatch',15,now())
  on conflict(event_id,work_kind) do update set
    state=case when ps_engine_work_items.state in ('waiting_evidence','dead_letter') then 'queued' else ps_engine_work_items.state end,
    available_at=now(),updated_at=now() returning id into v_work;
  insert into ps_engine_transitions(account_id,work_item_id,from_state,to_state,actor,reason)
  select new.account_id,v_work,null,'queued','database:dispatch','dispatch_recorded'
  where not exists(select 1 from ps_engine_transitions where work_item_id=v_work);
  return new;
end $$;
drop trigger if exists ps_engine_dispatch_bridge on public.ps_dispatch_queue;
create trigger ps_engine_dispatch_bridge after insert or update on public.ps_dispatch_queue for each row execute function public.ps_engine_bridge_dispatch();

create or replace function public.ps_engine_events_immutable() returns trigger language plpgsql as $$ begin raise exception 'engine events are immutable'; end $$;
drop trigger if exists ps_engine_events_immutable on public.ps_engine_events;
create trigger ps_engine_events_immutable before update or delete on public.ps_engine_events for each row execute function public.ps_engine_events_immutable();
