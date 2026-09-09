create table if not exists public.ps_engine_approval_requests (
  id uuid primary key default gen_random_uuid(), account_id text not null,
  work_item_id uuid not null references public.ps_engine_work_items(id) on delete restrict,
  approval_scope text not null, requested_by text not null,
  context jsonb not null default '{}'::jsonb, expires_at timestamptz not null,
  created_at timestamptz not null default now(), unique(work_item_id,approval_scope)
);
create table if not exists public.ps_engine_approval_decisions (
  id uuid primary key default gen_random_uuid(), account_id text not null,
  request_id uuid not null unique references public.ps_engine_approval_requests(id) on delete restrict,
  decision text not null check(decision in ('approved','rejected')),
  decided_by text not null, reason text not null, context jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists ps_engine_approval_pending on public.ps_engine_approval_requests(account_id,expires_at,created_at desc);
alter table public.ps_engine_approval_requests enable row level security;
alter table public.ps_engine_approval_decisions enable row level security;
revoke all on public.ps_engine_approval_requests,public.ps_engine_approval_decisions from anon,authenticated;

create or replace function public.ps_engine_request_approval(p_work_item_id uuid,p_owner text,p_scope text,p_requested_by text,p_context jsonb,p_expires_at timestamptz)
returns uuid language plpgsql security definer set search_path=public as $$
declare v_work ps_engine_work_items; v_request uuid;
begin
  select * into v_work from ps_engine_work_items where id=p_work_item_id for update;
  if not found or v_work.state<>'processing' or v_work.lease_owner<>p_owner then raise exception 'work item is not owned processing work'; end if;
  if p_expires_at<=now() then raise exception 'approval expiry must be in the future'; end if;
  insert into ps_engine_approval_requests(account_id,work_item_id,approval_scope,requested_by,context,expires_at)
  values(v_work.account_id,v_work.id,p_scope,p_requested_by,coalesce(p_context,'{}'::jsonb),p_expires_at)
  on conflict(work_item_id,approval_scope) do nothing returning id into v_request;
  if v_request is null then select id into v_request from ps_engine_approval_requests where work_item_id=v_work.id and approval_scope=p_scope; end if;
  update ps_engine_work_items set state='waiting_approval',approval_reference=v_request::text,lease_owner=null,lease_expires_at=null,updated_at=now() where id=v_work.id;
  insert into ps_engine_transitions(account_id,work_item_id,from_state,to_state,actor,reason,detail)
  values(v_work.account_id,v_work.id,'processing','waiting_approval',p_requested_by,'approval_requested',jsonb_build_object('approval_request_id',v_request,'scope',p_scope,'expires_at',p_expires_at));
  return v_request;
end $$;

create or replace function public.ps_engine_decide_approval(p_request_id uuid,p_account_id text,p_decision text,p_decided_by text,p_reason text,p_context jsonb default '{}'::jsonb)
returns public.ps_engine_work_items language plpgsql security definer set search_path=public as $$
declare v_request ps_engine_approval_requests; v_work ps_engine_work_items; v_after ps_engine_work_items;
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
  update ps_engine_work_items set state=case when p_decision='approved' then 'queued' else 'cancelled' end,
    approval_reference=v_request.id::text,available_at=case when p_decision='approved' then now() else null end,updated_at=now()
  where id=v_work.id returning * into v_after;
  insert into ps_engine_transitions(account_id,work_item_id,from_state,to_state,actor,reason,detail)
  values(p_account_id,v_work.id,'waiting_approval',v_after.state,p_decided_by,'approval_'||p_decision,jsonb_build_object('approval_request_id',p_request_id,'reason',p_reason));
  return v_after;
end $$;

drop trigger if exists ps_engine_approval_requests_immutable on public.ps_engine_approval_requests;
create trigger ps_engine_approval_requests_immutable before update or delete on public.ps_engine_approval_requests for each row execute function public.ps_engine_transitions_immutable();
drop trigger if exists ps_engine_approval_decisions_immutable on public.ps_engine_approval_decisions;
create trigger ps_engine_approval_decisions_immutable before update or delete on public.ps_engine_approval_decisions for each row execute function public.ps_engine_transitions_immutable();
grant execute on function public.ps_engine_request_approval(uuid,text,text,text,jsonb,timestamptz) to service_role;
grant execute on function public.ps_engine_decide_approval(uuid,text,text,text,text,jsonb) to service_role;
