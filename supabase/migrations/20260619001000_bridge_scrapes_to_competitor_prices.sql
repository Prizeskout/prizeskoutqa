-- Add UNIQUE constraint so the trigger can upsert cleanly
ALTER TABLE public.competitor_prices
  ADD CONSTRAINT competitor_prices_user_product_channel_key
  UNIQUE (user_id, product, channel);

-- Syncs a new competitor_scrapes INSERT → competitor_prices JSONB columns
CREATE OR REPLACE FUNCTION public.sync_scrape_to_competitor_prices()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_col       text;
  v_jsonb     jsonb;
  v_category  text;
  v_price     numeric;
  v_row_id    uuid;
  v_min_comp  numeric;
  v_signal    text;
BEGIN
  IF NEW.status != 'success' OR NEW.price IS NULL OR NEW.competitor IS NULL THEN
    RETURN NEW;
  END IF;

  v_col := lower(NEW.competitor);
  IF v_col NOT IN ('talabat','carrefour','lulu','amazon','noon') THEN
    RETURN NEW;  -- skip 'self' and unknown competitors
  END IF;

  -- Category comes from the self-URL row in competitor_product_urls
  SELECT cpu.category INTO v_category
  FROM public.competitor_product_urls cpu
  WHERE cpu.user_id = NEW.user_id
    AND lower(cpu.product) = lower(NEW.product)
    AND cpu.competitor = 'self'
  LIMIT 1;

  -- Your price from catalog
  SELECT COALESCE(cp.sale_price, cp.list_price) INTO v_price
  FROM public.catalog_prices cp
  JOIN public.catalog_products cprod ON cprod.id = cp.product_id
  JOIN public.accounts_v2 acct       ON acct.id  = cp.account_id
  JOIN public.licensee_members mem   ON mem.licensee_id = acct.licensee_id
  WHERE mem.user_id = NEW.user_id
    AND lower(cprod.name) = lower(NEW.product)
  LIMIT 1;

  v_jsonb := jsonb_build_object('price', NEW.price, 'observed_at', NEW.scraped_at);

  -- Upsert the base row (competitor JSONB columns default to null)
  INSERT INTO public.competitor_prices
    (user_id, product, category, channel, your_price, signal, position)
  VALUES
    (NEW.user_id, NEW.product, COALESCE(v_category,''), 'online',
     COALESCE(v_price, 0), 'WATCH', 0)
  ON CONFLICT (user_id, product, channel) DO UPDATE
    SET your_price = COALESCE(EXCLUDED.your_price, competitor_prices.your_price),
        category   = COALESCE(NULLIF(EXCLUDED.category,''), competitor_prices.category),
        updated_at = now()
  RETURNING id INTO v_row_id;

  IF v_row_id IS NULL THEN
    SELECT id INTO v_row_id
    FROM public.competitor_prices
    WHERE user_id = NEW.user_id
      AND lower(product) = lower(NEW.product)
      AND channel = 'online'
    LIMIT 1;
  END IF;

  -- Stamp the specific competitor column
  EXECUTE format(
    'UPDATE public.competitor_prices SET %I = $1, updated_at = now() WHERE id = $2',
    v_col
  ) USING v_jsonb, v_row_id;

  -- Recompute signal from minimum across all competitors
  SELECT LEAST(
    CASE WHEN r.talabat   IS NOT NULL THEN (r.talabat  ->>'price')::numeric END,
    CASE WHEN r.carrefour IS NOT NULL THEN (r.carrefour->>'price')::numeric END,
    CASE WHEN r.lulu      IS NOT NULL THEN (r.lulu     ->>'price')::numeric END,
    CASE WHEN r.amazon    IS NOT NULL THEN (r.amazon   ->>'price')::numeric END,
    CASE WHEN r.noon      IS NOT NULL THEN (r.noon     ->>'price')::numeric END
  ) INTO v_min_comp
  FROM public.competitor_prices r WHERE r.id = v_row_id;

  IF v_min_comp IS NOT NULL AND v_price IS NOT NULL AND v_price > 0 THEN
    v_signal := CASE
      WHEN v_price > v_min_comp * 1.02 THEN 'LOWER'
      WHEN v_price < v_min_comp * 0.98 THEN 'RAISE'
      ELSE 'WATCH'
    END;
    UPDATE public.competitor_prices SET signal = v_signal WHERE id = v_row_id;
  END IF;

  RETURN NEW;
END $$;

CREATE TRIGGER trg_sync_scrape_to_competitor_prices
  AFTER INSERT ON public.competitor_scrapes
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_scrape_to_competitor_prices();
