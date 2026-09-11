-- The due-status view is an internal scheduler input. It must not inherit the
-- view owner's privileges or be callable by browser-facing database roles.

ALTER VIEW public.v_url_due_status
  SET (security_invoker = true);

REVOKE ALL ON TABLE public.v_url_due_status FROM PUBLIC;
REVOKE ALL ON TABLE public.v_url_due_status FROM anon;
REVOKE ALL ON TABLE public.v_url_due_status FROM authenticated;

GRANT SELECT ON TABLE public.v_url_due_status TO service_role;

COMMENT ON VIEW public.v_url_due_status IS
  'Internal service-role scheduler view for competitor URL scrape cadence. Browser access is denied.';
