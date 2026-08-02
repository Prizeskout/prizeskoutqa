create table if not exists public.ps_zid_profit_snapshots (
  id uuid primary key default gen_random_uuid(),
  account_id text not null,
  period_start date not null,
  period_end date not null,
  currency text not null default 'SAR',
  order_count integer not null default 0,
  analyzable_order_count integer not null default 0,
  revenue numeric not null default 0,
  contribution numeric not null default 0,
  loss_order_count integer not null default 0,
  discount_total numeric not null default 0,
  verified_cost_coverage_pct numeric not null default 0,
  summary jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_ps_zid_profit_snapshots_account
  on public.ps_zid_profit_snapshots (account_id, created_at desc);

alter table public.ps_zid_profit_snapshots enable row level security;
revoke all on public.ps_zid_profit_snapshots from anon, authenticated;
