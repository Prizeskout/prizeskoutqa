-- Recover interrupted workers, expire abandoned approvals, and surface operator work.
create or replace function public.ps_engine_transition_guard() returns trigger language plpgsql as $$
declare allowed boolean;
begin
  if old.state=new.state then return new; end if;
  allowed := case old.state
    when 'queued' then new.state in ('leased','cancelled')
    when 'leased' then new.state in ('processing','retry_scheduled','dead_letter','cancelled')
    when 'processing' then new.state in ('waiting_evidence','waiting_approval','verifying','completed','retry_scheduled','dead_letter','cancelled')
    when 'waiting_evidence' then new.state in ('queued','cancelled')
    when 'waiting_approval' then new.state in ('queued','dead_letter','cancelled')
    when 'verifying' then new.state in ('completed','retry_scheduled','dead_letter')
    when 'retry_scheduled' then new.state in ('leased','cancelled')
    when 'dead_letter' then new.state in ('queued','cancelled')
    else false end;
  if not allowed then raise exception 'illegal engine transition: % -> %',old.state,new.state using errcode='check_violation'; end if;
  return new;
end $$;

create or replace function public.ps_engine_recover_stalled(p_actor text,p_limit integer default 100)
returns table(work_item_id uuid,from_state text,to_state text,reason text)
language plpgsql security definer set search_path=public as $$
declare v_work ps_engine_work_items; v_to text; v_reason text;
begin
  for v_work in
    select w.* from ps_engine_work_items w
    where (w.state in ('leased','processing','verifying') and w.lease_expires_at<now())
       or (w.state='waiting_approval' and exists(
         select 1 from ps_engine_approval_requests r
         where r.work_item_id=w.id and r.expires_at<=now()
           and not exists(select 1 from ps_engine_approval_decisions d where d.request_id=r.id)
       ))
    order by w.updated_at for update skip locked
    limit least(greatest(p_limit,1),500)
  loop
    if v_work.state='waiting_approval' then
      v_to := 'dead_letter'; v_reason := 'approval_expired';
    elsif v_work.attempt>=v_work.max_attempts then
      v_to := 'dead_letter'; v_reason := 'lease_expired_attempts_exhausted';
    else
      v_to := 'retry_scheduled'; v_reason := 'lease_expired_recovered';
    end if;
    update ps_engine_work_items set state=v_to,available_at=case when v_to='retry_scheduled' then now() else null end,
      lease_owner=null,lease_expires_at=null,last_error=v_reason,updated_at=now() where id=v_work.id;
    insert into ps_engine_transitions(account_id,work_item_id,from_state,to_state,actor,reason,detail)
    values(v_work.account_id,v_work.id,v_work.state,v_to,p_actor,v_reason,jsonb_build_object('expired_lease_owner',v_work.lease_owner,'attempt',v_work.attempt));
    work_item_id:=v_work.id;from_state:=v_work.state;to_state:=v_to;reason:=v_reason;return next;
  end loop;
end $$;

create or replace function public.ps_engine_sync_attention() returns trigger language plpgsql security definer set search_path=public as $$
declare v_event ps_engine_events; v_fingerprint text := 'engine:'||new.id::text;
begin
  select * into v_event from ps_engine_events where id=new.event_id;
  if new.state in ('waiting_evidence','waiting_approval','dead_letter') then
    insert into ps_attention_items(account_id,fingerprint,item_type,title,detail,priority,status,evidence_strength,source_route,context,detected_at,resolved_at,resolution_note)
    values(new.account_id,v_fingerprint,'engine_work',
      case new.state when 'dead_letter' then 'Engine work requires recovery' when 'waiting_approval' then 'Engine work needs approval' else 'Engine work needs evidence' end,
      concat(new.work_kind,' for ',v_event.event_type,' is ',replace(new.state,'_',' '),coalesce(': '||new.last_error,'')),
      case new.state when 'dead_letter' then 'critical' when 'waiting_approval' then 'high' else 'medium' end,
      case new.state when 'waiting_approval' then 'waiting_approval' else 'open' end,'verified','engine',
      jsonb_build_object('work_item_id',new.id,'event_id',new.event_id,'event_type',v_event.event_type,'source',v_event.source,'state',new.state,'attempt',new.attempt,'max_attempts',new.max_attempts,'last_error',new.last_error),
      now(),null,null)
    on conflict(account_id,fingerprint) do update set
      title=excluded.title,detail=excluded.detail,priority=excluded.priority,status=excluded.status,
      context=excluded.context,detected_at=excluded.detected_at,resolved_at=null,resolution_note=null;
  elsif old.state in ('waiting_evidence','waiting_approval','dead_letter') then
    update ps_attention_items set status='resolved',resolved_at=now(),
      resolution_note='Engine work moved from '||replace(old.state,'_',' ')||' to '||replace(new.state,'_',' ')||'.'
    where account_id=new.account_id and fingerprint=v_fingerprint and status not in ('resolved','dismissed');
  end if;
  return new;
end $$;

drop trigger if exists ps_engine_work_attention on public.ps_engine_work_items;
create trigger ps_engine_work_attention after update of state on public.ps_engine_work_items
for each row when(old.state is distinct from new.state) execute function public.ps_engine_sync_attention();

grant execute on function public.ps_engine_recover_stalled(text,integer) to service_role;
