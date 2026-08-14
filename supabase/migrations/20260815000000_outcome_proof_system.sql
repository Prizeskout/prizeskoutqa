-- Verified merchant outcomes derived from the existing PrizeSkout value ledger.
create table if not exists public.ps_outcome_proofs (
  id uuid primary key default gen_random_uuid(),
  account_id text not null,
  ledger_id uuid references public.ps_value_ledger(id) on delete set null,
  outcome_type text not null check (outcome_type in ('identified','protected','recovered','estimated','pending')),
  status text not null default 'detected' check (status in ('detected','merchant_approved','executed','verified','rejected')),
  source_type text not null,
  source_id text not null,
  title text not null,
  amount numeric not null check (amount >= 0),
  currency text not null,
  evidence_strength text not null check (evidence_strength in ('verified','strong','estimated','unknown')),
  before_state jsonb not null default '{}'::jsonb,
  after_state jsonb not null default '{}'::jsonb,
  evidence jsonb not null default '[]'::jsonb,
  approved_at timestamptz,
  executed_at timestamptz,
  verified_at timestamptz,
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(account_id,source_type,source_id,outcome_type)
);

create index if not exists ps_outcome_proofs_account_idx on public.ps_outcome_proofs(account_id,occurred_at desc);
create index if not exists ps_outcome_proofs_status_idx on public.ps_outcome_proofs(status,outcome_type,occurred_at desc);
alter table public.ps_outcome_proofs enable row level security;
revoke all on public.ps_outcome_proofs from anon,authenticated;

create or replace function public.sync_value_ledger_outcome_proof()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  insert into public.ps_outcome_proofs(
    account_id,ledger_id,outcome_type,status,source_type,source_id,title,amount,currency,
    evidence_strength,before_state,after_state,evidence,verified_at,occurred_at,updated_at
  ) values (
    new.account_id,new.id,new.category,
    case when new.category in ('protected','recovered') and new.evidence_strength='verified' then 'verified'
         when new.category in ('protected','recovered') then 'executed' else 'detected' end,
    new.source_type,new.source_id,new.label,new.amount,new.currency,new.evidence_strength,
    coalesce(new.metadata->'before_state','{}'::jsonb),coalesce(new.metadata->'after_state','{}'::jsonb),
    coalesce(new.metadata->'evidence','[]'::jsonb),
    case when new.category in ('protected','recovered') and new.evidence_strength='verified' then new.occurred_at else null end,
    new.occurred_at,now()
  ) on conflict(account_id,source_type,source_id,outcome_type) do update set
    ledger_id=excluded.ledger_id,title=excluded.title,amount=excluded.amount,currency=excluded.currency,
    evidence_strength=excluded.evidence_strength,before_state=excluded.before_state,
    after_state=excluded.after_state,evidence=excluded.evidence,status=excluded.status,
    verified_at=excluded.verified_at,occurred_at=excluded.occurred_at,updated_at=now();
  return new;
end $$;

drop trigger if exists ps_value_ledger_sync_outcome on public.ps_value_ledger;
create trigger ps_value_ledger_sync_outcome after insert or update on public.ps_value_ledger
for each row execute function public.sync_value_ledger_outcome_proof();

insert into public.ps_outcome_proofs(
  account_id,ledger_id,outcome_type,status,source_type,source_id,title,amount,currency,
  evidence_strength,before_state,after_state,evidence,verified_at,occurred_at
)
select account_id,id,category,
  case when category in ('protected','recovered') and evidence_strength='verified' then 'verified'
       when category in ('protected','recovered') then 'executed' else 'detected' end,
  source_type,source_id,label,amount,currency,evidence_strength,
  coalesce(metadata->'before_state','{}'::jsonb),coalesce(metadata->'after_state','{}'::jsonb),
  coalesce(metadata->'evidence','[]'::jsonb),
  case when category in ('protected','recovered') and evidence_strength='verified' then occurred_at else null end,
  occurred_at
from public.ps_value_ledger
on conflict(account_id,source_type,source_id,outcome_type) do nothing;
