-- Enterprise restaurant identities and source mappings.
-- Financial facts remain append-only in ps_normalized_commerce_events; these
-- tables resolve customer-specific ERP/POS identifiers into stable identities.

create table if not exists public.ps_enterprise_entities (
  id uuid primary key default gen_random_uuid(),
  account_id text not null,
  parent_id uuid references public.ps_enterprise_entities(id) on delete restrict,
  entity_type text not null check(entity_type in ('legal_entity','brand','branch','virtual_kitchen','revenue_center')),
  external_id text not null,
  name text not null,
  country_code text check(country_code is null or country_code ~ '^[A-Z]{2}$'),
  currency text check(currency is null or currency ~ '^[A-Z]{3}$'),
  timezone text,
  active boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(account_id,entity_type,external_id)
);

create table if not exists public.ps_source_field_mappings (
  id uuid primary key default gen_random_uuid(),
  account_id text not null,
  source_provider text not null,
  mapping_kind text not null check(mapping_kind in ('field','legal_entity','brand','branch','virtual_kitchen','revenue_center','channel','status','tender','tax','discount_funder')),
  source_value text not null,
  canonical_value text not null,
  effective_from date not null default current_date,
  effective_to date,
  version integer not null default 1 check(version > 0),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  check(effective_to is null or effective_to >= effective_from),
  unique(account_id,source_provider,mapping_kind,source_value,version)
);

create table if not exists public.ps_product_cost_evidence (
  id uuid primary key default gen_random_uuid(),
  account_id text not null,
  evidence_item_id uuid not null references public.ps_merchant_evidence_items(id) on delete restrict,
  source_provider text not null,
  external_event_id text not null,
  sku text not null,
  brand_external_id text,
  branch_external_id text,
  currency text not null check(currency ~ '^[A-Z]{3}$'),
  unit_cost numeric not null check(unit_cost >= 0),
  unit_of_measure text not null default 'unit',
  effective_from date not null,
  effective_to date,
  cost_components jsonb not null default '{}'::jsonb,
  event_fingerprint text not null check(length(event_fingerprint) = 64),
  created_at timestamptz not null default now(),
  check(effective_to is null or effective_to >= effective_from),
  unique(account_id,source_provider,external_event_id,event_fingerprint)
);

create index if not exists ps_enterprise_entities_account_parent on public.ps_enterprise_entities(account_id,parent_id);
create index if not exists ps_source_mappings_lookup on public.ps_source_field_mappings(account_id,source_provider,mapping_kind,source_value,effective_from desc);
create index if not exists ps_product_cost_lookup on public.ps_product_cost_evidence(account_id,sku,effective_from desc);

alter table public.ps_enterprise_entities enable row level security;
alter table public.ps_source_field_mappings enable row level security;
alter table public.ps_product_cost_evidence enable row level security;
revoke all on public.ps_enterprise_entities from anon,authenticated;
revoke all on public.ps_source_field_mappings from anon,authenticated;
revoke all on public.ps_product_cost_evidence from anon,authenticated;

drop trigger if exists ps_product_cost_evidence_immutable on public.ps_product_cost_evidence;
create trigger ps_product_cost_evidence_immutable
  before update or delete on public.ps_product_cost_evidence
  for each row execute function public.ps_reject_api_independent_evidence_mutation();

comment on table public.ps_enterprise_entities is 'Stable legal-entity, brand, branch, kitchen and revenue-center identities for enterprise restaurant groups.';
comment on table public.ps_source_field_mappings is 'Versioned customer-specific POS/ERP value mappings; never rewrites retained source evidence.';
comment on table public.ps_product_cost_evidence is 'Immutable effective-dated unit costs used to calculate historically accurate restaurant contribution profit.';
