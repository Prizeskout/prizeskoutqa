-- Prevent overlapping scheduler invocations from processing the same evidence
-- source concurrently. Existing evidence/source migrations are immutable.

alter table public.ps_evidence_source_connections
  add column if not exists sync_lease_token uuid,
  add column if not exists sync_lease_until timestamptz;

create index if not exists ps_evidence_sources_due
  on public.ps_evidence_source_connections(status, read_only, last_sync_at, sync_lease_until);

create or replace function public.ps_claim_due_evidence_sources(
  p_limit integer,
  p_lease_token uuid,
  p_now timestamptz default now()
)
returns setof public.ps_evidence_source_connections
language sql
security definer
set search_path = public
as $$
  with candidates as (
    select id
    from public.ps_evidence_source_connections
    where status = 'active'
      and read_only = true
      and (sync_lease_until is null or sync_lease_until <= p_now)
      and (
        last_sync_at is null
        or last_sync_at + make_interval(mins => greatest(15, coalesce(expected_sync_interval_minutes, 1440))) <= p_now
      )
    order by last_sync_at asc nulls first, id
    for update skip locked
    limit least(greatest(coalesce(p_limit, 10), 1), 25)
  )
  update public.ps_evidence_source_connections source
  set sync_lease_token = p_lease_token,
      sync_lease_until = p_now + interval '10 minutes',
      updated_at = p_now
  from candidates
  where source.id = candidates.id
  returning source.*;
$$;

revoke all on function public.ps_claim_due_evidence_sources(integer, uuid, timestamptz)
  from public, anon, authenticated;
grant execute on function public.ps_claim_due_evidence_sources(integer, uuid, timestamptz)
  to service_role;

comment on column public.ps_evidence_source_connections.sync_lease_until is
  'Short scheduler lease preventing overlapping evidence pulls. It is not evidence freshness.';
comment on function public.ps_claim_due_evidence_sources(integer, uuid, timestamptz) is
  'Atomically claims due active read-only sources for one scheduler invocation.';
