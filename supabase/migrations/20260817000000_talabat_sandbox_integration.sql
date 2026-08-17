-- Talabat sandbox/live webhook evidence and normalized order mirror.
-- Credentials remain in the service-role-only channel vault; these tables
-- retain webhook evidence and are never writable by browser clients.

create table if not exists public.ps_talabat_webhook_events (
  id uuid primary key default gen_random_uuid(),
  channel_id uuid not null references public.ps_merchant_channels(id) on delete cascade,
  account_id uuid not null,
  licensee_id uuid not null,
  merchant_id text not null,
  environment text not null default 'production' check (environment in ('sandbox','production')),
  event_name text not null,
  event_key text not null,
  external_order_id text,
  occurred_at timestamptz,
  status text not null default 'processing' check (status in ('processing','processed','failed')),
  payload jsonb not null,
  error_message text,
  processed_at timestamptz,
  created_at timestamptz not null default now(),
  unique(channel_id,event_key)
);

create index if not exists ps_talabat_webhook_events_account_time
  on public.ps_talabat_webhook_events(account_id,created_at desc);

create table if not exists public.ps_talabat_orders (
  id uuid primary key default gen_random_uuid(),
  channel_id uuid not null references public.ps_merchant_channels(id) on delete cascade,
  account_id uuid not null,
  licensee_id uuid not null,
  merchant_id text not null,
  external_order_id text not null,
  order_code text,
  vendor_id text not null,
  status text,
  currency text not null default 'QAR',
  subtotal numeric,
  total numeric,
  delivery_type text,
  items jsonb not null default '[]'::jsonb,
  raw_order jsonb not null,
  last_event_id uuid references public.ps_talabat_webhook_events(id) on delete set null,
  occurred_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(channel_id,external_order_id)
);

create index if not exists ps_talabat_orders_account_time
  on public.ps_talabat_orders(account_id,occurred_at desc);

alter table public.ps_talabat_webhook_events enable row level security;
alter table public.ps_talabat_orders enable row level security;
revoke all on public.ps_talabat_webhook_events from anon,authenticated;
revoke all on public.ps_talabat_orders from anon,authenticated;

comment on table public.ps_talabat_webhook_events is 'Idempotent raw Talabat sandbox and production webhook evidence.';
comment on table public.ps_talabat_orders is 'Normalized latest-state mirror of Talabat orders received by webhook.';
