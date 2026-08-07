-- Durable, policy-controlled work for the PrizeSkout Virtual Store Manager.
-- AI is not required to create or advance these records: scheduled workers,
-- webhooks and deterministic checks can all use the same task contract.

create table if not exists public.ps_store_manager_profiles (
  account_id text primary key,
  manager_name text not null default 'PrizeSkout Store Manager',
  operating_mode text not null default 'supervised'
    check (operating_mode in ('observe','assist','supervised','policy_controlled','exception_only')),
  daily_brief_enabled boolean not null default true,
  daily_brief_hour smallint not null default 8 check (daily_brief_hour between 0 and 23),
  timezone text not null default 'Asia/Riyadh',
  language text not null default 'en' check (language in ('en','ar','fr')),
  updated_at timestamptz not null default now()
);

create table if not exists public.ps_store_manager_policies (
  id uuid primary key default gen_random_uuid(),
  account_id text not null,
  policy_key text not null,
  enabled boolean not null default true,
  behavior text not null check (behavior in ('observe','recommend','prepare','auto_execute')),
  config jsonb not null default '{}'::jsonb,
  description text not null,
  updated_at timestamptz not null default now(),
  unique(account_id, policy_key)
);

create table if not exists public.ps_store_manager_tasks (
  id uuid primary key default gen_random_uuid(),
  account_id text not null,
  idempotency_key text not null,
  source text not null default 'merchant' check (source in ('merchant','assistant','webhook','schedule','system')),
  task_type text not null,
  title text not null,
  detail text not null default '',
  status text not null default 'detected'
    check (status in ('detected','investigating','prepared','waiting_approval','approved','executing','verifying','completed','needs_attention','cancelled')),
  risk_level text not null default 'read_only'
    check (risk_level in ('read_only','reversible','financial','permanent')),
  priority text not null default 'medium' check (priority in ('critical','high','medium','low')),
  connector text,
  target_type text,
  target_id text,
  assigned_to text,
  due_at timestamptz,
  execute_after timestamptz,
  input jsonb not null default '{}'::jsonb,
  proposed_changes jsonb not null default '[]'::jsonb,
  evidence jsonb not null default '[]'::jsonb,
  result jsonb not null default '{}'::jsonb,
  approval_required boolean not null default false,
  approved_by text,
  approved_at timestamptz,
  last_error text,
  attempt_count integer not null default 0 check (attempt_count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz,
  unique(account_id, idempotency_key)
);

create index if not exists ps_store_manager_tasks_queue
  on public.ps_store_manager_tasks(account_id, status, priority, due_at, created_at desc);

create table if not exists public.ps_store_manager_task_events (
  id uuid primary key default gen_random_uuid(),
  account_id text not null,
  task_id uuid not null references public.ps_store_manager_tasks(id) on delete cascade,
  from_status text,
  to_status text not null,
  actor text not null,
  note text,
  evidence jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists ps_store_manager_task_events_task_time
  on public.ps_store_manager_task_events(task_id, created_at desc);

alter table public.ps_store_manager_profiles enable row level security;
alter table public.ps_store_manager_policies enable row level security;
alter table public.ps_store_manager_tasks enable row level security;
alter table public.ps_store_manager_task_events enable row level security;
revoke all on public.ps_store_manager_profiles from anon,authenticated;
revoke all on public.ps_store_manager_policies from anon,authenticated;
revoke all on public.ps_store_manager_tasks from anon,authenticated;
revoke all on public.ps_store_manager_task_events from anon,authenticated;

drop trigger if exists ps_store_manager_profiles_updated_at on public.ps_store_manager_profiles;
create trigger ps_store_manager_profiles_updated_at before update on public.ps_store_manager_profiles
  for each row execute function public.set_updated_at();
drop trigger if exists ps_store_manager_policies_updated_at on public.ps_store_manager_policies;
create trigger ps_store_manager_policies_updated_at before update on public.ps_store_manager_policies
  for each row execute function public.set_updated_at();
drop trigger if exists ps_store_manager_tasks_updated_at on public.ps_store_manager_tasks;
create trigger ps_store_manager_tasks_updated_at before update on public.ps_store_manager_tasks
  for each row execute function public.set_updated_at();

insert into public.ps_store_manager_policies(account_id,policy_key,behavior,description,config)
select merchant_id,'catalog_hygiene','prepare','Prepare corrections for missing or inconsistent catalogue data.',
  '{"approval_required":true}'::jsonb
from public.ps_access_codes
on conflict(account_id,policy_key) do nothing;

insert into public.ps_store_manager_policies(account_id,policy_key,behavior,description,config)
select merchant_id,'margin_protection','recommend','Watch true contribution margin and prepare protected price actions.',
  '{"approval_required":true}'::jsonb
from public.ps_access_codes
on conflict(account_id,policy_key) do nothing;

insert into public.ps_store_manager_policies(account_id,policy_key,behavior,description,config)
select merchant_id,'inventory_watch','recommend','Watch stock-outs, overselling risk and slow-moving inventory.',
  '{"approval_required":true}'::jsonb
from public.ps_access_codes
on conflict(account_id,policy_key) do nothing;
