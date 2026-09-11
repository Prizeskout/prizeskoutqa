create table if not exists public.ps_connector_definitions (
  provider text primary key,
  display_name text not null,
  system_type text not null check(system_type in ('pos','erp','aggregator','settlement','accounting','custom')),
  readiness text not null check(readiness in ('production','sandbox','file_only','partner_approval_required','unavailable')),
  auth_methods text[] not null default '{}',
  capabilities text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ps_connector_connections (
  id uuid primary key default gen_random_uuid(),
  account_id text not null,
  merchant_id text not null,
  provider text not null references public.ps_connector_definitions(provider) on delete restrict,
  environment text not null default 'sandbox' check(environment in ('sandbox','production')),
  auth_method text not null check(auth_method in ('oauth2','api_key','service_account','partner_webhook','local_agent','file')),
  credential_reference text,
  external_merchant_id text,
  status text not null default 'setup_required' check(status in ('setup_required','pending_approval','connected','degraded','paused','revoked')),
  requested_capabilities text[] not null default '{}',
  granted_capabilities text[] not null default '{}',
  configuration jsonb not null default '{}'::jsonb,
  last_health_at timestamptz,
  last_success_at timestamptz,
  last_error text,
  connected_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(account_id,merchant_id,provider,environment)
);

create table if not exists public.ps_connector_identity_mappings (
  id uuid primary key default gen_random_uuid(),
  account_id text not null,
  connection_id uuid not null references public.ps_connector_connections(id) on delete cascade,
  identity_type text not null check(identity_type in ('legal_entity','brand','branch','revenue_center','product','customer','order')),
  external_id text not null,
  canonical_id text not null,
  match_status text not null default 'proposed' check(match_status in ('proposed','confirmed','rejected')),
  match_method text not null default 'manual' check(match_method in ('exact_id','source_reference','manual','merchant_confirmed')),
  confidence numeric not null default 1 check(confidence between 0 and 1),
  approved_by text,
  approved_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(connection_id,identity_type,external_id)
);

create table if not exists public.ps_connector_sync_checkpoints (
  connection_id uuid not null references public.ps_connector_connections(id) on delete cascade,
  stream text not null,
  cursor_value text,
  watermark_at timestamptz,
  last_attempt_at timestamptz,
  last_success_at timestamptz,
  status text not null default 'idle' check(status in ('idle','running','healthy','partial','failed')),
  records_received bigint not null default 0 check(records_received >= 0),
  last_error text,
  updated_at timestamptz not null default now(),
  primary key(connection_id,stream)
);

create index if not exists ps_connector_connections_account on public.ps_connector_connections(account_id,status,provider);
create index if not exists ps_connector_mappings_lookup on public.ps_connector_identity_mappings(account_id,identity_type,external_id);
alter table public.ps_connector_definitions enable row level security;
alter table public.ps_connector_connections enable row level security;
alter table public.ps_connector_identity_mappings enable row level security;
alter table public.ps_connector_sync_checkpoints enable row level security;
revoke all on public.ps_connector_definitions, public.ps_connector_connections, public.ps_connector_identity_mappings, public.ps_connector_sync_checkpoints from anon,authenticated;

insert into public.ps_connector_definitions(provider,display_name,system_type,readiness,auth_methods,capabilities) values
('odoo','Odoo','erp','partner_approval_required',array['oauth2','api_key','service_account'],array['merchant.read','branches.read','catalogue.read','orders.read','refunds.read','costs.read']),
('sap_s4hana','SAP S/4HANA','erp','partner_approval_required',array['oauth2','service_account','local_agent'],array['merchant.read','branches.read','catalogue.read','orders.read','refunds.read','costs.read','settlements.read']),
('sap_business_one','SAP Business One','erp','partner_approval_required',array['service_account','local_agent'],array['merchant.read','branches.read','catalogue.read','orders.read','refunds.read','costs.read']),
('oracle_micros','Oracle MICROS Simphony','pos','partner_approval_required',array['oauth2','service_account','local_agent'],array['branches.read','catalogue.read','orders.read','refunds.read','payments.read']),
('oracle_fusion','Oracle Fusion Cloud ERP','erp','partner_approval_required',array['oauth2','service_account'],array['merchant.read','branches.read','catalogue.read','costs.read','settlements.read']),
('netsuite','Oracle NetSuite','erp','partner_approval_required',array['oauth2','service_account'],array['merchant.read','branches.read','catalogue.read','orders.read','refunds.read','costs.read','settlements.read']),
('generic_api','Custom API','custom','sandbox',array['api_key','partner_webhook'],array['merchant.read','branches.read','catalogue.read','orders.read','refunds.read','costs.read','settlements.read'])
on conflict(provider) do update set display_name=excluded.display_name,system_type=excluded.system_type,
  readiness=excluded.readiness,auth_methods=excluded.auth_methods,capabilities=excluded.capabilities,updated_at=now();

comment on table public.ps_connector_connections is 'Provider-neutral tenant connector lifecycle. credential_reference identifies a secret in an approved vault; raw credentials are forbidden in configuration.';
comment on table public.ps_connector_identity_mappings is 'Explicit external-to-canonical identities; unconfirmed mappings must not silently drive financial truth.';
comment on table public.ps_connector_sync_checkpoints is 'Per-stream cursor and health state for restartable, observable connector synchronization.';
