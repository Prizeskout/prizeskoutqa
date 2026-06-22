-- DB-level hard floor for plan product caps.
-- handleSync's 402 is the UX layer; this trigger is the safety net so any
-- future INSERT path (direct SQL, migration scripts, new handlers) cannot
-- silently bypass the cap.

CREATE OR REPLACE FUNCTION public.enforce_product_plan_cap()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_plan  text;
  v_limit int;
  v_count bigint;
BEGIN
  -- Resolve plan from licensee. Default to 'starter' if somehow null.
  SELECT COALESCE(l.plan, 'starter') INTO v_plan
  FROM public.licensees l
  WHERE l.id = NEW.licensee_id;

  IF v_plan IS NULL THEN
    v_plan := 'starter';
  END IF;

  v_limit := CASE v_plan
    WHEN 'enterprise' THEN -1
    WHEN 'standard'   THEN 500
    ELSE                   50   -- starter + unknown plans
  END;

  -- Enterprise = unlimited, skip check.
  IF v_limit = -1 THEN
    RETURN NEW;
  END IF;

  -- Count products already in the account (before this row lands).
  SELECT COUNT(*) INTO v_count
  FROM public.catalog_products
  WHERE account_id = NEW.account_id;

  IF v_count >= v_limit THEN
    RAISE EXCEPTION
      'plan_product_cap_exceeded: account % already has % product(s); % plan limit is %. Upgrade to lift this cap.',
      NEW.account_id, v_count, v_plan, v_limit
      USING ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END;
$$;

-- Drop and recreate so re-running the migration is idempotent.
DROP TRIGGER IF EXISTS enforce_product_plan_cap ON public.catalog_products;

CREATE TRIGGER enforce_product_plan_cap
  BEFORE INSERT ON public.catalog_products
  FOR EACH ROW EXECUTE FUNCTION public.enforce_product_plan_cap();

-- Let service_role call the trigger-backing function (it owns the trigger,
-- but explicit grant keeps audit intent clear).
GRANT EXECUTE ON FUNCTION public.enforce_product_plan_cap() TO service_role;
