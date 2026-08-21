-- Trace recovery cases back to the exact immutable reconciliation conclusion.
-- Migrations through 20260837000000 are deployed and must remain unchanged.

-- Some early PrizeSkout environments predate the recovery-case migration.
-- Keep this additive migration self-contained so those databases can catch up
-- without replaying unrelated historical migrations.
create table if not exists public.ps_recovery_cases (
  id uuid primary key default gen_random_uuid(),
  account_id text not null,
  platform text not null,
  exception_key text not null,
  title text not null,
  status text not null default 'evidence_required'
    check (status in ('evidence_required','draft','ready','submitted_manually','platform_review','accepted','rejected','recovered','closed')),
  severity text not null,
  exception_amount numeric,
  claims_ready_amount numeric not null default 0,
  confidence text not null default 'low',
  affected_orders integer,
  contract_term_id uuid,
  contract_clause text,
  regulatory_reference text,
  evidence_sources jsonb not null default '[]'::jsonb,
  calculation jsonb not null default '{}'::jsonb,
  explanation_en text not null,
  explanation_ar text not null,
  submission_deadline date,
  owner text,
  platform_response text,
  recovered_amount numeric not null default 0,
  submission_reference text,
  submitted_at timestamptz,
  submitted_by text,
  submission_evidence_hash text,
  recovered_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(account_id,exception_key)
);

create index if not exists idx_ps_recovery_cases_account_status
  on public.ps_recovery_cases(account_id,status,created_at desc);

alter table public.ps_recovery_cases enable row level security;

alter table public.ps_recovery_cases
  add column if not exists reconciliation_finding_id uuid
    references public.ps_reconciliation_findings(id) on delete restrict,
  add column if not exists reconciliation_run_id uuid
    references public.ps_settlement_reconciliation_runs(id) on delete restrict;

create unique index if not exists ps_recovery_cases_finding_unique
  on public.ps_recovery_cases(reconciliation_finding_id)
  where reconciliation_finding_id is not null;

comment on column public.ps_recovery_cases.reconciliation_finding_id is
  'Immutable reconciliation conclusion from which the merchant prepared this recovery case.';
comment on column public.ps_recovery_cases.reconciliation_run_id is
  'Reconciliation run containing the evidence calculation used by this recovery case.';
