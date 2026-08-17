-- Production hardening for Talabat Partner API v2 callbacks and async jobs.

alter table public.ps_talabat_webhook_events
  add column if not exists callback_kind text not null default 'order'
    check (callback_kind in ('order','catalog')),
  add column if not exists job_id text,
  add column if not exists payload_hash text;

alter table public.ps_talabat_orders
  add column if not exists chain_id text,
  add column if not exists country_code text,
  add column if not exists order_type text,
  add column if not exists transport_type text,
  add column if not exists payment_type text,
  add column if not exists tax_total numeric,
  add column if not exists delivery_fee numeric,
  add column if not exists service_fee numeric,
  add column if not exists discount_total numeric,
  add column if not exists cancellation jsonb,
  add column if not exists promotion_status text,
  add column if not exists sys_updated_at timestamptz;

create table if not exists public.ps_talabat_catalog_jobs (
  id uuid primary key default gen_random_uuid(),
  channel_id uuid not null references public.ps_merchant_channels(id) on delete cascade,
  account_id uuid not null,
  licensee_id uuid not null,
  merchant_id text not null,
  environment text not null check (environment in ('sandbox','production')),
  job_id text not null,
  operation text not null default 'update_products',
  source_plan_id uuid references public.ps_channel_price_plans(id) on delete set null,
  status text not null default 'QUEUED',
  requested_products jsonb not null default '[]'::jsonb,
  download_url text,
  callback_payload jsonb,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(channel_id,job_id)
);

create index if not exists ps_talabat_catalog_jobs_account_time
  on public.ps_talabat_catalog_jobs(account_id,created_at desc);

alter table public.ps_talabat_catalog_jobs enable row level security;
revoke all on public.ps_talabat_catalog_jobs from anon,authenticated;

comment on table public.ps_talabat_catalog_jobs is
  'Tracks asynchronous Talabat catalog acceptance separately from confirmed callback completion.';

alter table public.ps_channel_price_plans drop constraint if exists ps_channel_price_plans_status_check;
alter table public.ps_channel_price_plans
  add constraint ps_channel_price_plans_status_check
  check (status in ('draft','approved','publishing','partially_published','published','cancelled'));
