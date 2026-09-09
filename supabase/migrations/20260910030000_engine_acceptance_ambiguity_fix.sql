-- Qualify the work idempotency constraint because RETURNS TABLE exposes an
-- event_id output variable inside PL/pgSQL.
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
  on conflict on constraint ps_engine_work_items_event_id_work_kind_key
  do update set event_id=excluded.event_id returning id into v_work;
  if v_inserted then insert into ps_engine_transitions(account_id,work_item_id,from_state,to_state,actor,reason) values(p_account_id,v_work,null,'queued','engine','event_accepted'); end if;
  return query select v_event,v_work,not v_inserted;
end $$;
