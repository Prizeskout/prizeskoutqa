create table if not exists public.ps_promotion_actions (
  id uuid primary key default gen_random_uuid(),
  account_id text not null,
  scenario_id uuid not null references public.ps_promotion_scenarios(id) on delete restrict,
  platform text not null,
  action_type text not null check(action_type in ('stop','reduce_discount','remove_item','adjust_discount')),
  target_reference text not null,
  requested_payload jsonb not null default '{}'::jsonb,
  status text not null default 'pending_approval' check(status in ('pending_approval','approved','awaiting_partner','confirmed','rejected','failed')),
  requested_by text not null,
  approved_by text,
  approved_at timestamptz,
  delivery_mode text check(delivery_mode is null or delivery_mode in ('partner_pull','manual')),
  partner_reference text,
  result_payload jsonb not null default '{}'::jsonb,
  confirmed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists ps_promotion_actions_queue on public.ps_promotion_actions(account_id,platform,status,created_at);
alter table public.ps_promotion_actions enable row level security;
revoke all on public.ps_promotion_actions from anon,authenticated;
comment on table public.ps_promotion_actions is 'Explicitly approved promotion changes delivered to a partner API or completed through an audited manual fallback.';
