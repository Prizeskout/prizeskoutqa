-- Distinguish a successful connector call from a provider-confirmed complete delivery.
-- Migrations through 20260848000000 are deployed and must remain unchanged.

alter table public.ps_evidence_source_sync_runs
  add column if not exists declared_record_count integer check(declared_record_count >= 0),
  add column if not exists delivery_complete boolean not null default false;

alter table public.ps_evidence_source_connections
  add column if not exists last_delivery_state text
    check(last_delivery_state in ('completed','partial','failed'));

comment on column public.ps_evidence_source_sync_runs.delivery_complete is
  'True only when the source explicitly declared the delivery complete and any declared count matched the received count.';
comment on column public.ps_evidence_source_connections.last_delivery_state is
  'Latest delivery result. Partial evidence is retained but must not be mistaken for complete provider coverage.';
