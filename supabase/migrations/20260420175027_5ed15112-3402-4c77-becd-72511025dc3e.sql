
-- =====================================================================
-- PROFILES
-- =====================================================================
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Users can view own profile"
  on public.profiles for select
  to authenticated
  using (auth.uid() = id);

create policy "Users can insert own profile"
  on public.profiles for insert
  to authenticated
  with check (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id);

create policy "Users can delete own profile"
  on public.profiles for delete
  to authenticated
  using (auth.uid() = id);

-- =====================================================================
-- OVERVIEW METRICS (top KPI cards)
-- =====================================================================
create table public.overview_metrics (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  slug text not null,            -- products_tracked | price_position | active_alerts | est_savings
  label text not null,
  value text not null,
  value_color text,              -- hex color override
  footer_text text,
  footer_color text,
  position int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, slug)
);

create index overview_metrics_user_idx on public.overview_metrics(user_id, position);
alter table public.overview_metrics enable row level security;

create policy "Users can view own metrics"
  on public.overview_metrics for select to authenticated
  using (auth.uid() = user_id);
create policy "Users can insert own metrics"
  on public.overview_metrics for insert to authenticated
  with check (auth.uid() = user_id);
create policy "Users can update own metrics"
  on public.overview_metrics for update to authenticated
  using (auth.uid() = user_id);
create policy "Users can delete own metrics"
  on public.overview_metrics for delete to authenticated
  using (auth.uid() = user_id);

-- =====================================================================
-- OVERVIEW ALERTS (live alerts feed)
-- =====================================================================
create table public.overview_alerts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  alert_type text not null,      -- price | stock | promo | pattern | insight
  channel text not null,         -- online | in-store
  message text not null,
  severity text not null,        -- action | opportunity | intel
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index overview_alerts_user_idx on public.overview_alerts(user_id, occurred_at desc);
alter table public.overview_alerts enable row level security;

create policy "Users can view own alerts"
  on public.overview_alerts for select to authenticated
  using (auth.uid() = user_id);
create policy "Users can insert own alerts"
  on public.overview_alerts for insert to authenticated
  with check (auth.uid() = user_id);
create policy "Users can update own alerts"
  on public.overview_alerts for update to authenticated
  using (auth.uid() = user_id);
create policy "Users can delete own alerts"
  on public.overview_alerts for delete to authenticated
  using (auth.uid() = user_id);

-- =====================================================================
-- OVERVIEW CHANNELS (revenue by channel)
-- =====================================================================
create table public.overview_channels (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  label text not null,           -- Online | In-Store | Marketplace
  amount text not null,          -- formatted display, e.g. "QAR 1.2M"
  share_text text not null,      -- "68% of total"
  percent int not null,          -- 0-100
  color text not null,           -- hex
  position int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index overview_channels_user_idx on public.overview_channels(user_id, position);
alter table public.overview_channels enable row level security;

create policy "Users can view own channels"
  on public.overview_channels for select to authenticated
  using (auth.uid() = user_id);
create policy "Users can insert own channels"
  on public.overview_channels for insert to authenticated
  with check (auth.uid() = user_id);
create policy "Users can update own channels"
  on public.overview_channels for update to authenticated
  using (auth.uid() = user_id);
create policy "Users can delete own channels"
  on public.overview_channels for delete to authenticated
  using (auth.uid() = user_id);

-- =====================================================================
-- OVERVIEW QUICK ACTIONS
-- =====================================================================
create table public.overview_quick_actions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  icon text not null,            -- lucide icon name: crosshair | trending-up | map-pin
  title text not null,
  description text not null,
  link_text text not null,
  link_href text,
  position int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index overview_quick_actions_user_idx on public.overview_quick_actions(user_id, position);
alter table public.overview_quick_actions enable row level security;

create policy "Users can view own quick actions"
  on public.overview_quick_actions for select to authenticated
  using (auth.uid() = user_id);
create policy "Users can insert own quick actions"
  on public.overview_quick_actions for insert to authenticated
  with check (auth.uid() = user_id);
create policy "Users can update own quick actions"
  on public.overview_quick_actions for update to authenticated
  using (auth.uid() = user_id);
create policy "Users can delete own quick actions"
  on public.overview_quick_actions for delete to authenticated
  using (auth.uid() = user_id);

-- =====================================================================
-- updated_at trigger helper
-- =====================================================================
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

create trigger overview_metrics_set_updated_at
  before update on public.overview_metrics
  for each row execute function public.set_updated_at();

create trigger overview_channels_set_updated_at
  before update on public.overview_channels
  for each row execute function public.set_updated_at();

create trigger overview_quick_actions_set_updated_at
  before update on public.overview_quick_actions
  for each row execute function public.set_updated_at();

-- =====================================================================
-- SIGNUP TRIGGER: create profile + seed dashboard demo data
-- =====================================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := new.id;
  email_prefix text := split_part(coalesce(new.email, ''), '@', 1);
  display text := coalesce(new.raw_user_meta_data ->> 'display_name', email_prefix);
begin
  -- profile
  insert into public.profiles (id, display_name)
  values (uid, display);

  -- metrics
  insert into public.overview_metrics
    (user_id, slug, label, value, value_color, footer_text, footer_color, position)
  values
    (uid, 'products_tracked', 'Products tracked', '2,847', '#1A1A18', '+12% vs last month', '#22C55E', 0),
    (uid, 'price_position',   'Price position',   '3rd / 6', '#1A1A18', 'Rank improved by 1', '#22C55E', 1),
    (uid, 'active_alerts',    'Active alerts today', '14', '#EA580C', '3 require action', '#6B6B6B', 2),
    (uid, 'est_savings',      'Estimated monthly savings', 'QAR 48K', '#22C55E', '+3.2% vs last month', '#22C55E', 3);

  -- alerts
  insert into public.overview_alerts
    (user_id, alert_type, channel, message, severity, occurred_at)
  values
    (uid, 'price',   'online',   'Carrefour dropped Sony WH-1000XM5 to QAR 1,149 (-4.2%)',                       'action',      now() - interval '2 minutes'),
    (uid, 'stock',   'online',   'Lulu out of stock on Samsung Galaxy S24 Ultra. Estimated restock: 3-4 days.',  'opportunity', now() - interval '18 minutes'),
    (uid, 'pattern', 'online',   'Talabat Eid sale detected. Matches their annual pattern. Confidence: 92%.',    'intel',       now() - interval '1 hour'),
    (uid, 'price',   'in-store', 'Carrefour Doha Festival City raised iPhone 15 Pro price by QAR 100 in-store.', 'intel',       now() - interval '2 hours'),
    (uid, 'insight', 'online',   'Your avg price response time improved to 4.2 hrs. Market average is 8.1 hrs.', 'intel',       now() - interval '5 hours'),
    (uid, 'promo',   'in-store', 'Lulu Hypermarket Lusail running 20% off on home appliances in-store only.',    'opportunity', now() - interval '6 hours');

  -- channels
  insert into public.overview_channels
    (user_id, label, amount, share_text, percent, color, position)
  values
    (uid, 'Online',      'QAR 1.2M', '68% of total', 68, '#3B82F6', 0),
    (uid, 'In-Store',    'QAR 480K', '27% of total', 27, '#7C3AED', 1),
    (uid, 'Marketplace', 'QAR 89K',  '5% of total',   5, '#EA580C', 2);

  -- quick actions
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

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
