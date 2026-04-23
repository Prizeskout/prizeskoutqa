-- Add payload + retry fields to webhook_deliveries
ALTER TABLE public.webhook_deliveries
  ADD COLUMN IF NOT EXISTS payload jsonb,
  ADD COLUMN IF NOT EXISTS response_body text,
  ADD COLUMN IF NOT EXISTS duration_ms integer,
  ADD COLUMN IF NOT EXISTS next_retry_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS max_attempts integer NOT NULL DEFAULT 5;

-- Add retry config to webhook_endpoints
ALTER TABLE public.webhook_endpoints
  ADD COLUMN IF NOT EXISTS max_attempts integer NOT NULL DEFAULT 5,
  ADD COLUMN IF NOT EXISTS backoff_seconds integer NOT NULL DEFAULT 30;

-- Allow users to UPDATE their own webhook_deliveries (needed for retry bookkeeping)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'webhook_deliveries'
      AND policyname = 'Users update own webhook deliveries'
  ) THEN
    CREATE POLICY "Users update own webhook deliveries"
      ON public.webhook_deliveries
      FOR UPDATE
      TO authenticated
      USING (auth.uid() = user_id);
  END IF;
END$$;