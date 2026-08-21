-- Durable, evidence-strength-aware conclusions produced by reconciliation.
-- Migrations through 20260836000000 are deployed and must remain unchanged.

create table if not exists public.ps_reconciliation_findings (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.ps_settlement_reconciliation_runs(id) on delete restrict,
  allocation_id uuid references public.ps_settlement_reconciliation_allocations(id) on delete restrict,
  account_id text not null,
  evidence_item_id uuid not null references public.ps_merchant_evidence_items(id) on delete restrict,
  contract_term_id uuid references public.ps_marketplace_contract_terms(id) on delete restrict,
  conclusion text not null check (conclusion in ('confirmed_discrepancy','probable_discrepancy','unallocated_batch_difference','insufficient_evidence','reconciled')),
  recoverability text not null check (recoverability in ('claims_ready','review_required','evidence_required','none')),
  order_external_id text,
  settlement_reference text,
  currency text not null,
  expected_amount numeric,
  reported_amount numeric,
  variance numeric,
  evidence_strength text not null check (evidence_strength in ('confirmed','strong','partial','insufficient')),
  explanation text not null,
  blockers jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  unique(run_id,allocation_id)
);

create index if not exists ps_reconciliation_findings_account_time
  on public.ps_reconciliation_findings(account_id,created_at desc);
create index if not exists ps_reconciliation_findings_attention
  on public.ps_reconciliation_findings(account_id,conclusion,recoverability,created_at desc)
  where conclusion <> 'reconciled';

alter table public.ps_reconciliation_findings enable row level security;
revoke all on public.ps_reconciliation_findings from anon,authenticated;

drop trigger if exists ps_reconciliation_findings_immutable on public.ps_reconciliation_findings;
create trigger ps_reconciliation_findings_immutable before update or delete on public.ps_reconciliation_findings
  for each row execute function public.ps_reject_reconciliation_mutation();

comment on table public.ps_reconciliation_findings is
  'Append-only evidence conclusions. Only confirmed, order-allocated discrepancies can be claims-ready automatically.';
