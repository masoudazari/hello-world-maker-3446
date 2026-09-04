alter table public.purchase_requests
  add column if not exists batch_id uuid;

create index if not exists purchase_requests_batch_idx on public.purchase_requests (batch_id);