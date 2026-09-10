-- Expand the industry column on ps_restaurant_workspaces to support
-- multiple business types beyond the original 'restaurant'-only constraint.

-- 1. Drop the old single-value constraint
alter table public.ps_restaurant_workspaces
  drop constraint if exists ps_restaurant_workspaces_industry_check;

-- 2. Add the expanded constraint
alter table public.ps_restaurant_workspaces
  add constraint ps_restaurant_workspaces_industry_check
  check (industry in ('restaurant','grocery','retail','cafe','cloud_kitchen','catering','other'));

-- 3. Keep the default as 'restaurant' for existing merchants
alter table public.ps_restaurant_workspaces
  alter column industry set default 'restaurant';
