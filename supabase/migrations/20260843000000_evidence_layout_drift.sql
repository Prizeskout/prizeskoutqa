-- Auditable source-layout observations and merchant approvals.
-- Migrations through 20260842000000 are deployed and must remain unchanged.

create table if not exists public.ps_evidence_layout_observations (
  id uuid primary key default gen_random_uuid(), account_id text not null, merchant_id text not null,
  evidence_item_id uuid not null references public.ps_merchant_evidence_items(id) on delete restrict,
  source_provider text not null, layout_profile text not null,
  format_fingerprint text not null check(format_fingerprint ~ '^[a-f0-9]{64}$'), headers jsonb not null default '[]'::jsonb,
  observed_at timestamptz not null default now(), unique(evidence_item_id,layout_profile,format_fingerprint)
);
create table if not exists public.ps_evidence_layout_approvals (
  id uuid primary key default gen_random_uuid(), account_id text not null,
  observation_id uuid not null unique references public.ps_evidence_layout_observations(id) on delete restrict,
  approved_by text not null, approved_at timestamptz not null default now()
);
create index if not exists ps_evidence_layout_history on public.ps_evidence_layout_observations(account_id,source_provider,layout_profile,observed_at desc);
alter table public.ps_evidence_layout_observations enable row level security;
alter table public.ps_evidence_layout_approvals enable row level security;
revoke all on public.ps_evidence_layout_observations from anon,authenticated;
revoke all on public.ps_evidence_layout_approvals from anon,authenticated;
drop trigger if exists ps_evidence_layout_observations_immutable on public.ps_evidence_layout_observations;
create trigger ps_evidence_layout_observations_immutable before update or delete on public.ps_evidence_layout_observations for each row execute function public.ps_reject_reconciliation_mutation();
drop trigger if exists ps_evidence_layout_approvals_immutable on public.ps_evidence_layout_approvals;
create trigger ps_evidence_layout_approvals_immutable before update or delete on public.ps_evidence_layout_approvals for each row execute function public.ps_reject_reconciliation_mutation();
comment on table public.ps_evidence_layout_observations is 'Append-only fingerprints used to detect changed provider report columns.';
