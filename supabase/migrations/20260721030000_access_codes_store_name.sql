-- The store name entered during onboarding was captured client-side and
-- sent to /api/auth/email-bridge, but that endpoint never persisted it
-- anywhere — the dashboard has never had a real business name to show,
-- only ever a hardcoded "My Account" placeholder.
ALTER TABLE ps_access_codes
  ADD COLUMN IF NOT EXISTS store_name text;
