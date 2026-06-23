-- ============================================================================
-- Group Buying Engine (API 12)
--
-- Tables:
--   group_campaigns  — one per group-buy event (sku + tiers + expiry)
--   group_buyers     — one commitment row per (campaign, buyer) — idempotent
--
-- Tier format (JSONB array, ordered ascending by min_buyers):
--   [{"min_buyers": 3, "price": 1100.00}, {"min_buyers": 10, "price": 1000.00}]
--
-- Floor invariant (enforced at campaign creation by API layer):
--   every tier.price >= minViablePrice(landed, channelCosts, min_margin_pct)
--   Uses the exact same formula as API 07 (margin.ts). Violation → 422.
--
-- Status lifecycle:
--   active → completed (at expiry, tier threshold met — payment_trigger emitted)
--   active → expired   (at expiry, no tier met — buyers notified)
--   active → closed    (merchant manual close via POST /v1/group/campaigns/:id/close)
--
-- GCC family flow:
--   invite_mechanic = 'family' enables family_config (OTP/SMS STUBBED).
--   family_config shape: { "otp_provider": null, "verified_phone_required": true,
--                          "max_family_members": 10, "stub_note": "..." }
--   OTP/SMS integration requires an SMS provider — NOT implemented.
--
-- Expiry processing:
--   POST /api/public/hooks/group-expire (publishable-key protected)
--   Schedule via pg_cron or Cloudflare Cron Trigger every 5 minutes.
--
--   pg_cron example (run in Supabase SQL editor, requires superuser):
--     SELECT cron.schedule(
--       'group-buy-expiry',
--       '*/5 * * * *',
--       $$
--         SELECT net.http_post(
--           url     := 'https://<your-worker>.workers.dev/api/public/hooks/group-expire',
--           headers := '{"Authorization": "Bearer <SUPABASE_PUBLISHABLE_KEY>"}'::jsonb,
--           body    := '{}'::jsonb
--         );
--       $$
--     );
--
--   Cloudflare Cron Trigger alternative: add to wrangler.jsonc:
--     "triggers": { "crons": ["*/5 * * * *"] }
--   and export a `scheduled` handler from the Worker entry that self-calls
--   POST /api/public/hooks/group-expire.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- group_campaigns
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.group_campaigns (
  id               uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id       uuid          NOT NULL REFERENCES public.accounts_v2(id) ON DELETE CASCADE,
  licensee_id      uuid          NOT NULL REFERENCES public.licensees(id)   ON DELETE CASCADE,
  sku              text          NOT NULL,
  channel          text          NOT NULL DEFAULT 'Online',
  base_price       numeric(12,2) NOT NULL
    CONSTRAINT group_campaigns_base_price_pos CHECK (base_price > 0),
  -- tiers: [{min_buyers: int, price: numeric}], ordered ASC by min_buyers.
  -- All prices validated >= margin floor at creation by the API layer.
  tiers            jsonb         NOT NULL,
  min_margin_pct   numeric(6,4)  NOT NULL DEFAULT 0.00,
  expiry_at        timestamptz   NOT NULL,
  status           text          NOT NULL DEFAULT 'active'
    CONSTRAINT group_campaigns_status_chk
      CHECK (status IN ('active','completed','expired','closed')),
  invite_mechanic  text          NOT NULL DEFAULT 'link'
    CONSTRAINT group_campaigns_mechanic_chk
      CHECK (invite_mechanic IN ('link','family')),
  -- GCC family config (STUB — OTP/SMS not integrated)
  family_config    jsonb,
  current_buyers   integer       NOT NULL DEFAULT 0
    CONSTRAINT group_campaigns_buyers_pos CHECK (current_buyers >= 0),
  current_tier_idx integer       NOT NULL DEFAULT -1,  -- -1 = no tier unlocked
  locked_price     numeric(12,2),                      -- set when payment_trigger fires
  created_by       uuid,                               -- user_id
  created_at       timestamptz   NOT NULL DEFAULT now(),
  updated_at       timestamptz   NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS group_campaigns_account_idx
  ON public.group_campaigns (account_id, status, expiry_at);

ALTER TABLE public.group_campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "group_campaigns_account" ON public.group_campaigns
  FOR ALL USING (
    account_id IN (
      SELECT id FROM public.accounts_v2
      WHERE licensee_id = (
        SELECT licensee_id FROM public.accounts_v2 WHERE id = account_id LIMIT 1
      )
    )
  );

-- ----------------------------------------------------------------------------
-- group_buyers — one commitment per (campaign, buyer); UNIQUE enforces idempotency
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.group_buyers (
  id           uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id  uuid          NOT NULL REFERENCES public.group_campaigns(id) ON DELETE CASCADE,
  account_id   uuid          NOT NULL,
  buyer_id     text          NOT NULL,   -- merchant-defined identifier (phone, email, user id)
  buyer_name   text,
  phone        text,                     -- for WhatsApp delivery + family flow
  status       text          NOT NULL DEFAULT 'committed'
    CONSTRAINT group_buyers_status_chk
      CHECK (status IN ('committed','paid','cancelled')),
  locked_price numeric(12,2),            -- populated when campaign completes
  joined_at    timestamptz   NOT NULL DEFAULT now(),
  UNIQUE (campaign_id, buyer_id)
);

CREATE INDEX IF NOT EXISTS group_buyers_campaign_idx
  ON public.group_buyers (campaign_id, status);

CREATE INDEX IF NOT EXISTS group_buyers_account_idx
  ON public.group_buyers (account_id, campaign_id);

ALTER TABLE public.group_buyers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "group_buyers_account" ON public.group_buyers
  FOR ALL USING (
    account_id IN (
      SELECT id FROM public.accounts_v2
      WHERE licensee_id = (
        SELECT licensee_id FROM public.accounts_v2 WHERE id = account_id LIMIT 1
      )
    )
  );
