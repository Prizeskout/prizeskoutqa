create table if not exists public.ps_zid_jahez_bridge_settings (
  account_id text primary key,
  mazeed_active boolean not null default false,
  jahez_active boolean not null default false,
  mazeed_commission_pct numeric check (mazeed_commission_pct is null or (mazeed_commission_pct >= 0 and mazeed_commission_pct <= 100)),
  vat_mode text not null default 'store_includes_vat' check (vat_mode in ('store_includes_vat','mazeed_adds_vat')),
  eligible_skus jsonb not null default '[]'::jsonb,
  confirmed_by text,
  confirmed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.ps_zid_jahez_bridge_settings enable row level security;

create table if not exists public.ps_channel_propagation_events (
  id uuid primary key default gen_random_uuid(),
  account_id text not null,
  ingest_event_id uuid references public.ps_ingest_events(id) on delete set null,
  sku text not null,
  source_channel text not null,
  target_channel text not null,
  expected_price numeric not null,
  confirmed_price numeric,
  status text not null default 'pending' check (status in ('pending','confirmed','failed','manual_verification')),
  evidence jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists ps_channel_propagation_events_account_time
  on public.ps_channel_propagation_events(account_id, created_at desc);

alter table public.ps_channel_propagation_events enable row level security;
