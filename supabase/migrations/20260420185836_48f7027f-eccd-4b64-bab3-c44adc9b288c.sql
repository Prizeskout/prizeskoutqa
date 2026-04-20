
-- Benchmarks metrics (top 4 cards)
create table public.benchmarks_metrics (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  slug text not null,
  label text not null,
  value text not null,
  value_color text,
  footer_text text,
  footer_color text,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.benchmarks_metrics enable row level security;
create policy "Users can view own benchmarks metrics" on public.benchmarks_metrics for select to authenticated using (auth.uid() = user_id);
create policy "Users can insert own benchmarks metrics" on public.benchmarks_metrics for insert to authenticated with check (auth.uid() = user_id);
create policy "Users can update own benchmarks metrics" on public.benchmarks_metrics for update to authenticated using (auth.uid() = user_id);
create policy "Users can delete own benchmarks metrics" on public.benchmarks_metrics for delete to authenticated using (auth.uid() = user_id);
create trigger trg_benchmarks_metrics_updated before update on public.benchmarks_metrics for each row execute function public.set_updated_at();

-- Market benchmarks (per-metric percentile rows)
create table public.market_benchmarks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  metric text not null,
  you integer not null,
  you_display text not null,
  market_avg integer not null,
  market_avg_display text not null,
  top integer not null,
  top_display text not null,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.market_benchmarks enable row level security;
create policy "Users can view own market benchmarks" on public.market_benchmarks for select to authenticated using (auth.uid() = user_id);
create policy "Users can insert own market benchmarks" on public.market_benchmarks for insert to authenticated with check (auth.uid() = user_id);
create policy "Users can update own market benchmarks" on public.market_benchmarks for update to authenticated using (auth.uid() = user_id);
create policy "Users can delete own market benchmarks" on public.market_benchmarks for delete to authenticated using (auth.uid() = user_id);
create trigger trg_market_benchmarks_updated before update on public.market_benchmarks for each row execute function public.set_updated_at();

-- Model knowledge (list of unique-intelligence bullet items)
create table public.model_knowledge (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  body text not null,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.model_knowledge enable row level security;
create policy "Users can view own model knowledge" on public.model_knowledge for select to authenticated using (auth.uid() = user_id);
create policy "Users can insert own model knowledge" on public.model_knowledge for insert to authenticated with check (auth.uid() = user_id);
create policy "Users can update own model knowledge" on public.model_knowledge for update to authenticated using (auth.uid() = user_id);
create policy "Users can delete own model knowledge" on public.model_knowledge for delete to authenticated using (auth.uid() = user_id);
create trigger trg_model_knowledge_updated before update on public.model_knowledge for each row execute function public.set_updated_at();

-- Model maturity (chart points + stat cards via kind)
-- kind = 'point' uses month_label + accuracy
-- kind = 'stat'  uses stat_label + stat_value + stat_color + stat_sub
create table public.model_maturity (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  kind text not null check (kind in ('point','stat')),
  month_label text,
  accuracy integer,
  stat_label text,
  stat_value text,
  stat_color text,
  stat_sub text,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.model_maturity enable row level security;
create policy "Users can view own model maturity" on public.model_maturity for select to authenticated using (auth.uid() = user_id);
create policy "Users can insert own model maturity" on public.model_maturity for insert to authenticated with check (auth.uid() = user_id);
create policy "Users can update own model maturity" on public.model_maturity for update to authenticated using (auth.uid() = user_id);
create policy "Users can delete own model maturity" on public.model_maturity for delete to authenticated using (auth.uid() = user_id);
create trigger trg_model_maturity_updated before update on public.model_maturity for each row execute function public.set_updated_at();

-- Switching cost (single-row narrative block per user)
create table public.switching_cost (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique,
  title text not null,
  body text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.switching_cost enable row level security;
create policy "Users can view own switching cost" on public.switching_cost for select to authenticated using (auth.uid() = user_id);
create policy "Users can insert own switching cost" on public.switching_cost for insert to authenticated with check (auth.uid() = user_id);
create policy "Users can update own switching cost" on public.switching_cost for update to authenticated using (auth.uid() = user_id);
create policy "Users can delete own switching cost" on public.switching_cost for delete to authenticated using (auth.uid() = user_id);
create trigger trg_switching_cost_updated before update on public.switching_cost for each row execute function public.set_updated_at();

-- Network value (single-row narrative block per user)
create table public.network_value (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique,
  title text not null,
  body text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.network_value enable row level security;
create policy "Users can view own network value" on public.network_value for select to authenticated using (auth.uid() = user_id);
create policy "Users can insert own network value" on public.network_value for insert to authenticated with check (auth.uid() = user_id);
create policy "Users can update own network value" on public.network_value for update to authenticated using (auth.uid() = user_id);
create policy "Users can delete own network value" on public.network_value for delete to authenticated using (auth.uid() = user_id);
create trigger trg_network_value_updated before update on public.network_value for each row execute function public.set_updated_at();

-- Seeder for benchmarks
create or replace function public.seed_benchmarks_for_user(uid uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- benchmarks_metrics
  insert into public.benchmarks_metrics (user_id, slug, label, value, value_color, footer_text, footer_color, position) values
    (uid, 'overall_rank',         'Overall market rank',     '3rd',    '#1A1A18', 'out of 6 tracked competitors', '#6B6B6B', 0),
    (uid, 'pricing_competitiveness','Pricing competitiveness','72nd',  '#EA580C', 'percentile',                   '#6B6B6B', 1),
    (uid, 'response_speed',       'Response speed',          '4.2 hrs','#22C55E', 'market avg is 8.1 hrs',        '#6B6B6B', 2),
    (uid, 'model_accuracy',       'Model accuracy',          '91%',    '#3B82F6', 'after 11 months of training',  '#6B6B6B', 3);

  -- market_benchmarks
  insert into public.market_benchmarks (user_id, metric, you, you_display, market_avg, market_avg_display, top, top_display, position) values
    (uid, 'Pricing competitiveness (Electronics)', 72, '72nd percentile', 58, '58th',   89, '89th',   0),
    (uid, 'Pricing competitiveness (Grocery)',     81, '81st percentile', 65, '65th',   93, '93rd',   1),
    (uid, 'Promotion ROI efficiency',              64, '64th percentile', 51, '51st',   83, '83rd',   2),
    (uid, 'Price response time',                   78, '4.2 hrs',         52, '8.1 hrs',92, '1.8 hrs',3),
    (uid, 'Assortment coverage vs market',         78, '78%',             72, '72%',    94, '94%',    4),
    (uid, 'Stock availability rate',               91, '91%',             85, '85%',    97, '97%',    5);

  -- model_knowledge
  insert into public.model_knowledge (user_id, body, position) values
    (uid, 'Your delivery fee structure and how it affects price sensitivity by zone across Doha, Lusail, and Al Wakrah', 0),
    (uid, 'Which product categories have the highest return rates on your platform and how that affects true margin', 1),
    (uid, 'Your customer base skews 14% toward premium buyers with higher average basket value than the market', 2),
    (uid, 'Your same-day delivery advantage justifies 3 to 7% price premiums on electronics compared to Amazon and Noon', 3),
    (uid, 'Your Sunday evening order spike pattern and how different promotion types perform during that window', 4),
    (uid, 'Your merchant commission structure and how it creates a different margin floor per category', 5),
    (uid, 'Seasonal demand curves specific to your platform, including Ramadan, Eid, and National Day patterns', 6),
    (uid, 'Price elasticity coefficients for your top 200 SKUs, calibrated against 11 months of actual sales data', 7);

  -- model_maturity (chart points)
  insert into public.model_maturity (user_id, kind, month_label, accuracy, position) values
    (uid, 'point', 'Month 1',  61, 0),
    (uid, 'point', 'Month 3',  74, 1),
    (uid, 'point', 'Month 6',  82, 2),
    (uid, 'point', 'Month 9',  87, 3),
    (uid, 'point', 'Month 12', 91, 4),
    (uid, 'point', 'Month 18', 94, 5);

  -- model_maturity (stat cards)
  insert into public.model_maturity (user_id, kind, stat_label, stat_value, stat_color, stat_sub, position) values
    (uid, 'stat', 'Current accuracy',           '91%', '#22C55E', 'Month 12 maturity',                 100),
    (uid, 'stat', 'Data points processed',      '2.4M','#1A1A18', 'Snoonu-specific signals',           101),
    (uid, 'stat', 'Competitor starting today',  '61%', '#EF4444', 'Would need 12+ months to catch up', 102);

  -- switching_cost
  insert into public.switching_cost (user_id, title, body) values
    (uid,
     'The cost of switching',
     'Building this in-house or switching to a competitor means starting a new model from scratch at 61% accuracy. It takes 12 months of continuous data to reach your current 91% level. During those 12 months, every pricing decision is less accurate, every promotion is less optimized, and every competitive gap takes longer to spot. The model you have built here is an asset that appreciates over time.');

  -- network_value
  insert into public.network_value (user_id, title, body) values
    (uid,
     'These benchmarks get more accurate as the network grows',
     'With more brands using PrizeSkout, the benchmark pool deepens and the data becomes more representative. Your data is never exposed to anyone. Every client benefits from the network. Nobody sees anyone else''s playbook.');
end;
$$;

-- Update handle_new_user trigger to also call benchmarks seeder
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  uid uuid := new.id;
  email_prefix text := split_part(coalesce(new.email, ''), '@', 1);
  display text := coalesce(new.raw_user_meta_data ->> 'display_name', email_prefix);
begin
  insert into public.profiles (id, display_name) values (uid, display);

  insert into public.overview_metrics
    (user_id, slug, label, value, value_color, footer_text, footer_color, position)
  values
    (uid, 'products_tracked', 'Products tracked', '2,847', '#1A1A18', '+12% vs last month', '#22C55E', 0),
    (uid, 'price_position',   'Price position',   '3rd / 6', '#1A1A18', 'Rank improved by 1', '#22C55E', 1),
    (uid, 'active_alerts',    'Active alerts today', '14', '#EA580C', '3 require action', '#6B6B6B', 2),
    (uid, 'est_savings',      'Estimated monthly savings', 'QAR 48K', '#22C55E', '+3.2% vs last month', '#22C55E', 3);

  insert into public.overview_alerts
    (user_id, alert_type, channel, message, severity, occurred_at)
  values
    (uid, 'price',   'online',   'Carrefour dropped Sony WH-1000XM5 to QAR 1,149 (-4.2%)',                       'action',      now() - interval '2 minutes'),
    (uid, 'stock',   'online',   'Lulu out of stock on Samsung Galaxy S24 Ultra. Estimated restock: 3-4 days.',  'opportunity', now() - interval '18 minutes'),
    (uid, 'pattern', 'online',   'Talabat Eid sale detected. Matches their annual pattern. Confidence: 92%.',    'intel',       now() - interval '1 hour'),
    (uid, 'price',   'in-store', 'Carrefour Doha Festival City raised iPhone 15 Pro price by QAR 100 in-store.', 'intel',       now() - interval '2 hours'),
    (uid, 'insight', 'online',   'Your avg price response time improved to 4.2 hrs. Market average is 8.1 hrs.', 'intel',       now() - interval '5 hours'),
    (uid, 'promo',   'in-store', 'Lulu Hypermarket Lusail running 20% off on home appliances in-store only.',    'opportunity', now() - interval '6 hours');

  insert into public.overview_channels
    (user_id, label, amount, share_text, percent, color, position)
  values
    (uid, 'Online',      'QAR 1.2M', '68% of total', 68, '#3B82F6', 0),
    (uid, 'In-Store',    'QAR 480K', '27% of total', 27, '#7C3AED', 1),
    (uid, 'Marketplace', 'QAR 89K',  '5% of total',   5, '#EA580C', 2);

  insert into public.overview_quick_actions
    (user_id, icon, title, description, link_text, position)
  values
    (uid, 'crosshair',   'Price alerts need action',
     '3 competitors have undercut your prices on tracked products.',
     'View competitors', 0),
    (uid, 'trending-up', '5 pricing recommendations',
     'AI has identified 5 products where price adjustments could improve margins.',
     'Review pricing', 1),
    (uid, 'map-pin',     'Field intel pending review',
     '4 new price observations submitted by your field team today.',
     'Review submissions', 2);

  insert into public.pricing_metrics
    (user_id, slug, label, value, value_color, footer_text, footer_color, position)
  values
    (uid, 'active_recs',     'Active recommendations',     '5',          '#1A1A18', 'across all categories',     '#6B6B6B', 0),
    (uid, 'monthly_impact',  'Total monthly impact',       '+QAR 71K',   '#22C55E', 'if all applied',            '#6B6B6B', 1),
    (uid, 'avg_confidence',  'Avg confidence score',       '89%',        '#EA580C', 'across recommendations',    '#6B6B6B', 2),
    (uid, 'model_maturity',  'Model maturity',             '11 months',  '#3B82F6', 'trained on your data',      '#6B6B6B', 3);

  insert into public.pricing_recommendations
    (user_id, product, category, channel, current_price, recommended_price, reason,
     unit_impact, margin_impact, net_monthly, confidence, position)
  values
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

  insert into public.pricing_rules
    (user_id, rule_text, enabled, position)
  values
    (uid, 'Never price more than 5% above the lowest competitor on Electronics', true, 0),
    (uid, 'Match Carrefour on all Grocery items within 24 hours of their price change', true, 1),
    (uid, 'Do not drop below QAR 15 margin on any Home category product', true, 2);

  insert into public.competitor_metrics
    (user_id, slug, label, value, value_color, footer_text, footer_color, position)
  values
    (uid, 'products_monitored', 'Products monitored',      '2,847', '#1A1A18', 'across 6 competitors',    '#6B6B6B', 0),
    (uid, 'cheapest_on',        'You are cheapest on',     '38%',   '#22C55E', 'of overlapping products', '#6B6B6B', 1),
    (uid, 'undercut_by',        'Undercut by competitors', '27%',   '#EF4444', 'of your catalog',         '#6B6B6B', 2),
    (uid, 'avg_price_gap',      'Avg price gap',           '-4.3%', '#F59E0B', 'vs market average',       '#6B6B6B', 3);

  insert into public.competitor_prices
    (user_id, product, category, channel, your_price, talabat, carrefour, lulu, amazon, noon, signal, position)
  values
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

  insert into public.competitor_price_history
    (user_id, product, month_label, position, you, talabat, carrefour, amazon)
  values
    (uid, 'Sony WH-1000XM5', 'Nov', 0, 1349, 1399, 1299, 1249),
    (uid, 'Sony WH-1000XM5', 'Dec', 1, 1299, 1349, 1249, 1199),
    (uid, 'Sony WH-1000XM5', 'Jan', 2, 1299, 1299, 1199, 1149),
    (uid, 'Sony WH-1000XM5', 'Feb', 3, 1299, 1349, 1199, 1149),
    (uid, 'Sony WH-1000XM5', 'Mar', 4, 1299, 1349, 1199, 1149),
    (uid, 'Sony WH-1000XM5', 'Apr', 5, 1299, 1349, 1199, 1149);

  insert into public.behavior_patterns
    (user_id, competitor, channel, category, detection_period, confidence, pattern, depth, evidence, recommendation, impact, position)
  values
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

  perform public.seed_field_intel_for_user(uid);
  perform public.seed_market_for_user(uid);
  perform public.seed_promotions_for_user(uid);
  perform public.seed_benchmarks_for_user(uid);

  return new;
end;
$function$;

-- Backfill existing users
do $$
declare
  r record;
begin
  for r in select id from public.profiles loop
    perform public.seed_benchmarks_for_user(r.id);
  end loop;
end$$;
