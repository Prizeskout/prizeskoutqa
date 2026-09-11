-- A Snoonu merchant identity may resolve to only one active PrizeSkout tenant.
-- This database-level guarantee prevents concurrent partner provisioning from
-- creating an ambiguous webhook route across tenants.
create unique index if not exists ps_snoonu_connected_external_merchant_unique
  on public.ps_merchant_channels ((metadata->>'snoonu_merchant_id'))
  where platform = 'snoonu'
    and status = 'connected'
    and nullif(metadata->>'snoonu_merchant_id', '') is not null;

comment on index public.ps_snoonu_connected_external_merchant_unique is
  'Prevents one active Snoonu merchant identity from being routed into multiple PrizeSkout tenants.';
