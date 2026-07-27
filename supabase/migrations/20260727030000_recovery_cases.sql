create table if not exists public.ps_recovery_cases (
  id uuid primary key default gen_random_uuid(),
  account_id text not null,
  platform text not null,
  exception_key text not null,
  title text not null,
  status text not null default 'evidence_required'
    check (status in ('evidence_required','draft','ready','submitted_manually','platform_review','accepted','rejected','recovered','closed')),
  severity text not null,
  exception_amount numeric,
  claims_ready_amount numeric not null default 0,
  confidence text not null default 'low',
  affected_orders integer,
  contract_term_id uuid,
  contract_clause text,
  regulatory_reference text,
  evidence_sources jsonb not null default '[]',
  calculation jsonb not null default '{}',
  explanation_en text not null,
  explanation_ar text not null,
  submission_deadline date,
  owner text,
  platform_response text,
  recovered_amount numeric not null default 0,
  submitted_at timestamptz,
  recovered_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(account_id, exception_key)
);

create index if not exists idx_ps_recovery_cases_account_status
  on public.ps_recovery_cases(account_id,status,created_at desc);

alter table public.ps_recovery_cases enable row level security;
