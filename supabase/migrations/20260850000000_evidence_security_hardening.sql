-- Defense-in-depth grants for the completed evidence and recovery foundation.
-- Migrations through 20260848000000 are deployed and must remain unchanged.

revoke all on public.ps_recovery_cases from anon,authenticated;

-- These functions exist only for database triggers. Prevent direct execution
-- through exposed database roles; trigger execution continues as the owner.
revoke all on function public.ps_enqueue_merchant_evidence() from public,anon,authenticated;
revoke all on function public.ps_record_recovery_case_update() from public,anon,authenticated;
revoke all on function public.ps_advance_normalized_event_head() from public,anon,authenticated;

comment on table public.ps_recovery_cases is
  'Server-controlled recovery workflow. Direct anonymous and authenticated table access is revoked; merchant operations pass through scoped application services.';
