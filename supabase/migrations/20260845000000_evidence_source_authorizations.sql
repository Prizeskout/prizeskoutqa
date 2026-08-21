-- Immutable merchant authorization for automatic read-only source evidence.
-- Migrations through 20260844000000 are deployed and must remain unchanged.
create table if not exists public.ps_evidence_source_authorizations (
  id uuid primary key default gen_random_uuid(), account_id text not null,
  connection_id uuid not null unique references public.ps_evidence_source_connections(id) on delete restrict,
  approved_by text not null, approval_statement text not null,
  permissions text[] not null, branch_references text[] not null default '{}', approved_at timestamptz not null default now()
);
create index if not exists ps_evidence_source_authorizations_account on public.ps_evidence_source_authorizations(account_id,approved_at desc);
alter table public.ps_evidence_source_authorizations enable row level security;
revoke all on public.ps_evidence_source_authorizations from anon,authenticated;
drop trigger if exists ps_evidence_source_authorizations_immutable on public.ps_evidence_source_authorizations;
create trigger ps_evidence_source_authorizations_immutable before update or delete on public.ps_evidence_source_authorizations for each row execute function public.ps_reject_reconciliation_mutation();
comment on table public.ps_evidence_source_authorizations is 'Merchant approval allowing sanitized read-only records from one source and branch scope to enter automatic evidence processing.';
