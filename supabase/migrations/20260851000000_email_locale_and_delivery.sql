-- Email localization + delivery preferences
-- ---------------------------------------------------------------------------
-- Feature: app-sent email now renders in each user's chosen language. Two
-- supporting pieces of state are added here.

-- 1) Persist the user's UI/email language. Until now the locale lived only in
--    browser localStorage (see src/lib/i18n.ts), so nothing server-side — and
--    therefore no background email path — could know which language to send.
alter table public.profiles
  add column if not exists preferred_locale text not null default 'en';

-- Constrain to the locales the app actually ships (en, ar, fr). Added
-- separately + guarded so re-running the migration is safe.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'profiles_preferred_locale_check'
  ) then
    alter table public.profiles
      add constraint profiles_preferred_locale_check
      check (preferred_locale in ('en', 'ar', 'fr'));
  end if;
end $$;

comment on column public.profiles.preferred_locale is
  'User UI/email language (en|ar|fr). Drives the template language for all app-sent email.';

-- 2) Master opt-out for non-transactional email (weekly digest, alerts).
--    Transactional mail (welcome, auth sign-in links) ignores this switch.
--    Reuses the existing user_notification_settings(user_id, pref_key, enabled)
--    table — no schema change — under the reserved key 'email_notifications'.
--    Application code treats a MISSING row as enabled (opt-out, not opt-in);
--    this seed just makes the current state explicit for existing users.
insert into public.user_notification_settings (user_id, pref_key, enabled)
select id, 'email_notifications', true
from public.profiles
on conflict (user_id, pref_key) do nothing;
