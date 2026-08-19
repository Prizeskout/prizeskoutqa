-- Durable authorization and execution ledger for live price changes.
-- This is additive: recommendations continue to work, while live publication
-- fails closed until an action can be recorded here.

create table if not exists public.ps_price_actions (
  id uuid primary key default gen_random_uuid(),
  account_id text not null,
  ingest_event_id uuid not null references public.ps_ingest_events(id) on delete restrict,
  decide_result_id uuid references public.ps_decide_results(id) on delete restrict,
  platform text not null,
  item_id text not null,
  currency text not null,
  idempotency_key text not null,
  actor_type text not null check (actor_type in ('merchant','automation')),
  approval_mode text not null check (approval_mode in ('recommend_only','auto_within_limit','approval_every_change')),
  approval_source text not null check (approval_source in ('merchant_click','active_policy')),
  approved_by text,
  approved_at timestamptz not null,
  approval_expires_at timestamptz not null,
  policy_version integer not null,
  economics_version_id uuid not null,
  expected_current_price numeric(14,4) not null,
  live_price_before numeric(14,4),
  target_price numeric(14,4) not null,
  live_price_after numeric(14,4),
  state text not null default 'authorized' check (state in (
    'authorized','publishing','confirmed','rejected_stale_price','rejected_policy',
    'platform_failed','confirmation_failed','rolled_back','rollback_failed'
  )),
  platform_http_status integer,
  result_payload jsonb,
  failure_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(account_id,idempotency_key)
);

create unique index if not exists ps_price_actions_one_active_target
  on public.ps_price_actions(account_id,platform,item_id)
  where state in ('authorized','publishing');
create index if not exists ps_price_actions_account_created
  on public.ps_price_actions(account_id,created_at desc);
create index if not exists ps_price_actions_event_created
  on public.ps_price_actions(ingest_event_id,created_at desc);

alter table public.ps_price_actions enable row level security;
revoke all on public.ps_price_actions from anon,authenticated;

comment on table public.ps_price_actions is
  'Append-only authorization and execution evidence for live price publication, including idempotency, policy/economics snapshots, readback and rollback outcome.';
