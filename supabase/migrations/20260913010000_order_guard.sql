create table if not exists public.ps_order_guard_sources (
  id uuid primary key default gen_random_uuid(),
  account_id text not null,
  merchant_id text not null,
  provider text not null default 'urbanpiper',
  external_business_id text not null,
  token_hash text not null unique,
  status text not null default 'active' check (status in ('active','paused','revoked')),
  last_event_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(provider, external_business_id)
);

create table if not exists public.ps_order_guard_settings (
  account_id text primary key,
  acknowledgement_seconds integer not null default 60 check (acknowledgement_seconds between 15 and 600),
  manager_escalation_seconds integer not null default 120 check (manager_escalation_seconds between 30 and 1800),
  critical_escalation_seconds integer not null default 180 check (critical_escalation_seconds between 60 and 3600),
  preparation_stall_seconds integer not null default 900 check (preparation_stall_seconds between 300 and 3600),
  ready_grace_seconds integer not null default 300 check (ready_grace_seconds between 60 and 1800),
  enabled boolean not null default true,
  updated_at timestamptz not null default now()
);

create table if not exists public.ps_order_guard_orders (
  id uuid primary key default gen_random_uuid(),
  account_id text not null,
  merchant_id text not null,
  source_id uuid not null references public.ps_order_guard_sources(id) on delete restrict,
  provider text not null,
  external_order_id text not null,
  external_business_id text not null,
  external_branch_id text,
  channel text,
  status text not null default 'watching' check (status in ('watching','acknowledged','preparing','ready','completed','cancelled','unable_to_fulfil')),
  risk_level text not null default 'watching' check (risk_level in ('watching','attention','manager','critical','cleared')),
  currency text not null default 'QAR',
  order_total numeric,
  placed_at timestamptz not null,
  expected_ready_at timestamptz,
  acknowledged_at timestamptz,
  acknowledged_by text,
  ready_at timestamptz,
  completed_at timestamptz,
  last_source_event_at timestamptz not null,
  raw_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(source_id, external_order_id)
);

create table if not exists public.ps_order_guard_actions (
  id uuid primary key default gen_random_uuid(),
  account_id text not null,
  order_id uuid not null references public.ps_order_guard_orders(id) on delete cascade,
  action text not null,
  actor text not null,
  detail jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists ps_order_guard_live on public.ps_order_guard_orders(account_id,status,risk_level,placed_at desc);
create index if not exists ps_order_guard_actions_order on public.ps_order_guard_actions(order_id,created_at desc);
alter table public.ps_order_guard_sources enable row level security;
alter table public.ps_order_guard_settings enable row level security;
alter table public.ps_order_guard_orders enable row level security;
alter table public.ps_order_guard_actions enable row level security;
revoke all on public.ps_order_guard_sources,public.ps_order_guard_settings,public.ps_order_guard_orders,public.ps_order_guard_actions from anon,authenticated;

insert into public.ps_connector_definitions(provider,display_name,system_type,readiness,auth_methods,capabilities)
values ('urbanpiper','UrbanPiper','aggregator','production',array['partner_webhook'],array['merchant.read','branches.read','orders.read'])
on conflict(provider) do update set display_name=excluded.display_name,system_type=excluded.system_type,readiness=excluded.readiness,
auth_methods=excluded.auth_methods,capabilities=excluded.capabilities,updated_at=now();
