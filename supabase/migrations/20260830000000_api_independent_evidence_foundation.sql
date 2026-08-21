-- API-independent merchant evidence foundation.
--
-- This migration is intentionally additive and shadow-only. It does not alter
-- Zid, Salla, live pricing, webhook, catalogue, or dispatch tables. Existing
-- integrations may later copy evidence here after their current work succeeds;
-- a failure in this pipeline must never fail an integration request.

create table if not exists public.ps_merchant_evidence_items (
  id uuid primary key default gen_random_uuid(),
  account_id text not null,
  merchant_id text not null,
  source_kind text not null check (source_kind in (
    'connected_mailbox',
    'forwarded_email',
    'file_upload',
    'watched_folder',
    'local_connector',
    'protected_integration_copy',
    'optional_api'
  )),
  source_provider text not null,
  source_external_id text not null,
  document_kind text not null check (document_kind in (
    'order_export',
    'order_summary',
    'settlement_report',
    'payout_notice',
    'credit_note',
    'promotion_confirmation',
    'contract',
    'contract_amendment',
    'adjustment_notice',
    'merchant_confirmation',
    'unknown'
  )),
  observed_at timestamptz,
  received_at timestamptz not null default now(),
  media_type text,
  original_filename text,
  storage_reference text,
  content_sha256 text not null check (length(content_sha256) = 64),
  source_metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique(account_id,source_kind,source_provider,source_external_id,content_sha256)
);

create table if not exists public.ps_evidence_processing_attempts (
  id uuid primary key default gen_random_uuid(),
  evidence_item_id uuid not null references public.ps_merchant_evidence_items(id) on delete restrict,
  account_id text not null,
  processor_version text not null,
  attempt_number integer not null check (attempt_number > 0),
  state text not null check (state in ('accepted','processing','normalized','needs_review','quarantined','failed')),
  detected_document_kind text,
  extraction_summary jsonb not null default '{}'::jsonb,
  limitations text[] not null default '{}',
  error_code text,
  error_message text,
  created_at timestamptz not null default now(),
  unique(evidence_item_id,processor_version,attempt_number)
);

create table if not exists public.ps_normalized_commerce_events (
  id uuid primary key default gen_random_uuid(),
  account_id text not null,
  merchant_id text not null,
  evidence_item_id uuid not null references public.ps_merchant_evidence_items(id) on delete restrict,
  source_kind text not null,
  source_provider text not null,
  external_event_id text not null,
  event_kind text not null check (event_kind in (
    'order_snapshot',
    'order_line',
    'cancellation',
    'refund',
    'commercial_adjustment',
    'settlement_line',
    'payout_total',
    'promotion_term',
    'contract_term',
    'receipt_confirmation'
  )),
  channel text,
  branch_external_id text,
  order_external_id text,
  settlement_reference text,
  occurred_at timestamptz,
  currency text,
  gross_amount numeric,
  discount_amount numeric,
  tax_amount numeric,
  fee_amount numeric,
  net_amount numeric,
  normalized_payload jsonb not null,
  normalization_version text not null,
  evidence_strength text not null check (evidence_strength in ('confirmed','strong','partial','insufficient')),
  limitations text[] not null default '{}',
  event_fingerprint text not null check (length(event_fingerprint) = 64),
  created_at timestamptz not null default now(),
  unique(account_id,source_provider,event_kind,external_event_id,event_fingerprint)
);

create index if not exists ps_merchant_evidence_account_received
  on public.ps_merchant_evidence_items(account_id,received_at desc);
create index if not exists ps_merchant_evidence_hash
  on public.ps_merchant_evidence_items(account_id,content_sha256);
create index if not exists ps_evidence_attempts_item_time
  on public.ps_evidence_processing_attempts(evidence_item_id,created_at desc);
create index if not exists ps_commerce_events_account_order
  on public.ps_normalized_commerce_events(account_id,channel,order_external_id,occurred_at desc);
create index if not exists ps_commerce_events_account_settlement
  on public.ps_normalized_commerce_events(account_id,channel,settlement_reference,occurred_at desc);

alter table public.ps_merchant_evidence_items enable row level security;
alter table public.ps_evidence_processing_attempts enable row level security;
alter table public.ps_normalized_commerce_events enable row level security;

revoke all on public.ps_merchant_evidence_items from anon,authenticated;
revoke all on public.ps_evidence_processing_attempts from anon,authenticated;
revoke all on public.ps_normalized_commerce_events from anon,authenticated;

create or replace function public.ps_reject_api_independent_evidence_mutation()
returns trigger language plpgsql as $$
begin
  raise exception 'Merchant evidence is append-only; add a new item, attempt, or event instead.';
end;
$$;

drop trigger if exists ps_merchant_evidence_items_immutable on public.ps_merchant_evidence_items;
create trigger ps_merchant_evidence_items_immutable
  before update or delete on public.ps_merchant_evidence_items
  for each row execute function public.ps_reject_api_independent_evidence_mutation();

drop trigger if exists ps_evidence_processing_attempts_immutable on public.ps_evidence_processing_attempts;
create trigger ps_evidence_processing_attempts_immutable
  before update or delete on public.ps_evidence_processing_attempts
  for each row execute function public.ps_reject_api_independent_evidence_mutation();

drop trigger if exists ps_normalized_commerce_events_immutable on public.ps_normalized_commerce_events;
create trigger ps_normalized_commerce_events_immutable
  before update or delete on public.ps_normalized_commerce_events
  for each row execute function public.ps_reject_api_independent_evidence_mutation();

comment on table public.ps_merchant_evidence_items is
  'Immutable merchant-controlled evidence intake. APIs are optional sources, never prerequisites.';
comment on column public.ps_merchant_evidence_items.source_kind is
  'How the merchant evidence reached PrizeSkout; protected_integration_copy is shadow-only for Zid and Salla.';
comment on table public.ps_evidence_processing_attempts is
  'Append-only parsing history. Failures are quarantined and never mutate the original evidence.';
comment on table public.ps_normalized_commerce_events is
  'Provider-neutral economic events derived from evidence; no live integration reads this table yet.';
