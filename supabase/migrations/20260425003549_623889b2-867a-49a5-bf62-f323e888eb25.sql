-- Security-definer helper: look up a user_id by email so authenticated admins
-- can invite an existing user to their licensee without needing service-role
-- access. Returns a single uuid or null. Returns ONLY the id, never any other
-- column, so nothing about the user is leaked beyond "yes this email exists".
CREATE OR REPLACE FUNCTION public.find_user_id_by_email(_email text)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT id
  FROM auth.users
  WHERE lower(email) = lower(_email)
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.find_user_id_by_email(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.find_user_id_by_email(text) TO authenticated;