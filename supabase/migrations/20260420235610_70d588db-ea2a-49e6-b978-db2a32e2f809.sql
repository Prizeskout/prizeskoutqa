create table public.competitor_scrapes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  url text not null,
  competitor text,
  product text,
  price numeric,
  currency text,
  markdown text,
  metadata jsonb default '{}'::jsonb,
  status text not null default 'success',
  error text,
  scraped_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index idx_competitor_scrapes_user_url on public.competitor_scrapes (user_id, url, scraped_at desc);

alter table public.competitor_scrapes enable row level security;

create policy "users read own scrapes"
  on public.competitor_scrapes for select
  to authenticated
  using (auth.uid() = user_id);

create policy "users insert own scrapes"
  on public.competitor_scrapes for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "users delete own scrapes"
  on public.competitor_scrapes for delete
  to authenticated
  using (auth.uid() = user_id);
