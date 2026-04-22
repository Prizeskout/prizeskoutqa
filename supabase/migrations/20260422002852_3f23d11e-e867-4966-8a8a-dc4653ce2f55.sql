-- Per-window AI insights caching: each (user_id, page, time_window) gets its own row.
ALTER TABLE public.ai_insights
  ADD COLUMN IF NOT EXISTS time_window text NOT NULL DEFAULT '24h';

-- Drop the old single-row-per-page uniqueness if it exists, replace with per-window.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'ai_insights_user_id_page_key'
  ) THEN
    ALTER TABLE public.ai_insights DROP CONSTRAINT ai_insights_user_id_page_key;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS ai_insights_user_page_window_key
  ON public.ai_insights (user_id, page, time_window);

ALTER TABLE public.ai_insights
  DROP CONSTRAINT IF EXISTS ai_insights_window_check;

ALTER TABLE public.ai_insights
  ADD CONSTRAINT ai_insights_window_check
  CHECK (time_window IN ('24h', '7d', '30d'));