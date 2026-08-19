-- Evidence freshness and applicability for live price publication.
-- Migration 20260825000000 is already deployed and remains immutable.

alter table public.ps_price_actions
  add constraint ps_price_actions_economics_version_fk
    foreign key (economics_version_id) references public.ps_economics_versions(id) on delete restrict not valid,
  add constraint ps_price_actions_idempotency_key_length
    check (length(idempotency_key) between 1 and 120) not valid,
  add constraint ps_price_actions_positive_prices
    check (expected_current_price > 0 and target_price > 0) not valid,
  add constraint ps_price_actions_approval_window
    check (approval_expires_at > approved_at) not valid;

alter table public.ps_decide_results
  add column if not exists cost_observed_at timestamptz,
  add column if not exists cost_evidence_expires_at timestamptz,
  add column if not exists decision_expires_at timestamptz,
  add column if not exists evidence_channel text,
  add column if not exists evidence_item_id text,
  add column if not exists evidence_currency text;

alter table public.ps_price_actions
  add column if not exists cost_observed_at timestamptz,
  add column if not exists decision_expires_at timestamptz,
  add column if not exists economics_effective_to timestamptz;

comment on column public.ps_decide_results.decision_expires_at is
  'Latest instant this decision may authorize a live price write without regeneration.';
comment on column public.ps_decide_results.cost_evidence_expires_at is
  'Latest instant the cost snapshot may authorize a live price write without a catalogue refresh.';
