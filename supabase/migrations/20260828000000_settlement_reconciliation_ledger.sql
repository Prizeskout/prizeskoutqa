-- Immutable evidence chain from order expectation to platform settlement and bank receipt.
create table if not exists public.ps_settlement_reconciliation_runs (
  id uuid primary key default gen_random_uuid(),
  account_id text not null,
  platform text not null,
  currency text not null,
  period_start date,
  period_end date,
  engine_version text not null,
  input_fingerprint text not null check (length(input_fingerprint)=64),
  status text not null check (status in ('completed','completed_with_exceptions','insufficient_evidence')),
  summary jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique(account_id,platform,currency,input_fingerprint)
);

create table if not exists public.ps_settlement_reconciliation_allocations (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.ps_settlement_reconciliation_runs(id) on delete restrict,
  account_id text not null,
  platform text not null,
  currency text not null,
  order_id text,
  settlement_reference text,
  bank_reference text,
  expected_amount numeric not null default 0,
  settled_amount numeric,
  received_amount numeric,
  variance numeric,
  state text not null check (state in ('awaiting_settlement','partially_settled','settled_awaiting_bank','partially_paid','reconciled','unexplained_deduction','overpaid','ambiguous','claim_ready')),
  match_basis text not null check (match_basis in ('exact_order_reference','exact_settlement_reference','unmatched','ambiguous')),
  evidence jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists ps_settlement_reconciliation_runs_account_time
  on public.ps_settlement_reconciliation_runs(account_id,created_at desc);
create index if not exists ps_settlement_allocations_run
  on public.ps_settlement_reconciliation_allocations(run_id);
create unique index if not exists ps_settlement_allocation_identity
  on public.ps_settlement_reconciliation_allocations(run_id,coalesce(order_id,''),coalesce(settlement_reference,''),coalesce(bank_reference,''));

alter table public.ps_settlement_reconciliation_runs enable row level security;
alter table public.ps_settlement_reconciliation_allocations enable row level security;

create or replace function public.ps_reject_reconciliation_mutation()
returns trigger language plpgsql as $$
begin
  raise exception 'Settlement reconciliation evidence is append-only; create a new run instead.';
end;
$$;

drop trigger if exists ps_reconciliation_runs_immutable on public.ps_settlement_reconciliation_runs;
create trigger ps_reconciliation_runs_immutable before update or delete on public.ps_settlement_reconciliation_runs
  for each row execute function public.ps_reject_reconciliation_mutation();
drop trigger if exists ps_reconciliation_allocations_immutable on public.ps_settlement_reconciliation_allocations;
create trigger ps_reconciliation_allocations_immutable before update or delete on public.ps_settlement_reconciliation_allocations
  for each row execute function public.ps_reject_reconciliation_mutation();

comment on table public.ps_settlement_reconciliation_allocations is
  'Append-only reconciliation conclusions. Corrections create a new run; prior evidence is never overwritten.';
