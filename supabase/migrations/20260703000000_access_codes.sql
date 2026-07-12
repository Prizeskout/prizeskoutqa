-- Dedicated table for store access code → merchant_id mapping.
-- Separate from ps_merchant_channels to avoid the platform/status CHECK constraints.
CREATE TABLE IF NOT EXISTS ps_access_codes (
  code         text        PRIMARY KEY,
  merchant_id  text        NOT NULL,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ps_access_codes_merchant ON ps_access_codes(merchant_id);
