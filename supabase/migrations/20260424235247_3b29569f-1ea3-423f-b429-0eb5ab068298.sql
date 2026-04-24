-- Shared timestamp helper (idempotent — safe if it already exists).
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ----------------------------------------------------------------------------
-- catalog_products
-- ----------------------------------------------------------------------------
CREATE TABLE public.catalog_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts_v2(id) ON DELETE CASCADE,
  licensee_id uuid NOT NULL REFERENCES public.licensees(id) ON DELETE CASCADE,
  sku text NOT NULL,
  name text NOT NULL,
  brand text,
  category text,
  attributes jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (account_id, sku)
);
CREATE INDEX idx_catalog_products_account ON public.catalog_products(account_id);
CREATE INDEX idx_catalog_products_licensee ON public.catalog_products(licensee_id);
ALTER TABLE public.catalog_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members view catalog_products" ON public.catalog_products FOR SELECT TO authenticated USING (is_licensee_member(licensee_id, 'viewer'::licensee_role));
CREATE POLICY "Developers insert catalog_products" ON public.catalog_products FOR INSERT TO authenticated WITH CHECK (is_licensee_member(licensee_id, 'developer'::licensee_role));
CREATE POLICY "Developers update catalog_products" ON public.catalog_products FOR UPDATE TO authenticated USING (is_licensee_member(licensee_id, 'developer'::licensee_role));
CREATE POLICY "Admins delete catalog_products" ON public.catalog_products FOR DELETE TO authenticated USING (is_licensee_member(licensee_id, 'admin'::licensee_role));
CREATE POLICY "Platform admins manage catalog_products" ON public.catalog_products FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- ----------------------------------------------------------------------------
-- catalog_prices
-- ----------------------------------------------------------------------------
CREATE TABLE public.catalog_prices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts_v2(id) ON DELETE CASCADE,
  licensee_id uuid NOT NULL REFERENCES public.licensees(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.catalog_products(id) ON DELETE CASCADE,
  channel text NOT NULL,
  list_price numeric(12,2) NOT NULL,
  sale_price numeric(12,2),
  currency text NOT NULL DEFAULT 'QAR',
  effective_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (product_id, channel)
);
CREATE INDEX idx_catalog_prices_account ON public.catalog_prices(account_id);
CREATE INDEX idx_catalog_prices_product ON public.catalog_prices(product_id);
ALTER TABLE public.catalog_prices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members view catalog_prices" ON public.catalog_prices FOR SELECT TO authenticated USING (is_licensee_member(licensee_id, 'viewer'::licensee_role));
CREATE POLICY "Developers insert catalog_prices" ON public.catalog_prices FOR INSERT TO authenticated WITH CHECK (is_licensee_member(licensee_id, 'developer'::licensee_role));
CREATE POLICY "Developers update catalog_prices" ON public.catalog_prices FOR UPDATE TO authenticated USING (is_licensee_member(licensee_id, 'developer'::licensee_role));
CREATE POLICY "Admins delete catalog_prices" ON public.catalog_prices FOR DELETE TO authenticated USING (is_licensee_member(licensee_id, 'admin'::licensee_role));
CREATE POLICY "Platform admins manage catalog_prices" ON public.catalog_prices FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- ----------------------------------------------------------------------------
-- margin_inputs
-- ----------------------------------------------------------------------------
CREATE TABLE public.margin_inputs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts_v2(id) ON DELETE CASCADE,
  licensee_id uuid NOT NULL REFERENCES public.licensees(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.catalog_products(id) ON DELETE CASCADE,
  unit_cost numeric(12,2) NOT NULL,
  freight numeric(12,2) NOT NULL DEFAULT 0,
  duty_pct numeric(6,4) NOT NULL DEFAULT 0,
  fees_pct numeric(6,4) NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'QAR',
  effective_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (product_id)
);
CREATE INDEX idx_margin_inputs_account ON public.margin_inputs(account_id);
ALTER TABLE public.margin_inputs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members view margin_inputs" ON public.margin_inputs FOR SELECT TO authenticated USING (is_licensee_member(licensee_id, 'viewer'::licensee_role));
CREATE POLICY "Developers insert margin_inputs" ON public.margin_inputs FOR INSERT TO authenticated WITH CHECK (is_licensee_member(licensee_id, 'developer'::licensee_role));
CREATE POLICY "Developers update margin_inputs" ON public.margin_inputs FOR UPDATE TO authenticated USING (is_licensee_member(licensee_id, 'developer'::licensee_role));
CREATE POLICY "Admins delete margin_inputs" ON public.margin_inputs FOR DELETE TO authenticated USING (is_licensee_member(licensee_id, 'admin'::licensee_role));
CREATE POLICY "Platform admins manage margin_inputs" ON public.margin_inputs FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- ----------------------------------------------------------------------------
-- dynprice_decisions (append-only)
-- ----------------------------------------------------------------------------
CREATE TABLE public.dynprice_decisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts_v2(id) ON DELETE CASCADE,
  licensee_id uuid NOT NULL REFERENCES public.licensees(id) ON DELETE CASCADE,
  product_id uuid REFERENCES public.catalog_products(id) ON DELETE SET NULL,
  api_key_id uuid REFERENCES public.api_keys(id) ON DELETE SET NULL,
  channel text NOT NULL,
  input_current_price numeric(12,2),
  input_competitor_min numeric(12,2),
  input_margin_floor numeric(12,2),
  output_price numeric(12,2) NOT NULL,
  reason text NOT NULL,
  signals jsonb NOT NULL DEFAULT '{}'::jsonb,
  decided_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_dynprice_decisions_account ON public.dynprice_decisions(account_id);
CREATE INDEX idx_dynprice_decisions_product ON public.dynprice_decisions(product_id);
CREATE INDEX idx_dynprice_decisions_decided_at ON public.dynprice_decisions(decided_at DESC);
ALTER TABLE public.dynprice_decisions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members view dynprice_decisions" ON public.dynprice_decisions FOR SELECT TO authenticated USING (is_licensee_member(licensee_id, 'viewer'::licensee_role));
CREATE POLICY "Developers insert dynprice_decisions" ON public.dynprice_decisions FOR INSERT TO authenticated WITH CHECK (is_licensee_member(licensee_id, 'developer'::licensee_role));
CREATE POLICY "Admins delete dynprice_decisions" ON public.dynprice_decisions FOR DELETE TO authenticated USING (is_licensee_member(licensee_id, 'admin'::licensee_role));
CREATE POLICY "Platform admins manage dynprice_decisions" ON public.dynprice_decisions FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- ----------------------------------------------------------------------------
-- ingestion_batches (idempotency cache)
-- ----------------------------------------------------------------------------
CREATE TABLE public.ingestion_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts_v2(id) ON DELETE CASCADE,
  licensee_id uuid NOT NULL REFERENCES public.licensees(id) ON DELETE CASCADE,
  api_key_id uuid REFERENCES public.api_keys(id) ON DELETE SET NULL,
  idempotency_key text NOT NULL,
  endpoint text NOT NULL,
  request_body jsonb NOT NULL DEFAULT '{}'::jsonb,
  response_body jsonb NOT NULL DEFAULT '{}'::jsonb,
  response_status integer NOT NULL,
  item_count integer NOT NULL DEFAULT 0,
  ok_count integer NOT NULL DEFAULT 0,
  error_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (account_id, endpoint, idempotency_key)
);
CREATE INDEX idx_ingestion_batches_account ON public.ingestion_batches(account_id);
CREATE INDEX idx_ingestion_batches_created_at ON public.ingestion_batches(created_at DESC);
ALTER TABLE public.ingestion_batches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members view ingestion_batches" ON public.ingestion_batches FOR SELECT TO authenticated USING (is_licensee_member(licensee_id, 'viewer'::licensee_role));
CREATE POLICY "Developers insert ingestion_batches" ON public.ingestion_batches FOR INSERT TO authenticated WITH CHECK (is_licensee_member(licensee_id, 'developer'::licensee_role));
CREATE POLICY "Admins delete ingestion_batches" ON public.ingestion_batches FOR DELETE TO authenticated USING (is_licensee_member(licensee_id, 'admin'::licensee_role));
CREATE POLICY "Platform admins manage ingestion_batches" ON public.ingestion_batches FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- ----------------------------------------------------------------------------
-- Helpers
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.current_account_for_user(_user_id uuid)
RETURNS TABLE (account_id uuid, licensee_id uuid)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT a.id AS account_id, a.licensee_id
  FROM public.accounts_v2 a
  JOIN public.licensee_members m ON m.licensee_id = a.licensee_id
  WHERE m.user_id = _user_id
  ORDER BY a.is_default DESC, a.created_at ASC
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.find_account_for_api_key(_api_key_id uuid)
RETURNS TABLE (account_id uuid, licensee_id uuid, user_id uuid)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    (SELECT a.id FROM public.accounts_v2 a WHERE a.licensee_id = k.licensee_id
       ORDER BY a.is_default DESC, a.created_at ASC LIMIT 1) AS account_id,
    k.licensee_id,
    k.user_id
  FROM public.api_keys k
  WHERE k.id = _api_key_id;
$$;

-- Triggers
CREATE TRIGGER set_catalog_products_updated_at BEFORE UPDATE ON public.catalog_products FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER set_catalog_prices_updated_at BEFORE UPDATE ON public.catalog_prices FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER set_margin_inputs_updated_at BEFORE UPDATE ON public.margin_inputs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();