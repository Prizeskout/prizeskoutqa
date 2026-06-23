-- Option C hook: store required_freshness_sec in competitor_url_cache so the
-- maintain_url_cache trigger can compare old vs new freshness on every join event.
--
-- Without this column the trigger only knows the new freshness (after the INSERT).
-- The old value is gone — detecting a cadence upgrade would require a BEFORE trigger
-- or a full refactor of required_freshness_seconds().
--
-- With this column the AFTER trigger reads v_old_freshness BEFORE overwriting the row,
-- giving it everything it needs.  Adding Option C attribution later becomes:
--
--   IF v_old_freshness IS NOT NULL AND v_new_freshness < v_old_freshness THEN
--     INSERT INTO cadence_attribution_log (...) VALUES (v_norm, NEW.user_id, v_old_freshness, v_new_freshness, now());
--   END IF;
--
-- That one condition + one INSERT is the only future change needed.

ALTER TABLE public.competitor_url_cache
  ADD COLUMN IF NOT EXISTS required_freshness_sec INTEGER;

-- Back-fill existing rows so v_old_freshness is never NULL on first check.
UPDATE public.competitor_url_cache
  SET required_freshness_sec = public.required_freshness_seconds(normalized_url);

-- Replace trigger function: maintain required_freshness_sec alongside watcher_count.
-- v_old_freshness is read before the upsert so future Option C can compare it.
CREATE OR REPLACE FUNCTION public.maintain_url_cache()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_norm          TEXT;
  v_new_freshness INTEGER;
  v_old_freshness INTEGER;  -- captured before upsert; Option C compares this to v_new_freshness
BEGIN
  -- Recalculate watcher_count for the old normalized URL on change or delete
  IF TG_OP IN ('DELETE', 'UPDATE') AND OLD.competitor <> 'self' THEN
    v_norm := normalize_competitor_url(OLD.url);
    UPDATE competitor_url_cache
      SET watcher_count          = (
            SELECT COUNT(DISTINCT user_id)
            FROM competitor_product_urls
            WHERE normalize_competitor_url(url) = v_norm
              AND competitor <> 'self'
          ),
          required_freshness_sec = required_freshness_seconds(v_norm),
          updated_at             = now()
      WHERE normalized_url = v_norm;
    -- Remove orphaned cache entries (no watchers remaining)
    DELETE FROM competitor_url_cache
      WHERE normalized_url = v_norm AND watcher_count = 0;
  END IF;

  -- Upsert cache entry for the new normalized URL on insert or update
  IF TG_OP IN ('INSERT', 'UPDATE') AND NEW.competitor <> 'self' THEN
    v_norm          := normalize_competitor_url(NEW.url);
    v_new_freshness := required_freshness_seconds(v_norm);

    -- Read old freshness before overwriting it (this is the Option C hook value)
    SELECT required_freshness_sec INTO v_old_freshness
      FROM competitor_url_cache WHERE normalized_url = v_norm;

    INSERT INTO competitor_url_cache (normalized_url, raw_url_sample, watcher_count, required_freshness_sec)
    VALUES (
      v_norm,
      NEW.url,
      (SELECT COUNT(DISTINCT user_id) FROM competitor_product_urls
       WHERE normalize_competitor_url(url) = v_norm AND competitor <> 'self'),
      v_new_freshness
    )
    ON CONFLICT (normalized_url) DO UPDATE
      SET watcher_count          = EXCLUDED.watcher_count,
          raw_url_sample         = EXCLUDED.raw_url_sample,
          required_freshness_sec = EXCLUDED.required_freshness_sec,
          updated_at             = now();

    -- Option C (NOT built yet — add the table + this block when attribution is needed):
    -- IF v_old_freshness IS NOT NULL AND v_new_freshness < v_old_freshness THEN
    --   INSERT INTO public.cadence_attribution_log
    --     (url, tenant_id, prev_freshness_sec, new_freshness_sec, joined_at)
    --   VALUES (v_norm, NEW.user_id, v_old_freshness, v_new_freshness, now());
    -- END IF;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;
