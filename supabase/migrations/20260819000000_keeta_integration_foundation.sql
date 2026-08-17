-- Keeta verified callback evidence. Credentials remain in the service-role-only
-- channel vault. message_id is the platform replay/idempotency key.

create table if not exists public.ps_keeta_webhook_events (
  id uuid primary key default gen_random_uuid(),
  channel_id uuid not null references public.ps_merchant_channels(id) on delete cascade,
  account_id uuid not null,
  licensee_id uuid not null,
  merchant_id text not null,
  event_id text not null,
  message_id text not null,
  shop_id text not null,
  occurred_at timestamptz,
  status text not null default 'received' check (status in ('received','processing','processed','failed')),
  payload jsonb not null,
  message jsonb not null,
  error_message text,
  processed_at timestamptz,
  created_at timestamptz not null default now(),
  unique(channel_id,message_id)
);

create index if not exists ps_keeta_webhook_events_account_time
  on public.ps_keeta_webhook_events(account_id,created_at desc);

alter table public.ps_keeta_webhook_events enable row level security;
revoke all on public.ps_keeta_webhook_events from anon,authenticated;

comment on table public.ps_keeta_webhook_events is
  'Idempotent verified Keeta callback envelopes retained for order normalization and audit.';

create table if not exists public.ps_keeta_orders (
  id uuid primary key default gen_random_uuid(),
  channel_id uuid not null references public.ps_merchant_channels(id) on delete cascade,
  account_id uuid not null,
  licensee_id uuid not null,
  merchant_id text not null,
  external_order_id text not null,
  order_code text,
  shop_id text not null,
  status text,
  currency text,
  subtotal numeric,
  discount_total numeric,
  delivery_fee numeric,
  tax_total numeric,
  total numeric,
  items jsonb not null default '[]'::jsonb,
  raw_order jsonb not null,
  source text not null default 'webhook' check (source in ('webhook','poll')),
  last_message_id text,
  occurred_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(channel_id,external_order_id)
);

create index if not exists ps_keeta_orders_account_time
  on public.ps_keeta_orders(account_id,occurred_at desc);

create table if not exists public.ps_keeta_catalog_items (
  id uuid primary key default gen_random_uuid(),
  channel_id uuid not null references public.ps_merchant_channels(id) on delete cascade,
  account_id uuid not null,
  licensee_id uuid not null,
  merchant_id text not null,
  shop_id text not null,
  spu_open_item_code text not null,
  sku_open_item_code text not null,
  name text,
  currency text,
  price numeric,
  status text,
  native_spu jsonb not null,
  native_sku jsonb not null,
  source_hash text not null,
  synced_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(channel_id,sku_open_item_code)
);

create index if not exists ps_keeta_catalog_items_account_sku
  on public.ps_keeta_catalog_items(account_id,sku_open_item_code);

alter table public.ps_keeta_orders enable row level security;
alter table public.ps_keeta_catalog_items enable row level security;
revoke all on public.ps_keeta_orders from anon,authenticated;
revoke all on public.ps_keeta_catalog_items from anon,authenticated;

comment on table public.ps_keeta_catalog_items is
  'Native Keeta SPU/SKU snapshots required for lossless full-SPU menu updates.';
