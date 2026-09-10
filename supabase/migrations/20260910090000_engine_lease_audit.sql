-- A lease is a state transition and must be present in the immutable audit trail.
create or replace function public.ps_engine_lease_work(p_owner text,p_limit integer default 20)
returns setof public.ps_engine_work_items language plpgsql security definer set search_path=public as $$
begin
  return query
  with candidates as (
    select id,state from ps_engine_work_items
    where state in ('queued','retry_scheduled') and coalesce(available_at,now())<=now()
      and (lease_expires_at is null or lease_expires_at<now())
    order by priority,created_at for update skip locked limit least(greatest(p_limit,1),50)
  ), updated as (
    update ps_engine_work_items w set state='leased',attempt=w.attempt+1,lease_owner=p_owner,
      lease_expires_at=now()+interval '2 minutes',updated_at=now()
    from candidates c where w.id=c.id returning w.*
  ), audited as (
    insert into ps_engine_transitions(account_id,work_item_id,from_state,to_state,actor,reason,detail)
    select u.account_id,u.id,c.state,'leased','worker:'||p_owner,'work_leased',jsonb_build_object('attempt',u.attempt,'lease_expires_at',u.lease_expires_at)
    from updated u join candidates c on c.id=u.id
  ) select * from updated;
end $$;
grant execute on function public.ps_engine_lease_work(text,integer) to service_role;
