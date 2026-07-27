alter table if exists public.ps_marketplace_contract_terms
  add column if not exists commission_base text not null default 'unknown'
    check (commission_base in ('gross_before_discount','net_after_discount','eligible_sales','unknown')),
  add column if not exists promotion_funding_platform_pct numeric
    check (promotion_funding_platform_pct is null or (promotion_funding_platform_pct >= 0 and promotion_funding_platform_pct <= 100)),
  add column if not exists refund_liability text not null default 'unknown'
    check (refund_liability in ('merchant','platform','shared','conditional','unknown')),
  add column if not exists cancellation_liability text not null default 'unknown'
    check (cancellation_liability in ('merchant','platform','shared','conditional','unknown')),
  add column if not exists settlement_frequency text,
  add column if not exists settlement_days integer check (settlement_days is null or settlement_days >= 0),
  add column if not exists dispute_deadline_days integer check (dispute_deadline_days is null or dispute_deadline_days >= 0),
  add column if not exists advertising_commitment numeric check (advertising_commitment is null or advertising_commitment >= 0),
  add column if not exists minimum_spend numeric check (minimum_spend is null or minimum_spend >= 0),
  add column if not exists currency text,
  add column if not exists coverage_legal_entity text,
  add column if not exists coverage_brands text[] not null default '{}',
  add column if not exists coverage_branches text[] not null default '{}';

comment on column public.ps_marketplace_contract_terms.commission_base is
  'The contractual amount to which commission applies; unknown blocks definitive compliance tests.';
