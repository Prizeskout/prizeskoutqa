-- Links a merchant's onboarding email to their access code / merchant_id, so
-- the "Access your dashboard -> Email" login path can look up which merchant
-- an authenticated email actually belongs to, instead of trusting whatever
-- merchant_id happens to already be sitting in the browser's localStorage.
ALTER TABLE ps_access_codes ADD COLUMN IF NOT EXISTS email text;

CREATE INDEX IF NOT EXISTS idx_ps_access_codes_email ON ps_access_codes(lower(email));
