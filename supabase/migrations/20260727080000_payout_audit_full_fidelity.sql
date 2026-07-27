-- Saved commission audits (ps_payout_audits) previously only kept the raw
-- ledger/findings/document-summary, dropping the assurance opinion, the
-- four-way reconciliation, cross-check windows, and the net-sales-override
-- disclosure that the freshly-run audit shows. Reopening a saved audit from
-- History therefore rendered a degraded, summarized report instead of the
-- comprehensive one just seen. Existing rows get NULL for the new columns —
-- CommissionAuditPanel already has a defined fallback for that case ("not
-- retained for this historical audit"), so old audits keep behaving exactly
-- as before; only audits saved going forward round-trip in full.
ALTER TABLE ps_payout_audits ADD COLUMN IF NOT EXISTS assurance jsonb;
ALTER TABLE ps_payout_audits ADD COLUMN IF NOT EXISTS four_way jsonb;
ALTER TABLE ps_payout_audits ADD COLUMN IF NOT EXISTS cross_check_windows jsonb;
ALTER TABLE ps_payout_audits ADD COLUMN IF NOT EXISTS net_sales_override_docs jsonb;
