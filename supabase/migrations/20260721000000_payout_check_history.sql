-- Persists each Expected Payout Check run (live pull or manual CSV upload)
-- so a merchant can look back at past checks instead of losing the number
-- the moment they navigate away. Previously nothing was persisted — every
-- check was computed and returned once, never stored.
CREATE TABLE IF NOT EXISTS ps_payout_checks (
  id                   uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id           text        NOT NULL,
  source               text        NOT NULL CHECK (source IN ('live','upload')),
  platform             text        NOT NULL,
  order_count          integer     NOT NULL,
  sub_total_sum        numeric     NOT NULL,
  commission_rate_pct  numeric     NOT NULL,
  expected_payout      numeric     NOT NULL,
  period_start         text,
  period_end           text,
  rows_skipped         integer,
  rows_total           integer,
  created_at           timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ps_payout_checks_account ON ps_payout_checks(account_id, created_at DESC);

ALTER TABLE ps_payout_checks ENABLE ROW LEVEL SECURITY;
-- Server-only, like ps_merchant_pricing_config: no policies means only
-- service_role (which bypasses RLS) can read/write it.
