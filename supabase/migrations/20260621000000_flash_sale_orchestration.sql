-- ============================================================================
-- Flash Sale Orchestration (API 09)
--
-- Tables:
--   flash_events      — event definition, one row per sale
--   flash_event_skus  — per-SKU state: original price, flash price, floor,
--                       channel push status, units_sold stub
--
-- Scheduling: hooks at /api/public/hooks/flash-start and /api/public/hooks/flash-end
-- called via pg_cron (see comments at bottom).
-- ============================================================================

-- flash_events
CREATE TABLE IF NOT EXISTS public.flash_events (
  id                  uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id          uuid          NOT NULL REFERENCES public.accounts_v2(id)  ON DELETE CASCADE,
  licensee_id         uuid          NOT NULL REFERENCES public.licensees(id)    ON DELETE CASCADE,
  created_by_user_id  uuid          NOT NULL,
  name                text          NOT NULL,
  skus                text[]        NOT NULL,
  discount_config     jsonb         NOT NULL,
    -- { "type": "pct"|"fixed", "value": number }
    -- pct: percentage points off (25 = 25% off)
    -- fixed: absolute QAR reduction
  channel_scope       text          NOT NULL DEFAULT 'Online',
  start_at            timestamptz   NOT NULL,
  end_at              timestamptz   NOT NULL,
  status              text          NOT NULL DEFAULT 'scheduled'
    CONSTRAINT fe_status_chk CHECK (status IN ('scheduled','active','completed','cancelled')),
  inventory_reserve   int,          -- optional units to hold; no live stock check (stub)
  auto_restore        boolean       NOT NULL DEFAULT true,
  note                text,
  created_at          timestamptz   NOT NULL DEFAULT now(),
  updated_at          timestamptz   NOT NULL DEFAULT now(),
  CONSTRAINT fe_time_chk CHECK (end_at > start_at)
);

CREATE INDEX IF NOT EXISTS fe_account_status_idx
  ON public.flash_events (account_id, status);

CREATE INDEX IF NOT EXISTS fe_start_at_idx
  ON public.flash_events (start_at)
  WHERE status = 'scheduled';

CREATE INDEX IF NOT EXISTS fe_end_at_idx
  ON public.flash_events (end_at)
  WHERE status = 'active';

ALTER TABLE public.flash_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY fe_account ON public.flash_events
  FOR ALL USING (
    account_id IN (
      SELECT id FROM public.accounts_v2
      WHERE licensee_id = (
        SELECT licensee_id FROM public.accounts_v2 WHERE id = account_id LIMIT 1
      )
    )
  );

GRANT SELECT, INSERT, UPDATE ON public.flash_events TO service_role;
GRANT SELECT ON public.flash_events TO authenticated, anon;

-- flash_event_skus: per-SKU price state
CREATE TABLE IF NOT EXISTS public.flash_event_skus (
  id                  uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  flash_event_id      uuid          NOT NULL REFERENCES public.flash_events(id) ON DELETE CASCADE,
  sku                 text          NOT NULL,
  product_id          uuid,         -- FK to catalog_products.id (resolved at creation)
  original_price      numeric(12,2), -- list_price before flash (stored for restore)
  flash_price         numeric(12,2), -- computed discounted price
  floor_price         numeric(12,2), -- margin floor at time of creation
  channel             text          NOT NULL DEFAULT 'Online',
  channel_push_status text          NOT NULL DEFAULT 'pending'
    CONSTRAINT fes_push_chk CHECK (channel_push_status IN ('pending','applied','failed','skipped')),
  units_sold          int,          -- stub: populated via order callback (not implemented)
  created_at          timestamptz   NOT NULL DEFAULT now(),
  UNIQUE (flash_event_id, sku)
);

CREATE INDEX IF NOT EXISTS fes_event_idx
  ON public.flash_event_skus (flash_event_id);

ALTER TABLE public.flash_event_skus ENABLE ROW LEVEL SECURITY;
CREATE POLICY fes_account ON public.flash_event_skus
  FOR ALL USING (
    flash_event_id IN (
      SELECT id FROM public.flash_events
      WHERE account_id IN (
        SELECT id FROM public.accounts_v2
        WHERE licensee_id = (
          SELECT licensee_id FROM public.accounts_v2
          WHERE id = (
            SELECT account_id FROM public.flash_events fe
            WHERE fe.id = flash_event_id LIMIT 1
          ) LIMIT 1
        )
      )
    )
  );

GRANT SELECT, INSERT, UPDATE ON public.flash_event_skus TO service_role;
GRANT SELECT ON public.flash_event_skus TO authenticated, anon;

-- pg_cron wiring (run after enabling pg_cron extension):
--
-- SELECT cron.schedule('flash-start', '* * * * *', $$
--   SELECT net.http_post(
--     url     := 'https://prizeskoutqa.prizeskoutqatar.workers.dev/api/public/hooks/flash-start',
--     headers := '{"Authorization":"Bearer <SUPABASE_PUBLISHABLE_KEY>"}'::jsonb,
--     body    := '{}'::jsonb
--   );
-- $$);
--
-- SELECT cron.schedule('flash-end', '* * * * *', $$
--   SELECT net.http_post(
--     url     := 'https://prizeskoutqa.prizeskoutqatar.workers.dev/api/public/hooks/flash-end',
--     headers := '{"Authorization":"Bearer <SUPABASE_PUBLISHABLE_KEY>"}'::jsonb,
--     body    := '{}'::jsonb
--   );
-- $$);

NOTIFY pgrst, 'reload schema';
