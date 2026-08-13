-- Support operations for the current PrizeSkout Revenue Protection product.
alter table public.contact_messages
  add column if not exists status text not null default 'open'
    check (status in ('open','in_progress','waiting_on_customer','resolved','closed')),
  add column if not exists priority text not null default 'normal'
    check (priority in ('low','normal','high','urgent')),
  add column if not exists assigned_to uuid references auth.users(id) on delete set null,
  add column if not exists admin_note text,
  add column if not exists source text not null default 'contact_form',
  add column if not exists updated_at timestamptz not null default now();

create index if not exists contact_messages_support_queue_idx
  on public.contact_messages(status, priority, created_at desc);

drop policy if exists "admins update contact messages" on public.contact_messages;
create policy "admins update contact messages" on public.contact_messages
for update to authenticated
using (public.has_role(auth.uid(), 'admin'))
with check (public.has_role(auth.uid(), 'admin'));
