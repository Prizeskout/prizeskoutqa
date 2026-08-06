-- Auditable workflows for promotion launch readiness, group policy rollout,
-- and manually submitted recovery claims.

alter table public.ps_promotion_scenarios
  drop constraint if exists ps_promotion_scenarios_status_check;

alter table public.ps_promotion_scenarios
  add constraint ps_promotion_scenarios_status_check
    check (status in ('draft','pending_approval','approved','ready_to_launch','running','completed','cancelled')),
  add column if not exists finance_approved_by text,
  add column if not exists finance_approved_at timestamptz,
  add column if not exists operations_approved_by text,
  add column if not exists operations_approved_at timestamptz,
  add column if not exists launch_manifest jsonb not null default '[]'::jsonb,
  add column if not exists launch_prepared_at timestamptz;

alter table public.ps_group_controls
  add column if not exists policy_rollout jsonb not null default '[]'::jsonb;

alter table public.ps_recovery_cases
  add column if not exists submission_reference text,
  add column if not exists submitted_at timestamptz,
  add column if not exists submitted_by text,
  add column if not exists submission_evidence_hash text;

create table if not exists public.ps_recovery_submission_events (
  id uuid primary key default gen_random_uuid(),
  account_id text not null,
  recovery_case_id uuid not null references public.ps_recovery_cases(id) on delete cascade,
  submission_reference text not null,
  submitted_by text not null,
  evidence_hash text not null,
  created_at timestamptz not null default now()
);

create index if not exists ps_recovery_submission_events_account_time
  on public.ps_recovery_submission_events(account_id, created_at desc);

alter table public.ps_recovery_submission_events enable row level security;
