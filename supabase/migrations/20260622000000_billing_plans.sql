-- ============================================================================
-- Billing Plans Migration
-- ============================================================================
-- Adds value-based plans (starter / standard / enterprise) to the platform.
-- Previously: per-call rate-limit packs (usage_events metering enforcement).
-- Now: plan tier on each licensee controls feature access, scrape cadence,
--      product/seat/channel caps, and pricing mode (advisory vs automated).
--
-- Schema changes:
--   1. licensees.plan        text NOT NULL DEFAULT 'starter'
--   2. licensees.is_platform boolean NOT NULL DEFAULT false
--   3. Recreate find_account_for_api_key to return plan + is_platform
--   4. Add enterprise hourly scrape pg_cron job
-- ============================================================================

-- 1. Add plan column
ALTER TABLE public.licensees
  ADD COLUMN IF NOT EXISTS plan text NOT NULL DEFAULT 'starter'
    CHECK (plan IN ('starter', 'standard', 'enterprise'));

-- 2. Add is_platform flag (grants embed API access regardless of plan tier)
ALTER TABLE public.licensees
  ADD COLUMN IF NOT EXISTS is_platform boolean NOT NULL DEFAULT false;

-- 3. Recreate find_account_for_api_key to expose plan + is_platform.
--    Must DROP first because return type is changing.
DROP FUNCTION IF EXISTS public.find_account_for_api_key(uuid);

CREATE FUNCTION public.find_account_for_api_key(_api_key_id uuid)
RETURNS TABLE (
  account_id  uuid,
  licensee_id uuid,
  user_id     uuid,
  plan        text,
  is_platform boolean
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    COALESCE(
      k.account_id,
      (SELECT a.id FROM public.accounts_v2 a
         WHERE a.licensee_id = k.licensee_id
         ORDER BY a.is_default DESC, a.created_at ASC
         LIMIT 1)
    )              AS account_id,
    k.licensee_id,
    k.user_id,
    l.plan,
    l.is_platform
  FROM public.api_keys k
  JOIN public.licensees l ON l.id = k.licensee_id
  WHERE k.id = _api_key_id;
$$;

GRANT EXECUTE ON FUNCTION public.find_account_for_api_key(uuid) TO service_role;

-- 4. Enterprise hourly scrape cron
-- The existing twice-daily cron at "0 6,15 * * *" covers starter + standard.
-- Enterprise accounts get hourly scrapes via a separate job.
-- The scrape hook accepts an optional ?plan= query param to filter by tier.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'scrape-enterprise-hourly') THEN
    PERFORM cron.schedule(
      'scrape-enterprise-hourly',
      '0 * * * *',
      $cron$
        SELECT net.http_post(
          url := current_setting('app.hook_base_url', true) || '/api/public/hooks/scrape-all?plan=enterprise',
          headers := jsonb_build_object('Content-Type', 'application/json'),
          body := '{}'::jsonb
        );
      $cron$
    );
  END IF;
END;
$$;
