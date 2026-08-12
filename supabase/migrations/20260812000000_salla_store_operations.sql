-- Idempotent operational mirror for Salla Store Manager and order reconciliation.
-- Raw payloads are retained for evidence while normalized columns power workflows.

create table if not exists public.ps_salla_webhook_events (
  id uuid primary key default gen_random_uuid(),
  channel_id uuid not null references public.ps_merchant_channels(id) on delete cascade,
  account_id uuid not null,
  licensee_id uuid not null,
  merchant_id text not null,
  event_name text not null,
  event_key text not null,
  occurred_at timestamptz,
  status text not null default 'processing' check(status in ('processing','processed','failed')),
  payload jsonb not null,
  error_message text,
  processed_at timestamptz,
  created_at timestamptz not null default now(),
  unique(channel_id,event_key)
);

create index if not exists ps_salla_webhook_events_account_time
  on public.ps_salla_webhook_events(account_id,created_at desc);

create table if not exists public.ps_salla_orders (
  id uuid primary key default gen_random_uuid(),
  channel_id uuid not null references public.ps_merchant_channels(id) on delete cascade,
  account_id uuid not null,
  licensee_id uuid not null,
  merchant_id text not null,
  external_order_id text not null,
  reference_id text,
  status text,
  payment_status text,
  currency text not null default 'SAR',
  subtotal numeric,
  discount_total numeric,
  shipping_total numeric,
  tax_total numeric,
  total numeric,
  paid_total numeric,
  refunded_total numeric,
  invoiced_total numeric,
  reconciliation_status text not null default 'pending'
    check(reconciliation_status in ('pending','reconciled','exception','cancelled')),
  reconciliation_delta numeric,
  last_event text not null,
  ordered_at timestamptz,
  updated_at timestamptz not null default now(),
  raw_payload jsonb not null default '{}'::jsonb,
  unique(channel_id,external_order_id)
);

create index if not exists ps_salla_orders_account_status
  on public.ps_salla_orders(account_id,reconciliation_status,updated_at desc);

create table if not exists public.ps_salla_order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.ps_salla_orders(id) on delete cascade,
  external_item_id text not null,
  product_id text,
  sku text,
  name text,
  quantity numeric not null default 0,
  unit_price numeric,
  total numeric,
  cost_total numeric,
  raw_payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  unique(order_id,external_item_id)
);

create table if not exists public.ps_salla_shipments (
  id uuid primary key default gen_random_uuid(),
  channel_id uuid not null references public.ps_merchant_channels(id) on delete cascade,
  account_id uuid not null,
  external_shipment_id text not null,
  external_order_id text,
  status text,
  company_name text,
  tracking_number text,
  shipping_cost numeric,
  last_event text not null,
  raw_payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  unique(channel_id,external_shipment_id)
);

create table if not exists public.ps_salla_invoices (
  id uuid primary key default gen_random_uuid(),
  channel_id uuid not null references public.ps_merchant_channels(id) on delete cascade,
  account_id uuid not null,
  external_invoice_id text not null,
  external_order_id text,
  currency text not null default 'SAR',
  total numeric,
  tax_total numeric,
  issued_at timestamptz,
  raw_payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  unique(channel_id,external_invoice_id)
);

create table if not exists public.ps_salla_store_entities (
  id uuid primary key default gen_random_uuid(),
  channel_id uuid not null references public.ps_merchant_channels(id) on delete cascade,
  account_id uuid not null,
  entity_type text not null check(entity_type in ('product','category','brand','special_offer','shipping_zone','shipping_company','branch','tax')),
  external_id text not null,
  name text,
  status text,
  deleted_at timestamptz,
  last_event text not null,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  unique(channel_id,entity_type,external_id)
);

create index if not exists ps_salla_store_entities_account_type
  on public.ps_salla_store_entities(account_id,entity_type,updated_at desc);

alter table public.ps_salla_webhook_events enable row level security;
alter table public.ps_salla_orders enable row level security;
alter table public.ps_salla_order_items enable row level security;
alter table public.ps_salla_shipments enable row level security;
alter table public.ps_salla_invoices enable row level security;
alter table public.ps_salla_store_entities enable row level security;

revoke all on public.ps_salla_webhook_events from anon,authenticated;
revoke all on public.ps_salla_orders from anon,authenticated;
revoke all on public.ps_salla_order_items from anon,authenticated;
revoke all on public.ps_salla_shipments from anon,authenticated;
revoke all on public.ps_salla_invoices from anon,authenticated;
revoke all on public.ps_salla_store_entities from anon,authenticated;
