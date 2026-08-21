-- Immutable server-generated recovery evidence manifests and approvals.
-- Migrations through 20260840000000 are deployed and must remain unchanged.

create table if not exists public.ps_recovery_evidence_packs (
  id uuid primary key default gen_random_uuid(),
  account_id text not null,
  recovery_case_id uuid not null references public.ps_recovery_cases(id) on delete restrict,
  pack_version text not null,
  manifest jsonb not null,
  manifest_fingerprint text not null check (manifest_fingerprint ~ '^[a-f0-9]{64}$'),
  created_at timestamptz not null default now(),
  unique(recovery_case_id,manifest_fingerprint)
);

create table if not exists public.ps_recovery_evidence_pack_approvals (
  id uuid primary key default gen_random_uuid(),
  account_id text not null,
  pack_id uuid not null unique references public.ps_recovery_evidence_packs(id) on delete restrict,
  approved_by text not null,
  approval_statement text not null,
  approved_at timestamptz not null default now()
);

create index if not exists ps_recovery_evidence_packs_case
  on public.ps_recovery_evidence_packs(account_id,recovery_case_id,created_at desc);

alter table public.ps_recovery_evidence_packs enable row level security;
alter table public.ps_recovery_evidence_pack_approvals enable row level security;
revoke all on public.ps_recovery_evidence_packs from anon,authenticated;
revoke all on public.ps_recovery_evidence_pack_approvals from anon,authenticated;

drop trigger if exists ps_recovery_evidence_packs_immutable on public.ps_recovery_evidence_packs;
create trigger ps_recovery_evidence_packs_immutable before update or delete on public.ps_recovery_evidence_packs
  for each row execute function public.ps_reject_reconciliation_mutation();
drop trigger if exists ps_recovery_pack_approvals_immutable on public.ps_recovery_evidence_pack_approvals;
create trigger ps_recovery_pack_approvals_immutable before update or delete on public.ps_recovery_evidence_pack_approvals
  for each row execute function public.ps_reject_reconciliation_mutation();

comment on table public.ps_recovery_evidence_packs is
  'Immutable evidence manifest prepared from retained documents, agreement terms, findings and reconciliation calculations.';
comment on table public.ps_recovery_evidence_pack_approvals is
  'Separate merchant approval required before a linked recovery case can be recorded as submitted.';
