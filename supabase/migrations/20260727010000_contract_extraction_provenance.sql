alter table if exists public.ps_marketplace_contract_terms
  add column if not exists extraction_json jsonb,
  add column if not exists extraction_model text,
  add column if not exists extraction_confidence numeric(5,4),
  add column if not exists extracted_at timestamptz;

comment on column public.ps_marketplace_contract_terms.extraction_json is
  'Evidence-backed AI extraction, including source quotes and page references. Never constitutes approval.';
