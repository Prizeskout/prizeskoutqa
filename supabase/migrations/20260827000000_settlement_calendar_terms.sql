-- Optional settlement-calendar terms. Null values preserve the existing
-- calendar-day estimate and prevent unsupported assumptions.
alter table public.ps_marketplace_contract_terms
  add column if not exists settlement_day_basis text
    check (settlement_day_basis is null or settlement_day_basis in ('calendar_days','business_days')),
  add column if not exists settlement_schedule_type text
    check (settlement_schedule_type is null or settlement_schedule_type in ('daily','weekly','twice_monthly','monthly')),
  add column if not exists settlement_weekday integer
    check (settlement_weekday is null or settlement_weekday between 0 and 6),
  add column if not exists settlement_month_days integer[] not null default '{}',
  add column if not exists settlement_cutoff_hour integer
    check (settlement_cutoff_hour is null or settlement_cutoff_hour between 0 and 23),
  add column if not exists settlement_timezone text,
  add column if not exists settlement_weekend_days integer[] not null default '{}',
  add column if not exists settlement_holidays date[] not null default '{}',
  add column if not exists settlement_reserve_days integer not null default 0
    check (settlement_reserve_days >= 0),
  add column if not exists minimum_payout_threshold numeric
    check (minimum_payout_threshold is null or minimum_payout_threshold >= 0);

comment on column public.ps_marketplace_contract_terms.settlement_weekday is
  'ISO-style JavaScript weekday number: Sunday 0 through Saturday 6.';
comment on column public.ps_marketplace_contract_terms.settlement_weekend_days is
  'Contract/calendar-specific non-business weekdays; no regional weekend is assumed when absent.';
