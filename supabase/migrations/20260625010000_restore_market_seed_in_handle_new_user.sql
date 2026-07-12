-- =====================================================================
-- Fix: restore seed_market_for_user() and seed_field_intel_for_user()
-- calls inside handle_new_user(). Migration 20260618000002 rewrote
-- handle_new_user to add ensure_licensee_for_user() but accidentally
-- dropped both seed calls, leaving Market and Field Intel tables empty
-- for every user who signed up after 2026-06-18.
--
-- Also backfills any existing account that has no market_metrics rows.
-- =====================================================================

-- 1. Fix handle_new_user to restore the missing seed calls
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
    (uid, 'price',   'in-store', 'Carrefour Doha Festival City raised iPhone 15 Pro price by QAR 100 in-store.','intel',       now() - interval '2 hours'),
    (uid, 'insight', 'online',   'Your avg price response time improved to 4.2 hrs. Market average is 8.1 hrs.','intel',       now() - interval '5 hours'),
    (uid, 'promo',   'in-store', 'Lulu Hypermarket Lusail running 20% off on home appliances in-store only.',   'opportunity', now() - interval '6 hours');

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

  -- pricing recommendations
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

  -- pricing rules
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

  -- competitor metrics
  INSERT INTO public.competitor_metrics
    (user_id, slug, label, value, value_color, footer_text, footer_color, position)
  VALUES
    (uid, 'products_monitored', 'Products monitored',      '2,847', '#1A1A18', 'across 6 competitors',    '#6B6B6B', 0),
    (uid, 'cheapest_on',        'You are cheapest on',     '38%',   '#22C55E', 'of overlapping products', '#6B6B6B', 1),
    (uid, 'undercut_by',        'Undercut by competitors', '27%',   '#EF4444', 'of your catalog',         '#6B6B6B', 2),
    (uid, 'avg_price_gap',      'Avg price gap',           '-4.3%', '#F59E0B', 'vs market average',       '#6B6B6B', 3);

  -- competitor prices
  INSERT INTO public.competitor_prices
    (user_id, product, category, channel, your_price, talabat, carrefour, lulu, amazon, noon, signal, position)
  VALUES
    (uid, 'Samsung Galaxy S24 Ultra 256GB', 'Electronics', 'online',   3899, '3949'::jsonb, '3799'::jsonb, '3849'::jsonb, '3699'::jsonb, '3749'::jsonb, 'HOLD',  0),
    (uid, 'Sony WH-1000XM5 Headphones',     'Electronics', 'online',   1299, '1349'::jsonb, '1199'::jsonb, '1249'::jsonb, '1149'::jsonb, '1199'::jsonb, 'LOWER', 1),
    (uid, 'Apple MacBook Air M3 256GB',     'Electronics', 'online',   4499, '4599'::jsonb, '4449'::jsonb, '{"price":4399,"outOfStock":true}'::jsonb, '4299'::jsonb, '4349'::jsonb, 'RAISE', 2),
    (uid, 'Nike Air Max 90 Men',            'Fashion',     'online',    549, '579'::jsonb,  'null'::jsonb, 'null'::jsonb, '499'::jsonb,  '519'::jsonb,  'HOLD',  3),
    (uid, 'Dyson V15 Detect Vacuum',        'Home',        'online',   2799, '2849'::jsonb, '2699'::jsonb, '2749'::jsonb, '2599'::jsonb, '2649'::jsonb, 'LOWER', 4),
    (uid, 'Al Rawabi Fresh Milk 2L',        'Grocery',     'online',    8.5, '8.75'::jsonb, '7.95'::jsonb, '8.25'::jsonb, 'null'::jsonb, 'null'::jsonb, 'HOLD',  5),
    (uid, 'Ariel Detergent 3kg',            'Grocery',     'online',     42, '44'::jsonb,   '38.5'::jsonb, '39.9'::jsonb, '41'::jsonb,   '40.5'::jsonb, 'LOWER', 6),
    (uid, 'iPad Air M2 11-inch 128GB',      'Electronics', 'online',   2699, '2749'::jsonb, '2649'::jsonb, '2599'::jsonb, '2549'::jsonb, '2599'::jsonb, 'LOWER', 7),
    (uid, 'Samsung Galaxy S24 Ultra 256GB', 'Electronics', 'in-store', 3999, 'null'::jsonb, '3849'::jsonb, '3899'::jsonb, 'null'::jsonb, 'null'::jsonb, 'WATCH', 8),
    (uid, 'Dyson V15 Detect Vacuum',        'Home',        'in-store', 2899, 'null'::jsonb, '2749'::jsonb, '2799'::jsonb, 'null'::jsonb, 'null'::jsonb, 'LOWER', 9),
    (uid, 'The Ordinary Niacinamide Serum', 'Beauty',      'online',     45, '42'::jsonb,   'null'::jsonb, '39.9'::jsonb, '38'::jsonb,   '41'::jsonb,   'LOWER', 10),
    (uid, 'Nespresso Vertuo Pop Machine',   'Home',        'in-store',  479, 'null'::jsonb, '449'::jsonb,  '459'::jsonb,  'null'::jsonb, 'null'::jsonb, 'LOWER', 11);

  -- competitor price history
  INSERT INTO public.competitor_price_history
    (user_id, product, month_label, position, you, talabat, carrefour, amazon)
  VALUES
    (uid, 'Sony WH-1000XM5', 'Nov', 0, 1349, 1399, 1299, 1249),
    (uid, 'Sony WH-1000XM5', 'Dec', 1, 1299, 1349, 1249, 1199),
    (uid, 'Sony WH-1000XM5', 'Jan', 2, 1299, 1299, 1199, 1149),
    (uid, 'Sony WH-1000XM5', 'Feb', 3, 1299, 1349, 1199, 1149),
    (uid, 'Sony WH-1000XM5', 'Mar', 4, 1299, 1349, 1199, 1149),
    (uid, 'Sony WH-1000XM5', 'Apr', 5, 1299, 1349, 1199, 1149);

  -- behavior patterns
  INSERT INTO public.behavior_patterns
    (user_id, competitor, channel, category, detection_period, confidence, pattern, depth, evidence, recommendation, impact, position)
  VALUES
    (uid, 'Carrefour', 'Both', 'Electronics', '14 months of data', 94,
     'Drops electronics prices every 3rd Thursday of the month by 8 to 12%',
     '8-12%',
     '[{"date":"Nov 16, 2025","description":"Electronics category dropped 9.2% across 47 products"},{"date":"Dec 21, 2025","description":"Electronics dropped 11.1% across 52 products"},{"date":"Jan 18, 2026","description":"Electronics dropped 8.7% across 44 products"},{"date":"Feb 20, 2026","description":"Electronics dropped 10.3% across 49 products"}]'::jsonb,
     'Hold your electronics promotions until the Friday after Carrefour''s Thursday drop. Their traffic spike peaks Thursday evening and fades by Saturday. You capture the residual demand at a better margin. Do not try to compete during their drop window. Instead, position yourself as the option for shoppers who missed the deals or want faster delivery.',
     '+QAR 14K monthly from better promotion timing', 0),
    (uid, 'Talabat', 'Online', 'Grocery', '11 months of data', 89,
     'Runs flash grocery discounts every Sunday between 6pm and 9pm',
     '10-15%',
     '[{"date":"Jan 5, 2026","description":"Grocery flash sale 6:02pm to 8:58pm, avg discount 12.4%"},{"date":"Jan 12, 2026","description":"Grocery flash sale 6:10pm to 9:05pm, avg discount 11.8%"},{"date":"Feb 2, 2026","description":"Grocery flash sale 5:55pm to 9:00pm, avg discount 13.1%"},{"date":"Mar 9, 2026","description":"Grocery flash sale 6:00pm to 8:50pm, avg discount 10.9%"}]'::jsonb,
     'Schedule your grocery push for Monday morning. Talabat''s Sunday buyers have already purchased, but Monday has low competition and your delivery speed advantage peaks during working hours when people order for home delivery. Run a ''Monday Fresh'' campaign specifically targeting items that Talabat discounted the night before.',
     '+QAR 8K monthly from shifted grocery promotion timing', 1),
    (uid, 'Amazon.ae', 'Online', 'Electronics', '9 months of data', 91,
     'Raises prices 5 to 8 days before a major sale, then discounts back to the original price',
     'Perceived 20-30% discount, actual 3-5%',
     '[{"date":"Nov 17, 2025","description":"Avg electronics price raised 18% across 230 products"},{"date":"Nov 25, 2025","description":"Black Friday sale launched with ''up to 25% off'', net price 2.8% below pre-inflation"},{"date":"Mar 5, 2026","description":"Avg electronics price raised 22% across 195 products"},{"date":"Mar 14, 2026","description":"Spring sale launched with ''up to 30% off'', net price 4.1% below pre-inflation"}]'::jsonb,
     'Do not react to Amazon''s pre-sale price hikes. Your team may see their prices jump and think demand is shifting. It is artificial inflation. Hold your prices steady. When their sale launches, your regular prices are already competitive without any margin sacrifice. Communicate this to your category managers so they do not panic-adjust.',
     'Prevents unnecessary margin erosion of 3-5% during Amazon sale periods', 2),
    (uid, 'Lulu', 'In-Store', 'Electronics, Home', '8 months of data', 87,
     'Stocks out on premium electronics and home appliances 2 to 3 days before weekend',
     null,
     '[{"date":"Dec 18, 2025","description":"Dyson, Samsung premium range out of stock at Lusail location by Wednesday"},{"date":"Jan 15, 2026","description":"Apple accessories, Dyson out of stock at Al Gharafa by Thursday morning"},{"date":"Feb 12, 2026","description":"Premium electronics stock gaps at 3 of 4 monitored Lulu locations by Wednesday"},{"date":"Mar 19, 2026","description":"Similar pattern, stock gaps appearing Wednesday afternoon"}]'::jsonb,
     'Push premium electronics and home appliance ads on Thursday evening, specifically targeting areas near Lulu locations (Lusail, Al Gharafa, Al Messila). Their stock gaps are your conversion opportunity. Customers who visited Lulu and found items out of stock will search online. Be the first result they see with guaranteed same-day delivery.',
     '+QAR 11K monthly from capturing Lulu stock gap demand', 3);

  -- field intel
  PERFORM public.seed_field_intel_for_user(uid);

  -- market (category performance, assortment gaps, cross-border radar, trending products, market metrics)
  PERFORM public.seed_market_for_user(uid);

  -- provision licensee → licensee_members → accounts_v2
  PERFORM public.ensure_licensee_for_user(uid);

  RETURN new;
END;
$function$;


-- 2. Backfill: seed market data for any user who has a profile but no market_metrics rows.
--    This covers users who signed up between 2026-06-18 and today.
DO $$
DECLARE
  rec RECORD;
BEGIN
  FOR rec IN
    SELECT p.id AS uid
    FROM public.profiles p
    WHERE NOT EXISTS (
      SELECT 1 FROM public.market_metrics m WHERE m.user_id = p.id
    )
  LOOP
    PERFORM public.seed_market_for_user(rec.uid);
  END LOOP;
END $$;


-- 3. Backfill: seed competitor data for any user who has no competitor_metrics rows.
DO $$
DECLARE
  rec RECORD;
BEGIN
  FOR rec IN
    SELECT p.id AS uid
    FROM public.profiles p
    WHERE NOT EXISTS (
      SELECT 1 FROM public.competitor_metrics m WHERE m.user_id = p.id
    )
  LOOP
    INSERT INTO public.competitor_metrics
      (user_id, slug, label, value, value_color, footer_text, footer_color, position)
    VALUES
      (rec.uid, 'products_monitored', 'Products monitored',      '2,847', '#1A1A18', 'across 6 competitors',    '#6B6B6B', 0),
      (rec.uid, 'cheapest_on',        'You are cheapest on',     '38%',   '#22C55E', 'of overlapping products', '#6B6B6B', 1),
      (rec.uid, 'undercut_by',        'Undercut by competitors', '27%',   '#EF4444', 'of your catalog',         '#6B6B6B', 2),
      (rec.uid, 'avg_price_gap',      'Avg price gap',           '-4.3%', '#F59E0B', 'vs market average',       '#6B6B6B', 3);

    INSERT INTO public.competitor_prices
      (user_id, product, category, channel, your_price, talabat, carrefour, lulu, amazon, noon, signal, position)
    VALUES
      (rec.uid, 'Samsung Galaxy S24 Ultra 256GB', 'Electronics', 'online',   3899, '3949'::jsonb, '3799'::jsonb, '3849'::jsonb, '3699'::jsonb, '3749'::jsonb, 'HOLD',  0),
      (rec.uid, 'Sony WH-1000XM5 Headphones',     'Electronics', 'online',   1299, '1349'::jsonb, '1199'::jsonb, '1249'::jsonb, '1149'::jsonb, '1199'::jsonb, 'LOWER', 1),
      (rec.uid, 'Apple MacBook Air M3 256GB',     'Electronics', 'online',   4499, '4599'::jsonb, '4449'::jsonb, '{"price":4399,"outOfStock":true}'::jsonb, '4299'::jsonb, '4349'::jsonb, 'RAISE', 2),
      (rec.uid, 'Nike Air Max 90 Men',            'Fashion',     'online',    549, '579'::jsonb,  'null'::jsonb, 'null'::jsonb, '499'::jsonb,  '519'::jsonb,  'HOLD',  3),
      (rec.uid, 'Dyson V15 Detect Vacuum',        'Home',        'online',   2799, '2849'::jsonb, '2699'::jsonb, '2749'::jsonb, '2599'::jsonb, '2649'::jsonb, 'LOWER', 4),
      (rec.uid, 'Al Rawabi Fresh Milk 2L',        'Grocery',     'online',    8.5, '8.75'::jsonb, '7.95'::jsonb, '8.25'::jsonb, 'null'::jsonb, 'null'::jsonb, 'HOLD',  5),
      (rec.uid, 'Ariel Detergent 3kg',            'Grocery',     'online',     42, '44'::jsonb,   '38.5'::jsonb, '39.9'::jsonb, '41'::jsonb,   '40.5'::jsonb, 'LOWER', 6),
      (rec.uid, 'iPad Air M2 11-inch 128GB',      'Electronics', 'online',   2699, '2749'::jsonb, '2649'::jsonb, '2599'::jsonb, '2549'::jsonb, '2599'::jsonb, 'LOWER', 7),
      (rec.uid, 'Samsung Galaxy S24 Ultra 256GB', 'Electronics', 'in-store', 3999, 'null'::jsonb, '3849'::jsonb, '3899'::jsonb, 'null'::jsonb, 'null'::jsonb, 'WATCH', 8),
      (rec.uid, 'Dyson V15 Detect Vacuum',        'Home',        'in-store', 2899, 'null'::jsonb, '2749'::jsonb, '2799'::jsonb, 'null'::jsonb, 'null'::jsonb, 'LOWER', 9),
      (rec.uid, 'The Ordinary Niacinamide Serum', 'Beauty',      'online',     45, '42'::jsonb,   'null'::jsonb, '39.9'::jsonb, '38'::jsonb,   '41'::jsonb,   'LOWER', 10),
      (rec.uid, 'Nespresso Vertuo Pop Machine',   'Home',        'in-store',  479, 'null'::jsonb, '449'::jsonb,  '459'::jsonb,  'null'::jsonb, 'null'::jsonb, 'LOWER', 11);

    INSERT INTO public.competitor_price_history
      (user_id, product, month_label, position, you, talabat, carrefour, amazon)
    VALUES
      (rec.uid, 'Sony WH-1000XM5', 'Nov', 0, 1349, 1399, 1299, 1249),
      (rec.uid, 'Sony WH-1000XM5', 'Dec', 1, 1299, 1349, 1249, 1199),
      (rec.uid, 'Sony WH-1000XM5', 'Jan', 2, 1299, 1299, 1199, 1149),
      (rec.uid, 'Sony WH-1000XM5', 'Feb', 3, 1299, 1349, 1199, 1149),
      (rec.uid, 'Sony WH-1000XM5', 'Mar', 4, 1299, 1349, 1199, 1149),
      (rec.uid, 'Sony WH-1000XM5', 'Apr', 5, 1299, 1349, 1199, 1149);

    INSERT INTO public.behavior_patterns
      (user_id, competitor, channel, category, detection_period, confidence, pattern, depth, evidence, recommendation, impact, position)
    VALUES
      (rec.uid, 'Carrefour', 'Both', 'Electronics', '14 months of data', 94,
       'Drops electronics prices every 3rd Thursday of the month by 8 to 12%',
       '8-12%',
       '[{"date":"Nov 16, 2025","description":"Electronics category dropped 9.2% across 47 products"},{"date":"Dec 21, 2025","description":"Electronics dropped 11.1% across 52 products"},{"date":"Jan 18, 2026","description":"Electronics dropped 8.7% across 44 products"},{"date":"Feb 20, 2026","description":"Electronics dropped 10.3% across 49 products"}]'::jsonb,
       'Hold your electronics promotions until the Friday after Carrefour''s Thursday drop. Their traffic spike peaks Thursday evening and fades by Saturday. You capture the residual demand at a better margin. Do not try to compete during their drop window.',
       '+QAR 14K monthly from better promotion timing', 0),
      (rec.uid, 'Talabat', 'Online', 'Grocery', '11 months of data', 89,
       'Runs flash grocery discounts every Sunday between 6pm and 9pm',
       '10-15%',
       '[{"date":"Jan 5, 2026","description":"Grocery flash sale 6:02pm to 8:58pm, avg discount 12.4%"},{"date":"Jan 12, 2026","description":"Grocery flash sale 6:10pm to 9:05pm, avg discount 11.8%"},{"date":"Feb 2, 2026","description":"Grocery flash sale 5:55pm to 9:00pm, avg discount 13.1%"},{"date":"Mar 9, 2026","description":"Grocery flash sale 6:00pm to 8:50pm, avg discount 10.9%"}]'::jsonb,
       'Schedule your grocery push for Monday morning. Talabat''s Sunday buyers have already purchased, but Monday has low competition and your delivery speed advantage peaks during working hours.',
       '+QAR 8K monthly from shifted grocery promotion timing', 1),
      (rec.uid, 'Amazon.ae', 'Online', 'Electronics', '9 months of data', 91,
       'Raises prices 5 to 8 days before a major sale, then discounts back to the original price',
       'Perceived 20-30% discount, actual 3-5%',
       '[{"date":"Nov 17, 2025","description":"Avg electronics price raised 18% across 230 products"},{"date":"Nov 25, 2025","description":"Black Friday sale launched with up to 25% off, net price 2.8% below pre-inflation"},{"date":"Mar 5, 2026","description":"Avg electronics price raised 22% across 195 products"},{"date":"Mar 14, 2026","description":"Spring sale launched with up to 30% off, net price 4.1% below pre-inflation"}]'::jsonb,
       'Do not react to Amazon''s pre-sale price hikes. It is artificial inflation. Hold your prices steady.',
       'Prevents unnecessary margin erosion of 3-5% during Amazon sale periods', 2),
      (rec.uid, 'Lulu', 'In-Store', 'Electronics, Home', '8 months of data', 87,
       'Stocks out on premium electronics and home appliances 2 to 3 days before weekend',
       null,
       '[{"date":"Dec 18, 2025","description":"Dyson, Samsung premium range out of stock at Lusail location by Wednesday"},{"date":"Jan 15, 2026","description":"Apple accessories, Dyson out of stock at Al Gharafa by Thursday morning"},{"date":"Feb 12, 2026","description":"Premium electronics stock gaps at 3 of 4 monitored Lulu locations by Wednesday"},{"date":"Mar 19, 2026","description":"Similar pattern, stock gaps appearing Wednesday afternoon"}]'::jsonb,
       'Push premium electronics and home appliance ads on Thursday evening near Lulu locations. Their stock gaps are your conversion opportunity.',
       '+QAR 11K monthly from capturing Lulu stock gap demand', 3);
  END LOOP;
END $$;


NOTIFY pgrst, 'reload schema';
