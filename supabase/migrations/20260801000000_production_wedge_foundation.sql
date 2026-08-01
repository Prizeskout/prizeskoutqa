-- Production wedge foundation: authoritative economics, durable dispatch,
-- confirmation/rollback, latency evidence, and tamper-evident governance.
create extension if not exists pgcrypto;

create table if not exists public.ps_economics_versions (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null,
  merchant_id text not null,
  channel text not null,
  region text not null,
  version integer not null,
  effective_from timestamptz not null,
  effective_to timestamptz,
  commission_rate numeric(8,6) not null check (commission_rate between 0 and 0.99),
  vat_rate numeric(8,6) not null default 0 check (vat_rate between 0 and 0.99),
  payment_fee_rate numeric(8,6) not null default 0 check (payment_fee_rate between 0 and 0.99),
  fixed_order_fee numeric(12,4) not null default 0,
  logistics_subsidy numeric(12,4) not null default 0,
  promotion_contribution_rate numeric(8,6) not null default 0,
  margin_floor_pct numeric(8,6) not null check (margin_floor_pct between 0.000001 and 0.99),
  source_contract_id uuid references public.ps_marketplace_contract_terms(id),
  status text not null default 'draft' check (status in ('draft','approved','retired')),
  approved_by text,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  unique(account_id, merchant_id, channel, version)
);
create unique index if not exists ps_economics_one_active
  on public.ps_economics_versions(account_id,merchant_id,channel)
  where status='approved' and effective_to is null;

create table if not exists public.ps_product_cost_versions (
  id uuid primary key default gen_random_uuid(), account_id uuid not null,
  merchant_id text not null, sku text not null, amount numeric(12,4) not null check(amount >= 0),
  currency text not null, source text not null check(source in ('platform','erp','merchant_upload','manual_verified')),
  effective_from timestamptz not null default now(), effective_to timestamptz,
  evidence_ref text, created_at timestamptz not null default now()
);
create unique index if not exists ps_product_cost_one_active
  on public.ps_product_cost_versions(account_id,merchant_id,sku) where effective_to is null;

create table if not exists public.ps_dispatch_queue (
  id uuid primary key default gen_random_uuid(), account_id uuid not null, licensee_id uuid not null,
  ingest_event_id uuid not null references public.ps_ingest_events(id),
  decide_result_id uuid not null references public.ps_decide_results(id),
  merchant_id text not null, channel text not null, sku text not null,
  old_price numeric(12,4) not null, target_price numeric(12,4) not null, currency text not null,
  economics_version_id uuid not null references public.ps_economics_versions(id),
  state text not null default 'queued' check(state in ('queued','leased','accepted','confirming','confirmed','rollback_queued','rolled_back','dead_letter')),
  priority integer not null default 100, attempts integer not null default 0, max_attempts integer not null default 5,
  available_at timestamptz not null default now(), lease_owner text, lease_expires_at timestamptz,
  upstream_job_id text, last_error text, accepted_at timestamptz, confirmed_at timestamptz,
  rollback_reason text, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(ingest_event_id,channel,target_price)
);
create index if not exists ps_dispatch_queue_due on public.ps_dispatch_queue(state,available_at,priority);

create table if not exists public.ps_channel_rate_limits (
  account_id uuid not null, channel text not null, max_concurrency integer not null default 2,
  requests_per_minute integer not null default 30, primary key(account_id,channel)
);

create table if not exists public.ps_latency_spans (
  id bigserial primary key, trace_id text not null, account_id uuid not null,
  stage text not null, duration_ms integer not null check(duration_ms >= 0),
  success boolean not null, attributes jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists ps_latency_spans_stage_time on public.ps_latency_spans(stage,created_at desc);

alter table public.ps_govern_audit_log add column if not exists previous_hash text;
alter table public.ps_govern_audit_log add column if not exists chain_hash text;
alter table public.ps_govern_audit_log add column if not exists sequence_no bigint;
create unique index if not exists ps_govern_account_sequence on public.ps_govern_audit_log(account_id,sequence_no);

create or replace function public.ps_prepare_audit_chain() returns trigger language plpgsql as $$
declare prev text; seq bigint;
begin
  perform pg_advisory_xact_lock(hashtextextended(new.account_id::text, 0));
  select chain_hash, sequence_no into prev, seq from public.ps_govern_audit_log
    where account_id=new.account_id order by sequence_no desc nulls last, created_at desc limit 1;
  new.previous_hash := coalesce(prev, repeat('0',64));
  new.sequence_no := coalesce(seq,0)+1;
  new.chain_hash := encode(digest(new.previous_hash || new.payload_hash || new.trace_id || new.sequence_no::text,'sha256'),'hex');
  return new;
end $$;
drop trigger if exists ps_govern_chain_before_insert on public.ps_govern_audit_log;
create trigger ps_govern_chain_before_insert before insert on public.ps_govern_audit_log
  for each row execute function public.ps_prepare_audit_chain();
select public.lock_immutable_table('ps_govern_audit_log');
select public.lock_immutable_table('ps_latency_spans');

alter table public.ps_economics_versions enable row level security;
alter table public.ps_product_cost_versions enable row level security;
alter table public.ps_dispatch_queue enable row level security;
alter table public.ps_channel_rate_limits enable row level security;
alter table public.ps_latency_spans enable row level security;

do $$ begin
  if exists(select 1 from pg_extension where extname='pg_cron') then
    perform cron.schedule('prizeskout-dispatch-queue','* * * * *',format($job$
      select net.http_post(url := %L, headers := jsonb_build_object('Authorization','Bearer ' || current_setting('app.settings.cron_secret',true),'Content-Type','application/json'), body := '{}'::jsonb)
    $job$,'https://prizeskout.qa/api/public/hooks/dispatch-queue'));
  end if;
end $$;
