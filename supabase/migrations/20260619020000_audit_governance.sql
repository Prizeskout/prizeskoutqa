-- ============================================================
-- Audit Governance: make pricing_decisions an immutable audit log
-- ============================================================

-- 1. Add audit columns
ALTER TABLE public.pricing_decisions
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'user',
  ADD COLUMN IF NOT EXISTS trigger_type text NOT NULL DEFAULT 'user_action',
  ADD COLUMN IF NOT EXISTS inputs_snapshot jsonb NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS alternatives jsonb NOT NULL DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS rule_fired text,
  ADD COLUMN IF NOT EXISTS rule_reason text,
  ADD COLUMN IF NOT EXISTS cost_snapshot jsonb NOT NULL DEFAULT '{}';

-- 2. Make recommendation_id nullable — engine_rec rows have no recommendation_id
ALTER TABLE public.pricing_decisions
  ALTER COLUMN recommendation_id DROP NOT NULL;

-- 3. Drop unique constraint — append-only log allows multiple events per recommendation
DROP INDEX IF EXISTS public.pricing_decisions_user_rec_unique;

-- 4. Extend decision check to include engine types
ALTER TABLE public.pricing_decisions
  DROP CONSTRAINT IF EXISTS pricing_decisions_decision_check;
ALTER TABLE public.pricing_decisions
  ADD CONSTRAINT pricing_decisions_decision_check
  CHECK (decision IN ('applied', 'dismissed', 'snoozed', 'engine_rec', 'api_compute'));

-- 5. Lock created_at: trigger forces created_at = now() regardless of app payload
CREATE OR REPLACE FUNCTION public.set_created_at_immutable()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.created_at := now();
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS pricing_decisions_lock_created_at ON public.pricing_decisions;
CREATE TRIGGER pricing_decisions_lock_created_at
  BEFORE INSERT ON public.pricing_decisions
  FOR EACH ROW EXECUTE FUNCTION public.set_created_at_immutable();

-- 6. Drop updated_at trigger (no more UPDATE path)
DROP TRIGGER IF EXISTS set_pricing_decisions_updated_at ON public.pricing_decisions;

-- 7. Drop UPDATE and DELETE RLS policies
DROP POLICY IF EXISTS "Users update own pricing decisions" ON public.pricing_decisions;
DROP POLICY IF EXISTS "Users delete own pricing decisions" ON public.pricing_decisions;

-- 8. Revoke UPDATE/DELETE from authenticated role — hard DB-level lock
REVOKE UPDATE, DELETE ON public.pricing_decisions FROM authenticated;

-- 9. Outcome attribution table (schema only — NULL until real sales data flows)
CREATE TABLE IF NOT EXISTS public.decision_outcome_attributions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  decision_id uuid NOT NULL REFERENCES public.pricing_decisions(id) ON DELETE RESTRICT,
  attribution_window_h integer NOT NULL DEFAULT 24,
  attributed_at timestamptz,
  units_sold_before numeric,
  units_sold_after numeric,
  revenue_before numeric,
  revenue_after numeric,
  margin_delta numeric,
  data_source text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (decision_id, attribution_window_h)
);
ALTER TABLE public.decision_outcome_attributions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own outcome attributions"
  ON public.decision_outcome_attributions FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.pricing_decisions pd
      WHERE pd.id = decision_id AND pd.user_id = auth.uid()
    )
  );
-- INSERT/UPDATE restricted to service role (internal attribution pipeline only)
