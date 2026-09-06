-- Structured fields for landing-page profit-audit requests.
alter table public.contact_messages
  add column if not exists lead_type text not null default 'contact'
    check (lead_type in ('contact','support','profit_audit')),
  add column if not exists job_title text,
  add column if not exists phone text,
  add column if not exists company_size text,
  add column if not exists commerce_stack text,
  add column if not exists market text,
  add column if not exists preferred_language text
    check (preferred_language is null or preferred_language in ('en','ar'));

create index if not exists contact_messages_lead_queue_idx
  on public.contact_messages(lead_type,status,created_at desc);

comment on column public.contact_messages.lead_type is
  'Separates sales audit requests from general contact and support messages.';
