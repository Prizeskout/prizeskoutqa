-- Per-merchant global margin floor. Was hardcoded (DEFAULT_MARGIN_FLOOR = 0.18
-- in decide-engine.ts) and identical for every merchant regardless of what the
-- dashboard showed. This table lets a merchant actually set their own floor;
-- a missing row means "use the 18% default", so every existing merchant's
-- behavior is unchanged until they set one.
CREATE TABLE IF NOT EXISTS ps_merchant_pricing_config (
  account_id       text        PRIMARY KEY,
  margin_floor_pct numeric     NOT NULL DEFAULT 0.18,
  updated_at       timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE ps_merchant_pricing_config ENABLE ROW LEVEL SECURITY;
-- Server-only, like ps_access_codes: no policies means only service_role
-- (which bypasses RLS) can read/write it.
