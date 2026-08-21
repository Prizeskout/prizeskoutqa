-- Link agreement drafts created through the Evidence Inbox to their immutable
-- source document and merchant review decision.
-- Migrations through 20260835000000 are deployed and must remain unchanged.

alter table public.ps_marketplace_contract_terms
  add column if not exists source_evidence_item_id uuid
    references public.ps_merchant_evidence_items(id) on delete restrict,
  add column if not exists source_review_decision_id uuid
    references public.ps_evidence_review_decisions(id) on delete restrict;

create unique index if not exists ps_contract_terms_source_evidence_unique
  on public.ps_marketplace_contract_terms(source_evidence_item_id)
  where source_evidence_item_id is not null;

create unique index if not exists ps_contract_terms_source_review_unique
  on public.ps_marketplace_contract_terms(source_review_decision_id)
  where source_review_decision_id is not null;

comment on column public.ps_marketplace_contract_terms.source_evidence_item_id is
  'Retained Evidence Inbox document from which this review-required agreement draft was created.';
comment on column public.ps_marketplace_contract_terms.source_review_decision_id is
  'Merchant approval of the extraction that created this draft; this is not approval of the agreement terms themselves.';
