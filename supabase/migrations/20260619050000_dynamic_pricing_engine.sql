-- ============================================================================
-- Dynamic Pricing Engine (API 03 — /v1/dynprice/*)
--
-- Tables
--   gcc_event_calendar     — GCC/Qatar event calendar (system + custom events)
--   dynprice_configs       — per-product base_price + floor config
--   dynprice_rules         — trigger rules (time_window | named_event | inventory)
--   dynprice_floor_overrides — immutable log of margin-floor clamps
--
-- Priority rule (documented):
--   Among all ENABLED rules that FIRE for a given evaluation, the rule with
--   the LOWEST priority number wins. Only one rule's adjustment is applied.
--   priority=1 > priority=2 > priority=100.
--
-- Adjustments are ALWAYS a % of base_price, never of the current live price.
--   proposed = base_price × (1 + adjustment_pct)   where adj_pct < 0 = discount
--
-- Floor protection:
--   floor = minViablePrice(landed_cost, channel_costs, min_margin_pct)
--   This is the EXACT formula from API 07 (margin.ts). If proposed < floor,
--   the price is clamped to floor and the override is logged.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- gcc_event_calendar
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.gcc_event_calendar (
  id                      uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type              text        NOT NULL
    CHECK (event_type IN ('ramadan','eid_al_fitr','eid_al_adha','national_day','white_friday','custom')),
  name                    text        NOT NULL,
  region                  text        NOT NULL DEFAULT 'GCC',
  starts_at               timestamptz NOT NULL,
  ends_at                 timestamptz NOT NULL,
  year                    smallint    NOT NULL,
  is_approximate          boolean     NOT NULL DEFAULT false,
  created_by_licensee_id  uuid        REFERENCES public.licensees(id) ON DELETE CASCADE,
  notes                   text,
  created_at              timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT gcc_event_calendar_time_chk CHECK (ends_at > starts_at)
);

CREATE INDEX IF NOT EXISTS gcc_event_calendar_type_idx  ON public.gcc_event_calendar (event_type);
CREATE INDEX IF NOT EXISTS gcc_event_calendar_range_idx ON public.gcc_event_calendar USING gist (tstzrange(starts_at, ends_at));

-- RLS: public read (for pricing engine), tenant write (for custom events)
ALTER TABLE public.gcc_event_calendar ENABLE ROW LEVEL SECURITY;
CREATE POLICY "gcc_events_read_all" ON public.gcc_event_calendar
  FOR SELECT USING (true);
CREATE POLICY "gcc_events_insert_own" ON public.gcc_event_calendar
  FOR INSERT WITH CHECK (
    created_by_licensee_id IS NOT NULL
  );

-- ----------------------------------------------------------------------------
-- dynprice_configs — one row per (account, sku, channel)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.dynprice_configs (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id      uuid        NOT NULL REFERENCES public.accounts_v2(id) ON DELETE CASCADE,
  licensee_id     uuid        NOT NULL REFERENCES public.licensees(id) ON DELETE CASCADE,
  sku             text        NOT NULL,
  channel         text        NOT NULL DEFAULT 'Online',
  base_price      numeric(12,2) NOT NULL
    CONSTRAINT dynprice_configs_base_price_pos CHECK (base_price > 0),
  min_margin_pct  numeric(6,4) NOT NULL DEFAULT 0.00
    CONSTRAINT dynprice_configs_margin_chk CHECK (min_margin_pct >= 0 AND min_margin_pct < 1),
  enabled         boolean     NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (account_id, sku, channel)
);

CREATE INDEX IF NOT EXISTS dynprice_configs_account_idx ON public.dynprice_configs (account_id, enabled);

ALTER TABLE public.dynprice_configs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "dynprice_configs_account" ON public.dynprice_configs
  FOR ALL USING (account_id IN (
    SELECT id FROM public.accounts_v2 WHERE licensee_id = (
      SELECT licensee_id FROM public.accounts_v2 WHERE id = account_id LIMIT 1
    )
  ));

-- ----------------------------------------------------------------------------
-- dynprice_rules — trigger rules linked to (account, sku, channel)
--
-- config JSONB schema by rule_type:
--   time_window  : { "hour_start": int(0-23), "hour_end": int(1-24),
--                    "days_of_week"?: int[]  }   -- Qatar time UTC+3; [start,end)
--   named_event  : { "event_type": string, "lookahead_days"?: int(0-30) }
--   inventory    : { "low_stock_threshold"?: int } -- STUB; needs merchant feed
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.dynprice_rules (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id      uuid        NOT NULL REFERENCES public.accounts_v2(id) ON DELETE CASCADE,
  licensee_id     uuid        NOT NULL REFERENCES public.licensees(id) ON DELETE CASCADE,
  sku             text        NOT NULL,
  channel         text        NOT NULL DEFAULT 'Online',
  rule_type       text        NOT NULL
    CHECK (rule_type IN ('time_window','named_event','inventory')),
  name            text        NOT NULL,
  priority        integer     NOT NULL DEFAULT 100
    CONSTRAINT dynprice_rules_priority_pos CHECK (priority >= 1),
  adjustment_pct  numeric(8,4) NOT NULL
    CONSTRAINT dynprice_rules_adj_range CHECK (adjustment_pct > -1 AND adjustment_pct <= 1),
  config          jsonb       NOT NULL DEFAULT '{}',
  enabled         boolean     NOT NULL DEFAULT true,
  notes           text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

COMMENT ON COLUMN public.dynprice_rules.priority IS
  'Lower = higher priority. Among all firing rules, the one with lowest priority wins.';
COMMENT ON COLUMN public.dynprice_rules.adjustment_pct IS
  'Fraction of base_price to adjust. -0.10 = 10% discount, +0.05 = 5% uplift.';

CREATE INDEX IF NOT EXISTS dynprice_rules_lookup_idx ON public.dynprice_rules (account_id, sku, channel, enabled);

ALTER TABLE public.dynprice_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "dynprice_rules_account" ON public.dynprice_rules
  FOR ALL USING (account_id IN (SELECT id FROM public.accounts_v2 WHERE licensee_id = licensee_id));

-- ----------------------------------------------------------------------------
-- dynprice_floor_overrides — immutable log: written when floor clamps a rule
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.dynprice_floor_overrides (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id      uuid        NOT NULL,
  licensee_id     uuid        NOT NULL,
  sku             text        NOT NULL,
  channel         text        NOT NULL,
  rule_id         uuid,
  rule_name       text,
  min_margin_pct  numeric(6,4) NOT NULL,
  proposed_price  numeric(12,2) NOT NULL,
  floor_price     numeric(12,2) NOT NULL,
  final_price     numeric(12,2) NOT NULL,
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- Lock as insert-only audit log (same pattern as pricing_decisions)
SELECT public.lock_immutable_table('dynprice_floor_overrides');

ALTER TABLE public.dynprice_floor_overrides ENABLE ROW LEVEL SECURITY;
CREATE POLICY "dynprice_floor_overrides_account" ON public.dynprice_floor_overrides
  FOR SELECT USING (account_id IN (
    SELECT id FROM public.accounts_v2 WHERE licensee_id = licensee_id
  ));

-- ============================================================================
-- Seed: GCC / Qatar event calendar 2026 + 2027
--
-- Islamic dates (Ramadan, Eid) are approximate (±1-2 days) depending on
-- official moon sighting in Saudi Arabia. is_approximate = true marks them.
-- Gregorian dates (Qatar National Day, White Friday) are exact.
--
-- White Friday = the Friday after US Thanksgiving (4th Thursday of November).
--   2026: Nov 27  |  2027: Nov 26
-- Qatar National Day = always December 18.
-- ============================================================================

INSERT INTO public.gcc_event_calendar
  (event_type, name, region, starts_at, ends_at, year, is_approximate, notes)
VALUES
  -- ── 2026 ─────────────────────────────────────────────────────────────────
  ('ramadan',      'Ramadan 2026',              'GCC',
   '2026-02-18T00:00:00+03:00', '2026-03-20T00:00:00+03:00', 2026, true,
   '1447 AH — 30 days. Starts eve of 18 Feb; ends with Eid al-Fitr sighting.'),

  ('eid_al_fitr',  'Eid al-Fitr 2026',          'GCC',
   '2026-03-20T00:00:00+03:00', '2026-03-23T00:00:00+03:00', 2026, true,
   '1447 AH — 3-day holiday immediately after Ramadan.'),

  ('eid_al_adha',  'Eid al-Adha 2026',          'GCC',
   '2026-05-26T00:00:00+03:00', '2026-05-30T00:00:00+03:00', 2026, true,
   '1447 AH — 4-day holiday. 10 Dhul Hijja ≈ 26 May 2026.'),

  ('white_friday', 'White Friday 2026',          'GCC',
   '2026-11-27T00:00:00+03:00', '2026-11-28T00:00:00+03:00', 2026, false,
   'Friday after US Thanksgiving (4th Thu Nov 26). GCC equivalent of Black Friday.'),

  ('national_day', 'Qatar National Day 2026',   'QA',
   '2026-12-18T00:00:00+03:00', '2026-12-19T00:00:00+03:00', 2026, false,
   'Annual Qatar National Day — fixed date Dec 18.'),

  -- ── 2027 ─────────────────────────────────────────────────────────────────
  ('ramadan',      'Ramadan 2027',              'GCC',
   '2027-02-07T00:00:00+03:00', '2027-03-09T00:00:00+03:00', 2027, true,
   '1448 AH — 30 days. Shifts ~11 days earlier vs 2026.'),

  ('eid_al_fitr',  'Eid al-Fitr 2027',          'GCC',
   '2027-03-09T00:00:00+03:00', '2027-03-12T00:00:00+03:00', 2027, true,
   '1448 AH — 3-day holiday.'),

  ('eid_al_adha',  'Eid al-Adha 2027',          'GCC',
   '2027-05-15T00:00:00+03:00', '2027-05-19T00:00:00+03:00', 2027, true,
   '1448 AH — 4-day holiday. 10 Dhul Hijja ≈ 15 May 2027.'),

  ('white_friday', 'White Friday 2027',          'GCC',
   '2027-11-26T00:00:00+03:00', '2027-11-27T00:00:00+03:00', 2027, false,
   'Friday after US Thanksgiving (4th Thu Nov 25, 2027 → Fri Nov 26).'),

  ('national_day', 'Qatar National Day 2027',   'QA',
   '2027-12-18T00:00:00+03:00', '2027-12-19T00:00:00+03:00', 2027, false,
   'Annual Qatar National Day — fixed date Dec 18.')

ON CONFLICT DO NOTHING;
