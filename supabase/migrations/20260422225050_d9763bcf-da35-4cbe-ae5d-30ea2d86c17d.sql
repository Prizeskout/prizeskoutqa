-- Contact form submissions (publicly insertable, only admins read)
create table if not exists public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  company text,
  email text not null,
  message text not null,
  user_agent text,
  created_at timestamptz not null default now()
);

alter table public.contact_messages enable row level security;

create policy "anyone can insert contact message"
on public.contact_messages
for insert
to anon, authenticated
with check (
  length(name) between 1 and 200
  and length(email) between 3 and 320
  and length(message) between 1 and 5000
);

create policy "admins read contact messages"
on public.contact_messages
for select
to authenticated
using (public.has_role(auth.uid(), 'admin'));

-- User account settings (one row per user, upsertable)
create table if not exists public.user_account_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  company_name text,
  industry text,
  country text,
  currency text,
  contact_email text,
  contact_phone text,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.user_account_settings enable row level security;

create policy "users read own account settings"
on public.user_account_settings for select to authenticated
using (auth.uid() = user_id);

create policy "users insert own account settings"
on public.user_account_settings for insert to authenticated
with check (auth.uid() = user_id);

create policy "users update own account settings"
on public.user_account_settings for update to authenticated
using (auth.uid() = user_id);

create trigger user_account_settings_set_updated_at
before update on public.user_account_settings
for each row execute function public.set_updated_at();

-- User notification preferences (key/value pairs, upsertable)
create table if not exists public.user_notification_settings (
  user_id uuid not null references auth.users(id) on delete cascade,
  pref_key text not null,
  enabled boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (user_id, pref_key)
);

alter table public.user_notification_settings enable row level security;

create policy "users read own notif prefs"
on public.user_notification_settings for select to authenticated
using (auth.uid() = user_id);

create policy "users insert own notif prefs"
on public.user_notification_settings for insert to authenticated
with check (auth.uid() = user_id);

create policy "users update own notif prefs"
on public.user_notification_settings for update to authenticated
using (auth.uid() = user_id);

create policy "users delete own notif prefs"
on public.user_notification_settings for delete to authenticated
using (auth.uid() = user_id);

create trigger user_notification_settings_set_updated_at
before update on public.user_notification_settings
for each row execute function public.set_updated_at();