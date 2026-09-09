create table if not exists public.ps_talabat_order_actions (
  id uuid primary key default gen_random_uuid(),
  channel_id uuid not null references public.ps_merchant_channels(id) on delete cascade,
  account_id uuid not null,
  merchant_id text not null,
  external_order_id text not null,
  action text not null check (action in ('order_accepted','order_rejected','order_prepared','order_picked_up')),
  callback_url text not null,
  request_payload jsonb not null default '{}'::jsonb,
  state text not null default 'pending' check (state in ('pending','retrying','succeeded','failed','expired')),
  attempts integer not null default 0 check (attempts >= 0),
  next_attempt_at timestamptz not null default now(),
  expires_at timestamptz,
  last_http_status integer,
  last_error text,
  upstream_response jsonb,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(channel_id, external_order_id, action)
);

create index if not exists ps_talabat_order_actions_due
  on public.ps_talabat_order_actions(state, next_attempt_at)
  where state in ('pending','retrying');

create index if not exists ps_talabat_order_actions_account_time
  on public.ps_talabat_order_actions(account_id, created_at desc);

alter table public.ps_talabat_order_actions enable row level security;
revoke all on public.ps_talabat_order_actions from anon, authenticated;

comment on table public.ps_talabat_order_actions is
  'Durable audit and retry queue for outbound Talabat order lifecycle callbacks.';
