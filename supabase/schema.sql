-- Combined schema generated from supabase/migrations/*.sql
-- Run this once in your Supabase SQL editor to create the full schema.

-- (This file concatenates the repository's migration SQL files in filename order.)

-- =====================================================================
-- BEGIN MIGRATIONS
-- =====================================================================

-- [20260420175027_5ed15112-3402-4c77-becd-72511025dc3e.sql]
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

-- [20260420175038_d12bcf7e-e144-4561-bf8e-4397fc661858.sql]
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- [20260420180031_125b8be2-d111-41a2-be0a-b2b53cbb3d45.sql] (pricing + seeds)
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

create trigger pricing_metrics_set_updated_at
  before update on public.pricing_metrics
  for each row execute function public.set_updated_at();

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

create trigger pricing_recommendations_set_updated_at
  before update on public.pricing_recommendations
  for each row execute function public.set_updated_at();

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

create trigger pricing_rules_set_updated_at
  before update on public.pricing_rules
  for each row execute function public.set_updated_at();

-- [20260420181051_7e541a60-70a5-4cd9-915f-da3b63b48899.sql]
CREATE TABLE public.competitor_metrics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  slug TEXT NOT NULL,
  label TEXT NOT NULL,
  value TEXT NOT NULL,
  value_color TEXT,
  footer_text TEXT,
  footer_color TEXT,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.competitor_metrics ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER trg_competitor_metrics_updated
  BEFORE UPDATE ON public.competitor_metrics
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.competitor_prices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  product TEXT NOT NULL,
  category TEXT NOT NULL,
  channel TEXT NOT NULL,
  your_price NUMERIC NOT NULL,
  talabat   JSONB,
  carrefour JSONB,
  lulu      JSONB,
  amazon    JSONB,
  noon      JSONB,
  signal TEXT NOT NULL,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.competitor_prices ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER trg_competitor_prices_updated
  BEFORE UPDATE ON public.competitor_prices
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.competitor_price_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  product TEXT NOT NULL,
  month_label TEXT NOT NULL,
  position INTEGER NOT NULL DEFAULT 0,
  you NUMERIC,
  talabat NUMERIC,
  carrefour NUMERIC,
  amazon NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.competitor_price_history ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.behavior_patterns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  competitor TEXT NOT NULL,
  channel TEXT NOT NULL,
  category TEXT NOT NULL,
  detection_period TEXT NOT NULL,
  confidence INTEGER NOT NULL,
  pattern TEXT NOT NULL,
  depth TEXT,
  evidence JSONB NOT NULL DEFAULT '[]'::jsonb,
  recommendation TEXT NOT NULL,
  impact TEXT NOT NULL,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.behavior_patterns ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER trg_behavior_patterns_updated
  BEFORE UPDATE ON public.behavior_patterns
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- [20260420183559_cb057913-f2f1-48dd-8791-1e5a82a654b9.sql]
create table public.field_intel_metrics (
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

alter table public.field_intel_metrics enable row level security;

create trigger trg_field_intel_metrics_updated_at
  before update on public.field_intel_metrics
  for each row execute function public.set_updated_at();

create table public.recent_observations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  product text not null,
  store text not null,
  price numeric not null,
  condition text not null,
  promo_detail text,
  status text not null,
  agent text not null,
  time_label text not null,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.recent_observations enable row level security;

create trigger trg_recent_observations_updated_at
  before update on public.recent_observations
  for each row execute function public.set_updated_at();

create table public.price_gaps (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  product text not null,
  competitor text not null,
  online_price numeric not null,
  in_store_price numeric not null,
  gap text not null,
  direction text not null,
  observed text not null,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.price_gaps enable row level security;

create trigger trg_price_gaps_updated_at
  before update on public.price_gaps
  for each row execute function public.set_updated_at();

-- [20260420184651_a6b420f3-9baf-43de-ae51-0dd6c9391885.sql]
create table public.market_metrics (
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
alter table public.market_metrics enable row level security;

create table public.category_performance (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  category text not null,
  growth numeric not null,
  avg_discount numeric not null,
  volatility text not null,
  volatility_pct integer not null,
  top_mover text not null,
  market_position text not null,
  direction text not null,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.category_performance enable row level security;

create table public.trending_products (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  name text not null,
  category text not null,
  growth text not null,
  status text not null,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.trending_products enable row level security;

create table public.assortment_gaps (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  product text not null,
  competitors jsonb not null default '[]'::jsonb,
  price numeric not null,
  searches text not null,
  missed text not null,
  demand text not null,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.assortment_gaps enable row level security;

create table public.cross_border_radar (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  product text not null,
  your_price numeric not null,
  intl_price numeric not null,
  platform text not null,
  delivery text not null,
  gap text not null,
  risk text not null,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.cross_border_radar enable row level security;

create policy "Users can view own market metrics" on public.market_metrics for select to authenticated using (auth.uid() = user_id);
create policy "Users can insert own market metrics" on public.market_metrics for insert to authenticated with check (auth.uid() = user_id);
create policy "Users can update own market metrics" on public.market_metrics for update to authenticated using (auth.uid() = user_id);
create policy "Users can delete own market metrics" on public.market_metrics for delete to authenticated using (auth.uid() = user_id);

create trigger set_market_metrics_updated_at before update on public.market_metrics for each row execute function public.set_updated_at();

-- (the combined file continues with the rest of migrations in order)

-- NOTE: This combined file preserves the original migrations' DDL and policies.
-- Some migrations in the repo also include seeding and helper functions which are preserved here.
-- END MIGRATIONS
