create table if not exists public.ps_group_controls (
  id uuid primary key default gen_random_uuid(),
  account_id text not null unique,
  group_name text not null,
  legal_entities jsonb not null default '[]'::jsonb,
  brands jsonb not null default '[]'::jsonb,
  branches jsonb not null default '[]'::jsonb,
  members jsonb not null default '[]'::jsonb,
  finance_approved_by text,
  finance_approved_at timestamptz,
  operations_approved_by text,
  operations_approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.ps_group_controls enable row level security;
