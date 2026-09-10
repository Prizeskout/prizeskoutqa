-- Canonical restaurant workspace and operating hierarchy.
-- This migration deliberately keeps financial facts in the immutable Economic
-- Twin (ps_normalized_commerce_events) and makes every mutable configuration
-- record point at the same account and branch identities.

create table if not exists public.ps_restaurant_workspaces (
  account_id text primary key,
  licensee_id uuid references public.licensees(id) on delete restrict,
  name text not null check (char_length(name) between 1 and 160),
  country_code text not null check (country_code ~ '^[A-Z]{2}$'),
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  industry text not null default 'restaurant' check (industry = 'restaurant'),
  timezone text not null default 'Asia/Qatar',
  active boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.licensee_members
  add column if not exists functional_role text
  check (functional_role is null or functional_role in ('finance','operations','management','accounting'));

create table if not exists public.ps_branch_channel_assignments (
  id uuid primary key default gen_random_uuid(),
  account_id text not null,
  branch_id uuid not null references public.ps_enterprise_entities(id) on delete restrict,
  platform text not null,
  external_branch_id text not null,
  pos_external_id text,
  active boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (account_id, branch_id, platform)
);

create table if not exists public.ps_alert_rules (
  id uuid primary key default gen_random_uuid(),
  account_id text not null,
  name text not null,
  metric text not null check (metric in ('money','percentage','contribution','payout_variance','margin')),
  operator text not null check (operator in ('gt','gte','lt','lte')),
  threshold numeric not null,
  severity text not null check (severity in ('info','warning','critical')),
  platform text,
  branch_external_id text,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(account_id,name)
);

-- Preserve existing location IDs as canonical branch external IDs so historic
-- orders and contracts can be joined without rewriting evidence.
insert into public.ps_enterprise_entities
  (account_id,entity_type,external_id,name,country_code,currency,timezone,active,metadata)
select l.account_id,'branch',l.id::text,l.name,
  case l.region when 'Qatar' then 'QA' when 'Saudi Arabia' then 'SA'
    when 'UAE' then 'AE' when 'Kuwait' then 'KW' when 'Bahrain' then 'BH'
    when 'Oman' then 'OM' end,
  case l.region when 'Qatar' then 'QAR' when 'Saudi Arabia' then 'SAR'
    when 'UAE' then 'AED' when 'Kuwait' then 'KWD' when 'Bahrain' then 'BHD'
    when 'Oman' then 'OMR' end,
  case l.region when 'Qatar' then 'Asia/Qatar' when 'Saudi Arabia' then 'Asia/Riyadh'
    when 'UAE' then 'Asia/Dubai' when 'Kuwait' then 'Asia/Kuwait'
    when 'Bahrain' then 'Asia/Bahrain' when 'Oman' then 'Asia/Muscat' end,
  l.active,jsonb_build_object('city',l.city,'region',l.region,'legacy_location_id',l.id)
from public.ps_merchant_locations l
on conflict(account_id,entity_type,external_id) do update set
  name=excluded.name,country_code=excluded.country_code,currency=excluded.currency,
  timezone=excluded.timezone,active=excluded.active,metadata=excluded.metadata,
  updated_at=now();

create index if not exists ps_branch_channels_lookup
  on public.ps_branch_channel_assignments(account_id,platform,external_branch_id);
create index if not exists ps_alert_rules_scope
  on public.ps_alert_rules(account_id,enabled,severity,platform,branch_external_id);

alter table public.ps_restaurant_workspaces enable row level security;
alter table public.ps_branch_channel_assignments enable row level security;
alter table public.ps_alert_rules enable row level security;
revoke all on public.ps_restaurant_workspaces from anon,authenticated;
revoke all on public.ps_branch_channel_assignments from anon,authenticated;
revoke all on public.ps_alert_rules from anon,authenticated;

comment on table public.ps_restaurant_workspaces is 'Canonical restaurant tenant configuration; one row per PrizeSkout account.';
comment on table public.ps_branch_channel_assignments is 'Canonical mapping between a restaurant branch, POS identity and delivery-platform identity.';
comment on table public.ps_alert_rules is 'Merchant-defined financial alert thresholds scoped by platform and branch.';
