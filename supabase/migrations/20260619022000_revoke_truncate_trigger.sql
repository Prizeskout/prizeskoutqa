-- TRUNCATE is not covered by DELETE privilege — must be revoked separately.
-- TRIGGER allows creating triggers that fire on the table (not needed by app roles).
-- After this migration, service_role, authenticated, and anon have only:
--   INSERT, SELECT (+ REFERENCES, which is a FK reference privilege, harmless)

REVOKE TRUNCATE, TRIGGER ON public.pricing_decisions FROM service_role;
REVOKE TRUNCATE, TRIGGER ON public.pricing_decisions FROM authenticated;
REVOKE TRUNCATE, TRIGGER ON public.pricing_decisions FROM anon;
