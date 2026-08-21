-- Explicit expected cadence for automatic evidence-source health.
-- Migrations through 20260845000000 are deployed and must remain unchanged.
alter table public.ps_evidence_source_connections
  add column if not exists expected_sync_interval_minutes integer not null default 1440
    check(expected_sync_interval_minutes between 15 and 10080);
comment on column public.ps_evidence_source_connections.expected_sync_interval_minutes is
  'Merchant-configured expected evidence cadence. Missing data creates a source-health warning, never a financial conclusion.';
