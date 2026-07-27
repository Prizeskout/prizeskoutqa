create table if not exists public.ps_month_end_closes (
  id uuid primary key default gen_random_uuid(),
  account_id text not null,
  period_start date,
  period_end date,
  currency text not null,
  status text not null default 'draft' check(status in ('draft','reviewed','approved','locked')),
  schedules jsonb not null default '[]'::jsonb,
  journals jsonb not null default '[]'::jsonb,
  limitations jsonb not null default '[]'::jsonb,
  prepared_by text,
  reviewed_by text,
  approved_at timestamptz,
  locked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists ps_month_end_closes_account_idx on public.ps_month_end_closes(account_id,period_end desc);
alter table public.ps_month_end_closes enable row level security;
