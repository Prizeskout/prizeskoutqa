-- ============================================================================
-- Tenant Pricing API (API 14)
--
-- Adds mall-level governance (anchor protection, category floors, events)
-- on top of the existing three-tier model: licensee = mall, accounts_v2 =
-- tenant sub-accounts.
--
-- New tables:
--   mall_governance_rules    — rules stored at licensee level
--   mall_events              — mall-wide pricing events
--   mall_event_opt_outs      — per-tenant opt-out from events that allow it
--   mall_governance_violations — immutable audit log of rejected prices
--
-- api_keys gets an optional account_id column so tenant keys can be scoped
-- to a specific sub-account rather than the licensee's default account.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Scope api_keys to a specific account (tenant-scoped keys)
-- ---------------------------------------------------------------------------
ALTER TABLE public.api_keys
  ADD COLUMN IF NOT EXISTS account_id uuid
    REFERENCES public.accounts_v2(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_api_keys_account ON public.api_keys(account_id);

-- Update find_account_for_api_key: use explicit account_id when set, else
-- fall back to the default account of the licensee (unchanged behavior for
-- existing keys).
CREATE OR REPLACE FUNCTION public.find_account_for_api_key(_api_key_id uuid)
RETURNS TABLE (account_id uuid, licensee_id uuid, user_id uuid)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    COALESCE(
      k.account_id,
      (SELECT a.id FROM public.accounts_v2 a
         WHERE a.licensee_id = k.licensee_id
         ORDER BY a.is_default DESC, a.created_at ASC
         LIMIT 1)
    ) AS account_id,
    k.licensee_id,
    k.user_id
  FROM public.api_keys k
  WHERE k.id = _api_key_id;
$$;

-- ---------------------------------------------------------------------------
-- 2. Mall governance rules (stored at licensee / mall level)
-- ---------------------------------------------------------------------------
CREATE TABLE public.mall_governance_rules (
  id                uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  licensee_id       uuid    NOT NULL REFERENCES public.licensees(id) ON DELETE CASCADE,
  rule_type         text    NOT NULL
    CHECK (rule_type IN ('anchor_protection', 'category_floor', 'event_requirement')),
  name              text    NOT NULL,
  -- Optional: NULL means the rule applies to ALL categories
  category          text,
  -- anchor_protection: no tenant may price below anchor × (1 − threshold_pct)
  threshold_pct     numeric(6,4),
  -- category_floor: all tenant prices must be >= floor_price
  floor_price       numeric(12,2),
  -- anchor_protection: the account_id of the anchor tenant (the reference price source)
  anchor_account_id uuid    REFERENCES public.accounts_v2(id) ON DELETE SET NULL,
  enabled           boolean NOT NULL DEFAULT true,
  notes             text,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_mall_governance_rules_licensee  ON public.mall_governance_rules(licensee_id);
CREATE INDEX idx_mall_governance_rules_enabled   ON public.mall_governance_rules(licensee_id, enabled);
ALTER TABLE public.mall_governance_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Licensee members view governance rules"
  ON public.mall_governance_rules FOR SELECT TO authenticated
  USING (public.is_licensee_member(licensee_id, 'viewer'));

CREATE POLICY "Licensee admins insert governance rules"
  ON public.mall_governance_rules FOR INSERT TO authenticated
  WITH CHECK (public.is_licensee_member(licensee_id, 'admin'));

CREATE POLICY "Licensee admins update governance rules"
  ON public.mall_governance_rules FOR UPDATE TO authenticated
  USING (public.is_licensee_member(licensee_id, 'admin'));

CREATE POLICY "Licensee admins delete governance rules"
  ON public.mall_governance_rules FOR DELETE TO authenticated
  USING (public.is_licensee_member(licensee_id, 'admin'));

CREATE POLICY "Platform admins manage governance rules"
  ON public.mall_governance_rules FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE TRIGGER set_mall_governance_rules_updated_at
  BEFORE UPDATE ON public.mall_governance_rules
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 3. Mall events (operator pushes; tenants inherit unless opted out)
-- ---------------------------------------------------------------------------
CREATE TABLE public.mall_events (
  id                    uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  licensee_id           uuid    NOT NULL REFERENCES public.licensees(id) ON DELETE CASCADE,
  name                  text    NOT NULL,
  event_type            text    NOT NULL
    CHECK (event_type IN ('promotion', 'sale', 'clearance', 'holiday', 'other')),
  -- NULL = applies to all categories; set to restrict to specific categories
  category_scope        text[],
  -- max allowed price as a fraction of the product's current catalog price.
  -- e.g. 0.90 = tenants must price at most 90% of their catalog price (≥10% off).
  -- NULL = no price cap enforced (participation-only event).
  price_cap_pct         numeric(6,4),
  starts_at             timestamptz NOT NULL,
  ends_at               timestamptz NOT NULL,
  -- true = tenants may opt out; false = event is mandatory for all in scope
  opt_out_allowed       boolean NOT NULL DEFAULT false,
  created_by_account_id uuid    REFERENCES public.accounts_v2(id) ON DELETE SET NULL,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT mall_events_time_chk CHECK (ends_at > starts_at)
);
CREATE INDEX idx_mall_events_licensee ON public.mall_events(licensee_id);
CREATE INDEX idx_mall_events_active   ON public.mall_events(licensee_id, starts_at, ends_at);
ALTER TABLE public.mall_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Licensee members view events"
  ON public.mall_events FOR SELECT TO authenticated
  USING (public.is_licensee_member(licensee_id, 'viewer'));

CREATE POLICY "Licensee admins insert events"
  ON public.mall_events FOR INSERT TO authenticated
  WITH CHECK (public.is_licensee_member(licensee_id, 'admin'));

CREATE POLICY "Licensee admins update events"
  ON public.mall_events FOR UPDATE TO authenticated
  USING (public.is_licensee_member(licensee_id, 'admin'));

CREATE POLICY "Licensee admins delete events"
  ON public.mall_events FOR DELETE TO authenticated
  USING (public.is_licensee_member(licensee_id, 'admin'));

CREATE POLICY "Platform admins manage events"
  ON public.mall_events FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE TRIGGER set_mall_events_updated_at
  BEFORE UPDATE ON public.mall_events
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 4. Event opt-outs (only meaningful when opt_out_allowed = true)
-- ---------------------------------------------------------------------------
CREATE TABLE public.mall_event_opt_outs (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id    uuid NOT NULL REFERENCES public.mall_events(id) ON DELETE CASCADE,
  account_id  uuid NOT NULL REFERENCES public.accounts_v2(id) ON DELETE CASCADE,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (event_id, account_id)
);
CREATE INDEX idx_mall_event_opt_outs_event ON public.mall_event_opt_outs(event_id);
ALTER TABLE public.mall_event_opt_outs ENABLE ROW LEVEL SECURITY;

-- Members can see opt-outs for events in their licensee
CREATE POLICY "Licensee members view opt-outs"
  ON public.mall_event_opt_outs FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.mall_events e
      WHERE e.id = event_id
        AND public.is_licensee_member(e.licensee_id, 'viewer')
    )
  );

-- Tenant members can opt out for their own account
CREATE POLICY "Members insert own opt-out"
  ON public.mall_event_opt_outs FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.accounts_v2 a
      JOIN public.licensee_members m ON m.licensee_id = a.licensee_id
      WHERE a.id = account_id AND m.user_id = auth.uid()
    )
  );

CREATE POLICY "Platform admins manage opt-outs"
  ON public.mall_event_opt_outs FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

-- ---------------------------------------------------------------------------
-- 5. Governance violations — immutable audit log of rejected price proposals
-- ---------------------------------------------------------------------------
CREATE TABLE public.mall_governance_violations (
  id                uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  licensee_id       uuid    NOT NULL REFERENCES public.licensees(id) ON DELETE CASCADE,
  -- The tenant account that submitted the violating price
  account_id        uuid    NOT NULL REFERENCES public.accounts_v2(id) ON DELETE CASCADE,
  -- The rule that was violated (nullable: rule may be deleted later)
  rule_id           uuid    REFERENCES public.mall_governance_rules(id) ON DELETE SET NULL,
  -- The event that was violated (for event_requirement violations)
  event_id          uuid    REFERENCES public.mall_events(id) ON DELETE SET NULL,
  product_id        uuid    REFERENCES public.catalog_products(id) ON DELETE SET NULL,
  sku               text,
  category          text,
  channel           text    NOT NULL DEFAULT 'Online',
  proposed_price    numeric(12,2) NOT NULL,
  violation_type    text    NOT NULL
    CHECK (violation_type IN ('anchor_protection', 'category_floor', 'event_requirement')),
  -- For anchor_protection: the minimum the tenant was allowed to price
  allowed_min_price numeric(12,2),
  -- For event_requirement: the maximum the tenant was allowed to price
  allowed_max_price numeric(12,2),
  -- The anchor tenant's price at the time of the violation (anchor_protection only)
  anchor_price      numeric(12,2),
  -- true = violation was flagged proactively (anchor changed, not tenant submitted)
  is_proactive      boolean NOT NULL DEFAULT false,
  created_at        timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_mgv_licensee    ON public.mall_governance_violations(licensee_id);
CREATE INDEX idx_mgv_account     ON public.mall_governance_violations(account_id);
CREATE INDEX idx_mgv_created_at  ON public.mall_governance_violations(created_at DESC);
ALTER TABLE public.mall_governance_violations ENABLE ROW LEVEL SECURITY;

-- All licensee members can see violations (operators see all; tenants need filtering in app)
CREATE POLICY "Licensee members view violations"
  ON public.mall_governance_violations FOR SELECT TO authenticated
  USING (public.is_licensee_member(licensee_id, 'viewer'));

CREATE POLICY "Service inserts violations"
  ON public.mall_governance_violations FOR INSERT TO authenticated
  WITH CHECK (public.is_licensee_member(licensee_id, 'developer'));

CREATE POLICY "Platform admins manage violations"
  ON public.mall_governance_violations FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

-- Violations are immutable — revoke mutating privileges
REVOKE UPDATE, DELETE ON public.mall_governance_violations FROM service_role;
REVOKE UPDATE, DELETE ON public.mall_governance_violations FROM authenticated;
REVOKE UPDATE, DELETE ON public.mall_governance_violations FROM anon;
