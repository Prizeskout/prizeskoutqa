create table if not exists public.ps_channel_price_plans (
  id uuid primary key default gen_random_uuid(),
  account_id text not null,
  name text not null,
  status text not null default 'draft'
    check (status in ('draft','approved','partially_published','published','cancelled')),
  channel_config jsonb not null default '[]'::jsonb,
  rows jsonb not null default '[]'::jsonb,
  approved_by text,
  approved_at timestamptz,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists ps_channel_price_plans_account_idx on public.ps_channel_price_plans(account_id,created_at desc);
alter table public.ps_channel_price_plans enable row level security;
