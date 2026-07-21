-- Persists the itemized "extra" line items and unexplained-charge flag from
-- the Talabat payout statement parser, so the History tab's detail view
-- matches what's shown right after running a check — same reasoning as the
-- earlier breakdown-fields migration.
ALTER TABLE ps_payout_checks
  ADD COLUMN IF NOT EXISTS extra_line_items       jsonb,
  ADD COLUMN IF NOT EXISTS unexplained_charge     jsonb;
