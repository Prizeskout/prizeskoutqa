-- ============================================================================
-- Migration: Loyalty & Segment Pricing (API 11)
--
-- Tables:
--   loyalty_segments         — segment registry (gold_member, vip, etc.)
--   loyalty_ab_assignments   — A/B test variant assignments per customer×sku
--   loyalty_outcomes         — purchase outcomes for conversion analysis
--
-- GCC Loyalty Program mapping (Shukran / Nojoom / Tawasol):
--   Stored as gcc_program TEXT column on loyalty_segments.
--   External API calls are STUBBED — partner credentials required.
--   Shukran   → Majid Al Futtaim (UAE/KSA): OAuth2 partner integration
--   Nojoom    → Saudia Airlines (KSA): REST API partner integration
--   Tawasol   → Qatar loyalty network: REST API partner integration
-- ============================================================================

-- ----------------------------------------------------------------------------
-- loyalty_segments — one row per named segment per account
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.loyalty_segments (
  id                uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id        uuid          NOT NULL REFERENCES public.accounts_v2(id) ON DELETE CASCADE,
  licensee_id       uuid          NOT NULL REFERENCES public.licensees(id)   ON DELETE CASCADE,
  name              text          NOT NULL,                 -- slug: "gold_member"
  display_label     text          NOT NULL,                 -- UI: "Gold Member"
  pricing_rule_type text          NOT NULL
    CONSTRAINT loyalty_rule_type_chk CHECK (pricing_rule_type IN ('pct_discount','fixed_price','points_multiplier')),
  rule_value        numeric(12,4) NOT NULL
    CONSTRAINT loyalty_rule_value_pos CHECK (rule_value > 0),
  -- GCC loyalty program mapping (STUB — external API not integrated)
  gcc_program       text
    CONSTRAINT loyalty_gcc_program_chk CHECK (gcc_program IS NULL OR gcc_program IN ('shukran','nojoom','tawasol')),
  valid_from        timestamptz,    -- null = always valid from now
  valid_to          timestamptz,    -- null = never expires
  enabled           boolean         NOT NULL DEFAULT true,
  created_at        timestamptz     NOT NULL DEFAULT now(),
  updated_at        timestamptz     NOT NULL DEFAULT now(),
  UNIQUE (account_id, name)
);

CREATE INDEX IF NOT EXISTS loyalty_segments_account_idx
  ON public.loyalty_segments (account_id, enabled);

ALTER TABLE public.loyalty_segments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "loyalty_segments_account" ON public.loyalty_segments
  FOR ALL USING (
    account_id IN (
      SELECT id FROM public.accounts_v2
      WHERE licensee_id = (
        SELECT licensee_id FROM public.accounts_v2 WHERE id = account_id LIMIT 1
      )
    )
  );

-- ----------------------------------------------------------------------------
-- loyalty_ab_assignments — one variant (control|treatment) per customer×sku
-- Assignment is sticky: once assigned, same customer always gets same variant.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.loyalty_ab_assignments (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id   uuid        NOT NULL REFERENCES public.accounts_v2(id) ON DELETE CASCADE,
  customer_id  text        NOT NULL,
  sku          text        NOT NULL,
  channel      text        NOT NULL DEFAULT 'Online',
  segment_id   uuid        REFERENCES public.loyalty_segments(id) ON DELETE SET NULL,
  variant      text        NOT NULL
    CONSTRAINT loyalty_variant_chk CHECK (variant IN ('control','treatment')),
  created_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (account_id, customer_id, sku, channel)
);

CREATE INDEX IF NOT EXISTS loyalty_ab_account_idx
  ON public.loyalty_ab_assignments (account_id, sku, channel);

ALTER TABLE public.loyalty_ab_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "loyalty_ab_account" ON public.loyalty_ab_assignments
  FOR ALL USING (
    account_id IN (
      SELECT id FROM public.accounts_v2
      WHERE licensee_id = (
        SELECT licensee_id FROM public.accounts_v2 WHERE id = account_id LIMIT 1
      )
    )
  );

-- ----------------------------------------------------------------------------
-- loyalty_outcomes — purchase outcomes for future conversion analysis.
-- Append-only by convention. Conversion analysis intentionally empty until
-- real outcome data accumulates.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.loyalty_outcomes (
  id            uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id    uuid          NOT NULL REFERENCES public.accounts_v2(id) ON DELETE CASCADE,
  assignment_id uuid          REFERENCES public.loyalty_ab_assignments(id) ON DELETE SET NULL,
  customer_id   text          NOT NULL,
  sku           text          NOT NULL,
  channel       text          NOT NULL DEFAULT 'Online',
  variant       text          NOT NULL CHECK (variant IN ('control','treatment')),
  segment_id    uuid          REFERENCES public.loyalty_segments(id) ON DELETE SET NULL,
  purchased     boolean       NOT NULL DEFAULT false,
  price_paid    numeric(12,2),
  created_at    timestamptz   NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS loyalty_outcomes_account_idx
  ON public.loyalty_outcomes (account_id, sku, created_at DESC);

ALTER TABLE public.loyalty_outcomes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "loyalty_outcomes_account" ON public.loyalty_outcomes
  FOR ALL USING (
    account_id IN (
      SELECT id FROM public.accounts_v2
      WHERE licensee_id = (
        SELECT licensee_id FROM public.accounts_v2 WHERE id = account_id LIMIT 1
      )
    )
  );
