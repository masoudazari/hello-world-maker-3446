-- =====================================================================
-- Phase 3: Purchase-request (RFQ) module upgrade
-- =====================================================================

-- 1) Offer negotiation history --------------------------------------------------
create table if not exists public.offer_versions (
  id uuid primary key default gen_random_uuid(),
  offer_id uuid not null references public.supplier_offers(id) on delete cascade,
  version_number int not null,
  unit_price bigint not null,
  total_price bigint not null,
  available_quantity numeric not null,
  shipping_cost bigint not null default 0,
  payment_terms text,
  preparation_time text,
  shipping_time text,
  description text,
  created_at timestamptz not null default now()
);
grant select on public.offer_versions to authenticated;
grant all on public.offer_versions to service_role;
alter table public.offer_versions enable row level security;

drop policy if exists "offer versions parties read" on public.offer_versions;
create policy "offer versions parties read" on public.offer_versions for select to authenticated
  using (
    exists (
      select 1 from public.supplier_offers o
      where o.id = offer_id
        and (
          o.supplier_id = private.my_supplier_id()
          or exists (select 1 from public.purchase_requests r where r.id = o.request_id and r.buyer_id = auth.uid())
          or private.has_role(auth.uid(), 'admin')
        )
    )
  );

create or replace function public.record_offer_version()
returns trigger language plpgsql security definer set search_path = public as $$
declare next_version int;
begin
  select coalesce(max(version_number), 0) + 1 into next_version from public.offer_versions where offer_id = new.id;
  insert into public.offer_versions
    (offer_id, version_number, unit_price, total_price, available_quantity, shipping_cost, payment_terms, preparation_time, shipping_time, description)
  values
    (new.id, next_version, new.unit_price, new.total_price, new.available_quantity, new.shipping_cost, new.payment_terms, new.preparation_time, new.shipping_time, new.description);
  return new;
end; $$;

drop trigger if exists trg_offer_version_insert on public.supplier_offers;
create trigger trg_offer_version_insert after insert on public.supplier_offers
for each row execute function public.record_offer_version();

drop trigger if exists trg_offer_version_update on public.supplier_offers;
create trigger trg_offer_version_update after update on public.supplier_offers
for each row when (
  old.unit_price is distinct from new.unit_price
  or old.total_price is distinct from new.total_price
  or old.available_quantity is distinct from new.available_quantity
  or old.shipping_cost is distinct from new.shipping_cost
  or old.payment_terms is distinct from new.payment_terms
  or old.description is distinct from new.description
)
execute function public.record_offer_version();

revoke all on function public.record_offer_version() from public, anon, authenticated;

-- 2) Per-request, per-supplier isolated conversation ----------------------------
create table if not exists public.request_conversations (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.purchase_requests(id) on delete cascade,
  buyer_id uuid not null references auth.users(id) on delete cascade,
  supplier_id uuid not null references public.suppliers(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (request_id, supplier_id)
);
grant select, insert on public.request_conversations to authenticated;
grant all on public.request_conversations to service_role;
alter table public.request_conversations enable row level security;

drop policy if exists "request conversations parties read" on public.request_conversations;
create policy "request conversations parties read" on public.request_conversations for select to authenticated
  using (
    buyer_id = auth.uid()
    or supplier_id = private.my_supplier_id()
    or private.has_role(auth.uid(), 'admin')
  );

create table if not exists public.request_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.request_conversations(id) on delete cascade,
  request_id uuid not null references public.purchase_requests(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  message text not null,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);
grant select, insert, update on public.request_messages to authenticated;
grant all on public.request_messages to service_role;
alter table public.request_messages enable row level security;
create index if not exists request_messages_conversation_idx on public.request_messages (conversation_id, created_at);

drop policy if exists "request messages parties read" on public.request_messages;
create policy "request messages parties read" on public.request_messages for select to authenticated
  using (
    exists (
      select 1 from public.request_conversations c
      where c.id = conversation_id
        and (c.buyer_id = auth.uid() or c.supplier_id = private.my_supplier_id() or private.has_role(auth.uid(), 'admin'))
    )
  );
drop policy if exists "request messages send" on public.request_messages;
create policy "request messages send" on public.request_messages for insert to authenticated
  with check (
    sender_id = auth.uid()
    and exists (
      select 1 from public.request_conversations c
      where c.id = conversation_id
        and (c.buyer_id = auth.uid() or c.supplier_id = private.my_supplier_id())
    )
  );
drop policy if exists "request messages mark read" on public.request_messages;
create policy "request messages mark read" on public.request_messages for update to authenticated
  using (
    exists (
      select 1 from public.request_conversations c
      where c.id = conversation_id and (c.buyer_id = auth.uid() or c.supplier_id = private.my_supplier_id())
    )
  )
  with check (true);

create or replace function public.ensure_request_conversation()
returns trigger language plpgsql security definer set search_path = public as $$
declare conv_id uuid; req_buyer uuid; req_product text;
begin
  select buyer_id, product_name into req_buyer, req_product from public.purchase_requests where id = new.request_id;

  insert into public.request_conversations (request_id, buyer_id, supplier_id)
  values (new.request_id, req_buyer, new.supplier_id)
  on conflict (request_id, supplier_id) do nothing
  returning id into conv_id;

  if conv_id is null then
    select id into conv_id from public.request_conversations where request_id = new.request_id and supplier_id = new.supplier_id;
  end if;

  if req_buyer is not null then
    insert into public.notifications (user_id, type, title, body, link)
    values (req_buyer, 'offer', 'پیشنهاد قیمت جدید', format('یک پیشنهاد جدید برای «%s» دریافت کردید.', req_product), '/buyer/requests/' || new.request_id);
  end if;

  return new;
end; $$;

drop trigger if exists trg_ensure_request_conversation on public.supplier_offers;
create trigger trg_ensure_request_conversation after insert on public.supplier_offers
for each row execute function public.ensure_request_conversation();

revoke all on function public.ensure_request_conversation() from public, anon, authenticated;

create or replace function public.notify_request_message()
returns trigger language plpgsql security definer set search_path = public as $$
declare conv record; recipient uuid; req_product text;
begin
  select c.buyer_id, c.supplier_id, s.user_id as supplier_user_id
    into conv
    from public.request_conversations c
    join public.suppliers s on s.id = c.supplier_id
    where c.id = new.conversation_id;

  recipient := case when new.sender_id = conv.buyer_id then conv.supplier_user_id else conv.buyer_id end;
  select product_name into req_product from public.purchase_requests where id = new.request_id;

  if recipient is not null then
    insert into public.notifications (user_id, type, title, body, link)
    values (recipient, 'message', 'پیام جدید', format('پیام جدید درباره درخواست «%s»', coalesce(req_product,'')), '/buyer/requests/' || new.request_id);
  end if;
  return new;
end; $$;

drop trigger if exists trg_notify_request_message on public.request_messages;
create trigger trg_notify_request_message after insert on public.request_messages
for each row execute function public.notify_request_message();

revoke all on function public.notify_request_message() from public, anon, authenticated;

-- 3) Smart fan-out with anti-spam cap -------------------------------------------
alter table public.purchase_requests
  add column if not exists max_recipients int not null default 20;

create table if not exists public.request_recipients (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.purchase_requests(id) on delete cascade,
  supplier_id uuid not null references public.suppliers(id) on delete cascade,
  match_score int not null default 0,
  notified_at timestamptz not null default now(),
  unique (request_id, supplier_id)
);
grant select on public.request_recipients to authenticated;
grant all on public.request_recipients to service_role;
alter table public.request_recipients enable row level security;

drop policy if exists "request recipients own read" on public.request_recipients;
create policy "request recipients own read" on public.request_recipients for select to authenticated
  using (
    supplier_id = private.my_supplier_id()
    or exists (select 1 from public.purchase_requests r where r.id = request_id and r.buyer_id = auth.uid())
    or private.has_role(auth.uid(), 'admin')
  );

create or replace function public.fanout_request_to_suppliers()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.category_id is null then
    return new;
  end if;

  insert into public.request_recipients (request_id, supplier_id, match_score)
  select new.id, s.id, s.supplier_score
  from (
    select distinct p.supplier_id
    from public.products p
    where p.category_id = new.category_id and p.status = 'active'
  ) matched
  join public.suppliers s on s.id = matched.supplier_id
  order by s.supplier_score desc
  limit new.max_recipients
  on conflict (request_id, supplier_id) do nothing;

  insert into public.notifications (user_id, type, title, body, link)
  select s.user_id, 'request', 'درخواست خرید جدید مرتبط', format('درخواست جدید «%s» در دسته‌بندی شما ثبت شد.', new.product_name), '/supplier/requests'
  from public.request_recipients rr
  join public.suppliers s on s.id = rr.supplier_id
  where rr.request_id = new.id and s.user_id is not null;

  return new;
end; $$;

drop trigger if exists trg_fanout_request on public.purchase_requests;
create trigger trg_fanout_request after insert on public.purchase_requests
for each row execute function public.fanout_request_to_suppliers();

revoke all on function public.fanout_request_to_suppliers() from public, anon, authenticated;

create index if not exists request_recipients_supplier_idx on public.request_recipients (supplier_id, request_id);
create index if not exists offer_versions_offer_idx on public.offer_versions (offer_id, version_number);