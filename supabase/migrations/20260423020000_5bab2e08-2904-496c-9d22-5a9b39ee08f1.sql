-- 1. Mark existing recommendations as seed; new computed rows will set 'computed'.
alter table public.pricing_recommendations
  add column if not exists source text not null default 'seed';

alter table public.pricing_recommendations
  add constraint pricing_recommendations_source_chk
  check (source in ('seed', 'computed'));

-- Backfill any existing rows explicitly to 'seed' (defensive; default already handles it).
update public.pricing_recommendations set source = 'seed' where source is null;

-- 2. Category on competitor_product_urls so the engine can pick elasticity.
alter table public.competitor_product_urls
  add column if not exists category text;

-- 3. Unique constraint for upsert key (user_id, product, channel, source='computed').
-- We allow seed + computed for the same product to coexist briefly during the
-- transition - the engine deletes seeds for that user once it writes any computed row.
create unique index if not exists pricing_recommendations_user_product_channel_source_key
  on public.pricing_recommendations (user_id, product, channel, source);
