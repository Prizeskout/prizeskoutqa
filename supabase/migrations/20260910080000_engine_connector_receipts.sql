-- Bring every first-party connector receipt under the same engine lifecycle.
create or replace function public.ps_engine_bridge_connector_receipt() returns trigger
language plpgsql security definer set search_path=public as $$
declare v_row jsonb:=to_jsonb(new); v_account text; v_merchant text; v_platform text; v_event_name text; v_event uuid; v_work uuid;
begin
  v_platform:=replace(replace(tg_table_name,'ps_',''),'_webhook_events','');
  v_account:=v_row->>'account_id';
  v_merchant:=v_row->>'merchant_id';
  if nullif(v_merchant,'') is null then select merchant_id into v_merchant from ps_merchant_channels where id=(v_row->>'channel_id')::uuid; end if;
  v_event_name:=coalesce(v_row->>'event_name',v_row->>'event_id','unknown');
  insert into ps_engine_events(account_id,merchant_id,event_type,source,source_event_id,schema_version,payload,occurred_at)
  values(v_account,v_merchant,'commerce.'||v_platform||'.'||v_event_name,v_platform||'_webhook',new.id::text,'2026-09-10',
    jsonb_build_object('platform',v_platform,'receipt_id',new.id,'channel_id',v_row->>'channel_id','event_name',v_event_name),
    coalesce((v_row->>'occurred_at')::timestamptz,now()))
  on conflict(account_id,source,source_event_id) do nothing returning id into v_event;
  if v_event is null then select id into v_event from ps_engine_events where account_id=v_account and source=v_platform||'_webhook' and source_event_id=new.id::text; end if;
  insert into ps_engine_work_items(account_id,event_id,work_kind,priority,available_at)
  values(v_account,v_event,'normalize_connector_event',20,now())
  on conflict(event_id,work_kind) do nothing returning id into v_work;
  if v_work is not null then insert into ps_engine_transitions(account_id,work_item_id,from_state,to_state,actor,reason)
    values(v_account,v_work,null,'queued','database:'||v_platform,'connector_receipt_recorded'); end if;
  return new;
end $$;

drop trigger if exists ps_engine_salla_receipt on public.ps_salla_webhook_events;
create trigger ps_engine_salla_receipt after insert on public.ps_salla_webhook_events for each row execute function public.ps_engine_bridge_connector_receipt();
drop trigger if exists ps_engine_zid_receipt on public.ps_zid_webhook_events;
create trigger ps_engine_zid_receipt after insert on public.ps_zid_webhook_events for each row execute function public.ps_engine_bridge_connector_receipt();
drop trigger if exists ps_engine_keeta_receipt on public.ps_keeta_webhook_events;
create trigger ps_engine_keeta_receipt after insert on public.ps_keeta_webhook_events for each row execute function public.ps_engine_bridge_connector_receipt();
drop trigger if exists ps_engine_talabat_receipt on public.ps_talabat_webhook_events;
create trigger ps_engine_talabat_receipt after insert on public.ps_talabat_webhook_events for each row execute function public.ps_engine_bridge_connector_receipt();
