-- ============================================================================
-- Cross-Border Price Parity API (API 15)
--
-- Tables:
--   gcc_country_configs  — system-seeded per-country cost basis (VAT, duty, logistics)
--   parity_rules         — per-account price band constraints between markets
--   parity_violations    — append-only audit of detected violations
--   fx_rates_cache       — shared QAR-based FX rate cache (~4-hour TTL)
--
-- GCC VAT Rates (verified as of 2026):
--   Qatar  (QA): 0%   — VAT not yet implemented (planned but not enforced)
--   UAE    (AE): 5%   — Federal Decree-Law No. 8 of 2017, effective Jan 2018
--   Saudi  (SA): 15%  — Raised from 5% to 15% by Royal Decree M/113, Jul 2020
--   Kuwait (KW): 0%   — Pending legislation; not implemented as of 2026
--   Bahrain(BH): 10%  — Raised from 5% to 10% by Decree 24/2021, Jan 2022
--   Oman   (OM): 5%   — Income Tax Law No. 121/2020, effective Apr 2021
--
-- Import Duty:
--   GCC Unified Customs Tariff: 5% on most goods at CIF value.
--   EXCEPTIONS: food staples, medicines, tobacco (different rates).
--   HS-code-specific rates require real customs data (not seeded here).
--   Intra-GCC trade: 0% for GCC-origin goods meeting Rules of Origin.
--   Non-GCC-origin goods re-exported within GCC: destination duty applies.
--   FLAG: default_import_duty_pct is a placeholder — replace per product's HS code.
--
-- FX Rates:
--   Fetched from api.frankfurter.app (ECB data, free, no API key).
--   GCC currencies are mostly USD-pegged; fallback pegs used for any currency
--   not returned by Frankfurter.
--   Cached for ~4 hours in fx_rates_cache (global, no per-account scope).
--
-- Floor calculation (per-country):
--   Uses exact API 07 formula (margin.ts) but with country-specific cost basis:
--     base_landed_qar    = unit_cost + freight + unit_cost × base_duty_pct
--     country_landed_qar = base_landed_qar × (1 + country_import_duty_pct) + logistics_cost_qar
--     country_landed_loc = country_landed_qar × fx_rate
--     pre_vat_floor      = minViablePrice(country_landed_loc, channel_costs_loc, min_margin_pct)
--     consumer_floor     = pre_vat_floor × (1 + vat_pct)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- gcc_country_configs — global system table (no account_id)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.gcc_country_configs (
  id                       uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  country_code             text          NOT NULL UNIQUE,   -- ISO 3166-1 alpha-2
  country_name             text          NOT NULL,
  currency_code            text          NOT NULL,          -- ISO 4217
  vat_pct                  numeric(6,4)  NOT NULL DEFAULT 0.00
    CONSTRAINT gcc_vat_range CHECK (vat_pct >= 0 AND vat_pct < 1),
  -- GCC Unified Customs Tariff default (most goods). Override per HS code.
  default_import_duty_pct  numeric(6,4)  NOT NULL DEFAULT 0.05
    CONSTRAINT gcc_duty_range CHECK (default_import_duty_pct >= 0 AND default_import_duty_pct < 1),
  -- Additional logistics overhead for cross-border delivery to this country (QAR)
  logistics_cost_qar       numeric(12,2) NOT NULL DEFAULT 0.00,
  notes                    text,
  created_at               timestamptz   NOT NULL DEFAULT now(),
  updated_at               timestamptz   NOT NULL DEFAULT now()
);

-- RLS: public read (pricing engine reads without account context), no API write
ALTER TABLE public.gcc_country_configs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "gcc_country_configs_read_all" ON public.gcc_country_configs
  FOR SELECT USING (true);

-- ----------------------------------------------------------------------------
-- Seed GCC country configs (VAT rates + duty defaults + logistics estimates)
-- ----------------------------------------------------------------------------
INSERT INTO public.gcc_country_configs
  (country_code, country_name, currency_code, vat_pct, default_import_duty_pct, logistics_cost_qar, notes)
VALUES
  ('QA', 'Qatar', 'QAR',
   0.00, 0.05, 0.00,
   'Qatar: VAT not implemented as of 2026 (planned). GCC Unified Tariff 5% on most imports. Domestic market — no cross-border logistics.'),

  ('AE', 'United Arab Emirates', 'AED',
   0.05, 0.05, 50.00,
   'UAE: 5% VAT (Decree-Law 8/2017, Jan 2018). GCC Unified Tariff 5% default. Est. QAR 50 logistics via Dubai Customs + last-mile. Note: GCC-origin goods may qualify for 0% intra-GCC duty.'),

  ('SA', 'Saudi Arabia', 'SAR',
   0.15, 0.05, 60.00,
   'KSA: VAT 15% (Royal Decree M/113, raised from 5% to 15% in Jul 2020). GCC Unified Tariff 5% default. Est. QAR 60 logistics via SACO / SMSA. Intra-GCC duty may be 0% for GCC-origin goods.'),

  ('KW', 'Kuwait', 'KWD',
   0.00, 0.05, 55.00,
   'Kuwait: VAT 0% — not implemented as of 2026 (GCC VAT Framework Agreement signed but not enacted). GCC Unified Tariff 5% default. Est. QAR 55 logistics via Kuwait City customs.'),

  ('BH', 'Bahrain', 'BHD',
   0.10, 0.05, 45.00,
   'Bahrain: VAT 10% (Decree 24/2021, raised from 5% to 10% effective Jan 2022). GCC Unified Tariff 5% default. Est. QAR 45 logistics via Manama; Qatar–Bahrain proximity reduces shipping.'),

  ('OM', 'Oman', 'OMR',
   0.05, 0.05, 55.00,
   'Oman: VAT 5% (Income Tax Law 121/2020, effective Apr 2021). GCC Unified Tariff 5% default. Est. QAR 55 logistics via Muscat via air or sea from Doha.')

ON CONFLICT (country_code) DO UPDATE SET
  vat_pct                 = EXCLUDED.vat_pct,
  default_import_duty_pct = EXCLUDED.default_import_duty_pct,
  logistics_cost_qar      = EXCLUDED.logistics_cost_qar,
  notes                   = EXCLUDED.notes,
  updated_at              = now();

-- ----------------------------------------------------------------------------
-- parity_rules — per-account: define acceptable price bands between markets
--
-- Semantics: the price in target_country expressed in QAR must satisfy:
--   source_price_qar × min_ratio <= target_price_qar <= source_price_qar × max_ratio
--
-- Example: AED price must be within 95%–108% of QAR price (in QAR equivalent)
--   source_country=QA, target_country=AE, min_ratio=0.95, max_ratio=1.08
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.parity_rules (
  id              uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id      uuid          NOT NULL REFERENCES public.accounts_v2(id) ON DELETE CASCADE,
  licensee_id     uuid          NOT NULL REFERENCES public.licensees(id)   ON DELETE CASCADE,
  name            text          NOT NULL,
  source_country  text          NOT NULL,    -- ISO country code
  target_country  text          NOT NULL,    -- ISO country code
  sku             text,                      -- NULL = applies to all SKUs
  min_ratio       numeric(8,4)  NOT NULL DEFAULT 0.90
    CONSTRAINT parity_rules_min_pos CHECK (min_ratio > 0),
  max_ratio       numeric(8,4)  NOT NULL DEFAULT 1.15
    CONSTRAINT parity_rules_max_gt_min CHECK (max_ratio > min_ratio),
  grey_market_threshold_pct numeric(6,4) NOT NULL DEFAULT 0.12,  -- 12% = flag grey market
  enabled         boolean       NOT NULL DEFAULT true,
  created_at      timestamptz   NOT NULL DEFAULT now(),
  updated_at      timestamptz   NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS parity_rules_account_idx
  ON public.parity_rules (account_id, enabled);

ALTER TABLE public.parity_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "parity_rules_account" ON public.parity_rules
  FOR ALL USING (
    account_id IN (
      SELECT id FROM public.accounts_v2
      WHERE licensee_id = (
        SELECT licensee_id FROM public.accounts_v2 WHERE id = account_id LIMIT 1
      )
    )
  );

-- ----------------------------------------------------------------------------
-- parity_violations — append-only audit log
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.parity_violations (
  id                   uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id           uuid          NOT NULL,
  sku                  text          NOT NULL,
  rule_id              uuid          REFERENCES public.parity_rules(id) ON DELETE SET NULL,
  rule_name            text,
  source_country       text          NOT NULL,
  target_country       text          NOT NULL,
  source_price_qar     numeric(12,2),
  target_price_qar     numeric(12,2),
  actual_ratio         numeric(8,4),
  min_ratio            numeric(8,4),
  max_ratio            numeric(8,4),
  violation_type       text          NOT NULL
    CONSTRAINT parity_violations_type_chk
      CHECK (violation_type IN ('below_min','above_max','grey_market')),
  evidence             jsonb,
  created_at           timestamptz   NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS parity_violations_account_sku_idx
  ON public.parity_violations (account_id, sku, created_at DESC);

ALTER TABLE public.parity_violations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "parity_violations_account" ON public.parity_violations
  FOR SELECT USING (
    account_id IN (
      SELECT id FROM public.accounts_v2
      WHERE licensee_id = (
        SELECT licensee_id FROM public.accounts_v2 WHERE id = account_id LIMIT 1
      )
    )
  );

-- ----------------------------------------------------------------------------
-- fx_rates_cache — global shared FX cache (QAR-based rates, ~4h TTL)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.fx_rates_cache (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  base         text        NOT NULL DEFAULT 'QAR',
  rates        jsonb       NOT NULL,    -- {"AED":1.0090,"SAR":1.0302,"KWD":0.0845,...}
  source_url   text,
  fetched_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS fx_rates_cache_fetched_idx
  ON public.fx_rates_cache (fetched_at DESC);

ALTER TABLE public.fx_rates_cache ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fx_rates_cache_read_all" ON public.fx_rates_cache
  FOR SELECT USING (true);
CREATE POLICY "fx_rates_cache_insert_service" ON public.fx_rates_cache
  FOR INSERT WITH CHECK (true);
