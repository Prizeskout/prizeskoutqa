create table if not exists public.ps_merchant_notification_settings (
  account_id text not null,
  pref_key text not null check (pref_key in (
    'margin_breach','reprice_applied','channel_down',
    'competitor_drop','promo_overlap','weekly_digest'
  )),
  enabled boolean not null,
  updated_at timestamptz not null default now(),
  primary key (account_id, pref_key)
);

alter table public.ps_merchant_notification_settings enable row level security;
revoke all on public.ps_merchant_notification_settings from anon, authenticated;

drop trigger if exists ps_merchant_notification_settings_set_updated_at
  on public.ps_merchant_notification_settings;
create trigger ps_merchant_notification_settings_set_updated_at
before update on public.ps_merchant_notification_settings
for each row execute function public.set_updated_at();
