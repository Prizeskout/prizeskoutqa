-- PrizeSkout research foundation. This schema is deliberately isolated from
-- live pricing and dispatch: it may observe decisions and record predictions,
-- but it has no trigger, foreign-key cascade, or function that can alter a
-- merchant price. Accounts are disabled by default and require explicit opt-in.

create table if not exists public.ps_shadow_intelligence_settings (
  account_id uuid primary key,
  enabled boolean not null default false,
  evaluation_only boolean not null default true check (evaluation_only),
  enabled_by text,
  enabled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ps_intelligence_model_versions (
  id uuid primary key default gen_random_uuid(),
  model_key text not null,
  version integer not null check (version > 0),
  model_kind text not null check (model_kind in ('baseline','statistical','causal','optimization')),
  status text not null default 'research' check (status in ('research','shadow','retired')),
  training_data_cutoff timestamptz,
  feature_schema jsonb not null default '{}'::jsonb,
  evaluation_summary jsonb not null default '{}'::jsonb,
  artifact_hash text,
  created_at timestamptz not null default now(),
  unique(model_key,version)
);

create table if not exists public.ps_shadow_predictions (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null,
  licensee_id uuid not null,
  merchant_id text not null,
  region text not null,
  ingest_event_id uuid not null references public.ps_ingest_events(id) on delete cascade,
  decide_result_id uuid not null references public.ps_decide_results(id) on delete cascade,
  model_version_id uuid not null references public.ps_intelligence_model_versions(id),
  sku text not null,
  horizon_hours integer not null default 168 check (horizon_hours between 1 and 8760),
  observed_price numeric(14,4) not null,
  candidate_price numeric(14,4) not null,
  predicted_margin numeric(14,4) not null,
  predicted_margin_pct numeric(10,8) not null,
  predicted_demand_change_pct numeric(10,8),
  risk_level text not null check (risk_level in ('low','medium','high','unknown')),
  confidence numeric(8,6) not null check (confidence between 0 and 1),
  recommendation text not null check (recommendation in ('observe','hold','consider_reprice','insufficient_evidence')),
  explanation_codes text[] not null default '{}',
  feature_snapshot jsonb not null,
  created_at timestamptz not null default now(),
  unique(decide_result_id,model_version_id,horizon_hours)
);

create index if not exists ps_shadow_predictions_account_time
  on public.ps_shadow_predictions(account_id,created_at desc);

create table if not exists public.ps_shadow_outcomes (
  id uuid primary key default gen_random_uuid(),
  prediction_id uuid not null unique references public.ps_shadow_predictions(id) on delete cascade,
  account_id uuid not null,
  outcome_window_start timestamptz not null,
  outcome_window_end timestamptz not null,
  actual_price numeric(14,4),
  actual_units numeric(14,4),
  actual_revenue numeric(14,4),
  actual_margin numeric(14,4),
  actual_margin_pct numeric(10,8),
  absolute_error numeric(14,4),
  outcome_source text not null,
  evidence jsonb not null default '{}'::jsonb,
  evaluated_at timestamptz not null default now()
);

alter table public.ps_shadow_intelligence_settings enable row level security;
alter table public.ps_intelligence_model_versions enable row level security;
alter table public.ps_shadow_predictions enable row level security;
alter table public.ps_shadow_outcomes enable row level security;

revoke all on public.ps_shadow_intelligence_settings from anon,authenticated;
revoke all on public.ps_intelligence_model_versions from anon,authenticated;
revoke all on public.ps_shadow_predictions from anon,authenticated;
revoke all on public.ps_shadow_outcomes from anon,authenticated;

insert into public.ps_intelligence_model_versions (
  model_key,version,model_kind,status,feature_schema,evaluation_summary
) values (
  'margin-baseline',1,'baseline','shadow',
  '{"inputs":["base_cost","current_retail_price","recommended_price","commission_rate","vat_rate","logistics_subsidy","margin_floor_pct"]}'::jsonb,
  '{"claim":"Deterministic baseline only; no demand-learning or production authority."}'::jsonb
) on conflict (model_key,version) do nothing;

comment on table public.ps_shadow_predictions is
  'Research-only predictions. No live pricing or dispatch code reads this table.';
comment on column public.ps_shadow_intelligence_settings.evaluation_only is
  'Hard database guard: shadow intelligence cannot be configured for execution.';
