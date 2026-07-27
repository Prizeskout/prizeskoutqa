-- Effective-dated marketplace commercial terms used by payout assurance.
-- Service-role only: dashboard requests are authenticated and account-scoped
-- in application code before this table is accessed.
CREATE TABLE IF NOT EXISTS ps_marketplace_contract_terms (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id               text NOT NULL,
  platform                 text NOT NULL,
  contract_name            text NOT NULL,
  commission_rate_pct      numeric NOT NULL CHECK (commission_rate_pct >= 0 AND commission_rate_pct < 100),
  vat_on_fees_pct          numeric NOT NULL DEFAULT 0 CHECK (vat_on_fees_pct >= 0 AND vat_on_fees_pct < 100),
  payment_fee_pct          numeric NOT NULL DEFAULT 0 CHECK (payment_fee_pct >= 0 AND payment_fee_pct < 100),
  fixed_order_fee          numeric NOT NULL DEFAULT 0 CHECK (fixed_order_fee >= 0),
  delivery_contribution    numeric NOT NULL DEFAULT 0 CHECK (delivery_contribution >= 0),
  effective_from           date NOT NULL,
  effective_to             date,
  status                   text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','approved','superseded')),
  source_file_name         text,
  source_sha256            text CHECK (source_sha256 IS NULL OR source_sha256 ~ '^[a-f0-9]{64}$'),
  notes                    text,
  reviewed_by              text,
  approved_at              timestamptz,
  created_at               timestamptz NOT NULL DEFAULT now(),
  updated_at               timestamptz NOT NULL DEFAULT now(),
  CHECK (effective_to IS NULL OR effective_to >= effective_from)
);

CREATE INDEX IF NOT EXISTS idx_ps_contract_terms_account
  ON ps_marketplace_contract_terms(account_id, platform, effective_from DESC);

CREATE UNIQUE INDEX IF NOT EXISTS idx_ps_contract_terms_one_approved_period
  ON ps_marketplace_contract_terms(account_id, platform, effective_from)
  WHERE status = 'approved';

ALTER TABLE ps_marketplace_contract_terms ENABLE ROW LEVEL SECURITY;
