-- ============================================================
-- True immutability: REVOKE UPDATE/DELETE from ALL application roles
-- including service_role, which bypasses RLS but NOT table-level GRANTs.
--
-- Previous migration (20260619020000) only dropped RLS policies and
-- revoked from 'authenticated'. The service_role key (used by
-- supabaseAdmin and the pricing engine) still had full write access.
--
-- After this migration, pricing_decisions is INSERT+SELECT-only for
-- every application role. The only path to modification is a direct
-- connection as the 'postgres' superuser — not exposed to any
-- application code.
-- ============================================================

REVOKE UPDATE, DELETE ON public.pricing_decisions FROM service_role;
REVOKE UPDATE, DELETE ON public.pricing_decisions FROM anon;
-- 'authenticated' was already revoked in 20260619020000 — idempotent
REVOKE UPDATE, DELETE ON public.pricing_decisions FROM authenticated;
