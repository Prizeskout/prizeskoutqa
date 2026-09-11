alter table public.ps_connector_definitions add column if not exists metadata jsonb not null default '{}'::jsonb;

update public.ps_connector_definitions set
  readiness='sandbox',
  auth_methods=array['api_key'],
  metadata=jsonb_build_object(
    'interface','Odoo JSON-2',
    'minimum_version','19.0',
    'requires_custom_plan',true,
    'credential_policy','Dedicated bot user API key; never a normal employee password.',
    'documentation_status','official'
  ), updated_at=now()
where provider='odoo';

update public.ps_connector_definitions set metadata=jsonb_build_object(
  'interface','Simphony Transaction Services Gen 2',
  'restriction','Not enabled for analytics or bulk transaction retrieval. Oracle documentation limits STS Gen 2 to digital transaction processing.',
  'documentation_status','official'
), updated_at=now() where provider='oracle_micros';

update public.ps_connector_definitions set metadata=jsonb_build_object(
  'interface','Customer-specific OData services through an SAP communication arrangement',
  'credential_policy','Dedicated communication system/user required.',
  'documentation_status','official',
  'activation_requirement','Customer SAP administrator must supply the enabled communication scenarios and service metadata.'
), updated_at=now() where provider in ('sap_s4hana','sap_business_one');
