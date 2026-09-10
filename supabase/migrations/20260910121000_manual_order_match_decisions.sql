create table if not exists public.ps_order_match_decisions (
  id uuid primary key default gen_random_uuid(),
  account_id text not null,
  reconciliation_finding_id uuid not null references public.ps_reconciliation_findings(id) on delete restrict,
  resolution text not null check(resolution in ('exact','probable','unmatched','duplicate')),
  aggregator_order_reference text,
  pos_order_reference text,
  notes text,
  decided_by text not null,
  supersedes_id uuid references public.ps_order_match_decisions(id) on delete restrict,
  created_at timestamptz not null default now(),
  check(resolution in ('unmatched','duplicate') or nullif(trim(pos_order_reference),'') is not null)
);
create index if not exists ps_order_match_decisions_current on public.ps_order_match_decisions(account_id,reconciliation_finding_id,created_at desc);
alter table public.ps_order_match_decisions enable row level security;
revoke all on public.ps_order_match_decisions from anon,authenticated;
drop trigger if exists ps_order_match_decisions_immutable on public.ps_order_match_decisions;
create trigger ps_order_match_decisions_immutable before update or delete on public.ps_order_match_decisions for each row execute function public.ps_reject_api_independent_evidence_mutation();
comment on table public.ps_order_match_decisions is 'Append-only merchant decisions resolving order matches; later decisions supersede rather than overwrite history.';
