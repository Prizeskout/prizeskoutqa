-- ============================================================================
-- Enriched Webhook Intelligence API (API 17)
--
-- Tables:
--   webhook_subscriptions          — account-level subscription store
--   webhook_intelligence_deliveries — per-attempt delivery log
--
-- Subscriptions are account-scoped (not user-scoped like the legacy
-- webhook_endpoints). Each subscription holds:
--   • the destination endpoint URL
--   • event filter list (literal, prefix enrich.*, wildcard *)
--   • enrichment_config JSONB: which enrichments to compute
--   • signing secret for HMAC-SHA-256
--   • payload filters: channel, category, sku_prefix, price_change_magnitude
--
-- Delivery log is append-only per attempt; retries insert new rows.
-- After max_attempts (default 5) all fail → dead_lettered = true.
--
-- Retry schedule: 5s → 30s → 5min → 30min → dead-letter
-- (4 retries after the initial attempt = 5 total)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- webhook_subscriptions
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.webhook_subscriptions (
  id                    uuid            PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id            uuid            NOT NULL REFERENCES public.accounts_v2(id)  ON DELETE CASCADE,
  licensee_id           uuid            NOT NULL REFERENCES public.licensees(id)    ON DELETE CASCADE,
  created_by_user_id    uuid            NOT NULL,
  endpoint_url          text            NOT NULL,
  events                text[]          NOT NULL DEFAULT '{}',
    -- e.g. ['rule.*', 'price.changed', '*']
    -- literal | prefix (enrich.*) | wildcard (*)
  enrichment_config     jsonb           NOT NULL DEFAULT
    '{"margin_impact":true,"competitor_context":true,"action_suggestion":true}',
  secret                text            NOT NULL,
    -- HMAC-SHA-256 signing secret; returned only on CREATE
  status                text            NOT NULL DEFAULT 'active'
    CONSTRAINT ws_status_chk CHECK (status IN ('active','paused','dead')),
  max_attempts          int             NOT NULL DEFAULT 5,
  -- Payload filters (all optional — NULL means no filter applied)
  channel_filter        text,
  category_filter       text,
  sku_prefix_filter     text,
  min_price_change_pct  numeric(6,4),   -- minimum abs price-change % to trigger delivery
  -- Metadata
  description           text,
  last_delivery_at      timestamptz,
  last_delivery_success boolean,
  created_at            timestamptz     NOT NULL DEFAULT now(),
  updated_at            timestamptz     NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ws_account_status_idx
  ON public.webhook_subscriptions (account_id, status);

ALTER TABLE public.webhook_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY ws_account ON public.webhook_subscriptions
  FOR ALL USING (
    account_id IN (
      SELECT id FROM public.accounts_v2
      WHERE licensee_id = (
        SELECT licensee_id FROM public.accounts_v2 WHERE id = account_id LIMIT 1
      )
    )
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.webhook_subscriptions TO service_role;
GRANT SELECT ON public.webhook_subscriptions TO authenticated, anon;

-- ----------------------------------------------------------------------------
-- webhook_intelligence_deliveries  — per-attempt delivery log
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.webhook_intelligence_deliveries (
  id                uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id   uuid          NOT NULL REFERENCES public.webhook_subscriptions(id) ON DELETE CASCADE,
  event_id          text          NOT NULL,
  event_type        text          NOT NULL,
  attempt           int           NOT NULL DEFAULT 1,
  status_code       int,
  response_time_ms  int,
  delivered_at      timestamptz,
  next_retry_at     timestamptz,
  success           boolean       NOT NULL DEFAULT false,
  dead_lettered     boolean       NOT NULL DEFAULT false,
  error_message     text,
  payload           jsonb,        -- full enriched payload stored for retries
  response_body     text,
  created_at        timestamptz   NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS wid_sub_created_idx
  ON public.webhook_intelligence_deliveries (subscription_id, created_at DESC);

-- Partial index for the retry queue — only rows pending retry
CREATE INDEX IF NOT EXISTS wid_retry_queue_idx
  ON public.webhook_intelligence_deliveries (next_retry_at ASC)
  WHERE success = false AND dead_lettered = false AND next_retry_at IS NOT NULL;

ALTER TABLE public.webhook_intelligence_deliveries ENABLE ROW LEVEL SECURITY;

-- Readable by the account that owns the subscription
CREATE POLICY wid_account ON public.webhook_intelligence_deliveries
  FOR SELECT USING (
    subscription_id IN (
      SELECT id FROM public.webhook_subscriptions
      WHERE account_id IN (
        SELECT id FROM public.accounts_v2
        WHERE licensee_id = (
          SELECT licensee_id FROM public.accounts_v2
          WHERE id = (
            SELECT account_id FROM public.webhook_subscriptions ws
            WHERE ws.id = subscription_id LIMIT 1
          ) LIMIT 1
        )
      )
    )
  );

GRANT SELECT, INSERT, UPDATE ON public.webhook_intelligence_deliveries TO service_role;
GRANT SELECT ON public.webhook_intelligence_deliveries TO authenticated, anon;

-- Wake PostgREST schema cache
NOTIFY pgrst, 'reload schema';
