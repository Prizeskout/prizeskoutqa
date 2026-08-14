-- Operational foundations for the PrizeSkout platform administration console.
create table if not exists public.support_ticket_events (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.contact_messages(id) on delete cascade,
  actor_id uuid references auth.users(id) on delete set null,
  event_type text not null check (event_type in ('note','reply','status_change','priority_change','assignment')),
  body text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists support_ticket_events_ticket_idx
  on public.support_ticket_events(ticket_id, created_at);

alter table public.support_ticket_events enable row level security;

drop policy if exists "admins read support ticket events" on public.support_ticket_events;
create policy "admins read support ticket events" on public.support_ticket_events
for select to authenticated using (public.has_role(auth.uid(), 'admin'));

drop policy if exists "admins create support ticket events" on public.support_ticket_events;
create policy "admins create support ticket events" on public.support_ticket_events
for insert to authenticated with check (public.has_role(auth.uid(), 'admin'));

create table if not exists public.platform_admin_audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references auth.users(id) on delete set null,
  action text not null,
  resource_type text not null,
  resource_id text,
  reason text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists platform_admin_audit_created_idx
  on public.platform_admin_audit_log(created_at desc);

alter table public.platform_admin_audit_log enable row level security;

drop policy if exists "admins read platform admin audit" on public.platform_admin_audit_log;
create policy "admins read platform admin audit" on public.platform_admin_audit_log
for select to authenticated using (public.has_role(auth.uid(), 'admin'));

drop policy if exists "admins create platform admin audit" on public.platform_admin_audit_log;
create policy "admins create platform admin audit" on public.platform_admin_audit_log
for insert to authenticated with check (public.has_role(auth.uid(), 'admin'));
