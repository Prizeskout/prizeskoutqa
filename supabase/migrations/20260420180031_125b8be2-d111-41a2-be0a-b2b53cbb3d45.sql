-- =========================================
-- Pricing tab tables
-- =========================================

-- 1) pricing_metrics
create table public.pricing_metrics (
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

alter table public.pricing_metrics enable row level security;

create policy "Users can view own pricing metrics"
  on public.pricing_metrics for select to authenticated
  using (auth.uid() = user_id);
create policy "Users can insert own pricing metrics"
  on public.pricing_metrics for insert to authenticated
  with check (auth.uid() = user_id);
create policy "Users can update own pricing metrics"
  on public.pricing_metrics for update to authenticated
  using (auth.uid() = user_id);
create policy "Users can delete own pricing metrics"
  on public.pricing_metrics for delete to authenticated
  using (auth.uid() = user_id);

create trigger pricing_metrics_set_updated_at
  before update on public.pricing_metrics
  for each row execute function public.set_updated_at();

create index pricing_metrics_user_position_idx
  on public.pricing_metrics (user_id, position);

-- 2) pricing_recommendations
create table public.pricing_recommendations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  product text not null,
  category text not null,
  channel text not null check (channel in ('Online', 'In-Store')),
  current_price numeric not null,
  recommended_price numeric not null,
  reason text not null,
  unit_impact text not null,
  margin_impact text not null,
  net_monthly text not null,
  confidence integer not null check (confidence between 0 and 100),
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.pricing_recommendations enable row level security;

create policy "Users can view own pricing recommendations"
  on public.pricing_recommendations for select to authenticated
  using (auth.uid() = user_id);
create policy "Users can insert own pricing recommendations"
  on public.pricing_recommendations for insert to authenticated
  with check (auth.uid() = user_id);
create policy "Users can update own pricing recommendations"
  on public.pricing_recommendations for update to authenticated
  using (auth.uid() = user_id);
create policy "Users can delete own pricing recommendations"
  on public.pricing_recommendations for delete to authenticated
  using (auth.uid() = user_id);

create trigger pricing_recommendations_set_updated_at
  before update on public.pricing_recommendations
  for each row execute function public.set_updated_at();

create index pricing_recommendations_user_position_idx
  on public.pricing_recommendations (user_id, position);

-- 3) pricing_rules
create table public.pricing_rules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  rule_text text not null,
  enabled boolean not null default true,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.pricing_rules enable row level security;

create policy "Users can view own pricing rules"
  on public.pricing_rules for select to authenticated
  using (auth.uid() = user_id);
create policy "Users can insert own pricing rules"
  on public.pricing_rules for insert to authenticated
  with check (auth.uid() = user_id);
create policy "Users can update own pricing rules"
  on public.pricing_rules for update to authenticated
  using (auth.uid() = user_id);
create policy "Users can delete own pricing rules"
  on public.pricing_rules for delete to authenticated
  using (auth.uid() = user_id);

create trigger pricing_rules_set_updated_at
  before update on public.pricing_rules
  for each row execute function public.set_updated_at();

create index pricing_rules_user_position_idx
  on public.pricing_rules (user_id, position);

-- =========================================
-- Extend handle_new_user() to seed pricing demo data
-- =========================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $function$
declare
  uid uuid := new.id;
  email_prefix text := split_part(coalesce(new.email, ''), '@', 1);
  display text := coalesce(new.raw_user_meta_data ->> 'display_name', email_prefix);
begin
  -- profile
  insert into public.profiles (id, display_name)
  values (uid, display);

  -- overview metrics
  insert into public.overview_metrics
    (user_id, slug, label, value, value_color, footer_text, footer_color, position)
  values
    (uid, 'products_tracked', 'Products tracked', '2,847', '#1A1A18', '+12% vs last month', '#22C55E', 0),
    (uid, 'price_position',   'Price position',   '3rd / 6', '#1A1A18', 'Rank improved by 1', '#22C55E', 1),
    (uid, 'active_alerts',    'Active alerts today', '14', '#EA580C', '3 require action', '#6B6B6B', 2),
    (uid, 'est_savings',      'Estimated monthly savings', 'QAR 48K', '#22C55E', '+3.2% vs last month', '#22C55E', 3);

  -- overview alerts
  insert into public.overview_alerts
    (user_id, alert_type, channel, message, severity, occurred_at)
  values
    (uid, 'price',   'online',   'Carrefour dropped Sony WH-1000XM5 to QAR 1,149 (-4.2%)',                       'action',      now() - interval '2 minutes'),
    (uid, 'stock',   'online',   'Lulu out of stock on Samsung Galaxy S24 Ultra. Estimated restock: 3-4 days.',  'opportunity', now() - interval '18 minutes'),
    (uid, 'pattern', 'online',   'Talabat Eid sale detected. Matches their annual pattern. Confidence: 92%.',    'intel',       now() - interval '1 hour'),
    (uid, 'price',   'in-store', 'Carrefour Doha Festival City raised iPhone 15 Pro price by QAR 100 in-store.', 'intel',       now() - interval '2 hours'),
    (uid, 'insight', 'online',   'Your avg price response time improved to 4.2 hrs. Market average is 8.1 hrs.', 'intel',       now() - interval '5 hours'),
    (uid, 'promo',   'in-store', 'Lulu Hypermarket Lusail running 20% off on home appliances in-store only.',    'opportunity', now() - interval '6 hours');

  -- overview channels
  insert into public.overview_channels
    (user_id, label, amount, share_text, percent, color, position)
  values
    (uid, 'Online',      'QAR 1.2M', '68% of total', 68, '#3B82F6', 0),
    (uid, 'In-Store',    'QAR 480K', '27% of total', 27, '#7C3AED', 1),
    (uid, 'Marketplace', 'QAR 89K',  '5% of total',   5, '#EA580C', 2);

  -- overview quick actions
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

  -- pricing metrics
  insert into public.pricing_metrics
    (user_id, slug, label, value, value_color, footer_text, footer_color, position)
  values
    (uid, 'active_recs',     'Active recommendations',     '5',          '#1A1A18', 'across all categories',     '#6B6B6B', 0),
    (uid, 'monthly_impact',  'Total monthly impact',       '+QAR 71K',   '#22C55E', 'if all applied',            '#6B6B6B', 1),
    (uid, 'avg_confidence',  'Avg confidence score',       '89%',        '#EA580C', 'across recommendations',    '#6B6B6B', 2),
    (uid, 'model_maturity',  'Model maturity',             '11 months',  '#3B82F6', 'trained on your data',      '#6B6B6B', 3);

  -- pricing recommendations
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

  -- pricing rules
  insert into public.pricing_rules
    (user_id, rule_text, enabled, position)
  values
    (uid, 'Never price more than 5% above the lowest competitor on Electronics', true, 0),
    (uid, 'Match Carrefour on all Grocery items within 24 hours of their price change', true, 1),
    (uid, 'Do not drop below QAR 15 margin on any Home category product', true, 2);

  return new;
end;
$function$;