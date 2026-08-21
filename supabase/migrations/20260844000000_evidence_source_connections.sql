-- Provider-neutral read-only evidence-source registry and sync history.
-- Migrations through 20260843000000 are deployed and must remain unchanged.

create table if not exists public.ps_evidence_source_connections (
  id uuid primary key default gen_random_uuid(), account_id text not null, merchant_id text not null,
  provider text not null, connection_kind text not null check(connection_kind in ('optional_api','automatic_report','watched_folder','local_connector','order_management_partner')),
  status text not null default 'setup_required' check(status in ('setup_required','active','paused','disconnected')),
  read_only boolean not null default true check(read_only), permissions text[] not null default '{}',
  branch_references text[] not null default '{}', external_connection_reference text not null default 'default',
  sync_cursor text, last_sync_at timestamptz, last_success_at timestamptz, last_error text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(account_id,provider,connection_kind,external_connection_reference)
);
create table if not exists public.ps_evidence_source_sync_runs (
  id uuid primary key default gen_random_uuid(), account_id text not null,
  connection_id uuid not null references public.ps_evidence_source_connections(id) on delete restrict,
  state text not null check(state in ('running','completed','failed','partial')),
  cursor_before text, cursor_after text, records_seen integer not null default 0,
  evidence_items_created integer not null default 0, duplicates_ignored integer not null default 0,
  error_message text, started_at timestamptz not null default now(), finished_at timestamptz
);
create index if not exists ps_evidence_sources_account on public.ps_evidence_source_connections(account_id,status,provider);
create index if not exists ps_evidence_source_runs on public.ps_evidence_source_sync_runs(account_id,connection_id,started_at desc);
alter table public.ps_evidence_source_connections enable row level security;
alter table public.ps_evidence_source_sync_runs enable row level security;
revoke all on public.ps_evidence_source_connections from anon,authenticated;
revoke all on public.ps_evidence_source_sync_runs from anon,authenticated;
comment on table public.ps_evidence_source_connections is 'Read-only source configuration and cursor only. Provider credentials must remain in the existing encrypted connector vault.';
