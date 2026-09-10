-- Attach the existing Ingest -> Decide pricing pipeline to the unified engine.
create or replace function public.ps_engine_bridge_pricing_ingest() returns trigger
language plpgsql security definer set search_path=public as $$
declare v_event uuid; v_work uuid;
begin
  insert into ps_engine_events(account_id,merchant_id,event_type,source,source_event_id,schema_version,payload,occurred_at)
  values(new.account_id::text,new.merchant_id,'pricing.ingest.received',new.source_platform||'_pricing_ingest',new.id::text,'2026-09-10',
    jsonb_build_object('ingest_event_id',new.id,'source_platform',new.source_platform,'sku',new.sku,'item_id',new.item_id,'region',new.region),new.created_at)
  on conflict(account_id,source,source_event_id) do nothing returning id into v_event;
  if v_event is null then select id into v_event from ps_engine_events where account_id=new.account_id::text and source=new.source_platform||'_pricing_ingest' and source_event_id=new.id::text; end if;
  insert into ps_engine_work_items(account_id,event_id,work_kind,priority,available_at)
  values(new.account_id::text,v_event,'supervise_pricing_ingest',25,now())
  on conflict(event_id,work_kind) do nothing returning id into v_work;
  if v_work is not null then insert into ps_engine_transitions(account_id,work_item_id,from_state,to_state,actor,reason)
    values(new.account_id::text,v_work,null,'queued','database:pricing_ingest','pricing_ingest_recorded'); end if;
  return new;
end $$;
drop trigger if exists ps_engine_pricing_ingest on public.ps_ingest_events;
create trigger ps_engine_pricing_ingest after insert on public.ps_ingest_events for each row execute function public.ps_engine_bridge_pricing_ingest();
