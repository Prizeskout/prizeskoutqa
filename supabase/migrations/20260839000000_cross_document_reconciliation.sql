-- Record every approved source document used by a reconciliation run.
-- Migrations through 20260838000000 are deployed and must remain unchanged.

create table if not exists public.ps_reconciliation_run_evidence (
  run_id uuid not null references public.ps_settlement_reconciliation_runs(id) on delete restrict,
  evidence_item_id uuid not null references public.ps_merchant_evidence_items(id) on delete restrict,
  account_id text not null,
  evidence_role text not null check (evidence_role in ('order','settlement','adjustment','confirmation','mixed')),
  created_at timestamptz not null default now(),
  primary key(run_id,evidence_item_id)
);

create index if not exists ps_reconciliation_run_evidence_item
  on public.ps_reconciliation_run_evidence(account_id,evidence_item_id,created_at desc);

alter table public.ps_reconciliation_run_evidence enable row level security;
revoke all on public.ps_reconciliation_run_evidence from anon,authenticated;

drop trigger if exists ps_reconciliation_run_evidence_immutable on public.ps_reconciliation_run_evidence;
create trigger ps_reconciliation_run_evidence_immutable before update or delete on public.ps_reconciliation_run_evidence
  for each row execute function public.ps_reject_reconciliation_mutation();

comment on table public.ps_reconciliation_run_evidence is
  'Append-only manifest of approved merchant evidence combined in one cross-document reconciliation.';
