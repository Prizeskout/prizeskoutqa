-- Put real high-impact Store Manager work behind the unified approval ledger.
create or replace function public.ps_engine_bridge_store_manager_approval() returns trigger
language plpgsql security definer set search_path=public as $$
declare v_event uuid; v_work uuid;
begin
  if new.status<>'waiting_approval' or not new.approval_required then return new; end if;
  if tg_op='UPDATE' and old.status=new.status then return new; end if;
  insert into ps_engine_events(account_id,event_type,source,source_event_id,schema_version,payload,occurred_at)
  values(new.account_id,'store_manager.approval.requested','store_manager_task',new.id::text||':waiting_approval','2026-09-10',
    jsonb_build_object('task_id',new.id,'task_type',new.task_type,'risk_level',new.risk_level,'title',new.title),now())
  on conflict(account_id,source,source_event_id) do nothing returning id into v_event;
  if v_event is null then select id into v_event from ps_engine_events where account_id=new.account_id and source='store_manager_task' and source_event_id=new.id::text||':waiting_approval'; end if;
  insert into ps_engine_work_items(account_id,event_id,work_kind,priority,available_at)
  values(new.account_id,v_event,'authorize_store_manager_task',case new.priority when 'critical' then 5 when 'high' then 10 else 25 end,now())
  on conflict(event_id,work_kind) do nothing returning id into v_work;
  if v_work is not null then
    insert into ps_engine_transitions(account_id,work_item_id,from_state,to_state,actor,reason)
    values(new.account_id,v_work,null,'queued','database:store_manager','approval_work_registered');
  end if;
  return new;
end $$;
drop trigger if exists ps_engine_store_manager_approval_bridge on public.ps_store_manager_tasks;
create trigger ps_engine_store_manager_approval_bridge after insert or update of status on public.ps_store_manager_tasks
for each row execute function public.ps_engine_bridge_store_manager_approval();

create or replace function public.ps_engine_decide_approval(p_request_id uuid,p_account_id text,p_decision text,p_decided_by text,p_reason text,p_context jsonb default '{}'::jsonb)
returns public.ps_engine_work_items language plpgsql security definer set search_path=public as $$
declare v_request ps_engine_approval_requests; v_work ps_engine_work_items; v_event ps_engine_events; v_after ps_engine_work_items; v_task uuid; v_task_before text;
begin
  if p_decision not in ('approved','rejected') then raise exception 'approval decision must be approved or rejected'; end if;
  if nullif(trim(p_reason),'') is null then raise exception 'approval reason is required'; end if;
  select * into v_request from ps_engine_approval_requests where id=p_request_id and account_id=p_account_id for update;
  if not found then raise exception 'approval request not found'; end if;
  if v_request.expires_at<=now() then raise exception 'approval request expired'; end if;
  if exists(select 1 from ps_engine_approval_decisions where request_id=v_request.id) then raise exception 'approval request already decided'; end if;
  select * into v_work from ps_engine_work_items where id=v_request.work_item_id for update;
  if v_work.state<>'waiting_approval' then raise exception 'work item is not waiting for approval'; end if;
  insert into ps_engine_approval_decisions(account_id,request_id,decision,decided_by,reason,context)
  values(p_account_id,p_request_id,p_decision,p_decided_by,p_reason,coalesce(p_context,'{}'::jsonb));
  select * into v_event from ps_engine_events where id=v_work.event_id;
  if v_work.work_kind='authorize_store_manager_task' then
    v_task:=nullif(v_event.payload->>'task_id','')::uuid;
    select status into v_task_before from ps_store_manager_tasks where id=v_task and account_id=p_account_id for update;
    if v_task_before<>'waiting_approval' then raise exception 'store manager task is not waiting for approval'; end if;
    update ps_store_manager_tasks set status=case when p_decision='approved' then 'approved' else 'cancelled' end,
      approved_by=case when p_decision='approved' then p_decided_by else approved_by end,
      approved_at=case when p_decision='approved' then now() else approved_at end,
      last_error=case when p_decision='rejected' then p_reason else null end,updated_at=now()
    where id=v_task and account_id=p_account_id;
    insert into ps_store_manager_task_events(account_id,task_id,from_status,to_status,actor,note,evidence)
    values(p_account_id,v_task,v_task_before,case when p_decision='approved' then 'approved' else 'cancelled' end,p_decided_by,p_reason,jsonb_build_object('engine_approval_request_id',p_request_id));
  end if;
  update ps_engine_work_items set state=case when p_decision='approved' then 'queued' else 'cancelled' end,
    approval_reference=v_request.id::text,available_at=case when p_decision='approved' then now() else null end,updated_at=now()
  where id=v_work.id returning * into v_after;
  insert into ps_engine_transitions(account_id,work_item_id,from_state,to_state,actor,reason,detail)
  values(p_account_id,v_work.id,'waiting_approval',v_after.state,p_decided_by,'approval_'||p_decision,jsonb_build_object('approval_request_id',p_request_id,'reason',p_reason));
  return v_after;
end $$;
grant execute on function public.ps_engine_decide_approval(uuid,text,text,text,text,jsonb) to service_role;
