create table if not exists public.ps_attention_items (
  id uuid primary key default gen_random_uuid(),
  account_id text not null,
  fingerprint text not null,
  item_type text not null,
  title text not null,
  detail text not null,
  priority text not null default 'medium' check (priority in ('critical','high','medium','low')),
  status text not null default 'open' check (status in ('open','assigned','waiting_approval','snoozed','resolved','dismissed')),
  amount numeric,
  currency text,
  evidence_strength text not null default 'estimated' check (evidence_strength in ('verified','strong','estimated','unknown')),
  source_route text not null default 'revenue_hub',
  copilot_prompt text,
  context jsonb not null default '{}'::jsonb,
  assigned_to text,
  snoozed_until timestamptz,
  resolution_note text,
  detected_at timestamptz not null default now(),
  resolved_at timestamptz,
  updated_at timestamptz not null default now(),
  unique(account_id,fingerprint)
);

create index if not exists idx_ps_attention_account_status on public.ps_attention_items(account_id,status,priority,updated_at desc);
alter table public.ps_attention_items enable row level security;
revoke all on public.ps_attention_items from anon,authenticated;
drop trigger if exists ps_attention_items_set_updated_at on public.ps_attention_items;
create trigger ps_attention_items_set_updated_at before update on public.ps_attention_items for each row execute function public.set_updated_at();

create table if not exists public.ps_value_ledger (
  id uuid primary key default gen_random_uuid(),
  account_id text not null,
  category text not null check (category in ('identified','protected','recovered','estimated','pending')),
  source_type text not null,
  source_id text not null,
  label text not null,
  amount numeric not null check (amount >= 0),
  currency text not null,
  evidence_strength text not null check (evidence_strength in ('verified','strong','estimated','unknown')),
  occurred_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  unique(account_id,source_type,source_id,category)
);

create index if not exists idx_ps_value_ledger_account on public.ps_value_ledger(account_id,occurred_at desc);
alter table public.ps_value_ledger enable row level security;
revoke all on public.ps_value_ledger from anon,authenticated;

create table if not exists public.ps_merchant_experience_settings (
  account_id text primary key,
  automation_level text not null default 'recommend' check (automation_level in ('observe','recommend','approve','auto_protect')),
  weekly_review_enabled boolean not null default true,
  progressive_mode boolean not null default true,
  updated_at timestamptz not null default now()
);

alter table public.ps_merchant_experience_settings enable row level security;
revoke all on public.ps_merchant_experience_settings from anon,authenticated;
drop trigger if exists ps_merchant_experience_settings_set_updated_at on public.ps_merchant_experience_settings;
create trigger ps_merchant_experience_settings_set_updated_at before update on public.ps_merchant_experience_settings for each row execute function public.set_updated_at();

create table if not exists public.ps_merchant_engagement_events (
  id uuid primary key default gen_random_uuid(),
  account_id text not null,
  event_name text not null,
  object_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists idx_ps_merchant_engagement_account on public.ps_merchant_engagement_events(account_id,created_at desc);
alter table public.ps_merchant_engagement_events enable row level security;
revoke all on public.ps_merchant_engagement_events from anon,authenticated;
