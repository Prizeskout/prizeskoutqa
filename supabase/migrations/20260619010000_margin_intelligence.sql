-- Add supplier to margin_inputs
ALTER TABLE public.margin_inputs ADD COLUMN IF NOT EXISTS supplier text;

-- Per-channel selling cost structure
CREATE TABLE public.channel_cost_structures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts_v2(id) ON DELETE CASCADE,
  licensee_id uuid NOT NULL REFERENCES public.licensees(id) ON DELETE CASCADE,
  channel text NOT NULL,
  commission_pct numeric(6,4) NOT NULL DEFAULT 0,
  delivery_cost numeric(12,2) NOT NULL DEFAULT 0,
  payment_pct numeric(6,4) NOT NULL DEFAULT 0,
  returns_provision numeric(12,2) NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'QAR',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (account_id, channel)
);
CREATE INDEX idx_channel_cost_structures_account ON public.channel_cost_structures(account_id);
ALTER TABLE public.channel_cost_structures ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members view channel_cost_structures" ON public.channel_cost_structures
  FOR SELECT TO authenticated USING (is_licensee_member(licensee_id, 'viewer'::licensee_role));
CREATE POLICY "Developers insert channel_cost_structures" ON public.channel_cost_structures
  FOR INSERT TO authenticated WITH CHECK (is_licensee_member(licensee_id, 'developer'::licensee_role));
CREATE POLICY "Developers update channel_cost_structures" ON public.channel_cost_structures
  FOR UPDATE TO authenticated USING (is_licensee_member(licensee_id, 'developer'::licensee_role));
CREATE POLICY "Admins delete channel_cost_structures" ON public.channel_cost_structures
  FOR DELETE TO authenticated USING (is_licensee_member(licensee_id, 'admin'::licensee_role));
CREATE POLICY "Platform admins manage channel_cost_structures" ON public.channel_cost_structures
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE TRIGGER set_channel_cost_structures_updated_at
  BEFORE UPDATE ON public.channel_cost_structures
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
