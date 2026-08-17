create table if not exists public.ps_zid_webhook_events (
  id uuid primary key default gen_random_uuid(),
  channel_id uuid not null references public.ps_merchant_channels(id) on delete cascade,
  account_id uuid not null,
  event_name text not null,
  event_key text not null,
  store_id text not null,
  external_order_id text,
  status text not null default 'received' check (status in ('received','processed','failed')),
  payload jsonb not null,
  error_message text,
  created_at timestamptz not null default now(),
  processed_at timestamptz,
  unique(channel_id,event_key)
);

create table if not exists public.ps_zid_orders (
  id uuid primary key default gen_random_uuid(),
  channel_id uuid not null references public.ps_merchant_channels(id) on delete cascade,
  account_id uuid not null,
  external_order_id text not null,
  order_code text,
  status text,
  payment_status text,
  currency text not null default 'SAR',
  total numeric,
  items jsonb not null default '[]'::jsonb,
  raw_order jsonb not null,
  occurred_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(channel_id,external_order_id)
);

create index if not exists ps_zid_webhook_events_account_time on public.ps_zid_webhook_events(account_id,created_at desc);
create index if not exists ps_zid_orders_account_time on public.ps_zid_orders(account_id,occurred_at desc);
alter table public.ps_zid_webhook_events enable row level security;
alter table public.ps_zid_orders enable row level security;
revoke all on public.ps_zid_webhook_events from anon,authenticated;
revoke all on public.ps_zid_orders from anon,authenticated;
