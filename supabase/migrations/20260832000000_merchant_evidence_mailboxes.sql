-- Merchant-controlled automatic email evidence collection.
-- Migrations through 20260831000000 are deployed and remain immutable.

create table if not exists public.ps_evidence_mailboxes (
  id uuid primary key default gen_random_uuid(),
  account_id text not null,
  merchant_id text not null,
  local_part text not null unique check (local_part ~ '^[a-z0-9][a-z0-9-]{11,63}$'),
  status text not null default 'active' check (status in ('active','paused','revoked')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(account_id,merchant_id)
);

create index if not exists ps_evidence_mailboxes_account
  on public.ps_evidence_mailboxes(account_id,status);

create table if not exists public.ps_evidence_email_sources (
  id uuid primary key default gen_random_uuid(),
  account_id text not null,
  merchant_id text not null,
  collection_mode text not null check (collection_mode in (
    'private_forwarding_address',
    'automatic_forwarding_rule',
    'connected_mailbox'
  )),
  provider text not null default 'merchant_email',
  status text not null default 'setup_required' check (status in ('setup_required','active','paused','revoked','error')),
  mailbox_id uuid references public.ps_evidence_mailboxes(id) on delete restrict,
  credential_reference text,
  collection_cursor text,
  last_collected_at timestamptz,
  source_config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(account_id,merchant_id,collection_mode,provider)
);

create index if not exists ps_evidence_email_sources_due
  on public.ps_evidence_email_sources(status,last_collected_at)
  where status='active';

alter table public.ps_evidence_mailboxes enable row level security;
alter table public.ps_evidence_email_sources enable row level security;
revoke all on public.ps_evidence_mailboxes from anon,authenticated;
revoke all on public.ps_evidence_email_sources from anon,authenticated;

-- Original RFC822 messages may be retained alongside their attachments.
update storage.buckets
set allowed_mime_types=array[
  'application/pdf','text/csv','application/csv','application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'image/png','image/jpeg','image/webp','message/rfc822','text/plain'
]
where id='merchant-evidence';

comment on table public.ps_evidence_mailboxes is
  'Private forwarding aliases used to collect merchant-authorized commercial evidence without aggregator APIs.';
comment on table public.ps_evidence_email_sources is
  'Merchant choice among direct forwarding, an automatic forwarding rule, or an optional read-only connected mailbox. Credential references must point to a secret vault; tokens do not belong in this table.';
