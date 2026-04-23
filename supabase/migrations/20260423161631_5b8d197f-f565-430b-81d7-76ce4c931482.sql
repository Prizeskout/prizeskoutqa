-- API Keys
create table public.api_keys (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  name text not null,
  mode text not null check (mode in ('test', 'live')),
  key_prefix text not null,
  key_hash text not null,
  last_four text not null,
  scopes jsonb not null default '["read"]'::jsonb,
  last_used_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.api_keys enable row level security;

create policy "Users view own api keys" on public.api_keys for select to authenticated using (auth.uid() = user_id);
create policy "Users insert own api keys" on public.api_keys for insert to authenticated with check (auth.uid() = user_id);
create policy "Users update own api keys" on public.api_keys for update to authenticated using (auth.uid() = user_id);
create policy "Users delete own api keys" on public.api_keys for delete to authenticated using (auth.uid() = user_id);

create index idx_api_keys_user on public.api_keys(user_id);
create index idx_api_keys_hash on public.api_keys(key_hash);

create trigger api_keys_set_updated_at before update on public.api_keys
  for each row execute function public.set_updated_at();

-- Webhook Endpoints
create table public.webhook_endpoints (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  url text not null,
  description text,
  events jsonb not null default '[]'::jsonb,
  signing_secret text not null,
  enabled boolean not null default true,
  last_delivery_at timestamptz,
  last_delivery_success boolean,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.webhook_endpoints enable row level security;

create policy "Users view own webhook endpoints" on public.webhook_endpoints for select to authenticated using (auth.uid() = user_id);
create policy "Users insert own webhook endpoints" on public.webhook_endpoints for insert to authenticated with check (auth.uid() = user_id);
create policy "Users update own webhook endpoints" on public.webhook_endpoints for update to authenticated using (auth.uid() = user_id);
create policy "Users delete own webhook endpoints" on public.webhook_endpoints for delete to authenticated using (auth.uid() = user_id);

create index idx_webhook_endpoints_user on public.webhook_endpoints(user_id);

create trigger webhook_endpoints_set_updated_at before update on public.webhook_endpoints
  for each row execute function public.set_updated_at();

-- Webhook Deliveries
create table public.webhook_deliveries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  endpoint_id uuid not null references public.webhook_endpoints(id) on delete cascade,
  event_type text not null,
  status_code integer,
  attempt integer not null default 1,
  success boolean not null default false,
  error text,
  payload_preview text,
  delivered_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

alter table public.webhook_deliveries enable row level security;

create policy "Users view own webhook deliveries" on public.webhook_deliveries for select to authenticated using (auth.uid() = user_id);
create policy "Users insert own webhook deliveries" on public.webhook_deliveries for insert to authenticated with check (auth.uid() = user_id);
create policy "Users delete own webhook deliveries" on public.webhook_deliveries for delete to authenticated using (auth.uid() = user_id);

create index idx_webhook_deliveries_user on public.webhook_deliveries(user_id);
create index idx_webhook_deliveries_endpoint on public.webhook_deliveries(endpoint_id);
create index idx_webhook_deliveries_time on public.webhook_deliveries(delivered_at desc);

-- API Request Logs
create table public.api_request_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  api_key_id uuid references public.api_keys(id) on delete set null,
  request_id text,
  method text not null,
  path text not null,
  status_code integer not null,
  duration_ms integer,
  ip text,
  user_agent text,
  error text,
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

alter table public.api_request_logs enable row level security;

create policy "Users view own api logs" on public.api_request_logs for select to authenticated using (auth.uid() = user_id);
create policy "Users insert own api logs" on public.api_request_logs for insert to authenticated with check (auth.uid() = user_id);
create policy "Users delete own api logs" on public.api_request_logs for delete to authenticated using (auth.uid() = user_id);

create index idx_api_logs_user on public.api_request_logs(user_id);
create index idx_api_logs_time on public.api_request_logs(occurred_at desc);
create index idx_api_logs_key on public.api_request_logs(api_key_id);

-- Usage Events (metering)
create table public.usage_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  api_key_id uuid references public.api_keys(id) on delete set null,
  endpoint text not null,
  units integer not null default 1,
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

alter table public.usage_events enable row level security;

create policy "Users view own usage events" on public.usage_events for select to authenticated using (auth.uid() = user_id);
create policy "Users insert own usage events" on public.usage_events for insert to authenticated with check (auth.uid() = user_id);

create index idx_usage_events_user on public.usage_events(user_id);
create index idx_usage_events_time on public.usage_events(occurred_at desc);