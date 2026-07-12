-- Add webhook_secret and webhook_registered_at to ps_merchant_channels.
-- webhook_secret: HMAC-SHA-256 key sent to each platform on subscription registration.
--   Stored here so inbound webhook handlers can verify signatures without a separate table.
-- webhook_registered_at: when we last successfully registered with the platform's webhook API.
--   NULL means we have not yet registered (pre-existing channels need re-registration).

ALTER TABLE ps_merchant_channels
  ADD COLUMN IF NOT EXISTS webhook_secret          TEXT,
  ADD COLUMN IF NOT EXISTS webhook_registered_at   TIMESTAMPTZ;

-- Fast lookup: inbound webhook handlers find channels by platform + store_id stored in metadata.
-- The existing GIN index on metadata covers this, but an expression index speeds up equality checks.
CREATE INDEX IF NOT EXISTS idx_ps_merchant_channels_platform_status
  ON ps_merchant_channels (platform, status)
  WHERE status = 'connected';

COMMENT ON COLUMN ps_merchant_channels.webhook_secret IS
  'Per-channel HMAC-SHA-256 key for verifying inbound webhooks from Salla / Foodics / Zid.';
COMMENT ON COLUMN ps_merchant_channels.webhook_registered_at IS
  'Timestamp of the last successful webhook subscription registration with the source platform.';
