-- Auditable agreement matching for approved merchant evidence.
-- Migrations through 20260834000000 are deployed and remain unchanged.

create table if not exists public.ps_evidence_agreement_matches (
  id uuid primary key default gen_random_uuid(),
  account_id text not null,
  merchant_id text not null,
  evidence_item_id uuid not null references public.ps_merchant_evidence_items(id) on delete restrict,
  review_decision_id uuid references public.ps_evidence_review_decisions(id) on delete restrict,
  contract_term_id uuid references public.ps_marketplace_contract_terms(id) on delete restrict,
  state text not null check (state in ('automatic','needs_confirmation','confirmed','rejected','no_match')),
  platform text,
  evidence_date_start date,
  evidence_date_end date,
  currency text,
  branch_reference text,
  brand_reference text,
  legal_entity_reference text,
  match_score integer not null default 0 check (match_score between 0 and 100),
  reasons text[] not null default '{}',
  blockers text[] not null default '{}',
  candidate_contract_ids uuid[] not null default '{}',
  matcher_version text not null,
  confirmed_by text,
  confirmed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(evidence_item_id,review_decision_id,matcher_version)
);

create index if not exists ps_evidence_agreement_matches_queue
  on public.ps_evidence_agreement_matches(account_id,state,created_at desc);
create index if not exists ps_evidence_agreement_matches_contract
  on public.ps_evidence_agreement_matches(contract_term_id,evidence_date_start);

alter table public.ps_evidence_agreement_matches enable row level security;
revoke all on public.ps_evidence_agreement_matches from anon,authenticated;

comment on table public.ps_evidence_agreement_matches is
  'Auditable automatic or merchant-confirmed link between approved evidence and the effective commercial agreement. Ambiguous evidence never selects a contract silently.';
