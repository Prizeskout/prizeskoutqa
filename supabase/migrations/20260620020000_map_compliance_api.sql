-- ============================================================================
-- MAP Compliance API (API 16)
--
-- Tables:
--   map_agreements    — per-account MAP contracts (sku, price, retailer list)
--   map_violations    — IMMUTABLE append-only violation log (legal evidence)
--
-- map_violations is locked via lock_immutable_table() → no UPDATE/DELETE/
-- TRUNCATE is possible from any application role. This makes it suitable
-- as court-admissible pricing evidence.
--
-- Retailer list format: JSONB array of {name, url}
--   name  — must match a competitor_prices column (talabat|carrefour|lulu|amazon|noon)
--           for the competitor_prices fallback to work; any string for Firecrawl-only
--   url   — the retailer product page URL; null if monitoring only via competitor_prices
--
-- Violation formula:
--   violation_pct = (map_price − detected_price) / map_price × 100
--   (positive = retailer is below MAP)
--
-- Evidence storage:
--   Screenshots from Firecrawl are stored in Supabase Storage bucket 'map-evidence'.
--   evidence_path is permanent; evidence_url is a signed URL generated on read.
--
-- Cron schedule: 30 6,15 * * * (30 min after competitor scrape runs at 0 6,15)
--   SELECT cron.schedule('map-compliance-monitor', '30 6,15 * * *', $$
--     SELECT net.http_post(
--       url     := 'https://prizeskoutqa.prizeskoutqatar.workers.dev/api/public/hooks/map-monitor',
--       headers := '{"Authorization":"Bearer <SUPABASE_PUBLISHABLE_KEY>"}'::jsonb,
--       body    := '{}'::jsonb
--     );
--   $$);
-- ============================================================================

-- ----------------------------------------------------------------------------
-- map_agreements
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.map_agreements (
  id                  uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id          uuid          NOT NULL REFERENCES public.accounts_v2(id) ON DELETE CASCADE,
  licensee_id         uuid          NOT NULL REFERENCES public.licensees(id)   ON DELETE CASCADE,
  created_by_user_id  uuid          NOT NULL,   -- ctx.userId — needed for competitor_prices lookup
  sku                 text          NOT NULL,
  map_price           numeric(12,2) NOT NULL
    CONSTRAINT map_agreements_price_pos CHECK (map_price > 0),
  currency            text          NOT NULL DEFAULT 'QAR',
  effective_from      date          NOT NULL DEFAULT CURRENT_DATE,
  effective_to        date,                     -- NULL = indefinite
  retailer_list       jsonb         NOT NULL DEFAULT '[]',
    -- [{name: "noon", url: "https://noon.com/..."}, ...]
  notes               text,
  created_at          timestamptz   NOT NULL DEFAULT now(),
  updated_at          timestamptz   NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS map_agreements_account_sku_idx
  ON public.map_agreements (account_id, sku);
ALTER TABLE public.map_agreements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "map_agreements_account" ON public.map_agreements
  FOR ALL USING (account_id IN (
    SELECT id FROM public.accounts_v2
    WHERE licensee_id = (
      SELECT licensee_id FROM public.accounts_v2 WHERE id = account_id LIMIT 1
    )
  ));

-- ----------------------------------------------------------------------------
-- map_violations — IMMUTABLE append-only (legal evidence)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.map_violations (
  id                  uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id          uuid          NOT NULL,
  agreement_id        uuid          REFERENCES public.map_agreements(id) ON DELETE SET NULL,
  sku                 text          NOT NULL,
  retailer            text          NOT NULL,
  retailer_url        text,
  map_price           numeric(12,2) NOT NULL,
  detected_price      numeric(12,2) NOT NULL,
  currency            text          NOT NULL DEFAULT 'QAR',
  -- (map_price − detected_price) / map_price × 100
  violation_pct       numeric(8,4)  NOT NULL
    CONSTRAINT map_violations_pct_pos CHECK (violation_pct > 0),
  evidence_path       text,          -- Supabase Storage path (permanent)
  evidence_url        text,          -- signed URL at detection time (may expire; re-sign from path)
  scrape_source       text          NOT NULL DEFAULT 'firecrawl'
    CONSTRAINT map_violations_source_chk
      CHECK (scrape_source IN ('firecrawl','competitor_prices','manual')),
  scrape_markdown     text,          -- Firecrawl page markdown (text evidence)
  first_detected_at   timestamptz   NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS map_violations_account_sku_idx
  ON public.map_violations (account_id, sku, first_detected_at DESC);
CREATE INDEX IF NOT EXISTS map_violations_retailer_idx
  ON public.map_violations (account_id, retailer, first_detected_at DESC);

ALTER TABLE public.map_violations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "map_violations_account_read" ON public.map_violations
  FOR SELECT USING (account_id IN (
    SELECT id FROM public.accounts_v2
    WHERE licensee_id = (
      SELECT licensee_id FROM public.accounts_v2 WHERE id = account_id LIMIT 1
    )
  ));

-- Lock immutable — revokes UPDATE, DELETE, TRUNCATE, TRIGGER from all app roles
SELECT public.lock_immutable_table('map_violations');
