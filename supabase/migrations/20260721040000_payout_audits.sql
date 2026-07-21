-- Saved multi-document commission audits (src/lib/commission-audit.ts).
-- Mirrors ps_payout_checks: service-role only, no policies, scoped by
-- account_id in application code (payout-audit-history.ts).
CREATE TABLE IF NOT EXISTS ps_payout_audits (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id          text NOT NULL,
  commission_rate_pct numeric NOT NULL,
  document_count      integer NOT NULL,
  documents           jsonb NOT NULL,
  findings            jsonb NOT NULL,
  ledger              jsonb,
  ledger_totals       jsonb,
  period_start        text,
  period_end          text,
  created_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ps_payout_audits_account ON ps_payout_audits(account_id, created_at DESC);

ALTER TABLE ps_payout_audits ENABLE ROW LEVEL SECURITY;
