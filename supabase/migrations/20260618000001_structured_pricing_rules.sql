-- Sprint 1: Add structured rule_type + params columns to pricing_rules.
--
-- Before this migration every rule was free-text in rule_text, ignored by the
-- engine. After this migration the engine evaluates the structured params field
-- and rule_text is kept as a human-readable label for the UI.
--
-- Rule types and their params shapes are documented in src/server/pricing-rules.ts.

-- 1. Add new columns (default 'legacy' keeps all existing rows valid).
ALTER TABLE public.pricing_rules
  ADD COLUMN IF NOT EXISTS rule_type text NOT NULL DEFAULT 'legacy',
  ADD COLUMN IF NOT EXISTS params    jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.pricing_rules
  ADD CONSTRAINT pricing_rules_type_chk
  CHECK (rule_type IN (
    'legacy',
    'margin_floor_pct',
    'nominal_floor_qar',
    'max_discount_pct',
    'moci_ceiling',
    'competitor_ceiling_pct',
    'price_rounding'
  ));

-- 2. Backfill the 3 seeded rules for every user who signed up before this migration.
--    Matches on exact rule_text string inserted by handle_new_user().

-- Rule 1: "Never price more than 5% above the lowest competitor on Electronics"
UPDATE public.pricing_rules
SET
  rule_type = 'competitor_ceiling_pct',
  params    = '{"type":"competitor_ceiling_pct","pct":0.05,"category":"Electronics"}'::jsonb
WHERE rule_text = 'Never price more than 5% above the lowest competitor on Electronics'
  AND rule_type  = 'legacy';

-- Rule 2: "Match Carrefour on all Grocery items within 24 hours of their price change"
-- Intent: never exceed Carrefour's price on Grocery products (pct=0 = exact match ceiling).
UPDATE public.pricing_rules
SET
  rule_type = 'competitor_ceiling_pct',
  params    = '{"type":"competitor_ceiling_pct","pct":0.0,"competitor":"Carrefour","category":"Grocery"}'::jsonb
WHERE rule_text = 'Match Carrefour on all Grocery items within 24 hours of their price change'
  AND rule_type  = 'legacy';

-- Rule 3: "Do not drop below QAR 15 margin on any Home category product"
-- Intent: recommended_price >= unit_cost + 15. Skipped when margin_inputs absent.
UPDATE public.pricing_rules
SET
  rule_type = 'nominal_floor_qar',
  params    = '{"type":"nominal_floor_qar","min_margin_qar":15,"category":"Home"}'::jsonb
WHERE rule_text = 'Do not drop below QAR 15 margin on any Home category product'
  AND rule_type  = 'legacy';

-- 3. Update handle_new_user() so new accounts get structured rules from the start.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  uid          uuid := new.id;
  email_prefix text := split_part(coalesce(new.email, ''), '@', 1);
  display      text := coalesce(new.raw_user_meta_data ->> 'display_name', email_prefix);
BEGIN
  -- profile
  INSERT INTO public.profiles (id, display_name)
  VALUES (uid, display);

  -- overview metrics
  INSERT INTO public.overview_metrics
    (user_id, slug, label, value, value_color, footer_text, footer_color, position)
  VALUES
    (uid, 'products_tracked', 'Products tracked',           '2,847',    '#1A1A18', '+12% vs last month', '#22C55E', 0),
    (uid, 'price_position',   'Price position',             '3rd / 6',  '#1A1A18', 'Rank improved by 1', '#22C55E', 1),
    (uid, 'active_alerts',    'Active alerts today',        '14',       '#EA580C', '3 require action',   '#6B6B6B', 2),
    (uid, 'est_savings',      'Estimated monthly savings',  'QAR 48K',  '#22C55E', '+3.2% vs last month','#22C55E', 3);

  -- overview alerts
  INSERT INTO public.overview_alerts
    (user_id, alert_type, channel, message, severity, occurred_at)
  VALUES
    (uid, 'price',   'online',   'Carrefour dropped Sony WH-1000XM5 to QAR 1,149 (-4.2%)',                       'action',      now() - interval '2 minutes'),
    (uid, 'stock',   'online',   'Lulu out of stock on Samsung Galaxy S24 Ultra. Estimated restock: 3-4 days.',  'opportunity', now() - interval '18 minutes'),
    (uid, 'pattern', 'online',   'Talabat Eid sale detected. Matches their annual pattern. Confidence: 92%.',    'intel',       now() - interval '1 hour'),
    (uid, 'price',   'in-store', 'Carrefour Doha Festival City raised iPhone 15 Pro price by QAR 100 in-store.', 'intel',       now() - interval '2 hours'),
    (uid, 'insight', 'online',   'Your avg price response time improved to 4.2 hrs. Market average is 8.1 hrs.', 'intel',       now() - interval '5 hours'),
    (uid, 'promo',   'in-store', 'Lulu Hypermarket Lusail running 20% off on home appliances in-store only.',    'opportunity', now() - interval '6 hours');

  -- overview channels
  INSERT INTO public.overview_channels
    (user_id, label, amount, share_text, percent, color, position)
  VALUES
    (uid, 'Online',      'QAR 1.2M', '68% of total', 68, '#3B82F6', 0),
    (uid, 'In-Store',    'QAR 480K', '27% of total', 27, '#7C3AED', 1),
    (uid, 'Marketplace', 'QAR 89K',  '5% of total',   5, '#EA580C', 2);

  -- overview quick actions
  INSERT INTO public.overview_quick_actions
    (user_id, icon, title, description, link_text, position)
  VALUES
    (uid, 'crosshair',   'Price alerts need action',
     '3 competitors have undercut your prices on tracked products.',
     'View competitors', 0),
    (uid, 'trending-up', '5 pricing recommendations',
     'AI has identified 5 products where price adjustments could improve margins.',
     'Review pricing', 1),
    (uid, 'map-pin',     'Field intel pending review',
     '4 new price observations submitted by your field team today.',
     'Review submissions', 2);

  -- pricing metrics
  INSERT INTO public.pricing_metrics
    (user_id, slug, label, value, value_color, footer_text, footer_color, position)
  VALUES
    (uid, 'active_recs',    'Active recommendations', '5',         '#1A1A18', 'across all categories',  '#6B6B6B', 0),
    (uid, 'monthly_impact', 'Total monthly impact',   '+QAR 71K',  '#22C55E', 'if all applied',         '#6B6B6B', 1),
    (uid, 'avg_confidence', 'Avg confidence score',   '89%',       '#EA580C', 'across recommendations', '#6B6B6B', 2),
    (uid, 'model_maturity', 'Model maturity',         '11 months', '#3B82F6', 'trained on your data',   '#6B6B6B', 3);

  -- pricing recommendations (seed data)
  INSERT INTO public.pricing_recommendations
    (user_id, product, category, channel, current_price, recommended_price, reason,
     unit_impact, margin_impact, net_monthly, confidence, position)
  VALUES
    (uid, 'Sony WH-1000XM5 Headphones', 'Electronics', 'Online', 1299, 1199,
     'You are 8% above market average. Carrefour and Amazon are both at 1,199. Price sensitivity is high in this bracket based on 11 months of your sales data. Lowering to match captures an estimated 340 additional units per month without triggering a price war, since you are matching rather than undercutting.',
     '+12%', '-2.1%', '+QAR 18K', 87, 0),
    (uid, 'Apple MacBook Air M3 256GB', 'Electronics', 'Online', 4499, 4599,
     'Carrefour is currently out of stock on this product. Talabat is at 4,599. Amazon has it at 4,299 but with 5 to 7 day delivery compared to your same-day option. Your customer base skews 14% toward premium buyers who pay for speed. Our elasticity model confirms low sensitivity at this price point.',
     '-3%', '+2.8%', '+QAR 31K', 91, 1),
    (uid, 'Ariel Detergent 3kg', 'Grocery', 'Online', 42, 39.9,
     'Grocery buyers on your platform are extremely price-sensitive. Carrefour is at 38.5 and Lulu at 39.9. You are currently the most expensive option for a commodity product. At 39.9 you match Lulu and stay above Carrefour. Combined with your delivery convenience, this is the optimal price point.',
     '+18%', '-5%', '+QAR 8K', 94, 2),
    (uid, 'Dyson V15 Detect Vacuum', 'Home', 'Online', 2799, 2699,
     'All five competitors are priced below you on this product. Lulu is temporarily out of stock but based on their historical restock cycle, they will be back within 4 days. There is a short window to capture customers looking for immediate availability. Recommend moving now and reviewing after Lulu restocks.',
     '+8%', '-1.2%', '+QAR 14K', 82, 3),
    (uid, 'Samsung Galaxy S24 Ultra (In-Store)', 'Electronics', 'In-Store', 3999, 3899,
     'Your in-store price is QAR 100 higher than your own online price for the same product. Customers comparing on their phones in your store are seeing this gap. Carrefour in-store at Doha Festival City is at 3,849. Harmonizing with your online price removes the inconsistency and keeps you within 1.3% of Carrefour.',
     '+5%', '-0.8%', '+QAR 6K', 88, 4);

  -- pricing rules (structured JSON)
  INSERT INTO public.pricing_rules
    (user_id, rule_text, rule_type, params, enabled, position)
  VALUES
    (uid,
     'Never price more than 5% above the lowest competitor on Electronics',
     'competitor_ceiling_pct',
     '{"type":"competitor_ceiling_pct","pct":0.05,"category":"Electronics"}'::jsonb,
     true, 0),
    (uid,
     'Match Carrefour on all Grocery items within 24 hours of their price change',
     'competitor_ceiling_pct',
     '{"type":"competitor_ceiling_pct","pct":0.0,"competitor":"Carrefour","category":"Grocery"}'::jsonb,
     true, 1),
    (uid,
     'Do not drop below QAR 15 margin on any Home category product',
     'nominal_floor_qar',
     '{"type":"nominal_floor_qar","min_margin_qar":15,"category":"Home"}'::jsonb,
     true, 2);

  RETURN new;
END;
$function$;
