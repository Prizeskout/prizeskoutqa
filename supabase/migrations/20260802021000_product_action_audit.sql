-- Record production Commerce Copilot product operations in the existing
-- append-only, hash-chained governance ledger.
alter table public.ps_govern_audit_log drop constraint if exists ps_govern_audit_log_event_type_check;
alter table public.ps_govern_audit_log add constraint ps_govern_audit_log_event_type_check
  check (event_type in ('ingest','decide','dispatch','error','channel_connect','product_action'));
