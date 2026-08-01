-- One enforceable merchant policy, versioned on every activation.
alter table public.ps_merchant_pricing_config
  add column if not exists max_price_increase_pct numeric not null default 0.15 check (max_price_increase_pct >= 0 and max_price_increase_pct <= 1),
  add column if not exists approval_mode text not null default 'recommend_only' check (approval_mode in ('recommend_only','auto_within_limit','approval_every_change')),
  add column if not exists active_version integer not null default 1,
  add column if not exists activated_by text,
  add column if not exists activated_at timestamptz not null default now();

create table if not exists public.ps_margin_policy_versions (
  id uuid primary key default gen_random_uuid(), account_id text not null, version integer not null,
  contribution_margin_floor_pct numeric not null check (contribution_margin_floor_pct > 0 and contribution_margin_floor_pct < 1),
  max_price_increase_pct numeric not null check (max_price_increase_pct >= 0 and max_price_increase_pct <= 1),
  approval_mode text not null check (approval_mode in ('recommend_only','auto_within_limit','approval_every_change')),
  status text not null default 'active' check (status in ('active','superseded')),
  activated_by text not null, activated_at timestamptz not null default now(), superseded_at timestamptz,
  unique(account_id,version)
);
create index if not exists ps_margin_policy_versions_account_time on public.ps_margin_policy_versions(account_id,activated_at desc);
alter table public.ps_margin_policy_versions enable row level security;

-- Preserve every input needed to reproduce a policy preview with the live evaluator.
alter table public.ps_decide_results
  add column if not exists payment_fee_rate numeric not null default 0,
  add column if not exists fixed_order_fee numeric not null default 0,
  add column if not exists promotion_contribution_rate numeric not null default 0,
  add column if not exists economics_version_id uuid references public.ps_economics_versions(id),
  add column if not exists margin_policy_version integer;
