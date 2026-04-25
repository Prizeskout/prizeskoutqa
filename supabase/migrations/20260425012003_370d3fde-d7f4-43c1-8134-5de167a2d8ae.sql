ALTER TABLE public.webhook_endpoints
  ADD COLUMN IF NOT EXISTS signing_version text NOT NULL DEFAULT 'v1',
  ADD COLUMN IF NOT EXISTS secret_revealed_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS secret_last_rotated_at timestamp with time zone;