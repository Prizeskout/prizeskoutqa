create table if not exists public.ps_group_approval_events (
  id uuid primary key default gen_random_uuid(),
  account_id text not null,
  group_control_id uuid not null references public.ps_group_controls(id) on delete cascade,
  approval_role text not null check (approval_role in ('finance','operations')),
  reviewer_member_id text not null,
  reviewer_name text not null,
  hierarchy_hash text not null,
  decision text not null default 'approved' check (decision in ('approved','revoked')),
  created_at timestamptz not null default now()
);

create index if not exists ps_group_approval_events_account_time
  on public.ps_group_approval_events(account_id, created_at desc);

alter table public.ps_group_approval_events enable row level security;

alter table public.ps_group_controls
  add column if not exists hierarchy_hash text,
  add column if not exists approved_hierarchy_hash text,
  add column if not exists policy_status text not null default 'draft'
    check (policy_status in ('draft','pending_approval','approved','propagating','live','partially_live','failed')),
  add column if not exists active_policy_version integer,
  add column if not exists active_margin_floor_pct numeric,
  add column if not exists policy_activated_at timestamptz;
