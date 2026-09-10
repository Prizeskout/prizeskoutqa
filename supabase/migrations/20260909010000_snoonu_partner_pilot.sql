create table if not exists public.ps_snoonu_webhook_events (
  id uuid primary key default gen_random_uuid(),
  channel_id uuid not null references public.ps_merchant_channels(id) on delete cascade,
  account_id text not null,
  licensee_id uuid,
  merchant_id text not null,
  external_merchant_id text not null,
  external_branch_id text not null,
  event_id text not null,
  event_type text not null check (event_type in ('order.created','order.updated','order.cancelled','order.refunded','settlement.created','settlement.updated')),
  schema_version text not null,
  occurred_at timestamptz not null,
  payload jsonb not null,
  normalized_payload jsonb not null,
  status text not null default 'accepted' check (status in ('accepted','processed','needs_review','failed')),
  error_message text,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  unique(channel_id,event_id)
);

create index if not exists ps_snoonu_events_account_received
  on public.ps_snoonu_webhook_events(account_id,received_at desc);
create index if not exists ps_snoonu_events_branch_occurred
  on public.ps_snoonu_webhook_events(channel_id,external_branch_id,occurred_at desc);
create index if not exists ps_snoonu_events_status
  on public.ps_snoonu_webhook_events(status,received_at) where status <> 'processed';

alter table public.ps_snoonu_webhook_events enable row level security;
-- Service-role only during the controlled pilot. No authenticated-client policy.

comment on table public.ps_snoonu_webhook_events is
  'Raw, idempotent receipts for the proposed Snoonu partner pilot contract; not evidence of Snoonu API approval.';
