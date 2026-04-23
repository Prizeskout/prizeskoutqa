-- Phase B: account-level live access approval.
-- One row per user. Tracks live API access lifecycle and the request payload
-- the developer submits before they can mint live keys.

create table if not exists public.accounts (
  user_id uuid primary key,
  live_status text not null default 'none' check (live_status in ('none','pending','approved','rejected')),
  company_name text,
  company_domain text,
  use_case text,
  expected_volume text,
  billing_email text,
  requested_at timestamptz,
  decided_at timestamptz,
  decided_by uuid,
  decision_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.accounts enable row level security;

-- Owner RLS
create policy "Users view own account"
  on public.accounts for select to authenticated
  using (auth.uid() = user_id);

create policy "Users insert own account"
  on public.accounts for insert to authenticated
  with check (auth.uid() = user_id);

create policy "Users update own account"
  on public.accounts for update to authenticated
  using (auth.uid() = user_id);

-- Admin RLS (uses existing has_role security definer fn)
create policy "Admins view all accounts"
  on public.accounts for select to authenticated
  using (public.has_role(auth.uid(), 'admin'));

create policy "Admins update all accounts"
  on public.accounts for update to authenticated
  using (public.has_role(auth.uid(), 'admin'));

create trigger trg_accounts_updated_at
  before update on public.accounts
  for each row execute function public.set_updated_at();

-- Auto-create an empty account row when a user signs up so the UI always has a record to read.
-- Extend the existing handle_new_user trigger by wrapping in a separate function for safety.
create or replace function public.ensure_account_for_user(uid uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.accounts (user_id) values (uid)
  on conflict (user_id) do nothing;
end;
$$;

-- Backfill existing users
insert into public.accounts (user_id)
select id from auth.users
on conflict (user_id) do nothing;

-- Patch handle_new_user to also create the account row
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
  insert into public.profiles (id, display_name) values (uid, display);
  perform public.ensure_account_for_user(uid);

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

  perform public.seed_field_intel_for_user(uid);
  perform public.seed_market_for_user(uid);
  perform public.seed_promotions_for_user(uid);
  perform public.seed_benchmarks_for_user(uid);
  perform public.seed_roi_model_for_user(uid);
  perform public.seed_competitor_urls_for_user(uid);

  return new;
end;
$function$;
