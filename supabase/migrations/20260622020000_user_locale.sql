-- Persists the user's preferred UI locale so it survives across devices/browsers.
-- The frontend uses localStorage as the fast-path and syncs to this column
-- asynchronously. On login from a new device, the stored locale takes precedence
-- over browser detection.

ALTER TABLE public.accounts_v2
  ADD COLUMN IF NOT EXISTS preferred_locale text NOT NULL DEFAULT 'en'
    CHECK (preferred_locale IN ('en', 'ar', 'fr'));

COMMENT ON COLUMN public.accounts_v2.preferred_locale IS
  'User-selected UI locale (en / ar / fr). Stored for cross-device persistence.';
