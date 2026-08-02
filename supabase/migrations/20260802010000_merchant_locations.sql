create table if not exists public.ps_merchant_locations (
  id uuid primary key default gen_random_uuid(),
  account_id text not null,
  name text not null check (char_length(name) between 1 and 160),
  city text not null check (char_length(city) between 1 and 120),
  region text not null check (region in ('Qatar','Saudi Arabia','UAE','Kuwait','Bahrain','Oman')),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (account_id, name, city)
);

create index if not exists idx_ps_merchant_locations_account
  on public.ps_merchant_locations (account_id, created_at);

alter table public.ps_merchant_locations enable row level security;

-- Dashboard access is verified by the server using the merchant's access
-- code. Browser clients never read or mutate this table directly.
revoke all on public.ps_merchant_locations from anon, authenticated;

drop trigger if exists ps_merchant_locations_set_updated_at on public.ps_merchant_locations;
create trigger ps_merchant_locations_set_updated_at
before update on public.ps_merchant_locations
for each row execute function public.set_updated_at();
