-- ============================================================================
-- Shared Competitor URL Cache
-- ============================================================================
-- Cost fix: instead of re-scraping the same competitor URL for every merchant
-- that tracks it, each unique normalized URL is scraped ONCE per freshness
-- window and the result propagates to all watching accounts.
--
-- Key tables
--   competitor_url_cache  — keyed by normalized URL; shared across tenants
--   scrape_cost_log       — per-run accounting: scrapes_performed vs. saved
--
-- Key functions
--   normalize_competitor_url(url)   — deterministic URL key (IMMUTABLE)
--   required_freshness_seconds(url) — most-demanding watcher plan cadence
--   max_freshness_seconds(url)      — slowest watcher cadence (backoff cap)
--   get_url_watchers(url)           — all (user_id,product,competitor) tuples
--
-- Isolation guarantee
--   competitor_url_cache holds ONLY public competitor web prices — fine to
--   share across tenants. It never stores which accounts track a URL; that
--   mapping stays in competitor_product_urls (per-user, RLS-gated). No RLS
--   policies are added to this table so PostgREST rejects all client access;
--   only service_role (the scrape worker) reads/writes it.
-- ============================================================================

-- ── URL normalization ─────────────────────────────────────────────────────────
-- IMMUTABLE so Postgres can index it deterministically.
-- Rules: lowercase host+scheme, strip fragment, strip known tracking params,
--        strip trailing slash from path.

CREATE OR REPLACE FUNCTION public.normalize_competitor_url(raw_url TEXT)
RETURNS TEXT
LANGUAGE plpgsql IMMUTABLE STRICT
AS $$
DECLARE
  v        TEXT    := lower(trim(raw_url));
  frag     INT;
  qpos     INT;
  scheme   TEXT;
  rest     TEXT;
  path     TEXT;
  qs       TEXT;
  params   TEXT[];
  kept     TEXT[];
  param    TEXT;
  pname    TEXT;
  tracking TEXT[]  := ARRAY[
    'utm_source','utm_medium','utm_campaign','utm_term','utm_content',
    'fbclid','gclid','msclkid','ref','referrer','source','track',
    '_ga','_gl','mc_cid','mc_eid','igshid','s_kwcid','si','twclid'
  ];
BEGIN
  -- strip fragment (#...)
  frag := strpos(v, '#');
  IF frag > 0 THEN v := left(v, frag - 1); END IF;

  -- split off scheme
  IF v ~ '^https?://' THEN
    scheme := regexp_replace(v, '^(https?://).*$', '\1');
    rest   := substring(v FROM length(scheme) + 1);
  ELSE
    scheme := 'https://';
    rest   := v;
  END IF;

  -- split path from query string
  qpos := strpos(rest, '?');
  IF qpos > 0 THEN
    path := left(rest, qpos - 1);
    qs   := substring(rest FROM qpos + 1);
  ELSE
    path := rest;
    qs   := NULL;
  END IF;

  -- strip trailing slashes from path
  WHILE length(path) > 0 AND right(path, 1) = '/' LOOP
    path := left(path, length(path) - 1);
  END LOOP;

  -- filter known tracking params from query string
  IF qs IS NOT NULL AND qs <> '' THEN
    params := string_to_array(qs, '&');
    kept   := ARRAY[]::TEXT[];
    FOREACH param IN ARRAY params LOOP
      pname := lower(split_part(param, '=', 1));
      IF NOT (pname = ANY(tracking)) THEN
        kept := array_append(kept, param);
      END IF;
    END LOOP;
    IF cardinality(kept) > 0 THEN
      RETURN scheme || path || '?' || array_to_string(kept, '&');
    END IF;
  END IF;

  RETURN scheme || path;
END;
$$;

COMMENT ON FUNCTION public.normalize_competitor_url IS
  'Deterministic URL cache key: lowercase, strip fragment + tracking params + trailing slash. '
  'IMMUTABLE — safe for functional indexes. Two superficially-different URLs tracking the '
  'same page (e.g., one with utm_source=google, another with fbclid=abc) collapse to one key.';

-- ── Shared URL cache ──────────────────────────────────────────────────────────
-- One row per unique normalized URL across ALL tenants.
-- Holds only PUBLIC competitor prices; no per-tenant data stored here.

CREATE TABLE IF NOT EXISTS public.competitor_url_cache (
  normalized_url        TEXT        PRIMARY KEY,
  raw_url_sample        TEXT        NOT NULL,         -- one real URL for Firecrawl
  last_price            NUMERIC,                      -- NULL until first success
  currency              TEXT,
  last_scraped_at       TIMESTAMPTZ,                  -- NULL = never scraped (always due)
  last_status           TEXT        CHECK (last_status IN ('ok', 'null_price', 'failed')),
  consecutive_unchanged INTEGER     NOT NULL DEFAULT 0,
  needs_stealth         BOOLEAN     NOT NULL DEFAULT false,
  watcher_count         INTEGER     NOT NULL DEFAULT 0,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Not exposed to PostgREST authenticated clients (no RLS policies → default deny
-- for the authenticated role; service_role bypasses RLS by design).
CREATE INDEX IF NOT EXISTS idx_url_cache_due
  ON public.competitor_url_cache (last_scraped_at NULLS FIRST);

COMMENT ON TABLE public.competitor_url_cache IS
  'Shared cache of public competitor URL prices. One row per unique normalized URL. '
  'Isolation: watcher_count is a count only — the specific accounts that track a URL '
  'are never stored here, only in the per-user competitor_product_urls table.';

-- ── Cost instrumentation ──────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.scrape_cost_log (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id              TEXT        NOT NULL,
  run_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  due_urls            INTEGER     NOT NULL DEFAULT 0,
  cache_hit_urls      INTEGER     NOT NULL DEFAULT 0,  -- unique URLs skipped (still fresh)
  scrapes_performed   INTEGER     NOT NULL DEFAULT 0,  -- actual Firecrawl API calls
  scrapes_saved       INTEGER     NOT NULL DEFAULT 0,  -- calls avoided by dedup (sum watcher_count-1)
  ok                  INTEGER     NOT NULL DEFAULT 0,
  null_price          INTEGER     NOT NULL DEFAULT 0,
  failed              INTEGER     NOT NULL DEFAULT 0,
  watchers_notified   INTEGER     NOT NULL DEFAULT 0   -- total competitor_scrapes rows inserted
);

COMMENT ON TABLE public.scrape_cost_log IS
  'Per-run cost accounting. scrapes_performed = Firecrawl calls made. '
  'scrapes_saved = calls avoided by URL-centric deduplication '
  '(sum of watcher_count-1 for each URL scraped in this run).';

-- ── Freshness helpers ─────────────────────────────────────────────────────────
-- required_freshness_seconds: MIN across watcher plans — most-demanding watcher wins.
--   enterprise=3600s (1h) < standard=43200s (12h) < starter=86400s (24h)
--   A URL watched by ANY enterprise account will refresh every hour.
--
-- max_freshness_seconds: MAX across watcher plans — slowest watcher's cadence.
--   Used as the upper bound for smart-backoff so no watcher gets staler data
--   than their plan promises.

CREATE OR REPLACE FUNCTION public.required_freshness_seconds(p_url TEXT)
RETURNS INTEGER
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT COALESCE(MIN(
    CASE l.plan
      WHEN 'enterprise' THEN 3600
      WHEN 'standard'   THEN 43200
      ELSE                   86400
    END
  ), 86400)
  FROM competitor_product_urls cpu
  JOIN licensee_members lm ON lm.user_id  = cpu.user_id
  JOIN licensees        l  ON l.id         = lm.licensee_id
  WHERE normalize_competitor_url(cpu.url) = p_url
    AND cpu.competitor <> 'self';
$$;

CREATE OR REPLACE FUNCTION public.max_freshness_seconds(p_url TEXT)
RETURNS INTEGER
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT COALESCE(MAX(
    CASE l.plan
      WHEN 'enterprise' THEN 3600
      WHEN 'standard'   THEN 43200
      ELSE                   86400
    END
  ), 86400)
  FROM competitor_product_urls cpu
  JOIN licensee_members lm ON lm.user_id  = cpu.user_id
  JOIN licensees        l  ON l.id         = lm.licensee_id
  WHERE normalize_competitor_url(cpu.url) = p_url
    AND cpu.competitor <> 'self';
$$;

COMMENT ON FUNCTION public.required_freshness_seconds IS
  'Returns the most-demanding (shortest) freshness window for a URL. '
  'Any enterprise watcher returns 3600 (1 hour) regardless of slower co-watchers.';

COMMENT ON FUNCTION public.max_freshness_seconds IS
  'Returns the slowest freshness window for a URL. '
  'Used as the smart-backoff ceiling: a stale URL is never served past the '
  'slowest watcher''s plan guarantee even when backoff applies.';

-- ── Watcher lookup ────────────────────────────────────────────────────────────
-- Called by the scrape worker to propagate a cached result to all watching accounts.
-- Returns (user_id, product, competitor) — the keys needed to insert a
-- competitor_scrapes row that the bridge trigger will forward to competitor_prices.

CREATE OR REPLACE FUNCTION public.get_url_watchers(p_url TEXT)
RETURNS TABLE (user_id UUID, product TEXT, competitor TEXT)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT DISTINCT cpu.user_id, cpu.product, cpu.competitor
  FROM competitor_product_urls cpu
  WHERE normalize_competitor_url(cpu.url) = p_url
    AND cpu.competitor <> 'self';
$$;

-- ── Due-URL view ──────────────────────────────────────────────────────────────
-- Annotates each cache entry with is_due, applying the smart-backoff rule:
--   If consecutive_unchanged >= 5, effective cadence = min(required*2, max_freshness).
--   Reset to full cadence the moment the price changes (consecutive_unchanged → 0).

CREATE OR REPLACE VIEW public.v_url_due_status AS
SELECT
  c.normalized_url,
  c.raw_url_sample,
  c.last_price,
  c.currency,
  c.last_scraped_at,
  c.last_status,
  c.consecutive_unchanged,
  c.watcher_count,
  required_freshness_seconds(c.normalized_url) AS required_freshness_sec,
  max_freshness_seconds(c.normalized_url)       AS max_freshness_sec,
  CASE
    WHEN c.last_scraped_at IS NULL THEN true    -- never scraped → always due
    WHEN c.consecutive_unchanged >= 5 THEN
      -- smart backoff: never staler than the slowest watcher's plan promise
      extract(epoch FROM (now() - c.last_scraped_at)) >=
        LEAST(
          required_freshness_seconds(c.normalized_url) * 2,
          max_freshness_seconds(c.normalized_url)
        )
    ELSE
      extract(epoch FROM (now() - c.last_scraped_at)) >=
        required_freshness_seconds(c.normalized_url)
  END AS is_due
FROM public.competitor_url_cache c;

-- ── Auto-maintain cache on competitor_product_urls changes ───────────────────
-- INSERT: new URL → upsert cache entry, increment watcher_count.
-- UPDATE: URL changed → decrement old, upsert new.
-- DELETE: remove watcher → decrement; delete cache entry if watcher_count hits 0.

CREATE OR REPLACE FUNCTION public.maintain_url_cache()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_norm TEXT;
BEGIN
  -- Recalculate watcher_count for the old normalized URL on change or delete
  IF TG_OP IN ('DELETE', 'UPDATE') AND OLD.competitor <> 'self' THEN
    v_norm := normalize_competitor_url(OLD.url);
    UPDATE competitor_url_cache
      SET watcher_count = (
            SELECT COUNT(DISTINCT user_id)
            FROM competitor_product_urls
            WHERE normalize_competitor_url(url) = v_norm
              AND competitor <> 'self'
          ),
          updated_at = now()
      WHERE normalized_url = v_norm;
    -- Remove orphaned cache entries (no watchers remaining)
    DELETE FROM competitor_url_cache
      WHERE normalized_url = v_norm AND watcher_count = 0;
  END IF;

  -- Upsert cache entry for the new normalized URL on insert or update
  IF TG_OP IN ('INSERT', 'UPDATE') AND NEW.competitor <> 'self' THEN
    v_norm := normalize_competitor_url(NEW.url);
    INSERT INTO competitor_url_cache (normalized_url, raw_url_sample, watcher_count)
    VALUES (
      v_norm,
      NEW.url,
      (SELECT COUNT(DISTINCT user_id) FROM competitor_product_urls
       WHERE normalize_competitor_url(url) = v_norm AND competitor <> 'self')
    )
    ON CONFLICT (normalized_url) DO UPDATE
      SET watcher_count  = EXCLUDED.watcher_count,
          raw_url_sample = EXCLUDED.raw_url_sample,
          updated_at     = now();
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER trg_maintain_url_cache
  AFTER INSERT OR UPDATE OR DELETE ON public.competitor_product_urls
  FOR EACH ROW EXECUTE FUNCTION public.maintain_url_cache();

-- ── Seed initial cache from existing competitor_product_urls ─────────────────
-- Idempotent: ON CONFLICT updates watcher_count and raw_url_sample.

INSERT INTO public.competitor_url_cache (normalized_url, raw_url_sample, watcher_count)
SELECT
  normalize_competitor_url(url)  AS normalized_url,
  min(url)                       AS raw_url_sample,
  count(DISTINCT user_id)::int   AS watcher_count
FROM public.competitor_product_urls
WHERE competitor <> 'self'
GROUP BY normalize_competitor_url(url)
ON CONFLICT (normalized_url) DO UPDATE
  SET watcher_count  = EXCLUDED.watcher_count,
      raw_url_sample = EXCLUDED.raw_url_sample,
      updated_at     = now();
