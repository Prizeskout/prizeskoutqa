-- Reliable automatic processing for retained merchant evidence.
-- Migrations through 20260833000000 are deployed and must remain unchanged.

create table if not exists public.ps_evidence_processing_jobs (
  id uuid primary key default gen_random_uuid(),
  evidence_item_id uuid not null unique references public.ps_merchant_evidence_items(id) on delete restrict,
  account_id text not null,
  merchant_id text not null,
  state text not null default 'queued' check (state in ('queued','leased','completed','dead_letter')),
  attempts integer not null default 0 check (attempts >= 0),
  max_attempts integer not null default 5 check (max_attempts between 1 and 20),
  available_at timestamptz,
  lease_owner text,
  lease_expires_at timestamptz,
  last_error text,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists ps_evidence_processing_jobs_due
  on public.ps_evidence_processing_jobs(state,available_at)
  where state in ('queued','leased');
create index if not exists ps_evidence_processing_jobs_merchant
  on public.ps_evidence_processing_jobs(account_id,state,updated_at desc);

create table if not exists public.ps_evidence_processor_runs (
  id uuid primary key default gen_random_uuid(),
  worker_id text not null,
  state text not null check (state in ('running','completed','failed')),
  leased_count integer not null default 0,
  completed_count integer not null default 0,
  retried_count integer not null default 0,
  dead_letter_count integer not null default 0,
  error_message text,
  started_at timestamptz not null default now(),
  finished_at timestamptz
);

create index if not exists ps_evidence_processor_runs_started
  on public.ps_evidence_processor_runs(started_at desc);

alter table public.ps_evidence_processing_jobs enable row level security;
alter table public.ps_evidence_processor_runs enable row level security;
revoke all on public.ps_evidence_processing_jobs from anon,authenticated;
revoke all on public.ps_evidence_processor_runs from anon,authenticated;

create or replace function public.ps_enqueue_merchant_evidence()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  if new.storage_reference is not null then
    insert into public.ps_evidence_processing_jobs(evidence_item_id,account_id,merchant_id,available_at)
    values(new.id,new.account_id,new.merchant_id,now()) on conflict(evidence_item_id) do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists ps_enqueue_merchant_evidence on public.ps_merchant_evidence_items;
create trigger ps_enqueue_merchant_evidence after insert on public.ps_merchant_evidence_items
for each row execute function public.ps_enqueue_merchant_evidence();

-- Backfill only documents that have not already reached review or normalization.
insert into public.ps_evidence_processing_jobs(evidence_item_id,account_id,merchant_id,available_at)
select item.id,item.account_id,item.merchant_id,now()
from public.ps_merchant_evidence_items item
where item.storage_reference is not null
  and not exists(select 1 from public.ps_evidence_review_drafts draft where draft.evidence_item_id=item.id)
  and not exists(select 1 from public.ps_normalized_commerce_events event where event.evidence_item_id=item.id)
on conflict(evidence_item_id) do nothing;

create or replace function public.ps_lease_evidence_processing_jobs(p_owner text,p_limit integer default 20)
returns setof public.ps_evidence_processing_jobs
language plpgsql security definer set search_path=public as $$
begin
  if coalesce(trim(p_owner),'')='' then raise exception 'Worker owner is required.'; end if;

  update public.ps_evidence_processing_jobs
  set state='dead_letter',available_at=null,lease_owner=null,lease_expires_at=null,
      last_error=coalesce(last_error,'Maximum processing attempts reached.'),updated_at=now()
  where attempts>=max_attempts and state in ('queued','leased')
    and (state='queued' or lease_expires_at<now());

  return query
  with due as (
    select id from public.ps_evidence_processing_jobs
    where attempts<max_attempts and (
      (state='queued' and coalesce(available_at,now())<=now()) or
      (state='leased' and lease_expires_at<now())
    )
    order by coalesce(available_at,created_at),created_at
    for update skip locked limit least(greatest(p_limit,1),50)
  )
  update public.ps_evidence_processing_jobs job
  set state='leased',attempts=job.attempts+1,lease_owner=p_owner,
      lease_expires_at=now()+interval '4 minutes',updated_at=now()
  from due where job.id=due.id returning job.*;
end;
$$;

revoke all on function public.ps_lease_evidence_processing_jobs(text,integer) from public,anon,authenticated;
grant execute on function public.ps_lease_evidence_processing_jobs(text,integer) to service_role;

comment on table public.ps_evidence_processing_jobs is
  'Durable leased evidence-processing queue with bounded retries and a merchant-visible dead-letter state.';
comment on table public.ps_evidence_processor_runs is
  'Worker heartbeat and outcome history used to detect stalled automatic processing.';

-- Production scheduling is deliberately secret-driven. After adding the two
-- Supabase Vault secrets below. The scheduled query remains a no-op until both
-- values exist, so no secret is committed to source control.
--   evidence_processor_url    = https://your-domain/api/public/hooks/evidence-process
--   evidence_processor_secret = the same value as EVIDENCE_PROCESSOR_SECRET
do $$
begin
  if exists(select 1 from pg_extension where extname='pg_cron')
     and exists(select 1 from pg_extension where extname='pg_net')
     and exists(select 1 from pg_namespace where nspname='vault') then
    if exists(select 1 from cron.job where jobname='evidence-process') then perform cron.unschedule('evidence-process'); end if;
    perform cron.schedule('evidence-process','*/5 * * * *',$job$
      select net.http_post(
        url := secrets.processor_url,
        headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer ' || secrets.processor_secret),
        body := '{"limit":20}'::jsonb
      )
      from (
        select
          max(decrypted_secret) filter(where name='evidence_processor_url') as processor_url,
          max(decrypted_secret) filter(where name='evidence_processor_secret') as processor_secret
        from vault.decrypted_secrets
      ) secrets
      where nullif(secrets.processor_url,'') is not null and nullif(secrets.processor_secret,'') is not null;
    $job$);
  end if;
end $$;
