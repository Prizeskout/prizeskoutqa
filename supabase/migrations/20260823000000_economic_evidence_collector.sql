-- Append-only evidence for the Economic Twin research loop. This migration
-- does not add triggers to, or change, any live order/pricing/dispatch table.

alter table public.ps_shadow_predictions
  add column if not exists source_platform text;

create table if not exists public.ps_economic_observations (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null,
  licensee_id uuid not null,
  merchant_id text not null,
  prediction_id uuid not null references public.ps_shadow_predictions(id) on delete cascade,
  source_platform text not null,
  source_table text not null,
  source_record_id text not null,
  external_order_id text,
  sku text not null,
  event_type text not null check (event_type in ('order_item','refund','cancellation','payout_charge','price_confirmation')),
  observed_at timestamptz not null,
  currency text,
  units numeric,
  revenue numeric,
  cost numeric,
  commission numeric,
  tax_on_fees numeric,
  reconstructed_margin numeric,
  quality_grade text not null check (quality_grade in ('A','B','C','D')),
  completeness numeric(8,6) not null check (completeness between 0 and 1),
  limitations text[] not null default '{}',
  evidence jsonb not null,
  evidence_hash text not null,
  created_at timestamptz not null default now(),
  unique(prediction_id,source_table,source_record_id,event_type)
);

create index if not exists ps_economic_observations_prediction_time
  on public.ps_economic_observations(prediction_id,observed_at);
create index if not exists ps_economic_observations_account_sku
  on public.ps_economic_observations(account_id,sku,observed_at desc);

alter table public.ps_shadow_outcomes
  add column if not exists quality_grade text not null default 'D'
    check (quality_grade in ('A','B','C','D')),
  add column if not exists completeness numeric(8,6) not null default 0
    check (completeness between 0 and 1),
  add column if not exists prediction_error_pct numeric(10,8),
  add column if not exists training_eligible boolean not null default false,
  add column if not exists limitations text[] not null default '{}';

alter table public.ps_economic_observations enable row level security;
revoke all on public.ps_economic_observations from anon,authenticated;

select public.lock_immutable_table('ps_economic_observations');

comment on table public.ps_economic_observations is
  'Append-only economic evidence collected in shadow mode; never consumed by live dispatch.';
comment on column public.ps_economic_observations.quality_grade is
  'A requires item-level settlement proof; B is strong reconstructed evidence; C is partial; D is unusable.';
comment on column public.ps_shadow_outcomes.training_eligible is
  'False unless evidence meets the explicit quality threshold; no automatic model training exists.';
