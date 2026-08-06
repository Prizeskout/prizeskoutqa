-- Channel-aware Competitor Radar. Existing rows remain valid as "online".
ALTER TABLE public.competitor_product_urls
  ADD COLUMN IF NOT EXISTS channel text NOT NULL DEFAULT 'online',
  ADD COLUMN IF NOT EXISTS merchant_sku text,
  ADD COLUMN IF NOT EXISTS competitor_sku text,
  ADD COLUMN IF NOT EXISTS gtin text,
  ADD COLUMN IF NOT EXISTS match_status text NOT NULL DEFAULT 'manual_confirmed',
  ADD COLUMN IF NOT EXISTS match_confidence numeric(5,4) NOT NULL DEFAULT 1.0;

ALTER TABLE public.competitor_product_urls
  DROP CONSTRAINT IF EXISTS competitor_product_urls_unique;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='competitor_product_urls_channel_unique') THEN
    ALTER TABLE public.competitor_product_urls ADD CONSTRAINT competitor_product_urls_channel_unique
      UNIQUE (user_id, product, channel, competitor);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='competitor_product_urls_match_status_chk') THEN
    ALTER TABLE public.competitor_product_urls ADD CONSTRAINT competitor_product_urls_match_status_chk
      CHECK (match_status IN ('manual_confirmed', 'auto_matched', 'needs_review', 'rejected'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='competitor_product_urls_match_confidence_chk') THEN
    ALTER TABLE public.competitor_product_urls ADD CONSTRAINT competitor_product_urls_match_confidence_chk
      CHECK (match_confidence >= 0 AND match_confidence <= 1);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_competitor_product_urls_channel
  ON public.competitor_product_urls(user_id, channel, product);

ALTER TABLE public.competitor_scrapes
  ADD COLUMN IF NOT EXISTS channel text NOT NULL DEFAULT 'online',
  ADD COLUMN IF NOT EXISTS original_price numeric,
  ADD COLUMN IF NOT EXISTS availability text NOT NULL DEFAULT 'unknown',
  ADD COLUMN IF NOT EXISTS product_title text,
  ADD COLUMN IF NOT EXISTS sku text,
  ADD COLUMN IF NOT EXISTS gtin text,
  ADD COLUMN IF NOT EXISTS seller text,
  ADD COLUMN IF NOT EXISTS match_confidence numeric(5,4),
  ADD COLUMN IF NOT EXISTS collector text NOT NULL DEFAULT 'firecrawl',
  ADD COLUMN IF NOT EXISTS evidence jsonb NOT NULL DEFAULT '{}'::jsonb;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='competitor_scrapes_availability_chk') THEN
    ALTER TABLE public.competitor_scrapes ADD CONSTRAINT competitor_scrapes_availability_chk
      CHECK (availability IN ('in_stock', 'out_of_stock', 'unknown'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='competitor_scrapes_match_confidence_chk') THEN
    ALTER TABLE public.competitor_scrapes ADD CONSTRAINT competitor_scrapes_match_confidence_chk
      CHECK (match_confidence IS NULL OR (match_confidence >= 0 AND match_confidence <= 1));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_competitor_scrapes_channel_product
  ON public.competitor_scrapes(user_id, channel, product, scraped_at DESC);

-- Remove the legacy two-value channel restriction. Channel identifiers are
-- merchant/platform-defined (zid, talabat, noon, etc.).
ALTER TABLE public.pricing_recommendations
  DROP CONSTRAINT IF EXISTS pricing_recommendations_channel_check;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='pricing_recommendations_channel_nonempty_chk') THEN
    ALTER TABLE public.pricing_recommendations
      ADD CONSTRAINT pricing_recommendations_channel_nonempty_chk
      CHECK (length(btrim(channel)) > 0);
  END IF;
END $$;

DROP FUNCTION IF EXISTS public.get_url_watchers(text);
CREATE FUNCTION public.get_url_watchers(p_url text)
RETURNS TABLE (
  user_id uuid, product text, competitor text, channel text,
  match_confidence numeric, match_status text
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT DISTINCT cpu.user_id,cpu.product,cpu.competitor,cpu.channel,
    cpu.match_confidence,cpu.match_status
  FROM competitor_product_urls cpu
  WHERE normalize_competitor_url(cpu.url)=p_url
    AND lower(cpu.competitor)<>'self' AND cpu.match_status<>'rejected';
$$;

-- Carry the tracked channel into legacy competitor_prices projections instead
-- of collapsing every observation into one generic online row.
CREATE OR REPLACE FUNCTION public.sync_scrape_to_competitor_prices()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_col text; v_jsonb jsonb; v_category text; v_price numeric;
  v_row_id uuid; v_min_comp numeric; v_signal text; v_channel text;
BEGIN
  IF NEW.status != 'success' OR NEW.price IS NULL OR NEW.competitor IS NULL THEN RETURN NEW; END IF;
  v_col := lower(NEW.competitor);
  IF v_col NOT IN ('talabat','carrefour','lulu','amazon','noon') THEN RETURN NEW; END IF;
  v_channel := COALESCE(NULLIF(NEW.channel, ''), 'online');

  SELECT cpu.category INTO v_category FROM public.competitor_product_urls cpu
   WHERE cpu.user_id=NEW.user_id AND lower(cpu.product)=lower(NEW.product)
     AND lower(cpu.competitor)='self' AND lower(cpu.channel)=lower(v_channel) LIMIT 1;
  SELECT COALESCE(cp.sale_price, cp.list_price) INTO v_price
    FROM public.catalog_prices cp JOIN public.catalog_products p ON p.id=cp.product_id
    JOIN public.accounts_v2 a ON a.id=cp.account_id
    JOIN public.licensee_members m ON m.licensee_id=a.licensee_id
   WHERE m.user_id=NEW.user_id AND lower(p.name)=lower(NEW.product)
     AND lower(cp.channel)=lower(v_channel) LIMIT 1;

  v_jsonb := jsonb_build_object('price',NEW.price,'original_price',NEW.original_price,
    'availability',NEW.availability,'observed_at',NEW.scraped_at,'evidence',NEW.evidence);
  INSERT INTO public.competitor_prices(user_id,product,category,channel,your_price,signal,position)
  VALUES(NEW.user_id,NEW.product,COALESCE(v_category,''),v_channel,COALESCE(v_price,0),'WATCH',0)
  ON CONFLICT(user_id,product,channel) DO UPDATE SET
    your_price=COALESCE(EXCLUDED.your_price,competitor_prices.your_price),
    category=COALESCE(NULLIF(EXCLUDED.category,''),competitor_prices.category),updated_at=now()
  RETURNING id INTO v_row_id;
  EXECUTE format('UPDATE public.competitor_prices SET %I=$1, updated_at=now() WHERE id=$2',v_col)
    USING v_jsonb,v_row_id;
  SELECT LEAST(
    CASE WHEN r.talabat IS NOT NULL THEN (r.talabat->>'price')::numeric END,
    CASE WHEN r.carrefour IS NOT NULL THEN (r.carrefour->>'price')::numeric END,
    CASE WHEN r.lulu IS NOT NULL THEN (r.lulu->>'price')::numeric END,
    CASE WHEN r.amazon IS NOT NULL THEN (r.amazon->>'price')::numeric END,
    CASE WHEN r.noon IS NOT NULL THEN (r.noon->>'price')::numeric END
  ) INTO v_min_comp FROM public.competitor_prices r WHERE r.id=v_row_id;
  IF v_min_comp IS NOT NULL AND v_price>0 THEN
    v_signal:=CASE WHEN v_price>v_min_comp*1.02 THEN 'LOWER' WHEN v_price<v_min_comp*0.98 THEN 'RAISE' ELSE 'WATCH' END;
    UPDATE public.competitor_prices SET signal=v_signal WHERE id=v_row_id;
  END IF;
  RETURN NEW;
END $$;
