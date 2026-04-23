create table if not exists public.pricing_decisions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  recommendation_id uuid not null,
  product text not null,
  category text not null,
  channel text not null,
  current_price numeric not null,
  recommended_price numeric not null,
  expected_net_monthly text,
  decision text not null check (decision in ('applied','dismissed','snoozed')),
  snooze_until timestamptz,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists pricing_decisions_user_idx on public.pricing_decisions(user_id, created_at desc);
create unique index if not exists pricing_decisions_user_rec_unique on public.pricing_decisions(user_id, recommendation_id);

alter table public.pricing_decisions enable row level security;

create policy "Users view own pricing decisions"
  on public.pricing_decisions for select to authenticated
  using (auth.uid() = user_id);

create policy "Users insert own pricing decisions"
  on public.pricing_decisions for insert to authenticated
  with check (auth.uid() = user_id);

create policy "Users update own pricing decisions"
  on public.pricing_decisions for update to authenticated
  using (auth.uid() = user_id);

create policy "Users delete own pricing decisions"
  on public.pricing_decisions for delete to authenticated
  using (auth.uid() = user_id);

create trigger set_pricing_decisions_updated_at
  before update on public.pricing_decisions
  for each row execute function public.set_updated_at();