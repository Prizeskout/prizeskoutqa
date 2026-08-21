-- Record exactly what each successful automatic-source delivery covered.
-- Migrations through 20260846000000 are deployed and must remain unchanged.

alter table public.ps_evidence_source_sync_runs
  add column if not exists evidence_period_start timestamptz,
  add column if not exists evidence_period_end timestamptz,
  add column if not exists final_records integer not null default 0 check(final_records >= 0),
  add column if not exists non_final_records integer not null default 0 check(non_final_records >= 0),
  add column if not exists channels text[] not null default '{}',
  add column if not exists currencies text[] not null default '{}',
  add column if not exists branch_references text[] not null default '{}';

alter table public.ps_evidence_source_sync_runs
  drop constraint if exists ps_evidence_source_sync_runs_period_valid;
alter table public.ps_evidence_source_sync_runs
  add constraint ps_evidence_source_sync_runs_period_valid
  check(evidence_period_end is null or evidence_period_start is null or evidence_period_end >= evidence_period_start);

comment on column public.ps_evidence_source_sync_runs.evidence_period_end is
  'Latest event time observed in this delivery. This is an evidence boundary, not a guarantee that every provider record was supplied.';
comment on column public.ps_evidence_source_sync_runs.non_final_records is
  'Records retained as partial evidence and excluded from claims-ready conclusions until a final update arrives.';
