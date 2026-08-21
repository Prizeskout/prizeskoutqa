-- Private original-file storage for merchant-controlled evidence.
-- Migration 20260830000000 is deployed and remains immutable.

insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values (
  'merchant-evidence',
  'merchant-evidence',
  false,
  15728640,
  array['application/pdf','text/csv','application/csv','application/vnd.ms-excel','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','image/png','image/jpeg','image/webp']
)
on conflict (id) do update set
  public=false,
  file_size_limit=excluded.file_size_limit,
  allowed_mime_types=excluded.allowed_mime_types;

comment on table public.ps_merchant_evidence_items is
  'Immutable merchant-controlled evidence intake. Original uploads are stored in the private merchant-evidence bucket; APIs remain optional.';
