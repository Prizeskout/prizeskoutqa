-- ============================================================================
-- Reusable helper: lock_immutable_table(table_name)
--
-- Revokes UPDATE, DELETE, TRUNCATE, and TRIGGER from all application roles
-- (service_role, authenticated, anon) on the named table, leaving only
-- INSERT, SELECT, and REFERENCES. Call this once per immutable audit/log
-- table to enforce true insert-only semantics at the PostgreSQL privilege
-- layer, independent of RLS.
--
-- TRUNCATE is a separate privilege from DELETE — must be revoked explicitly.
-- TRIGGER prevents application roles from creating triggers on the table,
-- which is not needed by any application code.
--
-- Usage in future migrations:
--   SELECT public.lock_immutable_table('my_audit_log_table');
-- ============================================================================

CREATE OR REPLACE FUNCTION public.lock_immutable_table(p_table text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  EXECUTE format(
    'REVOKE UPDATE, DELETE, TRUNCATE, TRIGGER ON public.%I FROM service_role, authenticated, anon',
    p_table
  );
END;
$$;

COMMENT ON FUNCTION public.lock_immutable_table(text) IS
  'Revokes UPDATE, DELETE, TRUNCATE, TRIGGER from all application roles on the named table. '
  'Leaves INSERT, SELECT, REFERENCES. Use for append-only audit/log tables.';

GRANT EXECUTE ON FUNCTION public.lock_immutable_table(text) TO service_role;

-- ============================================================================
-- Apply to all immutable log tables in the system.
--
-- pricing_decisions: already had UPDATE/DELETE revoked in migrations
--   20260619020000 and 20260619021000. Adding TRUNCATE+TRIGGER for
--   completeness (idempotent — REVOKE of an ungranted privilege is a no-op).
--
-- mall_governance_violations: created in 20260619030000 with only
--   UPDATE/DELETE revoked. This migration adds TRUNCATE+TRIGGER.
-- ============================================================================

SELECT public.lock_immutable_table('pricing_decisions');
SELECT public.lock_immutable_table('mall_governance_violations');
