-- Preserve every agreement-match decision while allowing newly approved terms
-- to safely revisit evidence that was previously blocked or ambiguous.
-- Migrations through 20260839000000 are deployed and must remain unchanged.

alter table public.ps_evidence_agreement_matches
  add column if not exists revision integer not null default 1 check (revision >= 1),
  add column if not exists rematch_reason text;

alter table public.ps_evidence_agreement_matches
  drop constraint if exists ps_evidence_agreement_matches_evidence_item_id_review_decision_id_matcher_version_key;

create unique index if not exists ps_evidence_agreement_match_revision_unique
  on public.ps_evidence_agreement_matches(evidence_item_id,review_decision_id,matcher_version,revision);

create index if not exists ps_evidence_agreement_match_latest
  on public.ps_evidence_agreement_matches(account_id,evidence_item_id,revision desc);

comment on column public.ps_evidence_agreement_matches.revision is
  'Append-only matcher revision. New approved agreements create a new result instead of replacing prior audit history.';
