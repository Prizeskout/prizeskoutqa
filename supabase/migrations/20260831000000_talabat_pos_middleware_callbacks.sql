-- Durable latest-state mirror for Delivery Hero POS Middleware vendor
-- availability callbacks. Service-role handlers are the only writers/readers.
create table if not exists public.ps_talabat_vendor_availability (
  channel_id uuid primary key references public.ps_merchant_channels(id) on delete cascade,
  account_id uuid not null,
  licensee_id uuid not null,
  merchant_id text not null,
  pos_vendor_id text not null,
  is_available boolean not null,
  closures jsonb not null default '[]'::jsonb,
  occurred_at timestamptz not null,
  updated_at timestamptz not null default now()
);

create index if not exists ps_talabat_vendor_availability_account
  on public.ps_talabat_vendor_availability(account_id);

alter table public.ps_talabat_vendor_availability enable row level security;
revoke all on public.ps_talabat_vendor_availability from anon, authenticated;

comment on table public.ps_talabat_vendor_availability is
  'Latest timestamp-ordered vendor availability received from Talabat POS Middleware.';
