create table if not exists public.ai_insights (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  page text not null,
  headline text not null,
  bullets jsonb not null default '[]'::jsonb,
  actions jsonb not null default '[]'::jsonb,
  model text,
  generated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, page)
);

alter table public.ai_insights enable row level security;

create policy "users view own ai insights"
  on public.ai_insights for select
  to authenticated
  using (auth.uid() = user_id);

create policy "users insert own ai insights"
  on public.ai_insights for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "users update own ai insights"
  on public.ai_insights for update
  to authenticated
  using (auth.uid() = user_id);

create policy "users delete own ai insights"
  on public.ai_insights for delete
  to authenticated
  using (auth.uid() = user_id);

create trigger ai_insights_set_updated_at
  before update on public.ai_insights
  for each row execute function public.set_updated_at();