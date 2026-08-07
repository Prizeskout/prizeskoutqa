-- Auditable product-image jobs. Files remain private and are only read by the
-- server using the service role; merchants access them through authenticated APIs.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('product-image-jobs','product-image-jobs',false,10485760,array['image/jpeg','image/png','image/webp'])
on conflict(id) do update set public=false,file_size_limit=10485760,allowed_mime_types=excluded.allowed_mime_types;

create table if not exists public.ps_product_image_jobs(
  id uuid primary key default gen_random_uuid(), account_id text not null,
  platform text not null default 'zid', title text not null,
  status text not null default 'draft' check(status in ('draft','matched','waiting_approval','approved','executing','verifying','completed','partial','needs_attention','rolled_back','cancelled')),
  source_type text not null default 'upload', policy jsonb not null default '{}'::jsonb,
  manager_task_id uuid references public.ps_store_manager_tasks(id) on delete set null,
  approved_by text,approved_at timestamptz,created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
create table if not exists public.ps_product_image_items(
  id uuid primary key default gen_random_uuid(),job_id uuid not null references public.ps_product_image_jobs(id) on delete cascade,
  account_id text not null,storage_path text not null,file_name text not null,mime_type text not null,file_size integer not null,sha256 text not null,
  width integer,height integer,alt_text text,position integer not null default 0,is_cover boolean not null default false,
  product_id text,product_sku text,product_name text,match_status text not null default 'unmatched' check(match_status in ('confirmed','likely','ambiguous','unmatched')),
  match_confidence numeric not null default 0 check(match_confidence between 0 and 1),
  before_gallery jsonb not null default '[]'::jsonb,uploaded_image_id text,result jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),unique(account_id,sha256,product_id)
);
create table if not exists public.ps_product_image_events(
 id uuid primary key default gen_random_uuid(),account_id text not null,job_id uuid not null references public.ps_product_image_jobs(id) on delete cascade,
 event_type text not null,actor text not null,detail jsonb not null default '{}'::jsonb,created_at timestamptz not null default now()
);
create index if not exists ps_product_image_jobs_account on public.ps_product_image_jobs(account_id,created_at desc);
create index if not exists ps_product_image_items_job on public.ps_product_image_items(job_id,position);
alter table public.ps_product_image_jobs enable row level security;alter table public.ps_product_image_items enable row level security;alter table public.ps_product_image_events enable row level security;
revoke all on public.ps_product_image_jobs from anon,authenticated;revoke all on public.ps_product_image_items from anon,authenticated;revoke all on public.ps_product_image_events from anon,authenticated;
drop trigger if exists ps_product_image_jobs_updated_at on public.ps_product_image_jobs;
create trigger ps_product_image_jobs_updated_at before update on public.ps_product_image_jobs for each row execute function public.set_updated_at();
