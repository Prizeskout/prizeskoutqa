create table if not exists public.ps_promotion_scenarios (
  id uuid primary key default gen_random_uuid(),
  account_id text not null,
  name text not null,
  platform text not null,
  status text not null default 'draft'
    check (status in ('draft','approved','running','completed','cancelled')),
  inputs jsonb not null default '{}'::jsonb,
  results jsonb not null default '{}'::jsonb,
  promised_platform_funding numeric,
  actual_platform_funding numeric,
  funding_variance numeric,
  approved_by text,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists ps_promotion_scenarios_account_idx
  on public.ps_promotion_scenarios(account_id, created_at desc);

alter table public.ps_promotion_scenarios enable row level security;
