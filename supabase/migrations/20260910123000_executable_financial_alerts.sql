alter table public.ps_alert_rules drop constraint if exists ps_alert_rules_metric_check;
alter table public.ps_alert_rules add constraint ps_alert_rules_metric_check
  check (metric in ('gross_sales','contribution','payout_variance','margin','recoverable_amount'));

comment on table public.ps_alert_rules is 'Executable merchant financial thresholds evaluated against the current normalized Economic Twin.';
