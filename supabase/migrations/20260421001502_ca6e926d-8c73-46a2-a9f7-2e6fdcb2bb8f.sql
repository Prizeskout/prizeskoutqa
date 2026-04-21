-- Persist competitor product URLs per (user, product, competitor)
CREATE TABLE public.competitor_product_urls (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  product TEXT NOT NULL,
  competitor TEXT NOT NULL DEFAULT '',
  url TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT competitor_product_urls_unique UNIQUE (user_id, product, competitor)
);

ALTER TABLE public.competitor_product_urls ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users read own product urls"
  ON public.competitor_product_urls FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "users insert own product urls"
  ON public.competitor_product_urls FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users update own product urls"
  ON public.competitor_product_urls FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "users delete own product urls"
  ON public.competitor_product_urls FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE TRIGGER competitor_product_urls_set_updated_at
  BEFORE UPDATE ON public.competitor_product_urls
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_competitor_product_urls_user
  ON public.competitor_product_urls(user_id, product);
