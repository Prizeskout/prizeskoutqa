-- Enable RLS on tables that were missing it.
--
-- Enabling RLS with NO policies = default-deny for anon/authenticated via PostgREST.
-- service_role bypasses RLS so worker functions continue to read/write unaffected.
--
-- competitor_url_cache / scrape_cost_log: the original migration comment said
-- "no RLS policies so PostgREST rejects access" — that is only true when RLS
-- is ENABLED. Without RLS enabled, PostgREST can read the table freely.
--
-- ps_access_codes: stores merchant store-code mappings written by the auth
-- worker; client code should never read or write this directly.

ALTER TABLE public.competitor_url_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scrape_cost_log      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ps_access_codes      ENABLE ROW LEVEL SECURITY;
