-- Persistent merchant conversations that can own Store Manager tasks and
-- retain the evidence needed to resume work after a refresh or new session.

create table if not exists public.ps_copilot_conversations (
  id uuid primary key default gen_random_uuid(),
  account_id text not null,
  title text not null,
  status text not null default 'active'
    check (status in ('active','archived')),
  current_task_id uuid references public.ps_store_manager_tasks(id) on delete set null,
  context jsonb not null default '{}'::jsonb,
  last_message_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists ps_copilot_conversations_account_recent
  on public.ps_copilot_conversations(account_id, status, last_message_at desc);

create table if not exists public.ps_copilot_messages (
  id uuid primary key default gen_random_uuid(),
  account_id text not null,
  conversation_id uuid not null references public.ps_copilot_conversations(id) on delete cascade,
  role text not null check (role in ('user','assistant','system')),
  message_type text not null default 'text'
    check (message_type in ('text','task','approval','execution','evidence','error')),
  content text not null check (length(content) between 1 and 12000),
  task_id uuid references public.ps_store_manager_tasks(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists ps_copilot_messages_conversation_time
  on public.ps_copilot_messages(conversation_id, created_at, id);

alter table public.ps_store_manager_tasks
  add column if not exists conversation_id uuid references public.ps_copilot_conversations(id) on delete set null;

create index if not exists ps_store_manager_tasks_conversation
  on public.ps_store_manager_tasks(account_id, conversation_id, created_at desc)
  where conversation_id is not null;

alter table public.ps_copilot_conversations enable row level security;
alter table public.ps_copilot_messages enable row level security;
revoke all on public.ps_copilot_conversations from anon, authenticated;
revoke all on public.ps_copilot_messages from anon, authenticated;

drop trigger if exists ps_copilot_conversations_updated_at on public.ps_copilot_conversations;
create trigger ps_copilot_conversations_updated_at
  before update on public.ps_copilot_conversations
  for each row execute function public.set_updated_at();

comment on table public.ps_copilot_conversations is
  'Durable merchant workspaces for CFO Copilot and Store Manager conversations.';
comment on table public.ps_copilot_messages is
  'Ordered conversation history with optional task, approval, execution, and evidence context.';
