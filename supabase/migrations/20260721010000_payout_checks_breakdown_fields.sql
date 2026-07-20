-- Persist the full payout breakdown (not just the headline numbers) so the
-- History tab can show the same comprehensive detail as the result a
-- merchant sees right after running a check, instead of an abridged summary.
ALTER TABLE ps_payout_checks
  ADD COLUMN IF NOT EXISTS commission_amount        numeric,
  ADD COLUMN IF NOT EXISTS additional_charges       numeric,
  ADD COLUMN IF NOT EXISTS additional_income        numeric,
  ADD COLUMN IF NOT EXISTS effective_commission_pct numeric,
  ADD COLUMN IF NOT EXISTS brand                    text,
  ADD COLUMN IF NOT EXISTS cancelled_gmv            numeric,
  ADD COLUMN IF NOT EXISTS cancelled_orders         integer;
