-- Margin Policy v2: retain the existing account-wide policy as a default,
-- while allowing effective channel overrides and an absolute cash floor.
-- No trigger or automatic dispatch authority is added by this migration.

alter table public.ps_merchant_pricing_config
  add column if not exists minimum_contribution_amount numeric not null default 0
    check (minimum_contribution_amount >= 0);

alter table public.ps_margin_policy_versions
  add column if not exists minimum_contribution_amount numeric not null default 0
    check (minimum_contribution_amount >= 0),
  add column if not exists channel_overrides jsonb not null default '[]'::jsonb;

create table if not exists public.ps_channel_margin_policy_overrides (
  id uuid primary key default gen_random_uuid(), account_id text not null,
  channel text not null, service_path text not null default 'default',
  contribution_margin_floor_pct numeric not null check (contribution_margin_floor_pct > 0 and contribution_margin_floor_pct < 1),
  minimum_contribution_amount numeric not null default 0 check (minimum_contribution_amount >= 0),
  max_price_increase_pct numeric not null check (max_price_increase_pct >= 0 and max_price_increase_pct <= 1),
  approval_mode text not null check (approval_mode in ('recommend_only','auto_within_limit','approval_every_change')),
  policy_version integer not null, status text not null default 'active' check (status in ('active','superseded')),
  activated_by text not null, activated_at timestamptz not null default now(), superseded_at timestamptz,
  unique(account_id,channel,service_path,policy_version)
);
create unique index if not exists ps_channel_margin_policy_one_active
  on public.ps_channel_margin_policy_overrides(account_id,channel,service_path) where status = 'active';
create index if not exists ps_channel_margin_policy_account
  on public.ps_channel_margin_policy_overrides(account_id,activated_at desc);
alter table public.ps_channel_margin_policy_overrides enable row level security;
revoke all on public.ps_channel_margin_policy_overrides from anon,authenticated;

alter table public.ps_decide_results
  add column if not exists minimum_contribution_amount numeric not null default 0,
  add column if not exists contribution_amount numeric,
  add column if not exists margin_policy_scope text not null default 'global',
  add column if not exists margin_policy_channel text;

comment on column public.ps_merchant_pricing_config.minimum_contribution_amount is
  'Absolute contribution cash floor applied alongside the percentage floor.';
comment on table public.ps_channel_margin_policy_overrides is
  'Versioned channel-specific overrides; absent channels inherit the account-wide default.';

create or replace function public.activate_margin_policy_v2(
  p_account_id text, p_margin_floor numeric, p_minimum_contribution numeric,
  p_max_increase numeric, p_approval_mode text, p_activated_by text,
  p_overrides jsonb default '[]'::jsonb
) returns integer language plpgsql security invoker set search_path=public as $$
declare v_version integer; v_now timestamptz:=now(); v_item jsonb;
begin
  if p_margin_floor<=0 or p_margin_floor>=1 or p_minimum_contribution<0
    or p_max_increase<0 or p_max_increase>1
    or p_approval_mode not in ('recommend_only','auto_within_limit','approval_every_change') then
    raise exception 'Invalid margin policy';
  end if;
  select coalesce(active_version,1)+1 into v_version from public.ps_merchant_pricing_config where account_id=p_account_id for update;
  v_version:=coalesce(v_version,2);
  update public.ps_margin_policy_versions set status='superseded',superseded_at=v_now where account_id=p_account_id and status='active';
  insert into public.ps_margin_policy_versions(account_id,version,contribution_margin_floor_pct,minimum_contribution_amount,max_price_increase_pct,approval_mode,channel_overrides,status,activated_by,activated_at)
    values(p_account_id,v_version,p_margin_floor,p_minimum_contribution,p_max_increase,p_approval_mode,p_overrides,'active',p_activated_by,v_now);
  update public.ps_channel_margin_policy_overrides set status='superseded',superseded_at=v_now where account_id=p_account_id and status='active';
  for v_item in select value from jsonb_array_elements(p_overrides) loop
    insert into public.ps_channel_margin_policy_overrides(account_id,channel,service_path,contribution_margin_floor_pct,minimum_contribution_amount,max_price_increase_pct,approval_mode,policy_version,status,activated_by,activated_at)
    values(p_account_id,v_item->>'channel',coalesce(v_item->>'servicePath','default'),(v_item->>'marginFloorPct')::numeric,coalesce((v_item->>'minimumContributionAmount')::numeric,0),(v_item->>'maxPriceIncreasePct')::numeric,v_item->>'approvalMode',v_version,'active',p_activated_by,v_now);
  end loop;
  insert into public.ps_merchant_pricing_config(account_id,margin_floor_pct,minimum_contribution_amount,max_price_increase_pct,approval_mode,active_version,activated_by,activated_at,updated_at)
    values(p_account_id,p_margin_floor,p_minimum_contribution,p_max_increase,p_approval_mode,v_version,p_activated_by,v_now,v_now)
  on conflict(account_id) do update set margin_floor_pct=excluded.margin_floor_pct,minimum_contribution_amount=excluded.minimum_contribution_amount,max_price_increase_pct=excluded.max_price_increase_pct,approval_mode=excluded.approval_mode,active_version=excluded.active_version,activated_by=excluded.activated_by,activated_at=excluded.activated_at,updated_at=excluded.updated_at;
  return v_version;
end $$;
revoke all on function public.activate_margin_policy_v2(text,numeric,numeric,numeric,text,text,jsonb) from public,anon,authenticated;
