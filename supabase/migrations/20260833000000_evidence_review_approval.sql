-- Merchant review gate for machine-extracted evidence.
-- Migrations 20260830000000 through 20260832000000 are deployed and remain unchanged.

create table if not exists public.ps_evidence_review_drafts (
  id uuid primary key default gen_random_uuid(),
  account_id text not null,
  merchant_id text not null,
  evidence_item_id uuid not null references public.ps_merchant_evidence_items(id) on delete restrict,
  processing_attempt_id uuid references public.ps_evidence_processing_attempts(id) on delete restrict,
  processor_version text not null,
  revision integer not null default 1 check (revision > 0),
  document_kind text not null,
  platform text,
  extraction_payload jsonb not null,
  source_citations jsonb not null default '[]'::jsonb,
  missing_information text[] not null default '{}',
  warnings text[] not null default '{}',
  confidence numeric check (confidence is null or (confidence >= 0 and confidence <= 1)),
  status text not null default 'pending' check (status in ('pending','superseded','approved','rejected')),
  created_at timestamptz not null default now(),
  unique(evidence_item_id,processor_version,revision)
);

create table if not exists public.ps_evidence_review_decisions (
  id uuid primary key default gen_random_uuid(),
  account_id text not null,
  merchant_id text not null,
  evidence_item_id uuid not null references public.ps_merchant_evidence_items(id) on delete restrict,
  review_draft_id uuid not null references public.ps_evidence_review_drafts(id) on delete restrict,
  decision text not null check (decision in ('approved','rejected')),
  reviewed_payload jsonb not null,
  correction_summary text,
  reviewer_user_id uuid,
  reviewer_email text,
  decided_at timestamptz not null default now(),
  unique(review_draft_id)
);

create index if not exists ps_evidence_review_queue
  on public.ps_evidence_review_drafts(account_id,status,created_at desc);
create index if not exists ps_evidence_review_decisions_item
  on public.ps_evidence_review_decisions(evidence_item_id,decided_at desc);

alter table public.ps_evidence_review_drafts enable row level security;
alter table public.ps_evidence_review_decisions enable row level security;
revoke all on public.ps_evidence_review_drafts from anon,authenticated;
revoke all on public.ps_evidence_review_decisions from anon,authenticated;

-- Drafts and decisions are permanent evidence. State changes are limited to
-- the one-way pending -> approved/rejected transition used by the review API.
create or replace function public.ps_guard_evidence_review_draft_update()
returns trigger language plpgsql as $$
begin
  if tg_op = 'DELETE' then
    raise exception 'Evidence review drafts cannot be deleted.';
  end if;
  if old.status <> 'pending' or new.status not in ('approved','rejected') or
     new.id <> old.id or new.account_id <> old.account_id or
     new.merchant_id <> old.merchant_id or new.evidence_item_id <> old.evidence_item_id or
     new.processing_attempt_id is distinct from old.processing_attempt_id or
     new.processor_version <> old.processor_version or new.revision <> old.revision or
     new.document_kind <> old.document_kind or new.platform is distinct from old.platform or
     new.extraction_payload <> old.extraction_payload or new.source_citations <> old.source_citations or
     new.missing_information <> old.missing_information or new.warnings <> old.warnings or
     new.confidence is distinct from old.confidence or new.created_at <> old.created_at then
    raise exception 'Evidence review drafts are immutable except for their final decision state.';
  end if;
  return new;
end;
$$;

drop trigger if exists ps_evidence_review_drafts_guard on public.ps_evidence_review_drafts;
create trigger ps_evidence_review_drafts_guard before update or delete on public.ps_evidence_review_drafts
for each row execute function public.ps_guard_evidence_review_draft_update();

drop trigger if exists ps_evidence_review_decisions_immutable on public.ps_evidence_review_decisions;
create trigger ps_evidence_review_decisions_immutable before update or delete on public.ps_evidence_review_decisions
for each row execute function public.ps_reject_api_independent_evidence_mutation();

comment on table public.ps_evidence_review_drafts is
  'Immutable machine-extracted drafts. These rows are never financial authority until a merchant decision exists.';
comment on table public.ps_evidence_review_decisions is
  'Permanent merchant approval/rejection audit including the corrected payload and reviewer identity.';
